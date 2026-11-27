import type { Kolam, Petak } from '../types.js';
import { DEFAULT_ENVIRONMENT, sunExposure, waterflow } from './environment.js';
import type { FuzzyInput } from './fuzzy.js';
import type { LiveState } from './types.js';

export const average = (values: number[]): number | null =>
  values.length === 0
    ? null
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) /
      100;

export const observedRainfall = (petak: Petak, live: LiveState) =>
  live.fuzzyByPetak?.[petak.id]?.curahHujanMm ??
  live.rainfallByPetak[petak.id] ?? petak.curahHujanMm;

const scenarioRainfall = (observed: number, environment: LiveState['environment']) => {
  if (environment.dryOverride) return Math.min(observed, 2100);
  if (environment.weatherOverride === 'Hujan') return Math.max(observed, 4200);
  return observed;
};

export const landInput = (petak: Petak, live: LiveState): FuzzyInput => {
  const override = live.fuzzyByPetak?.[petak.id];
  const environment = live.environment ?? DEFAULT_ENVIRONMENT;
  const rainfallMm = override?.curahHujanMm ?? scenarioRainfall(observedRainfall(petak, live), environment);
  const slope = override?.slope ?? petak.slope;
  const mdpl = override?.mdpl ?? petak.mdpl;
  return {
    kind: 'lahan',
    ph: override?.ph ?? petak.phTanah,
    curahHujanMm: rainfallMm,
    ndvi: override?.ndvi ?? live.ndviByPetak[petak.id] ?? petak.ndvi,
    slope,
    mdpl,
    sunExposure: sunExposure(mdpl, environment, rainfallMm, new Date(live.updatedAt)),
    waterflow: waterflow(slope, rainfallMm, environment),
    flooded: live.floodedPetak?.[petak.id],
  };
};

export const waterInput = (
  kolam: Kolam,
  petak: Petak,
  live: LiveState,
): FuzzyInput => {
  const water = live.fuzzyByKolam?.[kolam.id];
  const land = live.fuzzyByPetak?.[petak.id];
  const environment = live.environment ?? DEFAULT_ENVIRONMENT;
  const rainfallMm = land?.curahHujanMm ?? scenarioRainfall(observedRainfall(petak, live), environment);
  const slope = land?.slope ?? petak.slope;
  const mdpl = land?.mdpl ?? petak.mdpl;
  return {
    kind: 'air',
    ph: water?.ph ?? kolam.phAir,
    suhuAir: water?.suhuAir ?? kolam.suhuAir,
    do: water?.do ?? kolam.do,
    curahHujanMm: rainfallMm,
    ndvi: land?.ndvi ?? live.ndviByPetak[petak.id] ?? petak.ndvi,
    slope,
    mdpl,
    sunExposure: sunExposure(mdpl, environment, rainfallMm, new Date(live.updatedAt)),
    waterflow: waterflow(slope, rainfallMm, environment),
    flooded: live.floodedPetak?.[petak.id],
  };
};

export const averageInput = (
  petakRows: Petak[],
  live: LiveState,
): FuzzyInput => {
  const inputs = petakRows.map((petak) => landInput(petak, live));
  return {
    kind: 'lahan',
    ph: average(inputs.map((input) => input.ph)) ?? 6,
    curahHujanMm: average(inputs.map((input) => input.curahHujanMm)) ?? 3500,
    ndvi: average(inputs.map((input) => input.ndvi)) ?? 0.7,
    slope: average(inputs.map((input) => input.slope)) ?? 0,
    mdpl: average(inputs.map((input) => input.mdpl)) ?? 250,
    sunExposure: average(inputs.map((input) => input.sunExposure)) ?? 50,
    waterflow: average(inputs.map((input) => input.waterflow)) ?? 20,
  };
};
