import { useMemo } from 'react';
import { OrthographicCamera } from '@react-three/drei';
import { seed } from '../data/index.js';
import type { SceneVisibility } from '../logic/filters.js';
import type { Selection } from '../logic/types.js';
import { ROADS, RIVERS } from './mapData.js';
import { buildLayout, PASAR_POSITION, TARGET_Y } from './layout.js';
import { terrainYAt, Terrain } from './terrain.js';
import { CameraRig } from './CameraRig.js';
import {
  KandangPen,
  KolamPond,
  Pasar,
  PetakPlot,
  PetakSurfaces,
  River,
  Road,
  Trees,
  ZonaTerrace,
} from './components.js';

interface SceneProps {
  selected: Selection | null;
  onSelect: (selection: Selection) => void;
  visible: SceneVisibility;
  focusZonaId: string | null;
  focusNonce: number;
}

export function Scene({
  selected,
  onSelect,
  visible,
  focusZonaId,
  focusNonce,
}: SceneProps) {
  const layout = useMemo(() => {
    const next = buildLayout(seed);
    for (const zone of next.zones) {
      zone.baseY = terrainYAt(0, zone.centerZ);
      zone.topY = zone.baseY + 0.15;
    }
    for (const placement of next.petak.values()) {
      placement.topY = terrainYAt(placement.x, placement.z) + 0.28;
    }
    return next;
  }, []);
  const komoditasById = useMemo(
    () => new Map(seed.komoditas.map((row) => [row.id, row])),
    [],
  );
  const focusZone = focusZonaId
    ? layout.zones.find((zone) => zone.zona.id === focusZonaId)
    : undefined;
  const focusTarget = focusZone
    ? {
        x: 0,
        y: focusZone.topY + 1.2,
        z: focusZone.centerZ + 4,
        zoom: 'zone' as const,
      }
    : { x: 0, y: TARGET_Y, z: 0, zoom: 'home' as const };
  const isSelected = (kind: Selection['kind'], id: string) =>
    selected?.kind === kind && selected.id === id;
  const visiblePetak = useMemo(
    () =>
      Array.from(layout.petak.values()).flatMap((placement) => {
        const komoditas = placement.petak.komoditasId
          ? komoditasById.get(placement.petak.komoditasId)
          : undefined;
        return komoditas && visible.petak.has(placement.petak.id)
          ? [{ placement, komoditas }]
          : [];
      }),
    [layout, komoditasById, visible.petak],
  );

  return (
    <>
      <color attach="background" args={['#e8f2e3']} />
      <fog attach="fog" args={['#e8f2e3', 95, 190]} />

      <OrthographicCamera
        makeDefault
        position={[60, 60, 60]}
        near={0.1}
        far={300}
        zoom={2}
      />
      <CameraRig focusTarget={focusTarget} focusNonce={focusNonce} />

      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#ffffff', '#6d8f5f', 0.45]} />
      <directionalLight
        castShadow
        position={[38, 62, 28]}
        intensity={1.9}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={1}
        shadow-camera-far={180}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />

      <Terrain />

      {layout.zones.map((zone) => (
        <ZonaTerrace
          key={zone.zona.id}
          placement={zone}
          selected={isSelected('zona', zone.zona.id)}
          onSelect={() => onSelect({ kind: 'zona', id: zone.zona.id })}
        />
      ))}

      {visiblePetak.map(({ placement }) => (
        <PetakPlot
          key={placement.petak.id}
          placement={placement}
          selected={isSelected('petak', placement.petak.id)}
          onSelect={() => onSelect({ kind: 'petak', id: placement.petak.id })}
        />
      ))}
      <PetakSurfaces rows={visiblePetak} />

      {seed.kolam.map((kolam) => {
        const placement = layout.petak.get(kolam.petakId);
        const komoditas = komoditasById.get(kolam.komoditasId);
        if (!placement || !komoditas || !visible.kolam.has(kolam.id)) return null;
        const sharedWithPen = seed.ternak.some((row) => row.petakId === kolam.petakId);
        return (
          <KolamPond
            key={kolam.id}
            kolam={kolam}
            komoditas={komoditas}
            placement={placement}
            offsetX={sharedWithPen ? -1.9 : 0}
            compact={sharedWithPen}
            selected={isSelected('kolam', kolam.id)}
            onSelect={() => onSelect({ kind: 'kolam', id: kolam.id })}
          />
        );
      })}

      {seed.ternak.map((ternak) => {
        const placement = layout.petak.get(ternak.petakId);
        const komoditas = komoditasById.get(ternak.komoditasId);
        if (!placement || !komoditas || !visible.ternak.has(ternak.id)) return null;
        const sharedWithPond = seed.kolam.some((row) => row.petakId === ternak.petakId);
        return (
          <KandangPen
            key={ternak.id}
            ternak={ternak}
            komoditas={komoditas}
            placement={placement}
            offsetX={sharedWithPond ? 1.9 : 0}
            compact={sharedWithPond}
            selected={isSelected('ternak', ternak.id)}
            onSelect={() => onSelect({ kind: 'ternak', id: ternak.id })}
          />
        );
      })}

      <Pasar
        topY={terrainYAt(PASAR_POSITION.x, PASAR_POSITION.z) + 0.1}
        selected={isSelected('pasar', 'pasar-desa-ciapus')}
        onSelect={() => onSelect({ kind: 'pasar', id: 'pasar-desa-ciapus' })}
      />

      {RIVERS.map((river) => (
        <River
          key={river.id}
          spec={river}
          selected={isSelected('sungai', river.id)}
          onSelect={() => onSelect({ kind: 'sungai', id: river.id })}
        />
      ))}

      {ROADS.map((road) => (
        <Road key={road.id} spec={road} />
      ))}

      <Trees />
    </>
  );
}
