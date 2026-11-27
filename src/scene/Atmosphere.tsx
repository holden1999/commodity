import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { weatherConditions } from '../logic/environment.js';
import type { PetakPlacement } from './layout.js';
import { towardRiver } from './riverNetwork.js';
import { terrainYAt } from './terrainField.js';

const noRaycast = () => {};
type Conditions = ReturnType<typeof weatherConditions>;

export function Atmosphere({ conditions, morning, riverside }: {
  conditions: Conditions; morning: boolean; riverside: readonly PetakPlacement[];
}) {
  const mist = useMemo(() => {
    const size = 64;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        const radius = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
        pixels.set([218, 233, 236, 255 * Math.max(0, 1 - radius) ** 1.8], index);
      }
    }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);
  useEffect(() => () => mist.dispose(), [mist]);
  const mistSites = useMemo(() => riverside.filter(({ x, z }) => towardRiver(x, z).distance < 12),
    [riverside]);

  return (
    <>
      {conditions.rain ? <Precipitation rain wind={conditions.wind} /> :
        conditions.dry ? <Precipitation wind={conditions.wind} /> : null}
      {conditions.weather !== 'Cerah' && <StormClouds wind={conditions.wind} />}
      {morning && conditions.humidity >= 70 && mistSites.map(({ x, z, topY, petak }) => (
        <sprite key={petak.id} position={[x, topY + .65, z]} scale={[13, 3.6, 1]} raycast={noRaycast}>
          <spriteMaterial map={mist} transparent opacity={.54} depthWrite={false} />
        </sprite>
      ))}
    </>
  );
}

function StormClouds({ wind }: { wind: number }) {
  const clouds = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    const mesh = clouds.current;
    if (!mesh) return;
    const part = new THREE.Object3D();
    for (let i = 0; i < 21; i++) {
      const bank = Math.floor(i / 3);
      part.position.set(-39 + bank * 13 + (i % 3 - 1) * 2.7,
        13 + Math.sin(i * 3) * 1.1, -28 + Math.sin(bank * 2.6) * 9);
      part.scale.set(3.8, .85 + (i % 3) * .26, 2.6);
      part.updateMatrix();
      mesh.setMatrixAt(i, part.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.x = Math.sin(clock.elapsedTime * .13) * wind;
  });
  return (
    <group ref={group}>
      <instancedMesh ref={clouds} args={[undefined, undefined, 21]} raycast={noRaycast}>
        <icosahedronGeometry args={[1, 1]} />
        <meshLambertMaterial color="#aab5bb" flatShading />
      </instancedMesh>
    </group>
  );
}

function Precipitation({ rain = false, wind }: { rain?: boolean; wind: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = rain ? 1500 : 220;
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => {
    const seed = (n: number) => {
      const raw = Math.sin((i + 1) * n) * 43758.5453;
      return raw - Math.floor(raw);
    };
    const x = seed(12.989) * 87 - 43.5;
    const z = seed(36.77) * 74 - 37;
    return { x, z, floor: terrainYAt(x, z), phase: seed(78.233), speed: .7 + seed(8.38) * .6 };
  }), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const instances = mesh.current;
    if (!instances) return;
    const time = clock.elapsedTime;
    dummy.rotation.z = rain ? -wind * .035 : 0;
    for (let i = 0; i < particles.length; i++) {
      const { x, z, floor, phase, speed } = particles[i]!;
      const cycle = (phase + time * speed * (rain ? .62 : .16)) % 1;
      dummy.position.set(x + (rain ? cycle : Math.sin(cycle * Math.PI)) * wind * .55,
        floor + (rain ? (1 - cycle) * 14.5 : .18 + Math.sin(cycle * Math.PI) * .82), z);
      dummy.updateMatrix();
      instances.setMatrixAt(i, dummy.matrix);
    }
    instances.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh key={count} ref={mesh} args={[undefined, undefined, count]}
      frustumCulled={false} raycast={noRaycast}>
      <boxGeometry args={rain ? [.024, .47, .024] : [.08, .065, .08]} />
      <meshBasicMaterial color={rain ? '#c3e5fa' : '#dec296'} transparent
        opacity={rain ? .53 : .34} depthWrite={false} />
    </instancedMesh>
  );
}
