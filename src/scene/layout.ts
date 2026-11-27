import type { Petak, SeedData, Zona } from '../types.js';
import {
  MAP_DEPTH,
  MAP_WIDTH,
  WORLD_UNITS_PER_METER,
  TERRAIN_COLS,
  TERRAIN_ROWS,
  terrainMdplAt,
  terrainYAt,
} from './terrainField.js';
import { roadEdgeDistance } from './roadNetwork.js';
import { hasRiverClearance, towardRiver } from './riverNetwork.js';
import { VILLAGE_BOUNDARY } from './villageBoundary.js';

const ZONE_COLS = TERRAIN_COLS;
const ZONE_ROWS = TERRAIN_ROWS;

export interface ZoneCell {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  col: number;
  row: number;
}

export interface ZoneSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export interface ZonePlacement {
  zona: Zona;
  cells: readonly ZoneCell[];
  boundary: readonly ZoneSegment[];
  centerX: number;
  centerZ: number;
  span: number;
  topY: number;
}

export type LocalPoint = readonly [number, number];

export interface PlotFootprint {
  outline: readonly LocalPoint[];
  x: number;
  z: number;
  width: number;
  depth: number;
  y: number;
}

export interface PetakPlacement {
  petak: Petak;
  footprints: readonly PlotFootprint[];
  cells: readonly ZoneCell[];
  x: number;
  z: number;
  topY: number;
  width: number;
  depth: number;
}

const CORNER_PRODUCT = .012;
const POLYGON_AREA_FRACTION = 1 - 2 * CORNER_PRODUCT;
export const footprintArea = (footprint: PlotFootprint) =>
  footprint.width * footprint.depth * POLYGON_AREA_FRACTION;

function terrainOutline(x: number, z: number, width: number, depth: number): LocalPoint[] {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
  const river = towardRiver(x, z);
  const riverLength = Math.max(1, river.distance);
  return corners.flatMap(([sx, sz], index) => {
    const px = sx * width / 2;
    const pz = sz * depth / 2;
    const rise = terrainYAt(x + px, z + pz) - terrainYAt(x + px * .72, z + pz * .72);
    // The fixed morning sun direction keeps parcel boundaries stable as the scene clock changes.
    const elevation = terrainYAt(x + px, z + pz);
    const shade = Math.max(0, terrainYAt(x + px + 1.4, z + pz) - elevation - .21);
    const eastExposure = terrainYAt(x + px - .35, z + pz) - terrainYAt(x + px + .35, z + pz);
    const drainX = river.x / riverLength;
    const drainZ = river.z / riverLength;
    const fall = elevation - terrainYAt(x + px + drainX * .65, z + pz + drainZ * .65);
    const drainage = (sx * drainX + sz * drainZ) * Math.max(.3, Math.min(1, .6 + fall));
    const alongX = Math.max(.07, Math.min(.20,
      .124 + rise * .27 + (eastExposure - shade) * .18 + drainage * .028));
    const alongZ = CORNER_PRODUCT / alongX;
    const onX: LocalPoint = [px - sx * width * alongX, pz];
    const onZ: LocalPoint = [px, pz - sz * depth * alongZ];
    return index % 2 === 0 ? [onZ, onX] : [onX, onZ];
  });
}

export function containsLocalPoint(outline: readonly LocalPoint[], x: number, z: number) {
  return outline.every(([ax, az], index) => {
    const [bx, bz] = outline[(index + 1) % outline.length]!;
    return (bx - ax) * (z - az) - (bz - az) * (x - ax) >= -1e-8;
  });
}

function seatFootprint(x: number, z: number, width: number, depth: number): PlotFootprint {
  const heights = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dz) =>
    terrainYAt(x + dx * width / 2, z + dz * depth / 2)));
  const y = Math.max(...heights) + .045;
  return { x, z, width, depth, y, outline: terrainOutline(x, z, width, depth) };
}

function findFootprint(cells: readonly ZoneCell[], centerX: number, centerZ: number, targetArea: number) {
  const cell = cells[0]!;
  const cellWidth = cell.x1 - cell.x0;
  const cellDepth = cell.z1 - cell.z0;
  const keys = new Set(cells.map(({ col, row }) => `${col}:${row}`));
  let best = { coverageLoss: Infinity, total: Infinity, x: centerX, z: centerZ,
    width: cellWidth, depth: cellDepth, col: cell.col, row: cell.row, columns: 1, rows: 1 };
  const edgeGap = .96;
  const availableCellArea = cellWidth * cellDepth * edgeGap ** 2 * POLYGON_AREA_FRACTION;

  for (const { col, row, x0, z0 } of cells) {
    let maxColumns = Math.ceil(targetArea / availableCellArea);
    for (let rows = 1; maxColumns > 0; rows++) {
      let columns = 0;
      while (columns < maxColumns && keys.has(`${col + columns}:${row + rows - 1}`)) columns++;
      maxColumns = columns;
      for (let count = 1; count <= columns; count++) {
        const availableWidth = count * cellWidth * edgeGap;
        const availableDepth = rows * cellDepth * edgeGap;
        const area = availableWidth * availableDepth * POLYGON_AREA_FRACTION;
        const coverageLoss = area >= targetArea - 1e-9 ? 0 : 1 - area / targetArea;
        const scale = Math.min(1, Math.sqrt(targetArea / area));
        const x = x0 + count * cellWidth / 2;
        const z = z0 + rows * cellDepth / 2;
        const aspectPenalty = Math.abs(Math.log(availableWidth / availableDepth / 1.15));
        const distance = Math.hypot(x - centerX, z - centerZ);
        const total = aspectPenalty * .25 + distance * .023;
        if (coverageLoss < best.coverageLoss ||
          (coverageLoss === best.coverageLoss && total < best.total)) {
          best = { coverageLoss, total, x, z, width: availableWidth * scale, depth: availableDepth * scale,
            col, row, columns: count, rows };
        }
      }
    }
  }

  return best;
}

function buildFootprints(cells: readonly ZoneCell[], x: number, z: number, hectares: number) {
  // One hectare is 10,000 m². World scale applies to both axes.
  let area = 10_000 * hectares * WORLD_UNITS_PER_METER ** 2;
  let remaining = cells;
  const footprints: PlotFootprint[] = [];
  while (area > 1e-8 && remaining.length) {
    const rect = findFootprint(remaining, x, z, area);
    const { col, row, columns, rows } = rect;
    footprints.push(seatFootprint(rect.x, rect.z, rect.width, rect.depth));
    area -= footprintArea(footprints[footprints.length - 1]!);
    remaining = remaining.filter((cell) => cell.col < col || cell.col >= col + columns ||
      cell.row < row || cell.row >= row + rows);
  }
  return footprints;
}

/** Give facilities on a shared parcel adjacent slots along its longer side. */
export function facilityFootprint(footprint: PlotFootprint, slot: -1 | 0 | 1) {
  if (slot === 0) return footprint;
  const { x, z, width, depth } = footprint;
  return width >= depth
    ? seatFootprint(x + slot * width / 4, z, width * .5, depth)
    : seatFootprint(x, z + slot * depth / 4, width, depth * .5);
}

export interface SceneLayout {
  zones: ZonePlacement[];
  petak: Map<string, PetakPlacement>;
}

function zoneIndexAt(mdpl: number, zones: readonly Zona[]): number {
  for (let index = 0; index < zones.length; index += 1) {
    const zone = zones[index];
    if (zone && mdpl < zone.mdplMax) return index;
  }
  return Math.max(0, zones.length - 1);
}

function zoneIdAt(x: number, z: number, zones: readonly Zona[]): string | null {
  const zone = zones[zoneIndexAt(terrainMdplAt(x, z), zones)];
  return zone?.id ?? null;
}

function insideVillage(x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = VILLAGE_BOUNDARY.length - 1; i < VILLAGE_BOUNDARY.length; j = i++) {
    const a = VILLAGE_BOUNDARY[i];
    const b = VILLAGE_BOUNDARY[j];
    if (!a || !b) continue;
    const intersects =
      a[1] > z !== b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function cellKey(cell: Pick<ZoneCell, 'col' | 'row'>): string {
  return `${cell.col},${cell.row}`;
}

function buildZoneCells(zones: readonly Zona[]) {
  const byZone = new Map<string, ZoneCell[]>();
  const cellZone = new Map<string, string>();
  const stepX = MAP_WIDTH / ZONE_COLS;
  const stepZ = MAP_DEPTH / ZONE_ROWS;

  const cellRadius = Math.hypot(stepX, stepZ) / 2;
  for (let row = 0; row < ZONE_ROWS; row += 1) {
    const z0 = -MAP_DEPTH / 2 + row * stepZ;
    const z1 = z0 + stepZ;
    for (let col = 0; col < ZONE_COLS; col += 1) {
      const x0 = -MAP_WIDTH / 2 + col * stepX;
      const x1 = x0 + stepX;
      if (!insideVillage((x0 + x1) / 2, (z0 + z1) / 2)) continue;
      const x = (x0 + x1) / 2;
      const z = (z0 + z1) / 2;
      if (!hasRiverClearance(x, z, cellRadius + .14) ||
          roadEdgeDistance(x, z, cellRadius + .08) <= cellRadius + .08) continue;
      const zoneId = zoneIdAt((x0 + x1) / 2, (z0 + z1) / 2, zones);
      if (!zoneId) continue;

      const cells = byZone.get(zoneId) ?? [];
      cells.push({ x0, z0, x1, z1, col, row });
      byZone.set(zoneId, cells);
      cellZone.set(`${col},${row}`, zoneId);
    }
  }

  const boundaries = new Map<string, ZoneSegment[]>();
  for (let row = 0; row < ZONE_ROWS; row += 1) {
    const z0 = -MAP_DEPTH / 2 + row * stepZ;
    const z1 = z0 + stepZ;
    for (let col = 0; col < ZONE_COLS; col += 1) {
      const x0 = -MAP_WIDTH / 2 + col * stepX;
      const x1 = x0 + stepX;
      const zoneId = cellZone.get(`${col},${row}`);
      if (!zoneId) continue;

      const segments = boundaries.get(zoneId) ?? [];
      const add = (nx: number, nz: number, segment: ZoneSegment) => {
        if (nx < 0 || nx >= ZONE_COLS || nz < 0 || nz >= ZONE_ROWS) return;
        if (cellZone.get(`${nx},${nz}`) !== zoneId) segments.push(segment);
      };

      add(col, row - 1, { x1: x0, z1: z0, x2: x1, z2: z0 });
      add(col + 1, row, { x1: x1, z1: z0, x2: x1, z2: z1 });
      add(col, row + 1, { x1: x1, z1: z1, x2: x0, z2: z1 });
      add(col - 1, row, { x1: x0, z1: z1, x2: x0, z2: z0 });
      boundaries.set(zoneId, segments);
    }
  }

  return { byZone, boundaries };
}

function partitionZone(
  zone: ZonePlacement,
  rows: readonly Petak[],
): Map<string, ZoneCell[]> {
  const cells = zone.cells;
  const assigned = new Map<string, ZoneCell[]>();
  if (cells.length === 0 || rows.length === 0) return assigned;
  if (rows.length === 1 && rows[0]) {
    assigned.set(rows[0].id, [...cells]);
    return assigned;
  }

  const total = cells.length;
  const weights = rows.map((row) => Math.max(0.1, row.luasHa));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const counts = weights.map((weight) => Math.max(1, Math.round((total * weight) / weightSum)));
  let difference = total - counts.reduce((sum, value) => sum + value, 0);
  while (difference > 0) {
    const index = weights.indexOf(Math.max(...weights));
    counts[index] = (counts[index] ?? 1) + 1;
    difference -= 1;
  }
  while (difference < 0) {
    const index = counts.findIndex((count) => count > 1);
    if (index < 0) break;
    counts[index] = (counts[index] ?? 1) - 1;
    difference += 1;
  }

  const center = cells.reduce(
    (best, cell) => {
      const x = (cell.x0 + cell.x1) / 2;
      const z = (cell.z0 + cell.z1) / 2;
      const distance = (x - zone.centerX) ** 2 + (z - zone.centerZ) ** 2;
      return distance < best.distance ? { cell, distance } : best;
    },
    { cell: cells[0]!, distance: Number.POSITIVE_INFINITY },
  ).cell;

  const seeds: ZoneCell[] = [center];
  while (seeds.length < rows.length) {
    let best: { cell: ZoneCell; distance: number } | null = null;
    for (const cell of cells) {
      if (seeds.includes(cell)) continue;
      const x = (cell.x0 + cell.x1) / 2;
      const z = (cell.z0 + cell.z1) / 2;
      const distance = Math.min(
        ...seeds.map((seed) => {
          const sx = (seed.x0 + seed.x1) / 2;
          const sz = (seed.z0 + seed.z1) / 2;
          return (x - sx) ** 2 + (z - sz) ** 2;
        }),
      );
      if (!best || distance > best.distance) best = { cell, distance };
    }
    if (!best) break;
    seeds.push(best.cell);
  }

  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const owners = new Map<string, number>();
  const queues = seeds.map((seed, index) => {
    owners.set(cellKey(seed), index);
    return [seed];
  });
  const heads = seeds.map(() => 0);
  const sizes = seeds.map(() => 1);
  let remaining = total - seeds.length;

  const neighbours = (cell: ZoneCell): ZoneCell[] =>
    [
      byKey.get(cellKey({ col: cell.col - 1, row: cell.row })),
      byKey.get(cellKey({ col: cell.col + 1, row: cell.row })),
      byKey.get(cellKey({ col: cell.col, row: cell.row - 1 })),
      byKey.get(cellKey({ col: cell.col, row: cell.row + 1 })),
    ].filter((row): row is ZoneCell => row !== undefined);

  while (remaining > 0) {
    let progressed = false;
    for (let index = 0; index < queues.length; index += 1) {
      const queue = queues[index]!;
      const target = counts[index] ?? 1;
      while ((sizes[index] ?? 0) < target && (heads[index] ?? 0) < queue.length) {
        const cell = queue[heads[index]!]!;
        heads[index] = (heads[index] ?? 0) + 1;
        for (const neighbour of neighbours(cell)) {
          const key = cellKey(neighbour);
          if (owners.has(key)) continue;
          owners.set(key, index);
          sizes[index] = (sizes[index] ?? 0) + 1;
          queue.push(neighbour);
          remaining -= 1;
          progressed = true;
          break;
        }
        if ((sizes[index] ?? 0) >= target) break;
      }
    }

    if (!progressed) {
      const index = sizes.reduce(
        (best, size, current) =>
          (counts[current] ?? 1) - size > (counts[best] ?? 1) - (sizes[best] ?? 0)
            ? current
            : best,
        0,
      );
      const free = cells.find((cell) => !owners.has(cellKey(cell)));
      if (!free) break;
      owners.set(cellKey(free), index);
      sizes[index] = (sizes[index] ?? 0) + 1;
      queues[index]?.push(free);
      remaining -= 1;
    }
  }

  for (const [index, row] of rows.entries()) {
    assigned.set(
      row.id,
      cells.filter((cell) => owners.get(cellKey(cell)) === index),
    );
  }
  return assigned;
}

/**
 * Zones come from DEM elevation bands clipped to the OSM village boundary.
 * Every zone cell is assigned to one petak, so the petak surface fills the
 * zone instead of sitting inside a fixed rectangle.
 */
export function buildLayout(data: SeedData): SceneLayout {
  const { byZone, boundaries } = buildZoneCells(data.zona);
  const zones = data.zona.map((zona): ZonePlacement => {
    const cells = byZone.get(zona.id) ?? [];
    if (cells.length === 0) {
      return {
        zona,
        cells,
        boundary: [],
        centerX: 0,
        centerZ: 0,
        span: 1,
        topY: 0,
      };
    }

    const minX = Math.min(...cells.map((cell) => cell.x0));
    const maxX = Math.max(...cells.map((cell) => cell.x1));
    const minZ = Math.min(...cells.map((cell) => cell.z0));
    const maxZ = Math.max(...cells.map((cell) => cell.z1));
    const averageX =
      cells.reduce((sum, cell) => sum + (cell.x0 + cell.x1) / 2, 0) / cells.length;
    const averageZ =
      cells.reduce((sum, cell) => sum + (cell.z0 + cell.z1) / 2, 0) / cells.length;
    const center = cells.reduce(
      (best, cell) => {
        const x = (cell.x0 + cell.x1) / 2;
        const z = (cell.z0 + cell.z1) / 2;
        const distance = (x - averageX) ** 2 + (z - averageZ) ** 2;
        return distance < best.distance ? { x, z, distance } : best;
      },
      { x: averageX, z: averageZ, distance: Number.POSITIVE_INFINITY },
    );

    return {
      zona,
      cells,
      boundary: boundaries.get(zona.id) ?? [],
      centerX: center.x,
      centerZ: center.z,
      span: Math.max(maxX - minX, maxZ - minZ),
      topY: terrainYAt(center.x, center.z) + 0.15,
    };
  });

  const petak = new Map<string, PetakPlacement>();
  for (const zone of zones) {
    const rows = data.petak
      .filter((row) => row.zonaId === zone.zona.id)
      .sort((left, right) => right.luasHa - left.luasHa);
    const assigned = partitionZone(zone, rows);
    for (const row of rows) {
      const cells = assigned.get(row.id) ?? [];
      if (cells.length === 0) continue;
      const minX = Math.min(...cells.map((cell) => cell.x0));
      const maxX = Math.max(...cells.map((cell) => cell.x1));
      const minZ = Math.min(...cells.map((cell) => cell.z0));
      const maxZ = Math.max(...cells.map((cell) => cell.z1));
      const midX = (minX + maxX) / 2;
      const midZ = (minZ + maxZ) / 2;
      const center = cells.reduce((best, cell) => {
        const distance = ({ x0, x1, z0, z1 }: ZoneCell) =>
          Math.hypot((x0 + x1) / 2 - midX, (z0 + z1) / 2 - midZ);
        return distance(cell) < distance(best) ? cell : best;
      });
      const x = (center.x0 + center.x1) / 2;
      const z = (center.z0 + center.z1) / 2;
      petak.set(row.id, {
        petak: row,
        footprints: buildFootprints(cells, x, z, row.luasHa),
        cells,
        x,
        z,
        topY: terrainYAt(x, z) + 0.28,
        width: Math.max(1.2, maxX - minX),
        depth: Math.max(1.2, maxZ - minZ),
      });
    }
  }

  return { zones, petak };
}

const marketSite = { x: 27, z: 16.5 };
export const PASAR_POSITION = [marketSite, ...Array.from({ length: 8 }, (_, i) => i + 1)
  .flatMap((distance) => Array.from({ length: 16 }, (_, bearing) => ({
    x: marketSite.x + Math.cos(bearing * Math.PI / 8) * distance,
    z: marketSite.z + Math.sin(bearing * Math.PI / 8) * distance,
  })))]
  .find(({ x, z }) => hasRiverClearance(x, z, 2.7) && roadEdgeDistance(x, z, 2.7) > 2.7) ?? marketSite;
