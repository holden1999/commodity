import type { Petak, SeedData, Zona } from '../types.js';
import { MAP_DEPTH, MAP_WIDTH, terrainMdplAt, terrainYAt } from './terrainField.js';

const ZONE_COLS = 42;
const ZONE_ROWS = 36;
const AREA_PER_HA = 24;
const GAP = 0.9;

export interface ZoneCell {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
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

export interface PetakPlacement {
  petak: Petak;
  x: number;
  z: number;
  topY: number;
  width: number;
  depth: number;
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

function buildZoneCells(zones: readonly Zona[]) {
  const byZone = new Map<string, ZoneCell[]>();
  const cellZone = new Map<string, string>();
  const stepX = MAP_WIDTH / ZONE_COLS;
  const stepZ = MAP_DEPTH / ZONE_ROWS;

  for (let row = 0; row < ZONE_ROWS; row += 1) {
    const z0 = -MAP_DEPTH / 2 + row * stepZ;
    const z1 = z0 + stepZ;
    for (let col = 0; col < ZONE_COLS; col += 1) {
      const x0 = -MAP_WIDTH / 2 + col * stepX;
      const x1 = x0 + stepX;
      const zoneId = zoneIdAt((x0 + x1) / 2, (z0 + z1) / 2, zones);
      if (!zoneId) continue;

      const cells = byZone.get(zoneId) ?? [];
      cells.push({ x0, z0, x1, z1 });
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

function insideZone(
  x: number,
  z: number,
  width: number,
  depth: number,
  zoneId: string,
  zones: readonly Zona[],
): boolean {
  const halfW = width / 2;
  const halfD = depth / 2;
  if (Math.abs(x) + halfW > MAP_WIDTH / 2) return false;
  if (Math.abs(z) + halfD > MAP_DEPTH / 2) return false;

  return [
    [x, z],
    [x - halfW, z - halfD],
    [x, z - halfD],
    [x + halfW, z - halfD],
    [x - halfW, z],
    [x + halfW, z],
    [x - halfW, z + halfD],
    [x, z + halfD],
    [x + halfW, z + halfD],
  ].every(([px, pz]) => zoneIdAt(px ?? 0, pz ?? 0, zones) === zoneId);
}

function overlaps(
  x: number,
  z: number,
  width: number,
  depth: number,
  placed: readonly PetakPlacement[],
): boolean {
  return placed.some(
    (row) =>
      Math.abs(x - row.x) < (width + row.width) / 2 + GAP &&
      Math.abs(z - row.z) < (depth + row.depth) / 2 + GAP,
  );
}

function plotSize(petak: Petak): { width: number; depth: number } {
  const area = Math.max(7, petak.luasHa * AREA_PER_HA);
  let width = Math.min(10, Math.sqrt(area * 1.35));
  let depth = Math.max(2.2, area / width);
  if (depth > 8) {
    depth = 8;
    width = Math.min(10, area / depth);
  }
  return { width, depth };
}

/**
 * Zones come from the DEM: each cell is assigned to the elevation band that
 * contains its real terrain elevation. Plots are packed inside those cells,
 * so one zone can hold several plot sizes instead of one fixed grid.
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
      cells.reduce((sum, cell) => sum + (cell.x0 + cell.x1) / 2, 0) /
      cells.length;
    const averageZ =
      cells.reduce((sum, cell) => sum + (cell.z0 + cell.z1) / 2, 0) /
      cells.length;

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
    const candidates = zone.cells
      .map((cell) => ({
        x: (cell.x0 + cell.x1) / 2,
        z: (cell.z0 + cell.z1) / 2,
      }))
      .sort(
        (left, right) =>
          (left.x - zone.centerX) ** 2 +
          (left.z - zone.centerZ) ** 2 -
          ((right.x - zone.centerX) ** 2 + (right.z - zone.centerZ) ** 2),
      );
    const placed: PetakPlacement[] = [];

    for (const row of rows) {
      const base = plotSize(row);
      let found: PetakPlacement | null = null;

      for (let shrink = 1; shrink >= 0.58 && !found; shrink -= 0.06) {
        const width = base.width * shrink;
        const depth = base.depth * shrink;
        for (const swap of [false, true]) {
          const candidateWidth = swap ? depth : width;
          const candidateDepth = swap ? width : depth;
          for (const candidate of candidates) {
            if (
              insideZone(
                candidate.x,
                candidate.z,
                candidateWidth,
                candidateDepth,
                zone.zona.id,
                data.zona,
              ) &&
              !overlaps(candidate.x, candidate.z, candidateWidth, candidateDepth, placed)
            ) {
              found = {
                petak: row,
                x: candidate.x,
                z: candidate.z,
                topY: terrainYAt(candidate.x, candidate.z) + 0.28,
                width: candidateWidth,
                depth: candidateDepth,
              };
              break;
            }
          }
          if (found) break;
        }
      }

      if (!found) {
        const width = base.width * 0.5;
        const depth = base.depth * 0.5;
        found = {
          petak: row,
          x: zone.centerX,
          z: zone.centerZ,
          topY: terrainYAt(zone.centerX, zone.centerZ) + 0.28,
          width,
          depth,
        };
      }

      placed.push(found);
      petak.set(row.id, found);
    }
  }

  return { zones, petak };
}

export const PASAR_POSITION = { x: 27, z: 16.5 };

export const TREE_POSITIONS: readonly [number, number][] = [
  [-30, 24],
  [-33, 12],
  [-31, 1],
  [-33.5, -13],
  [-29, -25],
  [30, 24],
  [33, 13],
  [31, 2],
  [33.5, -13],
  [29, -25],
  [-14, 24.5],
  [13, 24.5],
  [-22, -27],
  [21, -27],
];
