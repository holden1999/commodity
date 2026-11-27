import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { SceneLayout } from './layout.js';
import { useAppStore } from '../store/useAppStore.js';

export function useFloodSimulation(layout: SceneLayout, sources: readonly string[], rain: boolean) {
  const level = useRef(.22);
  const flooded = useRef(false);
  const [waterLow, setWaterLow] = useState(false);
  const lastAffected = useRef('');
  const publish = useAppStore((state) => state.setFloodedPetak);
  const neighbors = useMemo(() => {
    const owners = new Map<string, string>();
    for (const [id, { cells }] of layout.petak) {
      for (const { col, row } of cells) owners.set(`${col}:${row}`, id);
    }
    return new Map([...layout.petak].map(([id, { cells }]) => {
      const adjacent = new Set<string>();
      for (const { col, row } of cells) {
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, -1], [0, 1]] as const) {
          const peer = owners.get(`${col + dx}:${row + dz}`);
          if (peer && peer !== id) adjacent.add(peer);
        }
      }
      return [id, adjacent];
    }));
  }, [layout]);
  const affected = useMemo(() => {
    const ids = new Set(sources);
    for (const id of sources) {
      const origin = layout.petak.get(id);
      if (!origin) continue;
      for (const neighbor of neighbors.get(id) ?? []) {
        const destination = layout.petak.get(neighbor);
        if (destination && destination.petak.mdpl <= origin.petak.mdpl + 14) ids.add(neighbor);
      }
    }
    return [...ids].sort();
  }, [sources, layout, neighbors]);
  const signature = affected.join(',');
  useFrame((_, delta) => {
    const change = Math.min(delta, .1) * (rain ? .045 : -.019);
    level.current = Math.max(.05, Math.min(1, level.current + change));
    const belowMinimum = level.current < .15;
    if (belowMinimum !== waterLow) setWaterLow(belowMinimum);
    if (level.current >= .72) flooded.current = true;
    if (level.current < .55) flooded.current = false;
    const active = flooded.current ? signature : '';
    if (active === lastAffected.current) return;
    lastAffected.current = active;
    publish(active ? Object.fromEntries(affected.map((id) => [id, true] as const)) : {});
  });
  return { water: level, waterLow };
}
