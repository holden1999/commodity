import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { botanicalGeometry, type BotanicalKind } from './botanical.js';
import { SelectionOutline } from './components.js';
import { containsLocalPoint, type LocalPoint, type PetakPlacement, type PlotFootprint } from './layout.js';
import { polygonSurfaceGeometry, TerrainPatch } from './TerrainPatch.js';
import { terrainYAt } from './terrainField.js';
import { hasRiverClearance } from './riverNetwork.js';
import { roadEdgeDistance } from './roadNetwork.js';
import { MapLabel } from './MapLabel.js';

export const cropKind: Record<string, BotanicalKind | undefined> = {
  'kom-padi': 'padi', 'kom-jagung': 'jagung', 'kom-cabai': 'cabai',
  'kom-singkong': 'singkong', 'kom-pisang': 'pisang', 'kom-kopi': 'kopi',
  'kom-sayur-daun': 'sayur',
};

const cropStyles = {
  padi: { soil: '#64583a', rows: 5, columns: 7, size: 0.66 },
  jagung: { soil: '#815033', rows: 4, columns: 6, size: 1.32 },
  cabai: { soil: '#513427', rows: 4, columns: 6, size: 0.85 },
  singkong: { soil: '#896940', rows: 3, columns: 4, size: 1.15 },
  pisang: { soil: '#60563a', rows: 2, columns: 3, size: 1.45 },
  kopi: { soil: '#534935', rows: 3, columns: 3, size: 1.28 },
  sayur: { soil: '#675036', rows: 6, columns: 8, size: 0.84 },
};

const noRaycast = () => {};
const seedlingGeometry = new THREE.ConeGeometry(.28, 1.1, 4).translate(0, .55, 0);
export type WaterLevel = RefObject<number>;

function FieldWater({ x, z, outline, level, sun, sky }: {
  x: number; z: number; outline: readonly LocalPoint[]; level: WaterLevel;
  sun: THREE.Vector3; sky: string;
}) {
  const water = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const plane = polygonSurfaceGeometry(outline);
    const positions = plane.attributes.position!;
    const heights = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      heights[i] = terrainYAt(x + positions.getX(i), z + positions.getZ(i));
    }
    plane.setAttribute('soilHeight', new THREE.BufferAttribute(heights, 1));
    return plane;
  }, [x, z, outline]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({
    time: { value: 0 },
    sun: { value: sun },
    sky: { value: new THREE.Color(sky) },
    tint: { value: new THREE.Color('#448d91') },
  }), [sun, sky]);
  useFrame(({ clock }) => {
    if (!water.current) return;
    uniforms.time.value = clock.elapsedTime;
    water.current.position.y = .079 + level.current * .14;
  });
  return (
    <mesh ref={water} geometry={geometry} raycast={noRaycast}>
      <shaderMaterial uniforms={uniforms}
        vertexShader={`
          attribute float soilHeight;
          varying float groundY;
          varying vec3 world;
          void main() {
            groundY = soilHeight;
            world = (modelMatrix * vec4(position, 1.)).xyz;
            gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.);
          }
        `}
        fragmentShader={`
          uniform float time;
          uniform vec3 sun;
          uniform vec3 sky;
          uniform vec3 tint;
          varying float groundY;
          varying vec3 world;
          void main() {
            float waterDepth = world.y - groundY;
            if (waterDepth < .055 || waterDepth > .38) discard;
            vec3 normal = normalize(vec3(
              sin(world.x * 4. + world.z * 2. + time * 1.4) * .06,
              1., cos(world.z * 7. - time) * .07));
            vec3 view = normalize(cameraPosition - world);
            vec3 ray = reflect(-view, normal);
            float fresnel = pow(1. - max(dot(normal, view), 0.), 2.);
            float glint = pow(max(dot(ray, sun), 0.), 22.);
            vec3 color = mix(tint, sky, .20 + fresnel * .62) + glint * .42;
            gl_FragColor = vec4(color, 1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
}

function SoilLines({ width, depth, cracks, runoff, ground, outline }: {
  width: number; depth: number; cracks: boolean; runoff: { x: number; z: number } | null;
  ground: (x: number, z: number) => number;
  outline: readonly LocalPoint[];
}) {
  const positions = useMemo(() => {
    const lines: number[] = [];
    if (cracks) {
      for (let i = 0; i < 19; i++) {
        const x = (Math.sin(i * 53.1) * 0.42) * width;
        const z = (Math.cos(i * 41.7) * 0.42) * depth;
        lines.push(x, 0.028, z, x + .19, .028, z - .12,
          x + .19, .028, z - .12, x + .30, .028, z + .09,
          x + .19, .028, z - .12, x + .23, .028, z - .29);
      }
    }
    if (runoff) {
      for (let i = -2; i <= 2; i++) {
        const offset = i * .27;
        lines.push(offset - runoff.x, .032, offset - runoff.z,
          offset + runoff.x, .032, offset + runoff.z);
      }
    }
    for (let i = 0; i < lines.length; i += 3) {
      let x = THREE.MathUtils.clamp(lines[i]!, -width * .49, width * .49);
      let z = THREE.MathUtils.clamp(lines[i + 2]!, -depth * .49, depth * .49);
      if (!containsLocalPoint(outline, x, z)) {
        x *= .88;
        z *= .88;
      }
      lines[i] = x;
      lines[i + 1] = ground(x, z) + .059;
      lines[i + 2] = z;
    }
    return new Float32Array(lines);
  }, [width, depth, cracks, runoff, ground, outline]);
  return (
    <lineSegments raycast={noRaycast}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={runoff ? '#96bfcd' : '#40332c'} transparent opacity={0.73} />
    </lineSegments>
  );
}

function PlantRows({ kind, originX, originZ, width, depth, outline, growth, stressed, pale, wind, ground }: {
  kind: BotanicalKind; originX: number; originZ: number; width: number; depth: number; outline: readonly LocalPoint[]; growth: number;
  stressed: boolean; pale: boolean; wind: number; ground: (x: number, z: number) => number;
}) {
  const plants = useRef<THREE.InstancedMesh>(null);
  const canopy = useRef<THREE.Group>(null);
  const style = cropStyles[kind];
  const rows = Math.max(1, Math.min(10, Math.round(style.rows * depth / 3.4)));
  const columns = Math.max(1, Math.min(12, Math.round(style.columns * width / 3.9)));
  const size = style.size;
  useLayoutEffect(() => {
    const mesh = plants.current;
    if (!mesh) return;
    const plant = new THREE.Object3D();
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        if (stressed && (row * 3 + column * 2) % 5 !== 0) continue;
        const x = ((column + .5) / columns - .5) * width * .89;
        const z = ((row + .5) / rows - .5) * depth * .89;
        if (!containsLocalPoint(outline, x, z)) continue;
        const variation = .92 + .08 * Math.cos(row * 4 + column * 3);
        const scale = size * variation * Math.min(1, width / 3.4, depth / 2.6);
        const canopyRadius = scale * .77 + .06;
        if (!hasRiverClearance(originX + x, originZ + z, canopyRadius) ||
            roadEdgeDistance(originX + x, originZ + z, canopyRadius) <= canopyRadius) continue;
        plant.position.set(x, ground(x, z) + (kind === 'cabai' ? .16 : .045), z);
        plant.rotation.y = (row * 17 + column * 43) * .14;
        plant.scale.setScalar(scale * (.24 + growth * .76) * (stressed ? .65 : 1));
        plant.updateMatrix();
        mesh.setMatrixAt(index++, plant.matrix);
      }
    }
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [rows, columns, kind, width, depth, size, growth, stressed, ground, outline, originX, originZ]);
  useFrame(({ clock }) => {
    if (canopy.current) {
      const t = clock.elapsedTime;
      canopy.current.rotation.z = Math.sin(t * 1.6) * wind * .005;
      canopy.current.rotation.x = Math.cos(t * 1.27) * wind * .003;
    }
  });
  return (
    <group ref={canopy}>
      <instancedMesh ref={plants} args={[undefined, undefined, rows * columns]}
        geometry={growth > .16 ? botanicalGeometry(kind, growth < .78) : seedlingGeometry} castShadow raycast={noRaycast}>
        <meshLambertMaterial vertexColors={growth > .16} side={THREE.DoubleSide}
          color={pale ? '#c4bd91' : growth <= .16 ? '#82ba59' : kind === 'singkong' ? '#d9ffc7' : '#ffffff'} />
      </instancedMesh>
    </group>
  );
}

export function CropPlot({ placement, footprint, showLabel, kind, score, name, selected, onSelect,
  rain, drought, waterLow, flooded, erosion, growth, wind, water, sun, sky, sunExposure }: {
  placement: PetakPlacement; footprint: PlotFootprint; showLabel: boolean; kind: BotanicalKind | undefined; score: number | null;
  name: string | null; selected: boolean; onSelect: () => void;
  rain: boolean; drought: boolean; waterLow: boolean; flooded: boolean; erosion: { x: number; z: number } | null;
  growth: number; wind: number; water: WaterLevel; sun: THREE.Vector3; sky: string;
  sunExposure: number;
}) {
  const { x, z, width, depth, outline } = footprint;
  const y = terrainYAt(x, z);
  const ground = useMemo(() => (dx: number, dz: number) => terrainYAt(x + dx, z + dz) - y, [x, y, z]);
  const stressed = score !== null && score < 40;
  const bedCount = Math.max(1, Math.min(10, Math.round(depth / .85)));
  const riceWater = kind === 'padi' && !stressed && !drought;
  const soil = flooded ? '#687981' : stressed ? '#8c8980' :
    erosion ? '#ad694a' : kind ? cropStyles[kind].soil : '#797156';
  const color = new THREE.Color(soil).multiplyScalar(rain && !flooded ? .74 : 1);
  const moistureStress = drought || (waterLow && kind === 'padi');
  const cropGrowth = Math.min(growth / 100, moistureStress ? .44 : .57 + sunExposure / 100 * .75);
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect();
  };
  return (
    <group position={[x, y, z]} onClick={select}>
      <TerrainPatch x={x} z={z} originY={y} width={width} depth={depth} outline={outline}
        color={color} roughness={rain ? .5 : .95} />
      <SoilLines width={width} depth={depth} ground={ground} outline={outline}
        cracks={stressed || drought || kind === 'jagung'} runoff={erosion} />
      {kind === 'cabai' && !flooded && Array.from({ length: bedCount }, (_, row) => {
        const rowZ = ((row + .5) / bedCount - .5) * depth * .89;
        const halfBed = Math.min(depth * .36 / bedCount, depth * .49 - Math.abs(rowZ));
        const intersections = outline.flatMap(([ax, az], i) => {
          const [bx, bz] = outline[(i + 1) % outline.length]!;
          return [rowZ - halfBed, rowZ + halfBed].flatMap((edgeZ) =>
            (az > edgeZ) === (bz > edgeZ) ? [] : [ax + (bx - ax) * (edgeZ - az) / (bz - az)]);
        });
        const left = Math.max(...intersections.filter((x) => x < 0));
        const right = Math.min(...intersections.filter((x) => x > 0));
        const rowWidth = (right - left) * .96;
        const rowX = (left + right) / 2;
        return (
          <group key={row} position={[rowX, 0, rowZ]}>
            <TerrainPatch x={x + rowX} z={z + rowZ} originY={y} width={rowWidth}
              depth={halfBed * 2} ridge={.105} color={stressed ? '#6a645c' : '#3f2b24'} />
            <TerrainPatch x={x + rowX} z={z + rowZ} originY={y} width={rowWidth * .97}
              depth={.025} lift={.158} color="#202b2c" />
          </group>
        );
      })}
      {riceWater && !flooded && <FieldWater x={x} z={z} outline={outline}
        level={water} sun={sun} sky={sky} />}
      {kind && <PlantRows kind={kind} originX={x} originZ={z} width={width} depth={depth} outline={outline}
        growth={flooded ? Math.min(.36, cropGrowth) : cropGrowth}
        stressed={stressed || flooded} pale={stressed || moistureStress || flooded}
        wind={wind} ground={ground} />}
      {selected && <>
        <SelectionOutline width={width + .1} depth={depth + .1} height={.9} />
        {showLabel && <MapLabel position={[0, 1.55, 0]} tone="crop" icon="crop">
          <span>{placement.petak.nama}</span>
          <small>{name ?? 'Lahan'} · {placement.petak.luasHa} ha · {flooded ? 'Banjir' : stressed ? 'Kurang sesuai' : `${score ?? '—'}%`}</small>
        </MapLabel>}
      </>}
    </group>
  );
}
