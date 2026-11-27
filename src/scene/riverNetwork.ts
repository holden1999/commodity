import { CatmullRomCurve3, Vector3 } from 'three';
import { RIVERS, type MapRiver } from './mapData.js';
import { MAPPED_REACHES, MAPPED_WATERWAYS, MAPPED_BANKS } from './osmCiapus.js';
import { terrainYAt } from './terrainField.js';

type Point = readonly [number, number];
type SceneRiver = MapRiver & { outlet?: boolean };

// The generated reaches share an endpoint. Route the visible junction through
// the nearby lower DEM basin and continue the joined reach to the map edge.
export const HILIR: Point = [24.75, -31.9];
const outletEnd: Point = [24.0, -36];
const outletStartY = terrainYAt(...HILIR);
const cisadane = RIVERS.find(({ id }) => id === 'cisadane')!;

const routes: readonly SceneRiver[] = [
  ...RIVERS.map((sceneRiver) => {
    const river = { ...sceneRiver, points: MAPPED_REACHES[sceneRiver.id] ?? sceneRiver.points };
    if (river.id === 'cisadane') return { ...river, points: [...river.points.slice(0, -4), HILIR] };
    if (river.id === 'cisindangbarang') return { ...river, points: [HILIR, ...river.points.slice(3)] };
    return river;
  }),
  ...MAPPED_WATERWAYS,
  {
    ...cisadane,
    points: [HILIR, outletEnd],
    width: 3.35,
    showLabel: false,
    outlet: true,
  },
];

export const riverWaterWidth = (river: MapRiver) => river.width * .34;
export const riverBankWidth = (river: MapRiver) => riverWaterWidth(river) + .55;

export const sceneRivers = routes.map((river) => {
  if (!river.outlet) return river;
  const points = new CatmullRomCurve3(river.points.map(([x, z]) => new Vector3(x, 0, z)))
    .getPoints(16).map(({ x, z }): Point => [x, z]);
  return { ...river, points };
});

function nearestOnSegment(x: number, z: number, [ax, az]: Point, [bx, bz]: Point) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  const vx = ax + t * dx - x;
  const vz = az + t * dz - z;
  return { x: vx, z: vz, t, distance: Math.hypot(vx, vz) };
}

const outletProjection = (x: number, z: number) => nearestOnSegment(x, z, HILIR, outletEnd);
export const outletGrade = (x: number, z: number) => outletStartY - .13 * outletProjection(x, z).t;

export function channelTerrainYAt(x: number, z: number) {
  const original = terrainYAt(x, z);
  const { distance, t } = outletProjection(x, z);
  if (distance > 1.6 || t === 0) return original;
  const bankBlend = Math.min(1, (1.6 - distance) / .65);
  const depth = Math.max(0, original - (outletGrade(x, z) + .045));
  return original - depth * bankBlend;
}

export function towardRiver(x: number, z: number) {
  let nearest = { x: 0, z: 0, distance: Infinity };
  for (const river of sceneRivers) {
    for (let i = 1; i < river.points.length; i++) {
      const candidate = nearestOnSegment(x, z, river.points[i - 1]!, river.points[i]!);
      if (candidate.distance < nearest.distance) nearest = candidate;
    }
  }
  return nearest;
}

function insideRing(x: number, z: number, ring: readonly Point[]) {
  let inside = false;
  for (let i = 1; i < ring.length; i++) {
    const [ax, az] = ring[i - 1]!;
    const [bx, bz] = ring[i]!;
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

export function hasRiverClearance(x: number, z: number, radius: number) {
  for (const bank of MAPPED_BANKS) {
    if (insideRing(x, z, bank.outer) && !bank.holes.some((ring) => insideRing(x, z, ring))) return false;
    for (const ring of [bank.outer, ...bank.holes]) {
      for (let i = 1; i < ring.length; i++) {
        if (nearestOnSegment(x, z, ring[i - 1]!, ring[i]!).distance <= radius) return false;
      }
    }
  }
  for (const river of sceneRivers) {
    const clearance = riverBankWidth(river) / 2 + radius;
    for (let i = 1; i < river.points.length; i++) {
      const a = river.points[i - 1]!;
      const b = river.points[i]!;
      if (x < Math.min(a[0], b[0]) - clearance || x > Math.max(a[0], b[0]) + clearance ||
          z < Math.min(a[1], b[1]) - clearance || z > Math.max(a[1], b[1]) + clearance) continue;
      if (nearestOnSegment(x, z, a, b).distance <= clearance) return false;
    }
  }
  return true;
}
