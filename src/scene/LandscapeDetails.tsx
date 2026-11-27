import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Instances } from './components.js';
import { PASAR_POSITION, type SceneLayout } from './layout.js';
import { roadEdgeDistance } from './roadNetwork.js';
import { hasRiverClearance, towardRiver } from './riverNetwork.js';
import { MAP_DEPTH, MAP_WIDTH, terrainYAt } from './terrainField.js';

type Kind = 'tree' | 'palm' | 'shrub' | 'grass' | 'stone' | 'shelter';
type Site = { x: number; z: number; size: number; turn: number; tint: number };
type Instance = {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string;
};

export function buildLandscapeSites(layout: SceneLayout) {
  const footprints = [...layout.petak.values()].flatMap((parcel) => parcel.footprints);
  const sites: Record<Kind, Site[]> = { tree: [], palm: [], shrub: [], grass: [], stone: [], shelter: [] };
  let seed = 17471;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const openSpace = (x: number, z: number, radius: number, roadDistance: number) => (
    roadDistance > radius + .42 &&
    Math.hypot(x - PASAR_POSITION.x, z - PASAR_POSITION.z) > radius + 2.9 &&
    hasRiverClearance(x, z, radius + .18) &&
    footprints.every((plot) => Math.abs(x - plot.x) > plot.width / 2 + radius ||
      Math.abs(z - plot.z) > plot.depth / 2 + radius)
  );

  for (let row = -MAP_DEPTH / 2 + 1; row < MAP_DEPTH / 2 - 1; row += 1.65) {
    for (let col = -MAP_WIDTH / 2 + 1; col < MAP_WIDTH / 2 - 1; col += 1.65) {
      const x = col + (random() - .5) * 1.5;
      const z = row + (random() - .5) * 1.5;
      const pick = random();
      const size = .65 + random() * .65;
      const turn = random() * Math.PI * 2;
      const tint = Math.floor(random() * 4);
      const roadDistance = roadEdgeDistance(x, z);
      const grove = (Math.sin(x * .27 + Math.cos(z * .18)) + Math.cos(z * .32 - x * .07)) * .25 + .5;
      const riverside = towardRiver(x, z).distance < 4;
      const site = { x, z, size, turn, tint };
      const palm = tint === 0 && (riverside || terrainYAt(x, z) < 4);
      if (pick < .025 && roadDistance < 3.8 && sites.shelter.length < 12 &&
          sites.shelter.every((s) => Math.hypot(s.x - x, s.z - z) > 6) &&
          openSpace(x, z, .87, roadDistance)) {
        sites.shelter.push(site);
      } else if (pick < .09 + grove * .27 && openSpace(x, z, size * (palm ? .92 : .67), roadDistance)) {
        (palm ? sites.palm : sites.tree).push(site);
      } else if (pick < .48 + grove * .17 && openSpace(x, z, size * .41, roadDistance)) {
        sites.shrub.push(site);
      } else if (pick > .86 && openSpace(x, z, size * .32, roadDistance)) {
        sites.stone.push(site);
      } else if (openSpace(x, z, size * .28, roadDistance)) {
        sites.grass.push(site);
      }
    }
  }
  return sites;
}

const greens = ['#3d642e', '#577a32', '#668443', '#788f43'];
const brush = ['#718647', '#809553', '#567637', '#9c9c59'];
const stones = ['#928671', '#a8a48a', '#827f68', '#b2a28c'];

function onGround(site: Site, offsetY: number, scale: [number, number, number], color: string): Instance {
  const { x, z, size, turn } = site;
  return {
    position: [x, terrainYAt(x, z) + offsetY * size, z],
    scale: scale.map((axis) => axis * size) as Instance['scale'],
    rotation: [0, turn, 0],
    color,
  };
}

function landscapeBatches(sites: ReturnType<typeof buildLandscapeSites>) {
  const trunks = [
    ...sites.tree.map((s) => onGround(s, .41, [.12, .86, .12], '#796448')),
    ...sites.palm.map((s) => onGround(s, .67, [.10, 1.36, .10], '#99835b')),
  ];
  const crowns = sites.tree.flatMap((s) => [
    onGround(s, .92, [.59, .54, .56], greens[s.tint]!),
    onGround(s, 1.25, [.41, .42, .44], greens[(s.tint + 1) % 4]!),
  ]);
  const fronds = sites.palm.flatMap((s) => Array.from({ length: 6 }, (_, i) => {
    const angle = s.turn + i * Math.PI / 3;
    const item = onGround(s, 1.27 + (i % 2) * .085, [.18, .088, .54], greens[(s.tint + i) % 4]!);
    item.position[0] += Math.sin(angle) * .32 * s.size;
    item.position[2] += Math.cos(angle) * .32 * s.size;
    item.rotation = [.18 + (i % 2) * .2, angle, 0];
    return item;
  }));
  const shrubs = sites.shrub.map((s) => onGround(s, .19, [.36, .31, .34], brush[s.tint]!));
  const grass = sites.grass.flatMap((s) => [-1, 0, 1].map((blade) => {
    const color = brush[s.tint]!;
    const item = onGround(s, .15, [.055, blade === 0 ? .38 : .3, .047], color);
    item.position[0] += blade * .075 * s.size * Math.cos(s.turn);
    item.position[2] += blade * .075 * s.size * Math.sin(s.turn);
    item.rotation = [blade * .25, s.turn, blade * .26];
    return item;
  }));
  const rocks = sites.stone.map((s) => onGround(s, .11, [.28, .21, .22], stones[s.tint]!));
  const walls = sites.shelter.map((s) => onGround({ ...s, size: Math.min(s.size, 1) },
    .21, [1.02, .56, .74], '#a98657'));
  const roofs = sites.shelter.map((s) => {
    const item = onGround({ ...s, size: Math.min(s.size, 1) }, .62, [.86, .34, .72],
      s.tint % 2 ? '#9d6243' : '#8b583d');
    item.rotation = [0, s.turn + Math.PI / 4, 0];
    return item;
  });
  return { trunks, crowns, fronds, shrubs, grass, rocks, walls, roofs };
}

export function LandscapeDetails({ layout, wind }: { layout: SceneLayout; wind: number }) {
  const details = useMemo(() => landscapeBatches(buildLandscapeSites(layout)), [layout]);
  const canopy = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (canopy.current) canopy.current.position.x = Math.sin(clock.elapsedTime * 1.4) * Math.min(.045, wind * .009);
  });
  const material = <meshLambertMaterial flatShading />;
  return (
    <>
      <Instances receiveShadow items={details.trunks}><cylinderGeometry args={[.67, 1, 1, 6]} />{material}</Instances>
      <group ref={canopy}>
        <Instances receiveShadow items={details.crowns} castShadow><icosahedronGeometry args={[1, 0]} />{material}</Instances>
        <Instances receiveShadow items={details.fronds}><icosahedronGeometry args={[1, 0]} />{material}</Instances>
      </group>
      <Instances receiveShadow items={details.shrubs}><icosahedronGeometry args={[1, 0]} />{material}</Instances>
      <Instances receiveShadow items={details.grass}><coneGeometry args={[1, 1, 3]} />{material}</Instances>
      <Instances receiveShadow items={details.rocks}><dodecahedronGeometry args={[1, 0]} />{material}</Instances>
      <Instances receiveShadow items={details.walls} castShadow><boxGeometry />{material}</Instances>
      <Instances receiveShadow items={details.roofs} castShadow><coneGeometry args={[1, 1, 4]} />{material}</Instances>
    </>
  );
}
