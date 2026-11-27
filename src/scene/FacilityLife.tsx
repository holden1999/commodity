import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { JenisTernak } from '../types.js';

export function FishSchool({ width, depth }: { width: number; depth: number }) {
  const fish = useRef<Group>(null);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    fish.current?.children.forEach((body, i) => {
      const angle = time * (.7 + i * .1) + i * 2.7;
      body.position.set(Math.cos(angle) * width * (.2 + i * .025),
        .025 + Math.sin(angle * 2) * .013, Math.sin(angle) * depth * .32);
      body.rotation.y = -angle - Math.PI / 2;
    });
  });
  return (
    <group ref={fish}>
      {[0, 1, 2].map((i) => (
        <group key={i} scale={1 - i * .12}>
          <mesh scale={[.19, .04, .087]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={i === 1 ? '#c17a45' : '#345c65'} />
          </mesh>
          <mesh position-x={-.18} rotation-z={-Math.PI / 2} scale={[1, 1, .3]}>
            <coneGeometry args={[.064, .1, 3]} />
            <meshStandardMaterial color="#55787e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Aerator() {
  const bubbles = useRef<Group>(null);
  useFrame(({ clock }) => {
    bubbles.current?.children.forEach((bubble, i) => {
      const rise = (clock.elapsedTime * .85 + i / 6) % 1;
      bubble.position.set(Math.sin(i * 4 + rise) * (.04 + rise * .11),
        rise * .29, Math.cos(i * 4 + rise) * (.04 + rise * .11));
      bubble.scale.setScalar(1 - rise * .43);
    });
  });
  return (
    <group ref={bubbles}>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[.043, 6, 4]} />
          <meshBasicMaterial color="#d4f5f5" transparent opacity={.72} />
        </mesh>
      ))}
    </group>
  );
}

export function PenAnimals({ jenis, count, width, depth, color, ground }: {
  jenis: JenisTernak; count: number; width: number; depth: number; color: string; ground: (x: number, z: number) => number;
}) {
  const herd = useRef<Group>(null);
  const bird = jenis === 'Ayam' || jenis === 'Itik';
  const cow = jenis === 'Sapi';
  const legs = bird ? [-.07, .07].map((z) => [0, z]) :
    [-.12, .12].flatMap((x) => [-.077, .077].map((z) => [x, z]));
  useFrame(({ clock }) => {
    herd.current?.children.forEach((animal, i) => {
      const angle = clock.elapsedTime * (.43 + i * .06) + i * Math.PI * 2 / count;
      const x = Math.cos(angle) * width * .34;
      const z = Math.sin(angle) * depth * .34;
      animal.position.set(x, ground(x, z) + .045 +
        (bird ? Math.abs(Math.sin(angle * 13)) * .025 : 0), z);
      animal.rotation.y = -angle - Math.PI / 2;
    });
  });
  return (
    <group ref={herd}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} scale={cow ? 1.21 : bird ? .72 : .94}>
          <mesh position-y={.18} scale={bird ? [.15, .112, .092] : [.204, .104, .112]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[bird ? .10 : .21, .29, 0]} scale={[.087, .083, .072]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {bird ? <>
            <mesh position={[.177, .29, 0]} rotation-z={-Math.PI / 2}>
              <coneGeometry args={[.036, .071, 4]} />
              <meshStandardMaterial color="#e4a344" />
            </mesh>
            {jenis === 'Ayam' && <mesh position={[.102, .369, 0]}>
              <boxGeometry args={[.052, .041, .024]} />
              <meshStandardMaterial color="#b84e36" />
            </mesh>}
          </> : [-.055, .055].map((z) => (
            <mesh key={z} position={[.208, .374, z]} rotation-x={z * 8}>
              <coneGeometry args={[.022, cow ? .068 : .105, 5]} />
              <meshStandardMaterial color="#e3d7bb" />
            </mesh>
          ))}
          {legs.map(([x, z], leg) => (
            <mesh key={leg} position={[x!, .076, z!]}>
              <boxGeometry args={bird ? [.021, .141, .023] : [.043, .148, .041]} />
              <meshStandardMaterial color={bird ? '#bc8646' : '#524131'} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
