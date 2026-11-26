import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Kolam, Komoditas, Ternak } from '../types.js';
import type { MapRiver, MapRoad } from './mapData.js';
import type { PetakPlacement, ZonePlacement } from './layout.js';
import { PASAR_POSITION, TREE_POSITIONS } from './layout.js';
import { terrainYAt } from './terrain.js';
import { MapLabel } from './MapLabel.js';

const SOIL = '#8a6a44';
const LIVESTOCK = '#9a6a42';

const CROP_COLORS: Record<string, string> = {
  'kom-padi': '#74c34a',
  'kom-jagung': '#9fb63b',
  'kom-cabai': '#438f39',
  'kom-singkong': '#6faa3c',
  'kom-pisang': '#9cc44a',
  'kom-kopi': '#356b35',
  'kom-sayur-daun': '#83cf5b',
};

const WATER_COLORS: Record<string, string> = {
  'KJA Sungai': '#2f9fd0',
  'Bioflok': '#2f8fbf',
  'Kolam Tanah': '#3aa8d6',
  'Embung': '#4bb5d9',
};

const ANIMAL_COLORS: Record<string, string> = {
  Sapi: '#7f5030',
  Kambing: '#93633c',
  Ayam: '#f1e6c8',
  Itik: '#e8e2d4',
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function shade(hex: string, amount: number) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const r = clamp(Math.round(((value >> 16) & 255) * (1 + amount)), 0, 255);
  const g = clamp(Math.round(((value >> 8) & 255) * (1 + amount)), 0, 255);
  const b = clamp(Math.round((value & 255) * (1 + amount)), 0, 255);
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

interface SelectableProps {
  selected: boolean;
  onSelect: () => void;
}

export function SelectionOutline({
  width,
  depth,
  height,
  y = height / 2,
  color = '#67e8f9',
}: {
  width: number;
  depth: number;
  height: number;
  y?: number;
  color?: string;
}) {
  const { edges, box } = useMemo(() => {
    const source = new THREE.BoxGeometry(width, height, depth);
    return { edges: new THREE.EdgesGeometry(source), box: source };
  }, [width, height, depth]);

  useEffect(
    () => () => {
      edges.dispose();
      box.dispose();
    },
    [edges, box],
  );

  const frame = Math.max(0.12, Math.min(width, depth) * 0.035);
  const frameY = -height / 2 + 0.05;

  return (
    <group position={[0, y, 0]}>
      <lineSegments geometry={edges} raycast={() => {}}>
        <lineBasicMaterial color={color} transparent opacity={0.95} depthTest={false} />
      </lineSegments>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -height / 2 + 0.02, 0]}
        raycast={() => {}}
      >
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {[
        { x: 0, z: depth / 2, sx: width, sz: frame },
        { x: 0, z: -depth / 2, sx: width, sz: frame },
        { x: width / 2, z: 0, sx: frame, sz: depth },
        { x: -width / 2, z: 0, sx: frame, sz: depth },
      ].map((edge, index) => (
        <mesh
          key={index}
          position={[edge.x, frameY, edge.z]}
          raycast={() => {}}
        >
          <boxGeometry args={[edge.sx, 0.07, edge.sz]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.95}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  );
}

const selectObject = (
  event: ThreeEvent<MouseEvent>,
  onSelect: () => void,
) => {
  event.stopPropagation();
  onSelect();
};

interface InstanceItem {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color?: string;
}

/** One draw call for repeated meshes. Decorations do not receive pointer events. */
function Instances({
  items,
  castShadow = false,
  receiveShadow = false,
  children,
}: {
  items: readonly InstanceItem[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const hasColor = items.some((item) => item.color !== undefined);

    mesh.count = items.length;
    items.forEach((item, index) => {
      dummy.position.set(...item.position);
      dummy.rotation.set(...(item.rotation ?? [0, 0, 0]));
      dummy.scale.set(...(item.scale ?? [1, 1, 1]));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (hasColor) {
        color.set(item.color ?? '#ffffff');
        mesh.setColorAt(index, color);
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      raycast={() => {}}
    >
      {children}
    </instancedMesh>
  );
}

function zonePerimeter(placement: ZonePlacement): [number, number, number][] {
  const halfW = placement.width / 2;
  const halfD = placement.depth / 2;
  const z0 = placement.centerZ;
  const points: [number, number, number][] = [];
  const edge = (x1: number, z1: number, x2: number, z2: number) => {
    for (let index = 0; index <= 10; index += 1) {
      const t = index / 10;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      points.push([x, terrainYAt(x, z) + 0.08, z]);
    }
  };
  edge(-halfW, z0 - halfD, halfW, z0 - halfD);
  edge(halfW, z0 - halfD, halfW, z0 + halfD);
  edge(halfW, z0 + halfD, -halfW, z0 + halfD);
  edge(-halfW, z0 + halfD, -halfW, z0 - halfD);
  return points;
}

export function ZonaTerrace({
  placement,
  selected,
  onSelect,
}: { placement: ZonePlacement } & SelectableProps) {
  const labelZ =
    placement.zona.id === 'zona-1'
      ? -placement.depth / 2 + 1.5
      : placement.zona.id === 'zona-4'
        ? placement.depth / 2 - 1.5
        : 0;
  const labelX = -placement.width / 2 - 1.2;
  const labelY = terrainYAt(labelX, placement.centerZ + labelZ) + 0.8;
  const perimeter = useMemo(() => zonePerimeter(placement), [placement]);

  return (
    <group
      position={[0, 0, placement.centerZ]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, placement.baseY + 0.03, 0]}
      >
        <planeGeometry args={[placement.width, placement.depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <MapLabel position={[labelX, labelY, labelZ]} tone="zone">
        <span>{placement.zona.nama}</span>
        <small>
          {placement.zona.mdplMin}–{placement.zona.mdplMax} mdpl
        </small>
      </MapLabel>
      <Line
        points={perimeter}
        color="#6f875c"
        lineWidth={1}
        transparent
        opacity={0.45}
        depthTest={false}
      />
      {selected ? (
        <>
          <Line
            points={perimeter}
            color="#67e8f9"
            lineWidth={6}
            transparent
            opacity={0.18}
            depthTest={false}
          />
          <Line
            points={perimeter}
            color="#67e8f9"
            lineWidth={2.2}
            depthTest={false}
          />
        </>
      ) : null}
    </group>
  );
}

export interface PetakSurfaceRow {
  placement: PetakPlacement;
  komoditas: Komoditas;
}

/** All petak surfaces in three draw calls instead of one per plot. */
export function PetakSurfaces({ rows }: { rows: readonly PetakSurfaceRow[] }) {
  const { bases, water, strips } = useMemo(() => {
    const bases: InstanceItem[] = [];
    const water: InstanceItem[] = [];
    const strips: InstanceItem[] = [];

    for (const { placement, komoditas } of rows) {
      const width = placement.width - 0.55;
      const depth = placement.depth - 0.55;
      const color = CROP_COLORS[komoditas.id] ?? '#6fbf4a';

      bases.push({
        position: [placement.x, placement.topY + 0.024, placement.z],
        rotation: [-Math.PI / 2, 0, 0],
        scale: [width * 0.94, depth * 0.94, 1],
        color,
      });

      if (komoditas.id === 'kom-padi') {
        water.push({
          position: [placement.x, placement.topY + 0.012, placement.z],
          rotation: [-Math.PI / 2, 0, 0],
          scale: [width, depth, 1],
        });
      }

      for (let index = 0; index < 2; index += 1) {
        strips.push({
          position: [
            placement.x,
            placement.topY + 0.09,
            placement.z + (index - 0.5) * (depth / 2),
          ],
          scale: [width * 0.86, 0.07, (depth / 2) * 0.3],
          color: shade(color, -0.12),
        });
      }
    }

    return { bases, water, strips };
  }, [rows]);

  return (
    <>
      <Instances items={water} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#6fb7c9" roughness={0.9} />
      </Instances>
      <Instances items={bases} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </Instances>
      <Instances items={strips}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
      </Instances>
    </>
  );
}

export function PetakPlot({
  placement,
  selected,
  onSelect,
}: { placement: PetakPlacement } & SelectableProps) {
  return (
    <group
      position={[placement.x, placement.topY, placement.z]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[placement.width, 0.3, placement.depth]} />
        <meshStandardMaterial color={SOIL} roughness={1} flatShading />
      </mesh>
      {selected ? (
        <SelectionOutline
          width={placement.width}
          depth={placement.depth}
          height={0.55}
          y={0.28}
        />
      ) : null}
    </group>
  );
}

export function KolamPond({
  kolam,
  komoditas,
  placement,
  offsetX = 0,
  compact = false,
  selected,
  onSelect,
}: {
  kolam: Kolam;
  komoditas: Komoditas;
  placement: PetakPlacement;
  offsetX?: number;
  compact?: boolean;
} & SelectableProps) {
  const width = clamp(
    Math.sqrt(kolam.luasM2) / 6,
    3.4,
    compact ? 3.8 : 5.0,
  );
  const depth = width * 0.68;
  const waterColor = WATER_COLORS[kolam.tipe] ?? '#3b9dcc';

  return (
    <group
      position={[placement.x + offsetX, placement.topY, placement.z]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <mesh position={[0, 0.175, 0]} receiveShadow>
        <boxGeometry args={[width + 0.8, 0.35, depth + 0.8]} />
        <meshStandardMaterial color={SOIL} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.37, 0]} receiveShadow>
        <boxGeometry args={[width, 0.12, depth]} />
        <meshStandardMaterial
          color={waterColor}
          roughness={0.2}
          metalness={0.15}
          transparent
          opacity={0.93}
        />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width * 0.82, depth * 0.82]} />
        <meshStandardMaterial color="#8fd3ea" transparent opacity={0.28} />
      </mesh>

      <group position={[0, 0.45, 0]}>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.65, 6]} />
          <meshStandardMaterial color="#d8d2bd" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.66, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.4, 0.055, 6, 12]} />
          <meshStandardMaterial color="#d8d2bd" roughness={0.8} />
        </mesh>
      </group>

      <MapLabel position={[0, 1.35, 0]} tone="water">
        <span>{komoditas.nama}</span>
        <small>{kolam.tipe}</small>
      </MapLabel>
      {selected ? (
        <SelectionOutline
          width={width + 1}
          depth={depth + 1}
          height={1.1}
          y={0.55}
        />
      ) : null}
    </group>
  );
}

export function KandangPen({
  ternak,
  komoditas,
  placement,
  offsetX = 0,
  compact = false,
  selected,
  onSelect,
}: {
  ternak: Ternak;
  komoditas: Komoditas;
  placement: PetakPlacement;
  offsetX?: number;
  compact?: boolean;
} & SelectableProps) {
  const width = clamp(
    Math.sqrt(ternak.jumlah) * 0.42,
    compact ? 2.8 : 3.2,
    compact ? 3.4 : 4.6,
  );
  const depth = width * 0.72;
  const animalColor = ANIMAL_COLORS[ternak.jenis] ?? LIVESTOCK;
  const animals = Math.min(4, Math.max(2, Math.ceil(ternak.jumlah / 100)));

  const decor = useMemo(() => {
    const posts: InstanceItem[] = [
      [-width / 2, -depth / 2],
      [width / 2, -depth / 2],
      [-width / 2, depth / 2],
      [width / 2, depth / 2],
    ].map(([x, z]) => ({
      position: [x ?? 0, 0.46, z ?? 0],
      scale: [0.11, 0.75, 0.11],
    }));

    const rails: InstanceItem[] = [
      { position: [0, 0.45, depth / 2], scale: [width, 0.07, 0.07] },
      { position: [0, 0.45, -depth / 2], scale: [width, 0.07, 0.07] },
      { position: [width / 2, 0.45, 0], scale: [0.07, 0.07, depth] },
      { position: [-width / 2, 0.45, 0], scale: [0.07, 0.07, depth] },
    ];

    const animalPositions: [number, number][] = [
      [-width * 0.24, depth * 0.18],
      [width * 0.2, depth * 0.22],
      [-width * 0.12, -depth * 0.18],
      [width * 0.26, -depth * 0.22],
    ];
    const bodies: InstanceItem[] = [];
    const heads: InstanceItem[] = [];

    for (let index = 0; index < animals; index += 1) {
      const [x, z] = animalPositions[index] ?? [0, 0];
      bodies.push({
        position: [x, 0.3, z],
        scale: [0.48, 0.28, 0.3],
        color: animalColor,
      });
      heads.push({
        position: [x + 0.3, 0.38, z],
        scale: [0.2, 0.2, 0.2],
        color: animalColor,
      });
    }

    return { posts, rails, bodies, heads };
  }, [width, depth, animals, animalColor]);

  return (
    <group
      position={[placement.x + offsetX, placement.topY, placement.z]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <mesh position={[0, 0.09, 0]} receiveShadow>
        <boxGeometry args={[width, 0.18, depth]} />
        <meshStandardMaterial color={LIVESTOCK} roughness={1} flatShading />
      </mesh>

      <Instances items={decor.posts}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6f4d31" roughness={1} flatShading />
      </Instances>
      <Instances items={decor.rails}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6f4d31" roughness={1} />
      </Instances>
      <Instances items={decor.bodies}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
      </Instances>
      <Instances items={decor.heads}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
      </Instances>

      <group position={[0, 0, -depth * 0.12]}>
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[width * 0.42, 0.62, depth * 0.38]} />
          <meshStandardMaterial color="#b98a5a" roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 0.95, 0]} rotation-y={Math.PI / 4} castShadow>
          <coneGeometry args={[width * 0.36, 0.42, 4]} />
          <meshStandardMaterial color="#9c5b3f" roughness={1} flatShading />
        </mesh>
      </group>

      <MapLabel position={[0, 1.65, 0]} tone="livestock">
        <span>Kandang {ternak.jenis}</span>
        <small>
          {ternak.jumlah} ekor · {komoditas.nama}
        </small>
      </MapLabel>
      {selected ? (
        <SelectionOutline
          width={width + 0.5}
          depth={depth + 0.5}
          height={1.5}
          y={0.75}
        />
      ) : null}
    </group>
  );
}

const MARKET_STALLS = [
  { x: -2.1, z: -1.5, color: '#b74b3f' },
  { x: 0.1, z: 1.3, color: '#3f7d4f' },
  { x: 2.2, z: -1.4, color: '#c99a35' },
] as const;

export function Pasar({
  topY,
  selected,
  onSelect,
}: { topY: number } & SelectableProps) {
  const decor = useMemo(() => {
    const stalls: InstanceItem[] = [];
    const posts: InstanceItem[] = [];
    const stripes: InstanceItem[] = [];
    const crates: InstanceItem[] = [];

    for (const stall of MARKET_STALLS) {
      stalls.push({
        position: [stall.x, 0.59, stall.z],
        scale: [2.3, 0.55, 1.2],
      });

      for (const [x, z] of [
        [-1.1, -0.55],
        [1.1, -0.55],
        [-1.1, 0.55],
        [1.1, 0.55],
      ]) {
        posts.push({
          position: [stall.x + (x ?? 0), 1.02, stall.z + (z ?? 0)],
          scale: [0.08, 1.7, 0.08],
        });
      }

      for (let stripe = 0; stripe < 5; stripe += 1) {
        stripes.push({
          position: [stall.x - 1 + stripe * 0.5, 1.89, stall.z],
          scale: [0.5, 0.12, 1.55],
          color: stripe % 2 === 0 ? stall.color : '#f1e6cf',
        });
      }
    }

    for (const [x, z] of [
      [-2.8, 2.2],
      [2.8, 2.2],
      [-2.8, -2.2],
      [2.8, -2.2],
    ]) {
      crates.push({
        position: [x ?? 0, 0.26, z ?? 0],
        scale: [0.65, 0.4, 0.5],
      });
    }

    return { stalls, posts, stripes, crates };
  }, []);

  return (
    <group
      position={[PASAR_POSITION.x, topY, PASAR_POSITION.z]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <mesh position={[0, -0.225, 0]} receiveShadow>
        <boxGeometry args={[7.6, 0.45, 7.0]} />
        <meshStandardMaterial color="#cbb98f" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.08, 6.6]} />
        <meshStandardMaterial color="#d9c7a3" roughness={1} />
      </mesh>

      <Instances items={decor.stalls} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#c9a86f" roughness={1} flatShading />
      </Instances>
      <Instances items={decor.posts}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7b5a3c" roughness={1} />
      </Instances>
      <Instances items={decor.stripes}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </Instances>
      <Instances items={decor.crates}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#a97b4a" roughness={1} flatShading />
      </Instances>

      <MapLabel position={[0, 2.4, 0]} tone="market">
        <span>Pasar Desa Ciapus</span>
        <small>B2B · B2C</small>
      </MapLabel>
      {selected ? (
        <SelectionOutline width={8.2} depth={7.6} height={2.8} y={1.4} />
      ) : null}
    </group>
  );
}

function ribbonGeometry(
  points: readonly (readonly [number, number])[],
  width: number,
  heightAt: (x: number, z: number) => number,
  lift: number,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  );
  const samples = curve.getPoints(48);
  const positions: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index < samples.length; index += 1) {
    const point = samples[index];
    if (!point) continue;
    const previous = samples[Math.max(0, index - 1)] ?? point;
    const next = samples[Math.min(samples.length - 1, index + 1)] ?? point;
    const direction = new THREE.Vector3()
      .subVectors(next, previous)
      .setY(0)
      .normalize();
    const normal = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(
      width / 2,
    );

    const leftX = point.x + normal.x;
    const leftZ = point.z + normal.z;
    const rightX = point.x - normal.x;
    const rightZ = point.z - normal.z;
    positions.push(leftX, heightAt(leftX, leftZ) + lift, leftZ);
    positions.push(rightX, heightAt(rightX, rightZ) + lift, rightZ);

    if (index < samples.length - 1) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function River({
  spec,
  selected,
  onSelect,
}: { spec: MapRiver } & SelectableProps) {
  const bank = useMemo(
    () => ribbonGeometry(spec.points, spec.width + 1.7, terrainYAt, 0.03),
    [spec],
  );
  const water = useMemo(
    () => ribbonGeometry(spec.points, spec.width, terrainYAt, 0.05),
    [spec],
  );
  const highlight = useMemo(
    () => ribbonGeometry(spec.points, spec.width * 0.45, terrainYAt, 0.07),
    [spec],
  );
  const outline = useMemo(
    () => ribbonGeometry(spec.points, spec.width + 1.2, terrainYAt, 0.09),
    [spec],
  );

  useEffect(
    () => () => {
      bank.dispose();
      water.dispose();
      highlight.dispose();
      outline.dispose();
    },
    [bank, water, highlight, outline],
  );

  const labelY = terrainYAt(spec.label[0], spec.label[1]) + 1.2;

  return (
    <group
      onClick={
        spec.selectable
          ? (event) => selectObject(event, onSelect)
          : undefined
      }
    >
      {selected && spec.selectable ? (
        <mesh geometry={outline} raycast={() => {}}>
          <meshBasicMaterial
            color="#67e8f9"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      <mesh geometry={bank} receiveShadow>
        <meshStandardMaterial color="#bda77a" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={water} receiveShadow>
        <meshStandardMaterial
          color={spec.color}
          roughness={0.25}
          metalness={0.15}
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={highlight}>
        <meshStandardMaterial
          color="#9fd7e8"
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>
      {spec.showLabel ? (
        <MapLabel position={[spec.label[0], labelY, spec.label[1]]} tone="water">
          {spec.nama}
        </MapLabel>
      ) : null}
    </group>
  );
}

export function Road({ spec }: { spec: MapRoad }) {
  const geometry = useMemo(
    () => ribbonGeometry(spec.points, spec.width, terrainYAt, 0.04),
    [spec],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#cdbb8c" roughness={1} />
    </mesh>
  );
}

const TREE_LAYERS = TREE_POSITIONS.map(([x, z], index) => {
  const green = index % 2 === 0 ? '#4f8a45' : '#5d9c4f';
  const base = terrainYAt(x, z);
  return {
    trunk: { position: [x, base + 0.55, z] as [number, number, number] },
    lower: {
      position: [x, base + 1.45, z] as [number, number, number],
      color: green,
    },
    upper: {
      position: [x, base + 2.05, z] as [number, number, number],
      color: shade(green, 0.08),
    },
  };
});

const TREE_TRUNKS = TREE_LAYERS.map((row) => row.trunk);
const TREE_LOWER = TREE_LAYERS.map((row) => row.lower);
const TREE_UPPER = TREE_LAYERS.map((row) => row.upper);

export function Trees() {
  return (
    <>
      <Instances items={TREE_TRUNKS}>
        <cylinderGeometry args={[0.14, 0.22, 1.1, 6]} />
        <meshStandardMaterial color="#7b5a3c" roughness={1} flatShading />
      </Instances>
      <Instances items={TREE_LOWER} castShadow>
        <coneGeometry args={[0.82, 1.25, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
      </Instances>
      <Instances items={TREE_UPPER} castShadow>
        <coneGeometry args={[0.58, 0.9, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
      </Instances>
    </>
  );
}
