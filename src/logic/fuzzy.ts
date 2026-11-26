import type { Sektor } from '../types.js';

export type FuzzyKind = 'lahan' | 'air';

export interface FuzzyInput {
  kind: FuzzyKind;
  /** Soil pH for lahan, water pH for air. */
  ph: number;
  curahHujanMm: number;
  ndvi: number;
  slope: number;
  mdpl: number;
  suhuAir?: number;
  /** Dissolved oxygen, mg/L. */
  do?: number;
}

export interface FuzzyProfile {
  komoditasId: string;
  sektor: Sektor;
  kind: FuzzyKind;
  phMin: number;
  phMax: number;
  rainMin: number;
  rainMax: number;
  ndviMin: number;
  slopeMax: number;
  mdplMin: number;
  mdplMax: number;
  tempMin?: number;
  tempMax?: number;
  doMin?: number;
}

export interface RankedCommodity {
  komoditasId: string;
  score: number;
}

const land = (
  komoditasId: string,
  sektor: Sektor,
  phMin: number,
  phMax: number,
  rainMin: number,
  rainMax: number,
  ndviMin: number,
  slopeMax: number,
  mdplMin: number,
  mdplMax: number,
): FuzzyProfile => ({
  komoditasId,
  sektor,
  kind: 'lahan',
  phMin,
  phMax,
  rainMin,
  rainMax,
  ndviMin,
  slopeMax,
  mdplMin,
  mdplMax,
});

const water = (
  komoditasId: string,
  phMin: number,
  phMax: number,
  rainMin: number,
  rainMax: number,
  tempMin: number,
  tempMax: number,
  doMin: number,
): FuzzyProfile => ({
  komoditasId,
  sektor: 'Perikanan',
  kind: 'air',
  phMin,
  phMax,
  rainMin,
  rainMax,
  ndviMin: 0,
  slopeMax: 100,
  mdplMin: 0,
  mdplMax: 2000,
  tempMin,
  tempMax,
  doMin,
});

/** Agronomic and water tolerances for the 15 seeded commodities. */
export const FUZZY_PROFILES: readonly FuzzyProfile[] = [
  land('kom-padi', 'Pertanian', 5.5, 7.0, 1500, 4500, 0.6, 8, 0, 800),
  land('kom-jagung', 'Pertanian', 5.5, 7.5, 800, 3000, 0.55, 15, 0, 1200),
  land('kom-cabai', 'Pertanian', 5.5, 6.8, 800, 2800, 0.6, 12, 200, 1200),
  land('kom-singkong', 'Pertanian', 4.5, 6.5, 800, 2800, 0.5, 20, 0, 800),
  land('kom-pisang', 'Pertanian', 5.0, 7.0, 1500, 4000, 0.6, 15, 0, 1000),
  land('kom-kopi', 'Pertanian', 5.0, 6.5, 1500, 3500, 0.6, 25, 200, 800),
  land('kom-sayur-daun', 'Pertanian', 5.5, 7.0, 1000, 3500, 0.65, 12, 200, 1200),
  land('kom-sapi', 'Peternakan', 5.5, 7.0, 800, 3500, 0.5, 15, 0, 1200),
  land('kom-kambing', 'Peternakan', 5.5, 7.5, 600, 3000, 0.45, 25, 0, 1200),
  land('kom-ayam', 'Peternakan', 5.5, 7.5, 600, 3500, 0.4, 10, 0, 1200),
  land('kom-itik', 'Peternakan', 5.5, 7.5, 1000, 4000, 0.5, 8, 0, 1000),
  water('kom-nila', 6.5, 8.5, 1000, 4500, 25, 30, 4),
  water('kom-lele', 6.0, 8.0, 800, 4500, 26, 32, 3),
  water('kom-mas', 6.5, 8.0, 1000, 4000, 24, 28, 4),
  water('kom-gurame', 6.5, 8.0, 1000, 4000, 24, 30, 4),
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function membership(value: number, min: number, max: number, tolerance: number) {
  if (value >= min && value <= max) {
    const midpoint = (min + max) / 2;
    const halfRange = (max - min) / 2;
    if (halfRange === 0) return 1;
    return 0.8 + 0.2 * (1 - Math.abs(value - midpoint) / halfRange);
  }
  const distance = value < min ? min - value : value - max;
  return Math.max(0, 0.8 * (1 - distance / tolerance));
}

/**
 * Pure 0-100 suitability score. No React, store, or scene dependency.
 * Land uses pH, rain, NDVI, slope, and elevation. Water uses pH,
 * temperature, dissolved oxygen, and a small rain-exchange weight.
 */
export function calculateFuzzyScore(
  input: FuzzyInput,
  profile: FuzzyProfile,
): number {
  if (profile.kind !== input.kind) return 0;

  const ph = membership(
    input.ph,
    profile.phMin,
    profile.phMax,
    input.kind === 'air' ? 1.5 : 1.2,
  );
  const rain = membership(input.curahHujanMm, profile.rainMin, profile.rainMax, 900);

  if (input.kind === 'air') {
    const temperature =
      typeof input.suhuAir === 'number' &&
      typeof profile.tempMin === 'number' &&
      typeof profile.tempMax === 'number'
        ? membership(input.suhuAir, profile.tempMin, profile.tempMax, 5)
        : 0;
    const oxygen =
      typeof input.do === 'number' && typeof profile.doMin === 'number'
        ? membership(input.do, profile.doMin, 12, 2)
        : 0;

    return Math.round(
      clamp01(ph * 0.35 + temperature * 0.3 + oxygen * 0.25 + rain * 0.1) * 100,
    );
  }

  const ndvi = membership(input.ndvi, profile.ndviMin, 1, 0.2);
  const slope =
    input.slope <= profile.slopeMax
      ? 1
      : Math.max(0, 1 - (input.slope - profile.slopeMax) / 12);
  const elevation = membership(input.mdpl, profile.mdplMin, profile.mdplMax, 300);

  return Math.round(
    clamp01(
      ph * 0.35 + rain * 0.25 + ndvi * 0.25 + slope * 0.1 + elevation * 0.05,
    ) * 100,
  );
}

export function rankCommodities(
  input: FuzzyInput,
  sector?: Sektor,
): RankedCommodity[] {
  return FUZZY_PROFILES.filter(
    (profile) =>
      profile.kind === input.kind && (!sector || profile.sektor === sector),
  )
    .map((profile) => ({
      komoditasId: profile.komoditasId,
      score: calculateFuzzyScore(input, profile),
    }))
    .sort((left, right) => right.score - left.score);
}

export function profileFor(komoditasId: string): FuzzyProfile | undefined {
  return FUZZY_PROFILES.find((profile) => profile.komoditasId === komoditasId);
}
