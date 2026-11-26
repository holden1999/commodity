import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seed } from '../data/index.js';
import type { TipeTransaksi } from '../types.js';
import { ROADS } from './mapData.js';
import { terrainYAt } from './terrainField.js';

const TYPE_COLORS: Record<TipeTransaksi, string> = {
  B2B: '#c88b42',
  B2C: '#5cb85c',
  C2C: '#3b9dcc',
};

interface LogisticsTrafficProps {
  rantaiPasokType: TipeTransaksi | 'Semua';
  selectedRantaiId: string | null;
  simPlaying: boolean;
  simSpeed: number;
  night: boolean;
}

interface VehicleSpec {
  id: string;
  tipe: TipeTransaksi;
  curve: THREE.CatmullRomCurve3;
  speed: number;
  phase: number;
  direction: 1 | -1;
}

/**
 * Animated low-poly delivery vehicles moving along OSM roads for active
 * rantaiPasok links, inspired by WareTrack's live logistics fleet.
 */
export function LogisticsTraffic({
  rantaiPasokType,
  selectedRantaiId,
  simPlaying,
  simSpeed,
  night,
}: LogisticsTrafficProps) {
  const curves = useMemo(() => {
    const usable = ROADS.filter((r) => r.points.length >= 3);
    return usable.map((road) => {
      const pts = road.points.map(
        ([x, z]) => new THREE.Vector3(x, terrainYAt(x, z) + 0.14, z),
      );
      return new THREE.CatmullRomCurve3(pts);
    });
  }, []);

  const vehicles = useMemo<VehicleSpec[]>(() => {
    if (curves.length === 0) return [];
    return seed.rantaiPasok
      .filter((row) => rantaiPasokType === 'Semua' || row.tipe === rantaiPasokType)
      .map((row, index) => {
        const curve = curves[index % curves.length]!;
        return {
          id: row.id,
          tipe: row.tipe,
          curve,
          speed: 0.032 + (index % 4) * 0.008,
          phase: (index * 0.23) % 1,
          direction: index % 2 === 0 ? 1 : -1,
        };
      });
  }, [curves, rantaiPasokType]);

  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const cargoRef = useRef<THREE.InstancedMesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef<number[]>([]);

  useEffect(() => {
    progressRef.current = vehicles.map((v) => v.phase);
  }, [vehicles]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const bodyMesh = bodyRef.current;
    const cargoMesh = cargoRef.current;
    if (!bodyMesh || !cargoMesh || vehicles.length === 0) return;

    const dt = simPlaying ? Math.min(delta, 0.1) * simSpeed : 0;
    let selectedPos: THREE.Vector3 | null = null;

    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i]!;
      let t = (progressRef.current[i] ?? v.phase) + dt * v.speed * v.direction;
      t = ((t % 1) + 1) % 1;
      progressRef.current[i] = t;

      v.curve.getPointAt(t, pos);
      v.curve.getTangentAt(t, tangent);
      const yaw = Math.atan2(tangent.x * v.direction, tangent.z * v.direction);

      // Chassis (1:100 scaled compact truck/cart)
      dummy.position.set(pos.x, pos.y + 0.06, pos.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(0.24, 0.12, 0.42);
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);

      // Cargo box
      const isSelected = v.id === selectedRantaiId;
      dummy.position.set(
        pos.x - Math.sin(yaw) * 0.05,
        pos.y + 0.16,
        pos.z - Math.cos(yaw) * 0.05,
      );
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(0.2, 0.14, 0.24);
      dummy.updateMatrix();
      cargoMesh.setMatrixAt(i, dummy.matrix);

      color.set(isSelected ? '#67e8f9' : TYPE_COLORS[v.tipe]);
      cargoMesh.setColorAt(i, color);

      if (isSelected) {
        selectedPos = pos.clone();
      }
    }

    bodyMesh.count = vehicles.length;
    cargoMesh.count = vehicles.length;
    bodyMesh.instanceMatrix.needsUpdate = true;
    cargoMesh.instanceMatrix.needsUpdate = true;
    if (cargoMesh.instanceColor) cargoMesh.instanceColor.needsUpdate = true;

    if (beaconRef.current) {
      if (selectedPos) {
        beaconRef.current.visible = true;
        beaconRef.current.position.set(selectedPos.x, selectedPos.y + 0.35, selectedPos.z);
        beaconRef.current.rotation.y += delta * 2.5;
      } else {
        beaconRef.current.visible = false;
      }
    }
  });

  if (vehicles.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={bodyRef}
        args={[undefined, undefined, vehicles.length]}
        castShadow
        raycast={() => {}}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={night ? '#dbeafe' : '#2d3748'}
          emissive={night ? '#f59e0b' : '#000000'}
          emissiveIntensity={night ? 0.45 : 0}
          roughness={0.6}
          flatShading
        />
      </instancedMesh>
      <instancedMesh
        ref={cargoRef}
        args={[undefined, undefined, vehicles.length]}
        castShadow
        raycast={() => {}}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={night ? '#fbbf24' : '#000000'}
          emissiveIntensity={night ? 0.25 : 0}
          roughness={0.7}
          flatShading
        />
      </instancedMesh>
      <mesh ref={beaconRef} visible={false} raycast={() => {}}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshBasicMaterial color="#67e8f9" wireframe />
      </mesh>
    </group>
  );
}
