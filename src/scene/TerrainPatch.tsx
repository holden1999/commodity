import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { LocalPoint } from './layout.js';
import { terrainYAt } from './terrainField.js';

export function polygonSurfaceGeometry(outline: readonly LocalPoint[]) {
  const edge = outline.flatMap(([ax, az], i) => {
    const [bx, bz] = outline[(i + 1) % outline.length]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / .35));
    return Array.from({ length: steps }, (_, j) =>
      [ax + (bx - ax) * j / steps, az + (bz - az) * j / steps] as const);
  });
  const rings = Math.max(1, Math.ceil(Math.max(...edge.map(([x, z]) => Math.hypot(x, z))) / .35));
  const points = [0, 0, 0];
  const indices: number[] = [];
  for (let ring = 1; ring <= rings; ring++) {
    const offset = 1 + (ring - 1) * edge.length;
    edge.forEach(([x, z], i) => {
      points.push(x * ring / rings, 0, z * ring / rings);
      const current = offset + i;
      const next = offset + (i + 1) % edge.length;
      if (ring === 1) indices.push(0, next, current);
      else indices.push(current - edge.length, next, current, current - edge.length, next - edge.length, next);
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function TerrainPatch({ x, z, originY, width, depth, lift = .045, ridge = 0,
  color, roughness = .95, outline }: {
  x: number; z: number; originY: number; width: number; depth: number;
  outline?: readonly LocalPoint[];
  lift?: number; ridge?: number; color: THREE.ColorRepresentation; roughness?: number;
}) {
  const geometry = useMemo(() => {
    const floor = outline ? polygonSurfaceGeometry(outline) :
      new THREE.PlaneGeometry(width, depth,
        Math.ceil(width / .35), Math.max(ridge ? 4 : 1, Math.ceil(depth / .35))).rotateX(-Math.PI / 2);
    const vertices = floor.attributes.position!;
    for (let i = 0; i < vertices.count; i++) {
      const dx = vertices.getX(i);
      const dz = vertices.getZ(i);
      const profile = Math.max(0, 1 - (2 * dz / depth) ** 4);
      vertices.setY(i, terrainYAt(x + dx, z + dz) - originY + lift + ridge * profile);
    }
    floor.computeVertexNormals();
    return floor;
  }, [x, z, originY, width, depth, lift, ridge, outline]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}
