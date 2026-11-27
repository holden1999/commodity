import type { Material } from 'three';
import type { PondBasin } from './pondBasin.js';

export function basinClip(ponds: readonly PondBasin[]) {
  // The vertical cut must follow the pond edges even when the DEM triangles
  // are wider than the pond. Use the same convex outline on all terrain layers.
  const discard = ponds.map(({ x, z, width, depth, rim }) => {
    const edges = rim.map(([ax, az], i) => {
      const [bx, bz] = rim[(i + 1) % rim.length]!;
      const nx = -(bz - az);
      const nz = bx - ax;
      return `dot(rel, vec2(${nx.toFixed(8)}, ${nz.toFixed(8)})) >= ${(nx * ax + nz * az).toFixed(8)}`;
    });
    return `{
      vec2 rel = basinXZ - vec2(${x.toFixed(8)}, ${z.toFixed(8)});
      if (abs(rel.x) <= ${(width / 2 + .001).toFixed(8)} &&
          abs(rel.y) <= ${(depth / 2 + .001).toFixed(8)} &&
          ${edges.join(' && ')}) discard;
    }`;
  }).join('\n');

  const onBeforeCompile: Material['onBeforeCompile'] = (shader) => {
    shader.vertexShader = 'varying vec2 basinXZ;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nbasinXZ = position.xz;',
    );
    shader.fragmentShader = 'varying vec2 basinXZ;\n' + shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${discard}`,
    );
  };
  return { onBeforeCompile, customProgramCacheKey: () => discard };
}
