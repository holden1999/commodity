import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Kolam, Komoditas, Ternak } from '../types.js';
import type { MapRiver, MapRoad } from './mapData.js';
import type {
  PetakPlacement,
  ZoneCell,
  ZonePlacement,
  ZoneSegment,
} from './layout.js';
import { PASAR_POSITION, TREE_POSITIONS } from './layout.js';
import { terrainYAt, WORLD_UNITS_PER_METER } from './terrainField.js';
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

function zoneFillGeometry(cells: readonly ZoneCell[]) {
  const positions: number[] = [];
  const indices: number[] = [];

  cells.forEach((cell, index) => {
    const base = index * 4;
    const y00 = terrainYAt(cell.x0, cell.z0) + 0.035;
    const y10 = terrainYAt(cell.x1, cell.z0) + 0.035;
    const y11 = terrainYAt(cell.x1, cell.z1) + 0.035;
    const y01 = terrainYAt(cell.x0, cell.z1) + 0.035;
    positions.push(
      cell.x0, y00, cell.z0,
      cell.x1, y10, cell.z0,
      cell.x1, y11, cell.z1,
      cell.x0, y01, cell.z1,
    );
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

function zoneBoundaryGeometry(segments: readonly ZoneSegment[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  const half = 0.11;

  for (const segment of segments) {
    const dx = segment.x2 - segment.x1;
    const dz = segment.z2 - segment.z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.0001) continue;

    const nx = (-dz / length) * half;
    const nz = (dx / length) * half;
    const base = positions.length / 3;
    for (const [x, z] of [
      [segment.x1, segment.z1],
      [segment.x2, segment.z2],
    ] as const) {
      positions.push(
        x + nx,
        terrainYAt(x + nx, z + nz) + 0.07,
        z + nz,
        x - nx,
        terrainYAt(x - nx, z - nz) + 0.07,
        z - nz,
      );
    }
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function ZonaTerrace({
  placement,
  selected,
  onSelect,
}: { placement: ZonePlacement } & SelectableProps) {
  const fill = useMemo(() => zoneFillGeometry(placement.cells), [placement.cells]);
  const boundary = useMemo(
    () => zoneBoundaryGeometry(placement.boundary),
    [placement.boundary],
  );

  useEffect(
    () => () => {
      fill.dispose();
      boundary.dispose();
    },
    [fill, boundary],
  );

  const labelY = terrainYAt(placement.centerX, placement.centerZ) + 0.85;
  const color = selected ? '#67e8f9' : '#6f875c';

  return (
    <group onClick={(event) => selectObject(event, onSelect)}>
      <mesh geometry={fill} receiveShadow>
        <meshBasicMaterial
          color={selected ? '#67e8f9' : '#5f8f4a'}
          transparent
          opacity={selected ? 0.16 : 0.055}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={boundary} raycast={() => {}}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.95 : 0.62}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <MapLabel
        position={[placement.centerX, labelY, placement.centerZ]}
        tone="zone"
        icon="zone"
      >
        <span>{placement.zona.nama}</span>
        <small>
          {placement.zona.mdplMin}–{placement.zona.mdplMax} mdpl
        </small>
      </MapLabel>
    </group>
  );
}

export interface PetakSurfaceRow {
  placement: PetakPlacement;
  komoditas: Komoditas;
}

function patchGeometry(
  rows: readonly PetakSurfaceRow[],
  padding: number,
  lift: number,
  colorFor: (row: PetakSurfaceRow) => string,
) {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const cells = 8;
  const stride = cells + 1;
  const color = new THREE.Color();

  for (const row of rows) {
    const { placement } = row;
    const width = Math.max(0.8, placement.width + padding);
    const depth = Math.max(0.8, placement.depth + padding);
    const base = positions.length / 3;
    color.set(colorFor(row));

    for (let iz = 0; iz <= cells; iz += 1) {
      for (let ix = 0; ix <= cells; ix += 1) {
        const x = placement.x - width / 2 + (ix / cells) * width;
        const z = placement.z - depth / 2 + (iz / cells) * depth;
        positions.push(x, terrainYAt(x, z) + lift, z);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let iz = 0; iz < cells; iz += 1) {
      for (let ix = 0; ix < cells; ix += 1) {
        const a = base + iz * stride + ix;
        indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Terrain-following soil and crop surfaces in two draw calls. */
export function PetakSurfaces({ rows }: { rows: readonly PetakSurfaceRow[] }) {
  const soil = useMemo(
    () => patchGeometry(rows, 0.3, 0.02, () => SOIL),
    [rows],
  );
  const crops = useMemo(
    () =>
      patchGeometry(
        rows,
        -0.22,
        0.05,
        (row) => CROP_COLORS[row.komoditas.id] ?? '#6fbf4a',
      ),
    [rows],
  );

  useEffect(
    () => () => {
      soil.dispose();
      crops.dispose();
    },
    [soil, crops],
  );

  return (
    <>
      <mesh geometry={soil} receiveShadow>
        <meshLambertMaterial vertexColors side={THREE.DoubleSide} flatShading />
      </mesh>
      <mesh geometry={crops} receiveShadow>
        <meshLambertMaterial vertexColors side={THREE.DoubleSide} flatShading />
      </mesh>
    </>
  );
}

export function PetakPlot({
  placement,
  selected,
  lowWater = false,
  onSelect,
}: { placement: PetakPlacement; lowWater?: boolean } & SelectableProps) {
  return (
    <group
      position={[placement.x, placement.topY, placement.z]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[placement.width, 0.3, placement.depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {lowWater ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]} raycast={() => {}}>
          <ringGeometry
            args={[
              Math.min(placement.width, placement.depth) * 0.36,
              Math.min(placement.width, placement.depth) * 0.44,
              24,
            ]}
          />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ) : null}
      {selected ? (
        <>
          <SelectionOutline
            width={placement.width}
            depth={placement.depth}
            height={0.55}
            y={0.28}
          />
          <MapLabel position={[0, 0.95, 0]} tone="crop" icon="crop">
            <span>{placement.petak.nama}</span>
            <small>{placement.petak.luasHa} ha</small>
          </MapLabel>
        </>
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
  // 1:100 scale aligned with terrain (~0.045 world units/meter, readable floor).
  const width = clamp(
    Math.sqrt(kolam.luasM2) * WORLD_UNITS_PER_METER * 1.4,
    1.15,
    compact ? 1.75 : 2.3,
  );
  const depth = width * 0.68;
  const waterColor = WATER_COLORS[kolam.tipe] ?? '#3b9dcc';

  return (
    <group
      position={[placement.x + offsetX, placement.topY, placement.z]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[width + 0.36, 0.2, depth + 0.36]} />
        <meshStandardMaterial color={SOIL} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.21, 0]} receiveShadow>
        <boxGeometry args={[width, 0.08, depth]} />
        <meshStandardMaterial
          color={waterColor}
          roughness={0.2}
          metalness={0.15}
          transparent
          opacity={0.93}
        />
      </mesh>
      <mesh position={[0, 0.255, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width * 0.82, depth * 0.82]} />
        <meshStandardMaterial color="#8fd3ea" transparent opacity={0.28} />
      </mesh>

      <group position={[0, 0.26, 0]}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.32, 6]} />
          <meshStandardMaterial color="#d8d2bd" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.33, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.2, 0.03, 6, 12]} />
          <meshStandardMaterial color="#d8d2bd" roughness={0.8} />
        </mesh>
      </group>

      <MapLabel position={[0, 0.85, 0]} tone="water" icon="fish">
        <span>{komoditas.nama}</span>
        <small>{kolam.tipe}</small>
      </MapLabel>
      {selected ? (
        <SelectionOutline
          width={width + 0.5}
          depth={depth + 0.5}
          height={0.65}
          y={0.325}
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
  cutaway = false,
  night = false,
  selected,
  onSelect,
}: {
  ternak: Ternak;
  komoditas: Komoditas;
  placement: PetakPlacement;
  offsetX?: number;
  compact?: boolean;
  cutaway?: boolean;
  night?: boolean;
} & SelectableProps) {
  // 1:100 scale aligned with terrain (~0.045 world units/meter).
  const width = clamp(
    Math.sqrt(ternak.jumlah) * 0.14,
    compact ? 1.3 : 1.5,
    compact ? 1.7 : 2.2,
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
      position: [x ?? 0, 0.24, z ?? 0],
      scale: [0.06, 0.38, 0.06],
    }));

    const rails: InstanceItem[] = [
      { position: [0, 0.24, depth / 2], scale: [width, 0.04, 0.04] },
      { position: [0, 0.24, -depth / 2], scale: [width, 0.04, 0.04] },
      { position: [width / 2, 0.24, 0], scale: [0.04, 0.04, depth] },
      { position: [-width / 2, 0.24, 0], scale: [0.04, 0.04, depth] },
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
        position: [x, 0.16, z],
        scale: [0.24, 0.14, 0.16],
        color: animalColor,
      });
      heads.push({
        position: [x + 0.15, 0.21, z],
        scale: [0.1, 0.1, 0.1],
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
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[width, 0.1, depth]} />
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
        <mesh position={[0, cutaway ? 0.14 : 0.26, 0]} castShadow>
          <boxGeometry args={[width * 0.42, cutaway ? 0.16 : 0.34, depth * 0.38]} />
          <meshStandardMaterial
            color="#b98a5a"
            emissive={night ? '#f59e0b' : '#000000'}
            emissiveIntensity={night ? 0.22 : 0}
            roughness={1}
            flatShading
          />
        </mesh>
        {!cutaway ? (
          <mesh position={[0, 0.52, 0]} rotation-y={Math.PI / 4} castShadow>
            <coneGeometry args={[width * 0.36, 0.24, 4]} />
            <meshStandardMaterial color="#9c5b3f" roughness={1} flatShading />
          </mesh>
        ) : (
          <mesh position={[0, 0.23, 0]} raycast={() => {}}>
            <boxGeometry args={[width * 0.26, 0.05, depth * 0.2]} />
            <meshStandardMaterial color="#e0b354" roughness={0.8} />
          </mesh>
        )}
      </group>

      <MapLabel position={[0, 1.0, 0]} tone="livestock" icon="livestock">
        <span>Kandang {ternak.jenis}</span>
        <small>
          {ternak.jumlah} ekor · {komoditas.nama}
        </small>
      </MapLabel>
      {selected ? (
        <SelectionOutline
          width={width + 0.3}
          depth={depth + 0.3}
          height={0.85}
          y={0.425}
        />
      ) : null}
    </group>
  );
}

const MARKET_STALLS = [
  { x: -1.0, z: -0.7, color: '#b74b3f' },
  { x: 0.05, z: 0.62, color: '#3f7d4f' },
  { x: 1.05, z: -0.65, color: '#c99a35' },
] as const;

export function Pasar({
  topY,
  cutaway = false,
  night = false,
  selected,
  onSelect,
}: { topY: number; cutaway?: boolean; night?: boolean } & SelectableProps) {
  const decor = useMemo(() => {
    const stalls: InstanceItem[] = [];
    const posts: InstanceItem[] = [];
    const stripes: InstanceItem[] = [];
    const crates: InstanceItem[] = [];

    for (const stall of MARKET_STALLS) {
      stalls.push({
        position: [stall.x, 0.3, stall.z],
        scale: [1.1, 0.28, 0.58],
      });

      for (const [x, z] of [
        [-0.52, -0.26],
        [0.52, -0.26],
        [-0.52, 0.26],
        [0.52, 0.26],
      ]) {
        posts.push({
          position: [stall.x + (x ?? 0), 0.52, stall.z + (z ?? 0)],
          scale: [0.05, 0.85, 0.05],
        });
      }

      for (let stripe = 0; stripe < 5; stripe += 1) {
        stripes.push({
          position: [stall.x - 0.48 + stripe * 0.24, 0.94, stall.z],
          scale: [0.24, 0.06, 0.75],
          color: stripe % 2 === 0 ? stall.color : '#f1e6cf',
        });
      }
    }

    for (const [x, z] of [
      [-1.3, 1.05],
      [1.3, 1.05],
      [-1.3, -1.05],
      [1.3, -1.05],
    ]) {
      crates.push({
        position: [x ?? 0, 0.14, z ?? 0],
        scale: [0.32, 0.2, 0.24],
      });
    }

    return { stalls, posts, stripes, crates };
  }, []);

  return (
    <group
      position={[PASAR_POSITION.x, topY, PASAR_POSITION.z]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[3.6, 0.24, 3.3]} />
        <meshStandardMaterial color="#cbb98f" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.05, 3.1]} />
        <meshStandardMaterial color="#d9c7a3" roughness={1} />
      </mesh>

      <Instances items={decor.stalls} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#c9a86f"
          emissive={night ? '#f59e0b' : '#000000'}
          emissiveIntensity={night ? 0.18 : 0}
          roughness={1}
          flatShading
        />
      </Instances>
      <Instances items={decor.posts}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7b5a3c" roughness={1} />
      </Instances>
      {!cutaway ? (
        <Instances items={decor.stripes}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </Instances>
      ) : null}
      <Instances items={decor.crates}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#a97b4a" roughness={1} flatShading />
      </Instances>
      {night ? (
        <pointLight position={[0, 1.5, 0]} color="#fbbf24" intensity={4.5} distance={14} decay={2} />
      ) : null}

      <MapLabel position={[0, 1.35, 0]} tone="market" icon="market">
        <span>Pasar Desa Ciapus</span>
        <small>B2B · B2C</small>
      </MapLabel>
      {selected ? (
        <SelectionOutline width={3.9} depth={3.6} height={1.45} y={0.725} />
      ) : null}
    </group>
  );
}

const RIVER_SEGMENTS = 100;

function ribbonGeometry(
  points: readonly (readonly [number, number])[],
  width: number,
  heightAt: (x: number, z: number) => number,
  lift: number,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  );
  const samples = curve.getPoints(RIVER_SEGMENTS);
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
  // 1:100 display width; OSM width is not a survey width.
  const width = spec.width * 0.34;
  const bank = useMemo(
    () => ribbonGeometry(spec.points, width + 0.55, terrainYAt, 0.12),
    [spec, width],
  );
  const water = useMemo(
    () => ribbonGeometry(spec.points, width, terrainYAt, 0.2),
    [spec, width],
  );
  const outline = useMemo(
    () => ribbonGeometry(spec.points, width + 0.35, terrainYAt, 0.28),
    [spec, width],
  );

  useEffect(
    () => () => {
      bank.dispose();
      water.dispose();
      outline.dispose();
    },
    [bank, water, outline],
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
        <meshStandardMaterial
          color="#bda77a"
          roughness={1}
          side={THREE.DoubleSide}
          flatShading
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh geometry={water} receiveShadow>
        <meshStandardMaterial
          color={spec.color}
          roughness={0.25}
          metalness={0.15}
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          flatShading
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      {spec.showLabel ? (
        <MapLabel position={[spec.label[0], labelY, spec.label[1]]} tone="water" icon="water">
          {spec.nama}
        </MapLabel>
      ) : null}
    </group>
  );
}

export function Road({ spec }: { spec: MapRoad }) {
  const geometry = useMemo(
    () => ribbonGeometry(spec.points, spec.width * 0.52, terrainYAt, 0.04),
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
    trunk: { position: [x, base + 0.26, z] as [number, number, number] },
    lower: {
      position: [x, base + 0.68, z] as [number, number, number],
      color: green,
    },
    upper: {
      position: [x, base + 0.96, z] as [number, number, number],
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
        <cylinderGeometry args={[0.06, 0.1, 0.52, 6]} />
        <meshStandardMaterial color="#7b5a3c" roughness={1} flatShading />
      </Instances>
      <Instances items={TREE_LOWER} castShadow>
        <coneGeometry args={[0.36, 0.58, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
      </Instances>
      <Instances items={TREE_UPPER} castShadow>
        <coneGeometry args={[0.25, 0.42, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
      </Instances>
    </>
  );
}
