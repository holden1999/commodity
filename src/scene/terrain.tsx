import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  MAP_DEPTH,
  MAP_WIDTH,
  TERRAIN_MAX_MDPL,
  TERRAIN_MIN_MDPL,
  sampleElevation,
  terrainYAt,
} from './terrainField.js';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function buildTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(MAP_WIDTH, MAP_DEPTH, 56, 48);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const low = new THREE.Color('#5f8f4a');
  const mid = new THREE.Color('#9bb268');
  const high = new THREE.Color('#c9ab70');
  const color = new THREE.Color();

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    positions.setY(index, terrainYAt(x, z));

    const t = clamp(
      (sampleElevation(x, z) - TERRAIN_MIN_MDPL) /
        (TERRAIN_MAX_MDPL - TERRAIN_MIN_MDPL),
      0,
      1,
    );
    color.copy(low).lerp(mid, clamp(t * 2, 0, 1));
    color.lerp(high, clamp((t - 0.5) * 2, 0, 1));
    color.toArray(colors, index * 3);
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const normals = geometry.attributes.normal;
  const light = new THREE.Vector3(0.65, 0.45, 0.35).normalize();
  for (let index = 0; index < positions.count; index += 1) {
    const shade =
      0.42 +
      0.58 *
        Math.max(
          0,
          normals.getX(index) * light.x +
            normals.getY(index) * light.y +
            normals.getZ(index) * light.z,
        );
    colors[index * 3] = (colors[index * 3] ?? 0) * shade;
    colors[index * 3 + 1] = (colors[index * 3 + 1] ?? 0) * shade;
    colors[index * 3 + 2] = (colors[index * 3 + 2] ?? 0) * shade;
  }
  geometry.attributes.color.needsUpdate = true;
  return geometry;
}

function buildContourGeometry() {
  const cols = 56;
  const rows = 48;
  const stepX = MAP_WIDTH / cols;
  const stepZ = MAP_DEPTH / rows;
  const positions: number[] = [];
  const heights: number[] = [];

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      const x = -MAP_WIDTH / 2 + col * stepX;
      const z = -MAP_DEPTH / 2 + row * stepZ;
      heights.push(terrainYAt(x, z));
    }
  }

  const heightAt = (col: number, row: number) =>
    heights[row * (cols + 1) + col] ?? 0;
  const xAt = (col: number) => -MAP_WIDTH / 2 + col * stepX;
  const zAt = (row: number) => -MAP_DEPTH / 2 + row * stepZ;
  const push = (
    x1: number,
    z1: number,
    h1: number,
    x2: number,
    z2: number,
    h2: number,
    level: number,
  ) => {
    if ((h1 < level && h2 < level) || (h1 > level && h2 > level)) return;
    const t = h1 === h2 ? 0 : (level - h1) / (h2 - h1);
    positions.push(
      x1 + (x2 - x1) * t,
      level + 0.03,
      z1 + (z2 - z1) * t,
    );
  };

  for (let level = 0.5; level < 10; level += 0.5) {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const h00 = heightAt(col, row);
        const h10 = heightAt(col + 1, row);
        const h01 = heightAt(col, row + 1);
        const h11 = heightAt(col + 1, row + 1);
        const min = Math.min(h00, h10, h01, h11);
        const max = Math.max(h00, h10, h01, h11);
        if (level < min || level > max) continue;

        const x0 = xAt(col);
        const x1 = xAt(col + 1);
        const z0 = zAt(row);
        const z1 = zAt(row + 1);
        const before = positions.length;

        push(x0, z0, h00, x1, z0, h10, level);
        push(x1, z0, h10, x1, z1, h11, level);
        push(x1, z1, h11, x0, z1, h01, level);
        push(x0, z1, h01, x0, z0, h00, level);

        if (positions.length - before > 6) {
          positions.length = before + 6;
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

/** Terrain mesh from the real SRTM grid. */
export function Terrain() {
  const geometry = useMemo(() => buildTerrainGeometry(), []);
  const contours = useMemo(() => buildContourGeometry(), []);

  useEffect(
    () => () => {
      geometry.dispose();
      contours.dispose();
    },
    [geometry, contours],
  );

  return (
    <>
      <mesh geometry={geometry} receiveShadow>
        <meshLambertMaterial vertexColors />
      </mesh>
      <lineSegments geometry={contours} raycast={() => {}}>
        <lineBasicMaterial color="#3f5d37" transparent opacity={0.38} depthWrite={false} />
      </lineSegments>
    </>
  );
}
