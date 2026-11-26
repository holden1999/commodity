import type { Petak, SeedData, Zona } from '../types.js';

export const MAP_WIDTH = 84;
export const MAP_DEPTH = 72;
export const ZONE_WIDTH = 50;
export const ZONE_DEPTH = 11.5;
export const TARGET_Y = 4;

const BASE_MDPL = 200;
const ELEVATION_SCALE = 0.05;
const TERRACE_HEIGHT = 0.45;

const ZONE_CENTERS: Record<string, number> = {
  'zona-1': 18,
  'zona-2': 6,
  'zona-3': -6,
  'zona-4': -18,
};

export interface ZonePlacement {
  zona: Zona;
  centerZ: number;
  width: number;
  depth: number;
  baseY: number;
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

/**
 * The seed has no parcel coordinates. Place each petak inside its zona in a
 * deterministic grid, then lift it by the zona floor plus its own mdpl.
 */
export function buildLayout(data: SeedData): SceneLayout {
  const zones = data.zona.map((zona, index): ZonePlacement => {
    const baseY = (zona.mdplMin - BASE_MDPL) * ELEVATION_SCALE;
    return {
      zona,
      centerZ: ZONE_CENTERS[zona.id] ?? 18 - index * 12,
      width: ZONE_WIDTH,
      depth: ZONE_DEPTH,
      baseY,
      topY: baseY + TERRACE_HEIGHT,
    };
  });

  const petak = new Map<string, PetakPlacement>();

  for (const zone of zones) {
    const rows = data.petak.filter((row) => row.zonaId === zone.zona.id);
    const count = rows.length;
    if (count === 0) continue;

    const cols = count <= 4 ? 2 : count === 6 ? 3 : 4;
    const rowCount = Math.ceil(count / cols);
    const width = count <= 4 ? 9 : count === 6 ? 8 : 7;
    const depth = 3.4;
    const gapX = 1.8;
    const gapZ = 2.0;

    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const itemsInRow = Math.min(cols, count - row * cols);
      const petakRow = rows[index];
      if (!petakRow) continue;

      const x = (col - (itemsInRow - 1) / 2) * (width + gapX);
      const z = zone.centerZ + (row - (rowCount - 1) / 2) * (depth + gapZ);
      const lift = (petakRow.mdpl - zone.zona.mdplMin) * 0.008;

      petak.set(petakRow.id, {
        petak: petakRow,
        x,
        z,
        topY: zone.topY + 0.28 + lift,
        width,
        depth,
      });
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
