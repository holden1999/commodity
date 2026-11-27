import { ROADS } from './mapData.js';

const square = 4;
const key = (x: number, z: number) => `${x}:${z}`;
const cells = new Map<string, { x: number; z: number; dx: number; dz: number; length2: number; half: number }[]>();
for (const road of ROADS) {
  if (road.tunnel) continue;
  for (let i = 1; i < road.points.length; i++) {
    const [x, z] = road.points[i - 1]!;
    const [bx, bz] = road.points[i]!;
    const dx = bx - x;
    const dz = bz - z;
    if (dx === 0 && dz === 0) continue;
    const segment = { x, z, dx, dz, length2: dx * dx + dz * dz, half: road.width / 2 };
    for (let ix = Math.floor((Math.min(x, bx) - segment.half) / square);
      ix <= Math.floor((Math.max(x, bx) + segment.half) / square); ix++) {
      for (let iz = Math.floor((Math.min(z, bz) - segment.half) / square);
        iz <= Math.floor((Math.max(z, bz) + segment.half) / square); iz++) {
        const id = key(ix, iz);
        const bucket = cells.get(id) ?? [];
        bucket.push(segment);
        cells.set(id, bucket);
      }
    }
  }
}

export function roadEdgeDistance(x: number, z: number, searchRadius = 4) {
  let best = Infinity;
  for (let ix = Math.floor((x - searchRadius) / square); ix <= Math.floor((x + searchRadius) / square); ix++) {
    for (let iz = Math.floor((z - searchRadius) / square); iz <= Math.floor((z + searchRadius) / square); iz++) {
      for (const segment of cells.get(key(ix, iz)) ?? []) {
        const { dx, dz, length2, half } = segment;
        const ax = x - segment.x;
        const az = z - segment.z;
        const t = Math.max(0, Math.min(1, (ax * dx + az * dz) / length2));
        best = Math.min(best, Math.hypot(ax - t * dx, az - t * dz) - half);
      }
    }
  }
  return best;
}
