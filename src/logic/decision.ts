import { seed } from '../data/index.js';
import type { Petak, Zona } from '../types.js';
import {
  calculateFuzzyScore,
  profileFor,
  rankCommodities,
} from './fuzzy.js';
import { average, averageInput, landInput, waterInput } from './fuzzyInputs.js';
import { priceSnapshot } from './prices.js';
import type { LiveState, Selection, SelectionKind } from './types.js';

const RIVER_NAMES: Record<string, string> = {
  'ci-apus': 'Ci Apus',
  ciapus: 'Ciapus',
};

export interface DecisionStatus {
  id: string;
  kind: SelectionKind;
  name: string;
  zona: string;
  fuzzyScore: number | null;
  recommendedKomoditas: string | null;
  soilPh: number | null;
  waterPh: number | null;
  rainfallMm: number | null;
  ndvi: number | null;
  hargaDesaRp: number | null;
  hppRp: number | null;
  hargaPasarBapanasRp: number | null;
  hargaKomoditas: string | null;
  lastUpdated: string;
}

const commodityName = (komoditasId: string | null | undefined) =>
  seed.komoditas.find((komoditas) => komoditas.id === komoditasId)?.nama ?? null;

const recommendedId = (
  ranked: readonly { komoditasId: string; score: number }[],
  assignedId: string | null,
): string | null => {
  const top = ranked[0];
  const assigned = ranked.find((row) => row.komoditasId === assignedId);
  return assigned && top && assigned.score >= top.score - 2
    ? assigned.komoditasId
    : top?.komoditasId ?? null;
};

const zonaFor = (petak: Petak): Zona | undefined =>
  seed.zona.find((zona) => zona.id === petak.zonaId);

function pricedStatus(
  komoditasId: string | null,
  live: LiveState,
): Pick<
  DecisionStatus,
  | 'hargaDesaRp'
  | 'hppRp'
  | 'hargaPasarBapanasRp'
  | 'hargaKomoditas'
> {
  if (!komoditasId) {
    return {
      hargaDesaRp: null,
      hppRp: null,
      hargaPasarBapanasRp: null,
      hargaKomoditas: null,
    };
  }
  const price = priceSnapshot(
    komoditasId,
    live.bapanasByKomoditas[komoditasId] ?? null,
  );
  return {
    ...price,
    hargaKomoditas: commodityName(komoditasId),
  };
}

function statusFromPetak(
  petak: Petak,
  live: LiveState,
): DecisionStatus {
  const zona = zonaFor(petak);
  const input = landInput(petak, live);
  const ranked = rankCommodities(input, 'Pertanian');
  const assignedId = petak.komoditasId ?? ranked[0]?.komoditasId ?? null;
  const profile = assignedId ? profileFor(assignedId) : undefined;
  const score = profile
    ? calculateFuzzyScore(input, profile)
    : ranked[0]?.score ?? null;

  return {
    id: petak.id,
    kind: 'petak',
    name: petak.nama,
    zona: zona?.nama ?? '—',
    fuzzyScore: score,
    recommendedKomoditas: commodityName(recommendedId(ranked, petak.komoditasId)),
    soilPh: petak.phTanah,
    waterPh: null,
    rainfallMm: input.curahHujanMm,
    ndvi: input.ndvi,
    ...pricedStatus(assignedId, live),
    lastUpdated: live.updatedAt,
  };
}

function statusFromKolam(kolamId: string, live: LiveState): DecisionStatus | null {
  const kolam = seed.kolam.find((row) => row.id === kolamId);
  if (!kolam) return null;
  const petak = seed.petak.find((row) => row.id === kolam.petakId);
  if (!petak) return null;
  const zona = zonaFor(petak);
  const input = waterInput(kolam, petak, live);
  const ranked = rankCommodities(input, 'Perikanan');
  const profile = profileFor(kolam.komoditasId);
  const komoditas = commodityName(kolam.komoditasId);
  return {
    id: kolam.id,
    kind: 'kolam',
    name: `${komoditas ?? 'Kolam'} · ${kolam.tipe}`,
    zona: zona?.nama ?? '—',
    fuzzyScore: profile ? calculateFuzzyScore(input, profile) : null,
    recommendedKomoditas: commodityName(recommendedId(ranked, kolam.komoditasId)),
    soilPh: null,
    waterPh: kolam.phAir,
    rainfallMm: input.curahHujanMm,
    ndvi: input.ndvi,
    ...pricedStatus(kolam.komoditasId, live),
    lastUpdated: live.updatedAt,
  };
}

function statusFromTernak(ternakId: string, live: LiveState): DecisionStatus | null {
  const ternak = seed.ternak.find((row) => row.id === ternakId);
  if (!ternak) return null;
  const petak = seed.petak.find((row) => row.id === ternak.petakId);
  if (!petak) return null;
  const zona = zonaFor(petak);
  const input = landInput(petak, live);
  const ranked = rankCommodities(input, 'Peternakan');
  const profile = profileFor(ternak.komoditasId);

  return {
    id: ternak.id,
    kind: 'ternak',
    name: `Kandang ${ternak.jenis}`,
    zona: zona?.nama ?? '—',
    fuzzyScore: profile ? calculateFuzzyScore(input, profile) : null,
    recommendedKomoditas: commodityName(recommendedId(ranked, ternak.komoditasId)),
    soilPh: petak.phTanah,
    waterPh: null,
    rainfallMm: input.curahHujanMm,
    ndvi: input.ndvi,
    ...pricedStatus(ternak.komoditasId, live),
    lastUpdated: live.updatedAt,
  };
}

function statusFromZona(zonaId: string, live: LiveState): DecisionStatus | null {
  const zona = seed.zona.find((row) => row.id === zonaId);
  if (!zona) return null;
  const petakRows = seed.petak.filter((petak) => petak.zonaId === zonaId);
  const cropRows = petakRows.filter((petak) => petak.komoditasId !== null);
  const input = averageInput(cropRows.length > 0 ? cropRows : petakRows, live);
  const ranked = rankCommodities(input, 'Pertanian');
  const recommended = ranked[0]?.komoditasId ?? null;
  const scores = cropRows
    .map((petak) => {
      const profile = petak.komoditasId
        ? profileFor(petak.komoditasId)
        : undefined;
      return profile ? calculateFuzzyScore(landInput(petak, live), profile) : null;
    })
    .filter((score): score is number => score !== null);

  return {
    id: zona.id,
    kind: 'zona',
    name: zona.nama,
    zona: zona.nama,
    fuzzyScore: average(scores),
    recommendedKomoditas: commodityName(recommended),
    soilPh: average(cropRows.map((petak) => petak.phTanah)),
    waterPh: null,
    rainfallMm: input.curahHujanMm,
    ndvi: input.ndvi,
    ...pricedStatus(recommended, live),
    lastUpdated: live.updatedAt,
  };
}

function statusFromPasar(live: LiveState): DecisionStatus {
  const cropRows = seed.petak.filter((petak) => petak.komoditasId !== null);
  const input = averageInput(cropRows, live);
  const ranked = rankCommodities(input, 'Pertanian');
  const recommended = ranked[0]?.komoditasId ?? null;
  const scores = cropRows
    .map((petak) => {
      const profile = petak.komoditasId
        ? profileFor(petak.komoditasId)
        : undefined;
      return profile ? calculateFuzzyScore(landInput(petak, live), profile) : null;
    })
    .filter((score): score is number => score !== null);

  return {
    id: 'pasar-desa-ciapus',
    kind: 'pasar',
    name: 'Pasar Desa Ciapus',
    zona: seed.zona.find((zona) => zona.id === 'zona-1')?.nama ?? '—',
    fuzzyScore: average(scores),
    recommendedKomoditas: commodityName(recommended),
    soilPh: average(cropRows.map((petak) => petak.phTanah)),
    waterPh: null,
    rainfallMm: input.curahHujanMm,
    ndvi: input.ndvi,
    ...pricedStatus(recommended, live),
    lastUpdated: live.updatedAt,
  };
}

function statusFromSungai(sungaiId: string, live: LiveState): DecisionStatus {
  const rainfall = average(
    seed.petak.map(
      (petak) => live.rainfallByPetak[petak.id] ?? petak.curahHujanMm,
    ),
  );
  return {
    id: sungaiId,
    kind: 'sungai',
    name: RIVER_NAMES[sungaiId] ?? `Sungai ${sungaiId}`,
    zona: 'Lintas zona',
    fuzzyScore: null,
    recommendedKomoditas: null,
    soilPh: null,
    waterPh: null,
    rainfallMm: rainfall,
    ndvi: null,
    hargaDesaRp: null,
    hppRp: null,
    hargaPasarBapanasRp: null,
    hargaKomoditas: null,
    lastUpdated: live.updatedAt,
  };
}

/** Pure selector from selection plus live state to panel-ready values. */
export function buildDecisionStatus(
  selection: Selection,
  live: LiveState,
): DecisionStatus | null {
  switch (selection.kind) {
    case 'petak': {
      const petak = seed.petak.find((row) => row.id === selection.id);
      return petak ? statusFromPetak(petak, live) : null;
    }
    case 'kolam':
      return statusFromKolam(selection.id, live);
    case 'ternak':
      return statusFromTernak(selection.id, live);
    case 'zona':
      return statusFromZona(selection.id, live);
    case 'pasar':
      return statusFromPasar(live);
    case 'sungai':
      return statusFromSungai(selection.id, live);
    default:
      return null;
  }
}
