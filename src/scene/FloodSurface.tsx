import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LiveState } from '../logic/types.js';
import type { WaterLevel } from './CropPlot.js';
import type { SceneLayout } from './layout.js';
import { terrainYAt } from './terrainField.js';

export function FloodSurface({ layout, flooded, water }: {
  layout: SceneLayout; flooded: LiveState['floodedPetak']; water: WaterLevel;
}) {
  const surface = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (const id of Object.keys(flooded ?? {})) {
      for (const { x0, x1, z0, z1 } of layout.petak.get(id)?.cells ?? []) {
        const point = (x: number, z: number) => [x, terrainYAt(x, z), z];
        const nw = point(x0, z0);
        const ne = point(x1, z0);
        const sw = point(x0, z1);
        const se = point(x1, z1);
        positions.push(...nw, ...sw, ...ne, ...ne, ...sw, ...se);
      }
    }
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return mesh;
  }, [layout, flooded]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (surface.current) surface.current.position.y = .16 + water.current * .12;
  });

  if (!geometry.attributes.position?.count) return null;
  return (
    <mesh geometry={geometry} ref={surface} raycast={() => {}}>
      <meshBasicMaterial color="#799ca9" transparent opacity={.5} depthWrite={false} />
    </mesh>
  );
}
