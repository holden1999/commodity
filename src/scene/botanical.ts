import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const BOTANICAL_KINDS = [
  'padi',
  'jagung',
  'cabai',
  'singkong',
  'pisang',
  'kopi',
  'sayur',
] as const;

export type BotanicalKind = (typeof BOTANICAL_KINDS)[number];

const BOTANICAL_SET = new Set<string>(BOTANICAL_KINDS);

export function isBotanicalKind(kind: string): kind is BotanicalKind {
  return BOTANICAL_SET.has(kind);
}

interface Part {
  geometry: THREE.BufferGeometry;
  color: string;
}

interface Transform {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
}

const GREEN = '#4f8f39';
const LEAF = '#62a844';
const DARK_GREEN = '#356b35';
const STEM = '#6f5138';
const GOLD = '#c9a63b';
const RED = '#b54232';
const PALE = '#d9c98a';

function painted(geometry: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  if (source !== geometry) geometry.dispose();

  const count = source.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  const tint = new THREE.Color(color);
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = tint.r;
    colors[index * 3 + 1] = tint.g;
    colors[index * 3 + 2] = tint.b;
  }
  source.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return source;
}

function placed(geometry: THREE.BufferGeometry, transform: Transform = {}) {
  const position = new THREE.Vector3(...(transform.position ?? [0, 0, 0]));
  const rotation = new THREE.Euler(...(transform.rotation ?? [0, 0, 0]));
  const scale = new THREE.Vector3(...(transform.scale ?? [1, 1, 1]));
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(
      position,
      new THREE.Quaternion().setFromEuler(rotation),
      scale,
    ),
  );
  return geometry;
}

function addPart(
  parts: Part[],
  geometry: THREE.BufferGeometry,
  color: string,
  transform?: Transform,
) {
  parts.push({ geometry: placed(painted(geometry, color), transform), color });
}

function leafGeometry(length: number, width: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width, length * 0.24, width * 0.55, length * 0.62);
  shape.quadraticCurveTo(width * 0.32, length * 0.9, 0, length);
  shape.quadraticCurveTo(-width * 0.32, length * 0.9, -width * 0.55, length * 0.62);
  shape.quadraticCurveTo(-width, length * 0.24, 0, 0);
  return new THREE.ShapeGeometry(shape, 4);
}

function addLeaf(
  parts: Part[],
  length: number,
  width: number,
  color: string,
  transform: Transform,
) {
  addPart(parts, leafGeometry(length, width), color, transform);
}

function addSegment(
  parts: Part[],
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  radius: number,
  color: string,
) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length < 0.0001) return;
  const geometry = new THREE.CylinderGeometry(radius * 0.7, radius, length, 5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5),
      quaternion,
      new THREE.Vector3(1, 1, 1),
    ),
  );
  parts.push({ geometry: painted(geometry, color), color });
}

function addCone(
  parts: Part[],
  radius: number,
  height: number,
  color: string,
  transform: Transform,
) {
  addPart(parts, new THREE.ConeGeometry(radius, height, 5), color, transform);
}

function addBall(
  parts: Part[],
  radius: number,
  color: string,
  transform: Transform,
) {
  addPart(parts, new THREE.SphereGeometry(radius, 5, 4), color, transform);
}

function buildPadi(young = false): Part[] {
  const parts: Part[] = [];
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const x = Math.cos(angle) * 0.16;
    const z = Math.sin(angle) * 0.16;
    const top: [number, number, number] = [x * 0.35, 0.92 + (index % 2) * 0.08, z * 0.35];
    addSegment(parts, [x, 0, z], top, 0.016, DARK_GREEN);
    for (let leaf = 0; leaf < 3; leaf += 1) {
      addLeaf(parts, 0.62, 0.045, LEAF, {
        position: [x, 0.2 + leaf * 0.18, z],
        rotation: [0.2 + leaf * 0.12, angle + leaf * 0.8, 0.35],
      });
    }
    addCone(parts, 0.065, 0.3, young ? LEAF : GOLD, {
      position: top,
      rotation: [0.3, angle, -0.15],
    });
    addCone(parts, 0.04, 0.2, young ? GREEN : PALE, {
      position: [top[0] + 0.05, top[1] - 0.08, top[2]],
      rotation: [0.4, angle, 0.25],
    });
  }
  return parts;
}

function buildJagung(): Part[] {
  const parts: Part[] = [];
  addSegment(parts, [0, 0, 0], [0, 1.3, 0], 0.035, GREEN);
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    addLeaf(parts, 0.92, 0.1, LEAF, {
      position: [0, 0.18 + index * 0.18, 0],
      rotation: [0.4 + index * 0.08, angle, 0.55],
    });
  }
  for (let index = 0; index < 3; index += 1) {
    addCone(parts, 0.045, 0.22, PALE, {
      position: [0, 1.38 + index * 0.03, 0],
      rotation: [0.15 * index, (index / 3) * Math.PI * 2, 0.18],
    });
  }
  addBall(parts, 0.1, GOLD, {
    position: [0.16, 0.72, 0.07],
    scale: [0.8, 1.65, 0.8],
    rotation: [0, 0, -0.28],
  });
  addLeaf(parts, 0.48, 0.13, GREEN, {
    position: [0.08, 0.58, 0.04],
    rotation: [0.3, 0.2, -0.8],
  });
  addLeaf(parts, 0.42, 0.11, GREEN, {
    position: [0.08, 0.62, 0.04],
    rotation: [0.3, Math.PI, -0.8],
  });
  return parts;
}

function buildCabai(): Part[] {
  const parts: Part[] = [];
  addSegment(parts, [0, 0, 0], [0, 0.62, 0], 0.035, STEM);
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    const end: [number, number, number] = [
      Math.cos(angle) * 0.3,
      0.62,
      Math.sin(angle) * 0.3,
    ];
    addSegment(parts, [0, 0.32, 0], end, 0.022, STEM);
    addBall(parts, 0.2, LEAF, {
      position: [end[0], 0.7, end[2]],
      scale: [1, 0.9, 1],
    });
  }
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    addLeaf(parts, 0.45, 0.09, LEAF, {
      position: [Math.cos(angle) * 0.12, 0.42 + (index % 2) * 0.16, Math.sin(angle) * 0.12],
      rotation: [0.2, angle, 0.45],
    });
  }
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + 0.4;
    addCone(parts, 0.055, 0.2, RED, {
      position: [Math.cos(angle) * 0.22, 0.48, Math.sin(angle) * 0.22],
      rotation: [Math.PI, angle, 0.15],
    });
  }
  return parts;
}

function buildSingkong(): Part[] {
  const parts: Part[] = [];
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    const top: [number, number, number] = [
      Math.cos(angle) * 0.2,
      0.62,
      Math.sin(angle) * 0.2,
    ];
    addSegment(parts, [0, 0, 0], top, 0.026, STEM);
    for (let leaf = 0; leaf < 5; leaf += 1) {
      const spread = angle + (leaf / 5) * Math.PI * 2;
      addLeaf(parts, 0.52, 0.075, LEAF, {
        position: top,
        rotation: [0.15, spread, 0.45],
      });
    }
  }
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    addBall(parts, 0.1, '#9a6a42', {
      position: [Math.cos(angle) * 0.2, 0.08, Math.sin(angle) * 0.2],
      scale: [1.1, 1.7, 1.1],
      rotation: [0, angle, 0.4],
    });
  }
  return parts;
}

function buildPisang(): Part[] {
  const parts: Part[] = [];
  addSegment(parts, [0, 0, 0], [0, 0.92, 0], 0.08, '#7e8f35');
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    addLeaf(parts, 1.02, 0.34, index % 2 === 0 ? LEAF : GREEN, {
      position: [0, 0.64 + (index % 2) * 0.16, 0],
      rotation: [0.18 + index * 0.06, angle, 0.35],
    });
  }
  for (let index = 0; index < 3; index += 1) {
    addBall(parts, 0.08, '#d6b44d', {
      position: [0.1 + index * 0.05, 0.4, 0.02],
      scale: [0.7, 1.5, 0.7],
      rotation: [0, (index / 3) * Math.PI * 2, 0.3],
    });
  }
  return parts;
}

function buildKopi(): Part[] {
  const parts: Part[] = [];
  addSegment(parts, [0, 0, 0], [0, 0.56, 0], 0.035, STEM);
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    const end: [number, number, number] = [
      Math.cos(angle) * 0.26,
      0.72,
      Math.sin(angle) * 0.26,
    ];
    addSegment(parts, [0, 0.38, 0], end, 0.018, STEM);
    addBall(parts, 0.24, DARK_GREEN, {
      position: [end[0], 0.78, end[2]],
      scale: [1.2, 0.9, 1.2],
    });
    for (let leaf = 0; leaf < 4; leaf += 1) {
      const spread = angle + (leaf / 4) * Math.PI * 2;
      addLeaf(parts, 0.34, 0.1, DARK_GREEN, {
        position: [end[0], 0.68, end[2]],
        rotation: [0.2, spread, 0.3],
      });
    }
    for (let cherry = 0; cherry < 2; cherry += 1) {
      addBall(parts, 0.055, RED, {
        position: [
          end[0] + Math.cos(angle + cherry) * 0.12,
          0.62 + cherry * 0.12,
          end[2] + Math.sin(angle + cherry) * 0.12,
        ],
      });
    }
  }
  return parts;
}

function buildSayur(): Part[] {
  const parts: Part[] = [];
  for (let layer = 0; layer < 2; layer += 1) {
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + layer * 0.3;
      addLeaf(parts, 0.48 - layer * 0.08, 0.16, layer === 0 ? LEAF : GREEN, {
        position: [0, 0.08 + layer * 0.06, 0],
        rotation: [0.18, angle, 0.32 - layer * 0.1],
      });
    }
  }
  addBall(parts, 0.22, GREEN, {
    position: [0, 0.18, 0],
    scale: [1.1, 0.55, 1.1],
  });
  return parts;
}

const BUILDERS: Record<BotanicalKind, () => Part[]> = {
  padi: buildPadi,
  jagung: buildJagung,
  cabai: buildCabai,
  singkong: buildSingkong,
  pisang: buildPisang,
  kopi: buildKopi,
  sayur: buildSayur,
};

const cache = new Map<BotanicalKind | 'padi-young', THREE.BufferGeometry>();

export function botanicalGeometry(kind: BotanicalKind, young = false): THREE.BufferGeometry {
  const key = kind === 'padi' && young ? 'padi-young' : kind;
  const cached = cache.get(key);
  if (cached) return cached;

  const parts = key === 'padi-young' ? buildPadi(true) : BUILDERS[kind]();
  const merged = mergeGeometries(
    parts.map((part) => part.geometry),
    false,
  );
  parts.forEach((part) => part.geometry.dispose());
  if (!merged) return new THREE.BufferGeometry();

  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  cache.set(key, merged);
  return merged;
}
