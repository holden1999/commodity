import { TERRAIN_BOUNDS, TERRAIN_ELEVATION } from './terrainData.js';

/** World size of the map. x spans [-MAP_WIDTH/2, MAP_WIDTH/2]. */
export const MAP_WIDTH = 84;
export const MAP_DEPTH = 72;
export const TARGET_Y = 4;

export const TERRAIN_MIN_MDPL = Math.min(...TERRAIN_ELEVATION);
export const TERRAIN_MAX_MDPL = Math.max(...TERRAIN_ELEVATION);
export const TERRAIN_Y_MAX = 10;

/**
 * The DEM grid covers 207-261 mdpl, while the seed zone bands span 200-325.
 * Stretch the local relief into the seed range so zone bands keep the real
 * terrain shape without inventing a second terrain surface.
 */
export const ZONE_MDPL_MIN = 200;
export const ZONE_MDPL_MAX = 325;

const { south, west, north, east, cols, rows } = TERRAIN_BOUNDS;
const centerLat = (south + north) / 2;
const centerLon = (west + east) / 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Bilinear sample of the 20x20 SRTM grid. */
export function sampleElevation(x: number, z: number): number {
  const lon = centerLon + (x / MAP_WIDTH) * (east - west);
  const lat = centerLat - (z / MAP_DEPTH) * (north - south);
  const col = clamp(((lon - west) / (east - west)) * (cols - 1), 0, cols - 1);
  const row = clamp(((lat - south) / (north - south)) * (rows - 1), 0, rows - 1);
  const c0 = Math.floor(col);
  const r0 = Math.floor(row);
  const c1 = Math.min(c0 + 1, cols - 1);
  const r1 = Math.min(r0 + 1, rows - 1);
  const tx = col - c0;
  const ty = row - r0;

  const at = (r: number, c: number) =>
    TERRAIN_ELEVATION[r * cols + c] ?? TERRAIN_MIN_MDPL;
  const top = at(r0, c0) * (1 - tx) + at(r0, c1) * tx;
  const bottom = at(r1, c0) * (1 - tx) + at(r1, c1) * tx;
  return top * (1 - ty) + bottom * ty;
}

export function terrainYAt(x: number, z: number): number {
  const normalized =
    (sampleElevation(x, z) - TERRAIN_MIN_MDPL) /
    (TERRAIN_MAX_MDPL - TERRAIN_MIN_MDPL);
  return normalized * TERRAIN_Y_MAX;
}

/** DEM elevation expressed in the seed's 200-325 mdpl banding. */
export function terrainMdplAt(x: number, z: number): number {
  const t = clamp(
    (sampleElevation(x, z) - TERRAIN_MIN_MDPL) /
      (TERRAIN_MAX_MDPL - TERRAIN_MIN_MDPL),
    0,
    1,
  );
  return ZONE_MDPL_MIN + t * (ZONE_MDPL_MAX - ZONE_MDPL_MIN);
}
