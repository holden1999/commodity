import { useMemo } from 'react';
import { seed } from '../data/index.js';
import { SEASONS, WEATHERS } from '../logic/environment.js';
import { rankCommodities } from '../logic/fuzzy.js';
import { landInput, waterInput } from '../logic/fuzzyInputs.js';
import { useAppStore } from '../store/useAppStore.js';

const LAND_FIELDS = [
  { key: 'ph', label: 'pH tanah', min: 4.5, max: 8.5, step: 0.1 },
  { key: 'curahHujanMm', label: 'Curah hujan', min: 2600, max: 4600, step: 25 },
  { key: 'ndvi', label: 'NDVI', min: 0.3, max: 0.95, step: 0.01 },
  { key: 'slope', label: 'Kemiringan', min: 0, max: 25, step: 1 },
  { key: 'mdpl', label: 'Elevasi', min: 200, max: 325, step: 1 },
] as const;

const WATER_FIELDS = [
  { key: 'ph', label: 'pH air', min: 6, max: 9, step: 0.1 },
  { key: 'suhuAir', label: 'Suhu air', min: 20, max: 35, step: 0.1 },
  { key: 'do', label: 'Oksigen', min: 2, max: 9, step: 0.1 },
] as const;

const scoreTone = (score: number) =>
  score >= 75 ? 'good' : score >= 50 ? 'fair' : 'low';

export function FuzzyLab() {
  const selection = useAppStore((state) => state.selection);
  const focusZonaId = useAppStore((state) => state.focusZonaId);
  const live = useAppStore((state) => state.live);
  const setLandInput = useAppStore((state) => state.setLandInput);
  const setWaterInput = useAppStore((state) => state.setWaterInput);
  const setSeason = useAppStore((state) => state.setSeason);
  const setWeather = useAppStore((state) => state.setWeather);
  const resetFuzzy = useAppStore((state) => state.resetFuzzy);
  const fuzzyDirty = useAppStore((state) => state.fuzzyDirty);

  const target = useMemo(() => {
    const selectedPetak =
      selection?.kind === 'petak'
        ? seed.petak.find((row) => row.id === selection.id)
        : undefined;
    const selectedKolam =
      selection?.kind === 'kolam'
        ? seed.kolam.find((row) => row.id === selection.id)
        : undefined;
    const selectedZona =
      selection?.kind === 'zona' ? selection.id : focusZonaId;
    const petak =
      selectedPetak ??
      (selectedKolam
        ? seed.petak.find((row) => row.id === selectedKolam.petakId)
        : undefined) ??
      (selectedZona
        ? seed.petak.find((row) => row.zonaId === selectedZona)
        : undefined) ??
      seed.petak[0];
    const kolam =
      selectedKolam ??
      (petak ? seed.kolam.find((row) => row.petakId === petak.id) : undefined);
    return { petak, kolam };
  }, [selection, focusZonaId]);

  const { petak, kolam } = target;
  const useWater = selection?.kind === 'kolam' && Boolean(kolam);
  const input = useMemo(
    () =>
      petak
        ? useWater && kolam
          ? waterInput(kolam, petak, live)
          : landInput(petak, live)
        : null,
    [petak, kolam, useWater, live],
  );

  const ranked = useMemo(
    () =>
      input
        ? rankCommodities(input, input.kind === 'air' ? 'Perikanan' : 'Pertanian').slice(0, 4)
        : [],
    [input],
  );

  if (!petak || !input) return null;

  const isWater = input.kind === 'air';

  return (
    <aside className={`fuzzy-lab${fuzzyDirty ? ' is-dirty' : ''}`} aria-label="Simulasi fuzzy">
      <header className="fuzzy-lab__header">
        <div>
          <p>Simulasi fuzzy</p>
          <strong>{useWater && kolam ? `${kolam.tipe} · ${petak.nama}` : petak.nama}</strong>
        </div>
        <button type="button" onClick={resetFuzzy} title="Kembalikan nilai awal">
          Reset
        </button>
      </header>

      <div className="fuzzy-lab__environment">
        <label>
          Musim
          <select
            value={live.environment.season}
            onChange={(event) => setSeason(event.target.value as (typeof SEASONS)[number])}
          >
            {SEASONS.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cuaca
          <select
            value={live.environment.weather}
            onChange={(event) => setWeather(event.target.value as (typeof WEATHERS)[number])}
          >
            {WEATHERS.map((weather) => (
              <option key={weather} value={weather}>
                {weather}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="fuzzy-lab__metrics">
        <span>
          Sinar matahari <b>{Math.round(input.sunExposure)}</b>
        </span>
        <span>
          Aliran air <b>{Math.round(input.waterflow)}</b>
        </span>
      </div>

      <div className="fuzzy-lab__sliders">
        {(isWater ? WATER_FIELDS : LAND_FIELDS).map((field) => {
          const value =
            field.key === 'suhuAir'
              ? input.suhuAir ?? 0
              : field.key === 'do'
                ? input.do ?? 0
                : field.key === 'ph'
                  ? input.ph
                  : input[field.key];
          return (
            <label key={field.key} className="fuzzy-lab__field">
              <span>
                {field.label}
                <b>{typeof value === 'number' ? value.toFixed(field.step < 1 ? 2 : 0) : '—'}</b>
              </span>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={value ?? field.min}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (isWater) {
                    setWaterInput(kolam!.id, field.key as 'ph' | 'suhuAir' | 'do', next);
                  } else {
                    setLandInput(
                      petak.id,
                      field.key as 'ph' | 'curahHujanMm' | 'ndvi' | 'slope' | 'mdpl',
                      next,
                    );
                  }
                }}
              />
            </label>
          );
        })}
      </div>

      <div className="fuzzy-lab__scale" aria-label="Skala warna petak">
        <span><i className="fuzzy-lab__dot fuzzy-lab__dot--good" />Sesuai</span>
        <span><i className="fuzzy-lab__dot fuzzy-lab__dot--fair" />Cukup</span>
        <span><i className="fuzzy-lab__dot fuzzy-lab__dot--low" />Rendah</span>
      </div>

      <div className="fuzzy-lab__rank">
        <p>Komoditas paling sesuai</p>
        {ranked.map((row) => {
          const komoditas = seed.komoditas.find((item) => item.id === row.komoditasId);
          return (
            <div key={row.komoditasId} className="fuzzy-lab__rank-row">
              <span>{komoditas?.nama ?? row.komoditasId}</span>
              <i className={`fuzzy-lab__bar fuzzy-lab__bar--${scoreTone(row.score)}`}>
                <b style={{ width: `${row.score}%` }} />
              </i>
              <strong>{row.score}</strong>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
