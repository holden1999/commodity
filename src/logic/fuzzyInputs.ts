import type { Kolam, Petak } from '../types.js';
import type { FuzzyInput } from './fuzzy.js';
import type { LiveState } from './types.js';

export const average = (values: number[]): number | null =>
  values.length === 0
    ? null
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) /
      100;

export const landInput = (petak: Petak, live: LiveState): FuzzyInput => ({
  kind: 'lahan',
  ph: petak.phTanah,
  curahHujanMm: live.rainfallByPetak[petak.id] ?? petak.curahHujanMm,
  ndvi: live.ndviByPetak[petak.id] ?? petak.ndvi,
  slope: petak.slope,
  mdpl: petak.mdpl,
});

export const waterInput = (
  kolam: Kolam,
  petak: Petak,
  live: LiveState,
): FuzzyInput => ({
  kind: 'air',
  ph: kolam.phAir,
  suhuAir: kolam.suhuAir,
  do: kolam.do,
  curahHujanMm: live.rainfallByPetak[petak.id] ?? petak.curahHujanMm,
  ndvi: live.ndviByPetak[petak.id] ?? petak.ndvi,
  slope: petak.slope,
  mdpl: petak.mdpl,
});

export const averageInput = (
  petakRows: Petak[],
  live: LiveState,
): FuzzyInput => ({
  kind: 'lahan',
  ph: average(petakRows.map((petak) => petak.phTanah)) ?? 6,
  curahHujanMm:
    average(
      petakRows.map(
        (petak) => live.rainfallByPetak[petak.id] ?? petak.curahHujanMm,
      ),
    ) ?? 3500,
  ndvi:
    average(
      petakRows.map((petak) => live.ndviByPetak[petak.id] ?? petak.ndvi),
    ) ?? 0.7,
  slope: average(petakRows.map((petak) => petak.slope)) ?? 0,
  mdpl: average(petakRows.map((petak) => petak.mdpl)) ?? 250,
});
