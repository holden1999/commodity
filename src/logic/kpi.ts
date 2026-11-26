import { seed } from '../data/index.js';
import { calculateFuzzyScore, profileFor } from './fuzzy.js';
import { average, landInput, waterInput } from './fuzzyInputs.js';
import { latestHarga } from './prices.js';
import type { LiveState } from './types.js';

export interface KpiSummary {
  averageFuzzyScore: number | null;
  hargaDesaMarginPct: number | null;
  highFloodRiskPct: number | null;
  activeKolam: number;
  totalTernak: number;
  lowWaterAlerts: number;
}

const zonaById = new Map(seed.zona.map((zona) => [zona.id, zona]));
const petakById = new Map(seed.petak.map((petak) => [petak.id, petak]));

const zoneRisk = (petakId: string) => {
  const petak = petakById.get(petakId);
  return petak ? zonaById.get(petak.zonaId)?.risikoBanjir : undefined;
};

/** KPI values from seed data and the live store snapshot. */
export function buildKpi(live: LiveState): KpiSummary {
  const scores: number[] = [];

  for (const petak of seed.petak) {
    if (!petak.komoditasId) continue;
    const profile = profileFor(petak.komoditasId);
    if (profile) scores.push(calculateFuzzyScore(landInput(petak, live), profile));
  }

  for (const kolam of seed.kolam) {
    const petak = petakById.get(kolam.petakId);
    const profile = profileFor(kolam.komoditasId);
    if (petak && profile) {
      scores.push(calculateFuzzyScore(waterInput(kolam, petak, live), profile));
    }
  }

  for (const ternak of seed.ternak) {
    const petak = petakById.get(ternak.petakId);
    const profile = profileFor(ternak.komoditasId);
    if (petak && profile) {
      scores.push(calculateFuzzyScore(landInput(petak, live), profile));
    }
  }

  const margins: number[] = [];
  for (const komoditas of seed.komoditas) {
    const latest = latestHarga(komoditas.id);
    if (latest && latest.hppRp !== null && latest.hppRp > 0) {
      margins.push(((latest.hargaDesaRp - latest.hppRp) / latest.hppRp) * 100);
    }
  }

  const highRisk = seed.petak.filter(
    (petak) => zoneRisk(petak.id) === 'Tinggi',
  ).length;

  const lowWaterAlerts = seed.petak.filter((petak) => {
    const current = live.rainfallByPetak[petak.id] ?? petak.curahHujanMm;
    return current < petak.curahHujanMm * 0.9;
  }).length;

  return {
    averageFuzzyScore: average(scores),
    hargaDesaMarginPct: average(margins),
    highFloodRiskPct:
      seed.petak.length === 0
        ? null
        : Math.round((highRisk / seed.petak.length) * 1000) / 10,
    activeKolam: seed.kolam.filter((kolam) => kolam.do > 0).length,
    totalTernak: seed.ternak.reduce((sum, ternak) => sum + ternak.jumlah, 0),
    lowWaterAlerts,
  };
}
