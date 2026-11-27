import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { JenisTernak, Kolam, Komoditas, Ternak } from '../types.js';
import { ROADS, type MapRiver } from './mapData.js';
import { MAPPED_BANKS } from './osmCiapus.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WaterLevel } from './CropPlot.js';
import { Aerator, FishSchool, PenAnimals } from './FacilityLife.js';
import { VILLAGE_BOUNDARY } from './villageBoundary.js';
import type {
  LocalPoint,
  PlotFootprint,
  ZoneCell,
  ZonePlacement,
  ZoneSegment,
} from './layout.js';
import { containsLocalPoint, PASAR_POSITION } from './layout.js';
import { terrainYAt } from './terrainField.js';
import { HILIR, channelTerrainYAt, outletGrade, riverBankWidth, riverWaterWidth } from './riverNetwork.js';
import { POND_FLOOR_SCALE, type PondBasin } from './pondBasin.js';
import { basinClip } from './basinClip.js';
import { polygonSurfaceGeometry, TerrainPatch } from './TerrainPatch.js';
import { MapLabel } from './MapLabel.js';

const SOIL = '#8a6a44';
const LIVESTOCK = '#9a6a42';

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
export function Instances({
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
  excavations,
  selected,
  onSelect,
}: { placement: ZonePlacement; excavations: readonly PondBasin[] } & SelectableProps) {
  const clip = useMemo(() => basinClip(excavations), [excavations]);
  const raycast = useMemo(() => function (this: THREE.Mesh, ray: THREE.Raycaster, hits: THREE.Intersection[]) {
    const candidates: THREE.Intersection[] = [];
    THREE.Mesh.prototype.raycast.call(this, ray, candidates);
    for (const hit of candidates) {
      if (!excavations.some((basin) => containsLocalPoint(
        basin.rim, hit.point.x - basin.x, hit.point.z - basin.z,
      ))) hits.push(hit);
    }
  }, [excavations]);
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
      <mesh geometry={fill} raycast={raycast} receiveShadow>
        <meshBasicMaterial key={clip.customProgramCacheKey()} {...clip}
          color={selected ? '#67e8f9' : '#5f8f4a'}
          transparent
          opacity={selected ? 0.16 : 0.055}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={boundary} raycast={() => {}}>
        <meshBasicMaterial key={clip.customProgramCacheKey()} {...clip}
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

export function FacilityGround({ footprint: { x, z, width, depth, outline }, flooded, onSelect }: {
  footprint: PlotFootprint; flooded: boolean; onSelect: () => void;
}) {
  return (
    <group position={[x, 0, z]} onClick={(event) => selectObject(event, onSelect)}>
      <TerrainPatch x={x} z={z} originY={0} width={width} depth={depth} outline={outline}
        color={flooded ? '#718590' : SOIL} />
    </group>
  );
}

function PondBank({ x, z, y, outline, color }: {
  x: number; z: number; y: number; outline: readonly LocalPoint[]; color: string;
}) {
  const geometry = useMemo(() => {
    const edge = outline.flatMap(([ax, az], i) => {
      const [bx, bz] = outline[(i + 1) % outline.length]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / .4));
      return Array.from({ length: steps }, (_, step) =>
        [ax + (bx - ax) * step / steps, az + (bz - az) * step / steps] as const);
    });
    const vertices: number[] = [];
    edge.forEach(([ax, az], i) => {
      const [bx, bz] = edge[(i + 1) % edge.length]!;
      const bankTop = (dx: number, dz: number) => [
        dx * 1.015, channelTerrainYAt(x + dx * 1.015, z + dz * 1.015) - y + .025, dz * 1.015,
      ];
      const lowerA = [ax * POND_FLOOR_SCALE, 0, az * POND_FLOOR_SCALE];
      const lowerB = [bx * POND_FLOOR_SCALE, 0, bz * POND_FLOOR_SCALE];
      const upperA = bankTop(ax, az);
      const upperB = bankTop(bx, bz);
      vertices.push(...lowerA, ...upperA, ...lowerB, ...upperA, ...upperB, ...lowerB);
    });
    const bank = new THREE.BufferGeometry();
    bank.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    bank.computeVertexNormals();
    return bank;
  }, [x, z, y, outline]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial color={color} roughness={.94} side={THREE.DoubleSide} />
  </mesh>;
}

export function KolamPond({
  kolam, komoditas, basin, stressed, flooded, water,
  hectares, selected, onSelect,
}: {
  kolam: Kolam; komoditas: Komoditas; basin: PondBasin;
  stressed: boolean; flooded: boolean; water: WaterLevel;
  hectares: number;
} & SelectableProps) {
  const { x, z, floorY: y, width, depth, rim } = basin;
  const tarp = kolam.tipe === 'Bioflok' || kolam.tipe === 'Kolam Terpal';
  const waterGeometry = useMemo(() => polygonSurfaceGeometry(rim), [rim]);
  useEffect(() => () => waterGeometry.dispose(), [waterGeometry]);
  const surface = useRef<THREE.Group>(null);
  useFrame(() => {
    if (surface.current) surface.current.position.y = .12 + water.current * .21;
  });
  const base = tarp ? '#242b2b' : stressed ? '#858582' : '#786042';
  const waterColor = flooded || stressed ? '#738e97' : WATER_COLORS[kolam.tipe] ?? '#348bb4';

  return (
    <group position={[x, y, z]}
      onClick={(event) => selectObject(event, onSelect)}>
      <mesh geometry={waterGeometry} scale={[POND_FLOOR_SCALE + .004, 1, POND_FLOOR_SCALE + .004]}
        receiveShadow>
        <meshStandardMaterial color={base} roughness={.94} />
      </mesh>
      <PondBank x={x} z={z} y={y} outline={rim} color={base} />
      <group ref={surface} position-y={.2}>
        <mesh geometry={waterGeometry} receiveShadow>
          <meshStandardMaterial color={waterColor} roughness={.23} metalness={.16} />
        </mesh>
        <FishSchool width={width} depth={depth} />
        {tarp && <Aerator />}
      </group>
      <MapLabel position={[0, channelTerrainYAt(x, z) - y + .72, 0]} tone="water" icon="fish">
        <span>{komoditas.nama}</span>
        <small>{kolam.tipe} · {hectares} ha{flooded ? ' · Banjir' : stressed ? ' · Kurang sesuai' : ''}</small>
      </MapLabel>
      {selected && <SelectionOutline width={width + .5} depth={depth + .5} height={.65} />}
    </group>
  );
}

export function KandangPen({
  ternak, jenis, stressed, flooded,
  komoditas,
  placement,
  hectares,
  cutaway = false,
  night = false,
  selected,
  onSelect,
}: {
  ternak: Ternak;
  jenis: JenisTernak;
  stressed: boolean;
  flooded: boolean;
  komoditas: Komoditas;
  placement: PlotFootprint;
  hectares: number;
  cutaway?: boolean;
  night?: boolean;
} & SelectableProps) {
  const { x, z, width, depth, outline } = placement;
  const y = terrainYAt(x, z);
  const ground = useMemo(() => (dx: number, dz: number) => terrainYAt(x + dx, z + dz) - y, [x, y, z]);
  const animalColor = stressed ? '#b1ae9f' : ANIMAL_COLORS[jenis];
  const animals = Math.min(4, Math.max(2, Math.ceil(ternak.jumlah / 100)));

  const decor = useMemo(() => {
    const posts: InstanceItem[] = [];
    const rails: InstanceItem[] = [];
    outline.forEach(([ax, az], index) => {
      const [bx, bz] = outline[(index + 1) % outline.length]!;
      const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / .85);
      for (let i = 0; i < steps; i++) {
        const x1 = ax + (bx - ax) * i / steps;
        const z1 = az + (bz - az) * i / steps;
        const x2 = ax + (bx - ax) * (i + 1) / steps;
        const z2 = az + (bz - az) * (i + 1) / steps;
        const h1 = ground(x1, z1);
        const h2 = ground(x2, z2);
        posts.push({ position: [x1, h1 + .22, z1], scale: [.065, .43, .065] });
        const direction = new THREE.Vector3(x2 - x1, h2 - h1, z2 - z1);
        const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion()
          .setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.clone().normalize()));
        rails.push({
          position: [(x1 + x2) / 2, (h1 + h2) / 2 + .26, (z1 + z2) / 2],
          rotation: [rotation.x, rotation.y, rotation.z],
          scale: [direction.length(), .044, .045],
        });
      }
    });
    return { posts, rails };
  }, [outline, ground]);

  return (
    <group
      position={[x, y, z]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <TerrainPatch x={x} z={z} originY={y} width={width} depth={depth} outline={outline}
        color={flooded ? '#718590' : stressed ? '#8d8880' : LIVESTOCK} />

      <Instances items={decor.posts}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6f4d31" roughness={1} flatShading />
      </Instances>
      <Instances items={decor.rails}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6f4d31" roughness={1} />
      </Instances>
      <PenAnimals jenis={jenis} count={stressed ? Math.min(2, animals) : animals}
        width={width} depth={depth} color={animalColor} ground={ground} />

      <group position={[0, ground(0, -depth * .12), -depth * .12]}>
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
            <coneGeometry args={[Math.min(width, depth) * 0.36, 0.24, 4]} />
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
        <span>Kandang {jenis}</span>
        <small>
          {ternak.jumlah} ekor · {hectares} ha · {komoditas.nama}{flooded ? ' · Banjir' : stressed ? ' · Kurang sesuai' : ''}
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

    const ground = (x: number, z: number) =>
      terrainYAt(PASAR_POSITION.x + x, PASAR_POSITION.z + z) - topY;
    for (const stall of MARKET_STALLS) {
      const stallY = ground(stall.x, stall.z);
      stalls.push({
        position: [stall.x, stallY + .3, stall.z],
        scale: [1.1, 0.28, 0.58],
      });

      for (const [x, z] of [
        [-0.52, -0.26],
        [0.52, -0.26],
        [-0.52, 0.26],
        [0.52, 0.26],
      ]) {
        posts.push({
          position: [stall.x + (x ?? 0), stallY + .49, stall.z + (z ?? 0)],
          scale: [0.05, 0.85, 0.05],
        });
      }

      for (let stripe = 0; stripe < 5; stripe += 1) {
        stripes.push({
          position: [stall.x - 0.48 + stripe * 0.24, stallY + .94, stall.z],
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
        position: [x!, ground(x!, z!) + .14, z!],
        scale: [0.32, 0.2, 0.24],
      });
    }

    return { stalls, posts, stripes, crates };
  }, [topY]);

  return (
    <group
      position={[PASAR_POSITION.x, topY, PASAR_POSITION.z]}
      onClick={(event) => selectObject(event, onSelect)}
    >
      <TerrainPatch x={PASAR_POSITION.x} z={PASAR_POSITION.z} originY={topY}
        width={3.6} depth={3.3} color="#cbb98f" />

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
  preSampled = false,
) {
  const vertices = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const samples = preSampled ? vertices : new THREE.CatmullRomCurve3(vertices).getPoints(RIVER_SEGMENTS);
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
}: { spec: MapRiver & { outlet?: boolean } } & SelectableProps) {
  const width = riverWaterWidth(spec);
  const surfaceHeight = spec.outlet ? outletGrade : channelTerrainYAt;
  const bank = useMemo(
    () => ribbonGeometry(spec.points, riverBankWidth(spec), channelTerrainYAt, 0.12, true),
    [spec],
  );
  const water = useMemo(
    () => ribbonGeometry(spec.points, width, surfaceHeight, 0.2, true),
    [spec, width, surfaceHeight],
  );
  const outline = useMemo(
    () => ribbonGeometry(spec.points, width + 0.35, surfaceHeight, 0.28, true),
    [spec, width, surfaceHeight],
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
      {spec.outlet && (
        <mesh position={[HILIR[0], outletGrade(...HILIR) + .206, HILIR[1]]}
          rotation-x={-Math.PI / 2}>
          <circleGeometry args={[width / 2, 20]} />
          <meshStandardMaterial color={spec.color} roughness={.25} metalness={.15} />
        </mesh>
      )}
      {spec.showLabel ? (
        <MapLabel position={[spec.label[0], labelY, spec.label[1]]} tone="water" icon="water">
          {spec.nama}
        </MapLabel>
      ) : null}
    </group>
  );
}

export function VillageBoundary({ night = false }: { night?: boolean }) {
  const geometry = useMemo(() => {
    const ring = [...VILLAGE_BOUNDARY, VILLAGE_BOUNDARY[0]!];
    return ribbonGeometry(ring, 0.34, terrainYAt, 0.12);
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} renderOrder={10}>
      <meshBasicMaterial
        color={night ? '#9fd7e8' : '#e6b74e'}
        transparent
        opacity={night ? 0.9 : 0.82}
        depthTest={false}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

export function Roads() {
  const geometry = useMemo(() => {
    const parts = ROADS.filter((road) => !road.tunnel).map((road) =>
      ribbonGeometry(road.points, road.width, terrainYAt, road.bridge ? .29 : .065, true));
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    return merged;
  }, []);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return geometry && <mesh geometry={geometry} receiveShadow raycast={() => {}}>
    <meshStandardMaterial color="#c6b691" roughness={1} side={THREE.DoubleSide} />
  </mesh>;
}

export function MappedRiverBanks() {
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (const bank of MAPPED_BANKS) {
      const contour = bank.outer.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, z));
      const holes = bank.holes.map((ring) => ring.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, z)));
      const all = [...contour, ...holes.flat()];
      for (const face of THREE.ShapeUtils.triangulateShape(contour, holes)) {
        for (const index of face) {
          const { x, y: z } = all[index]!;
          points.push(x, terrainYAt(x, z) + .18, z);
        }
      }
    }
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    mesh.computeVertexNormals();
    return mesh;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow raycast={() => {}}>
    <meshStandardMaterial color="#4e8fa3" roughness={.32} side={THREE.DoubleSide} />
  </mesh>;
}
