import { seed } from '../data/index.js';
import type { Kolam, Ternak, TipeTransaksi } from '../types.js';
import { calculateFuzzyScore, profileFor } from './fuzzy.js';
import { landInput, waterInput } from './fuzzyInputs.js';
import type { CiapusFilters, LiveState, Selection } from './types.js';

export interface SceneVisibility {
  petak: Set<string>;
  kolam: Set<string>;
  ternak: Set<string>;
}

const zonaById = new Map(seed.zona.map((zona) => [zona.id, zona]));
const petakById = new Map(seed.petak.map((petak) => [petak.id, petak]));
const kolamByPetak = new Map<string, Kolam[]>();
const ternakByPetak = new Map<string, Ternak[]>();

for (const kolam of seed.kolam) {
  const rows = kolamByPetak.get(kolam.petakId) ?? [];
  rows.push(kolam);
  kolamByPetak.set(kolam.petakId, rows);
}

for (const ternak of seed.ternak) {
  const rows = ternakByPetak.get(ternak.petakId) ?? [];
  rows.push(ternak);
  ternakByPetak.set(ternak.petakId, rows);
}

const riskFor = (petakId: string) => {
  const petak = petakById.get(petakId);
  return petak ? zonaById.get(petak.zonaId)?.risikoBanjir : undefined;
};

const fuzzyPass = (score: number | null, enabled: boolean) =>
  !enabled || (score !== null && score > 70);

/**
 * Pure filter selector. Flood risk follows the petak zone. The fuzzy filter
 * uses each object's own commodity, not the petak's crop.
 */
export function buildSceneVisibility(
  filters: CiapusFilters,
  live: LiveState,
): SceneVisibility {
  const petak = new Set<string>();
  const kolam = new Set<string>();
  const ternak = new Set<string>();

  for (const row of seed.petak) {
    const riskPass = !filters.highFloodRisk || riskFor(row.id) === 'Tinggi';
    if (!riskPass) continue;

    if (row.komoditasId) {
      const profile = profileFor(row.komoditasId);
      const score = profile
        ? calculateFuzzyScore(landInput(row, live), profile)
        : null;
      if (fuzzyPass(score, filters.highFuzzy)) petak.add(row.id);
    }

    for (const pond of kolamByPetak.get(row.id) ?? []) {
      const profile = profileFor(pond.komoditasId);
      const score = profile
        ? calculateFuzzyScore(waterInput(pond, row, live), profile)
        : null;
      if (fuzzyPass(score, filters.highFuzzy)) kolam.add(pond.id);
    }

    for (const pen of ternakByPetak.get(row.id) ?? []) {
      const profile = profileFor(pen.komoditasId);
      const score = profile
        ? calculateFuzzyScore(landInput(row, live), profile)
        : null;
      if (fuzzyPass(score, filters.highFuzzy)) ternak.add(pen.id);
    }
  }

  return { petak, kolam, ternak };
}

export function isSelectionVisible(
  selection: Selection,
  visibility: SceneVisibility,
): boolean {
  switch (selection.kind) {
    case 'petak':
      return visibility.petak.has(selection.id);
    case 'kolam':
      return visibility.kolam.has(selection.id);
    case 'ternak':
      return visibility.ternak.has(selection.id);
    default:
      return true;
  }
}

export interface RantaiPasokView {
  id: string;
  tipe: TipeTransaksi;
  dariNama: string;
  keNama: string;
  komoditasNama: string;
  marginRp: number;
}

export function selectRantaiPasok(
  type: TipeTransaksi | 'Semua',
): RantaiPasokView[] {
  const pelaku = new Map(seed.pelaku.map((row) => [row.id, row]));
  const komoditas = new Map(seed.komoditas.map((row) => [row.id, row]));

  return seed.rantaiPasok
    .filter((row) => type === 'Semua' || row.tipe === type)
    .map((row) => ({
      id: row.id,
      tipe: row.tipe,
      dariNama: pelaku.get(row.dariId)?.nama ?? row.dariId,
      keNama: pelaku.get(row.keId)?.nama ?? row.keId,
      komoditasNama: komoditas.get(row.komoditasId)?.nama ?? row.komoditasId,
      marginRp: row.marginRp,
    }));
}
