import { useMemo } from 'react';
import { OrthographicCamera } from '@react-three/drei';
import { seed } from '../data/index.js';
import type { SceneVisibility } from '../logic/filters.js';
import type { LiveState, Selection } from '../logic/types.js';
import type { TipeTransaksi } from '../types.js';
import { ROADS, RIVERS } from './mapData.js';
import { buildLayout, PASAR_POSITION } from './layout.js';
import { MAP_WIDTH, TARGET_Y, MAP_BACKGROUND, terrainYAt } from './terrainField.js';
import { Terrain } from './terrain.js';
import { CameraRig } from './CameraRig.js';
import { LogisticsTraffic } from './LogisticsTraffic.js';
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

const NIGHT_BACKGROUND = '#0d1b26';

interface SceneProps {
  selected: Selection | null;
  onSelect: (selection: Selection) => void;
  visible: SceneVisibility;
  live: LiveState;
  focusZonaId: string | null;
  focusNonce: number;
  night: boolean;
  cutaway: boolean;
  simPlaying: boolean;
  simSpeed: number;
  rantaiPasokType: TipeTransaksi | 'Semua';
  selectedRantaiId: string | null;
}

export function Scene({
  selected,
  onSelect,
  visible,
  live,
  focusZonaId,
  focusNonce,
  night,
  cutaway,
  simPlaying,
  simSpeed,
  rantaiPasokType,
  selectedRantaiId,
}: SceneProps) {
  const layout = useMemo(() => buildLayout(seed), []);
  const komoditasById = useMemo(
    () => new Map(seed.komoditas.map((row) => [row.id, row])),
    [],
  );
  const focusZone = focusZonaId
    ? layout.zones.find((zone) => zone.zona.id === focusZonaId)
    : undefined;
  const focusTarget = focusZone
    ? {
        x: focusZone.centerX,
        y: focusZone.topY + 1.2,
        z: focusZone.centerZ,
        zoom: 'zone' as const,
        span: focusZone.span,
      }
    : { x: 0, y: TARGET_Y, z: 0, zoom: 'home' as const, span: MAP_WIDTH };
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

  const bg = night ? NIGHT_BACKGROUND : MAP_BACKGROUND;

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 95, 190]} />

      <OrthographicCamera
        makeDefault
        position={[60, 60, 60]}
        near={0.1}
        far={300}
        zoom={2}
      />
      <CameraRig focusTarget={focusTarget} focusNonce={focusNonce} />

      <ambientLight intensity={night ? 0.35 : 0.6} />
      <hemisphereLight
        args={night ? ['#7ab6e6', '#1b2d3b', 0.4] : ['#ffffff', '#6d8f5f', 0.45]}
      />
      <directionalLight
        castShadow
        position={[38, 62, 28]}
        intensity={night ? 1.1 : 1.9}
        color={night ? '#b7d7f7' : '#ffffff'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={1}
        shadow-camera-far={180}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={6}
      />

      <Terrain night={night} />

      {layout.zones.map((zone) => (
        <ZonaTerrace
          key={zone.zona.id}
          placement={zone}
          selected={isSelected('zona', zone.zona.id)}
          onSelect={() => onSelect({ kind: 'zona', id: zone.zona.id })}
        />
      ))}

      {visiblePetak.map(({ placement }) => {
        const currentRain =
          live.rainfallByPetak[placement.petak.id] ?? placement.petak.curahHujanMm;
        const lowWater = currentRain < placement.petak.curahHujanMm * 0.9;
        return (
          <PetakPlot
            key={placement.petak.id}
            placement={placement}
            lowWater={lowWater}
            selected={isSelected('petak', placement.petak.id)}
            onSelect={() => onSelect({ kind: 'petak', id: placement.petak.id })}
          />
        );
      })}
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
            offsetX={sharedWithPen ? -1.1 : 0}
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
            offsetX={sharedWithPond ? 1.1 : 0}
            compact={sharedWithPond}
            cutaway={cutaway}
            night={night}
            selected={isSelected('ternak', ternak.id)}
            onSelect={() => onSelect({ kind: 'ternak', id: ternak.id })}
          />
        );
      })}

      <Pasar
        topY={terrainYAt(PASAR_POSITION.x, PASAR_POSITION.z) + 0.1}
        cutaway={cutaway}
        night={night}
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

      <LogisticsTraffic
        rantaiPasokType={rantaiPasokType}
        selectedRantaiId={selectedRantaiId}
        simPlaying={simPlaying}
        simSpeed={simSpeed}
        night={night}
      />

      <Trees />
    </>
  );
}
