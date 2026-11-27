import { useMemo } from 'react';
import { OrthographicCamera } from '@react-three/drei';
import { seed } from '../data/index.js';
import { Vector3 } from 'three';
import { DEFAULT_ENVIRONMENT, sunDirection, weatherConditions } from '../logic/environment.js';
import { buildDecisionStatus } from '../logic/decision.js';
import { average, landInput, observedRainfall } from '../logic/fuzzyInputs.js';
import { useAppStore } from '../store/useAppStore.js';
import { Atmosphere } from './Atmosphere.js';
import { CropPlot, cropKind } from './CropPlot.js';
import { FloodSurface } from './FloodSurface.js';
import { useFloodSimulation } from './useFloodSimulation.js';
import type { SceneVisibility } from '../logic/filters.js';
import type { LiveState, Selection } from '../logic/types.js';
import { sceneRivers, towardRiver } from './riverNetwork.js';
import { findPondBasin } from './pondBasin.js';
import { buildLayout, facilityFootprint, PASAR_POSITION } from './layout.js';
import { MAP_WIDTH, TARGET_Y, MAP_BACKGROUND, terrainYAt } from './terrainField.js';
import { Terrain } from './terrain.js';
import { LandscapeDetails } from './LandscapeDetails.js';
import { CameraRig } from './CameraRig.js';
import {
  FacilityGround,
  KandangPen,
  KolamPond,
  Pasar,
  River,
  Roads,
  MappedRiverBanks,
  VillageBoundary,
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
}: SceneProps) {
  const layout = useMemo(() => buildLayout(seed), []);
  const environment = live.environment ?? DEFAULT_ENVIRONMENT;
  const growth = useAppStore((state) => state.growth);
  const annualRain = average(seed.petak.map((petak) => observedRainfall(petak, live))) ?? 3000;
  const conditions = weatherConditions(environment, annualRain);
  const morning = environment.period === 'Pagi';
  const evening = environment.period === 'Sore';
  const solar = useMemo(() => sunDirection(environment, new Date(live.updatedAt)),
    [environment, live.updatedAt]);
  const sun = useMemo(() => new Vector3(solar.x, solar.y, solar.z), [solar]);
  const clouded = conditions.weather !== 'Cerah';
  const sunlight = night ? .7 : clouded ? 1.04 : 1.38 + sun.y * .52;
  const sky = night ? NIGHT_BACKGROUND : clouded ? '#aabac2' :
    conditions.dry ? '#eee0ba' : morning || evening ? '#edcba7' : MAP_BACKGROUND;
  const komoditasById = useMemo(
    () => new Map(seed.komoditas.map((row) => [row.id, row])),
    [],
  );
  const kolamByPetak = useMemo(
    () => new Map(seed.kolam.map((row) => [row.petakId, row])),
    [],
  );
  const ternakByPetak = useMemo(
    () => new Map(seed.ternak.map((row) => [row.petakId, row])),
    [],
  );
  const pondBasins = useMemo(() => new Map(seed.kolam.flatMap((pond) => {
    const placement = layout.petak.get(pond.petakId);
    const basin = placement && findPondBasin(placement, ternakByPetak.has(pond.petakId), pond.tipe === 'Bioflok');
    return basin ? [[pond.id, basin] as const] : [];
  })), [layout, ternakByPetak]);
  const excavations = useMemo(() => [...pondBasins].flatMap(([id, basin]) =>
    visible.kolam.has(id) ? [basin] : []), [pondBasins, visible.kolam]);
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
  const riverside = useMemo(() => [...layout.petak.values()]
    .filter(({ petak }) => petak.zonaId === 'zona-1'), [layout]);
  const floodSources = useMemo(() => {
    const baseline = { ...live, floodedPetak: undefined };
    return [...layout.petak.values()].filter(({ petak }) =>
      kolamByPetak.has(petak.id) ||
      (petak.zonaId === 'zona-1' && buildDecisionStatus(
        { kind: 'petak', id: petak.id }, baseline,
      )?.recommendedKomoditasId === 'kom-padi'),
    ).map(({ petak }) => petak.id);
  }, [layout, kolamByPetak, live]);
  const { water, waterLow } = useFloodSimulation(layout, floodSources, conditions.rain);
  const cropPlots = useMemo(() => [...layout.petak.values()].flatMap((placement) => {
    const { petak, x, z } = placement;
    if (!visible.petak.has(petak.id) || kolamByPetak.has(petak.id) || ternakByPetak.has(petak.id)) return [];
    const status = buildDecisionStatus({ kind: 'petak', id: petak.id }, live);
    const input = landInput(petak, live);
    const local = weatherConditions(environment, observedRainfall(petak, live));
    const eroding = (conditions.heavy || local.heavy) && input.slope >= 12 &&
      (petak.zonaId === 'zona-3' || petak.zonaId === 'zona-4');
    const river = eroding ? towardRiver(x, z) : null;
    const erosion = river && river.distance > 0
      ? { x: river.x / river.distance * 1.05, z: river.z / river.distance * 1.05 } : null;
    return [{ placement, status, input, local, erosion }];
  }), [layout, visible.petak, kolamByPetak, ternakByPetak, live, environment, conditions.heavy]);

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, clouded || conditions.dry ? 75 : 100, clouded ? 185 : 230]} />

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
        position={[sun.x * 72, sun.y * 72, sun.z * 72]}
        intensity={sunlight}
        color={night ? '#b7d7f7' : clouded ? '#ced4d9' : morning || evening ? '#ffc18d' : '#ffffff'}
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

      <Terrain excavations={excavations} night={night} wet={conditions.rain} dry={conditions.dry} />
      <FloodSurface layout={layout} flooded={live.floodedPetak} water={water} />
      <Atmosphere conditions={conditions} morning={morning} riverside={riverside} />
      <VillageBoundary night={night} />

      {layout.zones.map((zone) => (
        <ZonaTerrace
          key={zone.zona.id}
          placement={zone}
          excavations={excavations}
          selected={isSelected('zona', zone.zona.id)}
          onSelect={() => onSelect({ kind: 'zona', id: zone.zona.id })}
        />
      ))}

      {cropPlots.flatMap(({ placement, status, input, local, erosion }) =>
        placement.footprints.map((footprint, index) => (
          <CropPlot key={`${placement.petak.id}:${index}`} placement={placement}
            footprint={footprint} showLabel={index === 0}
            kind={cropKind[status?.recommendedKomoditasId ?? '']}
            score={status?.fuzzyScore ?? null} name={status?.recommendedKomoditas ?? null}
            rain={conditions.rain || local.rain} drought={local.dry}
            waterLow={waterLow && !local.rain}
            flooded={input.flooded === true} erosion={erosion} growth={growth}
            wind={local.wind} water={water} sun={sun} sky={sky} sunExposure={input.sunExposure}
            selected={isSelected('petak', placement.petak.id)}
            onSelect={() => onSelect({ kind: 'petak', id: placement.petak.id })}
          />
        )))}

      {[...layout.petak.values()].flatMap(({ petak, footprints }) => {
        const pond = kolamByPetak.get(petak.id);
        const pen = ternakByPetak.get(petak.id);
        const selection: Selection | null = pond && visible.kolam.has(pond.id)
          ? { kind: 'kolam', id: pond.id }
          : pen && visible.ternak.has(pen.id) ? { kind: 'ternak', id: pen.id } : null;
        if (!selection) return [];
        const basin = pond && visible.kolam.has(pond.id) ? pondBasins.get(pond.id) : undefined;
        return footprints.filter((footprint, index) =>
          footprint !== basin?.footprint && (index > 0 || !pen)).map((footprint, index) => (
          <FacilityGround key={`${petak.id}:${index}`} footprint={footprint}
            flooded={live.floodedPetak?.[petak.id] === true} onSelect={() => onSelect(selection)} />
        ));
      })}

      {seed.kolam.map((kolam) => {
        const placement = layout.petak.get(kolam.petakId);
        const status = buildDecisionStatus({ kind: 'kolam', id: kolam.id }, live);
        const komoditas = komoditasById.get(status?.recommendedKomoditasId ?? kolam.komoditasId);
        if (!placement || !komoditas || !visible.kolam.has(kolam.id)) return null;
        const basin = pondBasins.get(kolam.id);
        if (!basin) return null;
        return (
          <KolamPond
            key={kolam.id}
            kolam={kolam}
            komoditas={komoditas}
            stressed={(status?.fuzzyScore ?? 100) < 40}
            flooded={live.floodedPetak?.[placement.petak.id] === true}
            water={water}
            basin={basin}
            hectares={placement.petak.luasHa}
            selected={isSelected('kolam', kolam.id)}
            onSelect={() => onSelect({ kind: 'kolam', id: kolam.id })}
          />
        );
      })}

      {seed.ternak.map((ternak) => {
        const placement = layout.petak.get(ternak.petakId);
        const status = buildDecisionStatus({ kind: 'ternak', id: ternak.id }, live);
        const komoditas = komoditasById.get(status?.recommendedKomoditasId ?? ternak.komoditasId);
        const jenis = seed.ternak.find((row) => row.komoditasId === komoditas?.id)?.jenis ?? ternak.jenis;
        if (!placement || !komoditas || !visible.ternak.has(ternak.id)) return null;
        const sharedWithPond = seed.kolam.some((row) => row.petakId === ternak.petakId);
        return (
          <KandangPen
            key={ternak.id}
            ternak={ternak}
            jenis={jenis}
            komoditas={komoditas}
            stressed={(status?.fuzzyScore ?? 100) < 40}
            flooded={live.floodedPetak?.[placement.petak.id] === true}
            placement={facilityFootprint(placement.footprints[0]!, sharedWithPond ? 1 : 0)}
            hectares={placement.petak.luasHa}
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

      {sceneRivers.map((river) => (
        <River
          key={river.outlet ? 'cisadane-outlet' : river.id}
          spec={river}
          selected={isSelected('sungai', river.id)}
          onSelect={() => onSelect({ kind: 'sungai', id: river.id })}
        />
      ))}

      <Roads />
      <MappedRiverBanks />

      <LandscapeDetails layout={layout} wind={conditions.wind} />
    </>
  );
}
