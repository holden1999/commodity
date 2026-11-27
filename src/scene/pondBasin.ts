import type { LocalPoint, PetakPlacement, PlotFootprint } from './layout.js';
import { facilityFootprint } from './layout.js';
import { channelTerrainYAt } from './riverNetwork.js';

export interface PondBasin {
  x: number;
  z: number;
  width: number;
  depth: number;
  rim: readonly LocalPoint[];
  floorY: number;
  footprint: PlotFootprint;
}

export const POND_FLOOR_SCALE = .72;

export function findPondBasin(placement: PetakPlacement, shared: boolean, round: boolean) {
  const footprints = placement.footprints.map((parent, i) => ({
    parent, site: shared && i === 0 ? facilityFootprint(parent, -1) : parent,
  }));
  const largest = Math.max(...footprints.map(({ site }) => site.width * site.depth));
  let lowest: PondBasin | undefined;
  let elevation = Infinity;
  for (const { parent, site } of footprints) {
    // Tiny leftover strips can be lower, but may not fit a useful pond.
    if (site.width * site.depth < largest * .55) continue;
    const width = site.width * .74;
    const depth = site.depth * .74;
    const rim = round
      ? Array.from({ length: 16 }, (_, i): LocalPoint => {
          const angle = i * Math.PI / 8;
          return [Math.cos(angle) * width / 2, Math.sin(angle) * depth / 2];
        })
      : site.outline.map(([x, z]): LocalPoint => [x * .74, z * .74]);
    for (const ox of [-.08, 0, .08]) {
      for (const oz of [-.08, 0, .08]) {
        const x = site.x + ox * site.width;
        const z = site.z + oz * site.depth;
        const ground = channelTerrainYAt(x, z);
        if (ground >= elevation) continue;
        const rimLow = Math.min(...rim.flatMap(([ax, az], i) => {
          const [bx, bz] = rim[(i + 1) % rim.length]!;
          const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / .12));
          return Array.from({ length: steps }, (_, step) => channelTerrainYAt(
            x + ax + (bx - ax) * step / steps, z + az + (bz - az) * step / steps));
        }));
        elevation = ground;
        lowest = { x, z, width, depth, rim, floorY: Math.min(ground, rimLow) - .42, footprint: parent };
      }
    }
  }
  return lowest;
}
