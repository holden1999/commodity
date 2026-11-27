import type { TipeTransaksi } from '../types.js';
import type { Environment, Season, Weather } from './environment.js';
import type { FuzzyInput } from './fuzzy.js';

export type SelectionKind =
  | 'zona'
  | 'petak'
  | 'kolam'
  | 'ternak'
  | 'pasar'
  | 'sungai';

export interface Selection {
  kind: SelectionKind;
  id: string;
}

export type LandOverride = Partial<
  Pick<FuzzyInput, 'ph' | 'curahHujanMm' | 'ndvi' | 'slope' | 'mdpl'>
>;
export type WaterOverride = Partial<Pick<FuzzyInput, 'ph' | 'suhuAir' | 'do'>>;

export interface LiveState {
  rainfallByPetak: Record<string, number>;
  ndviByPetak: Record<string, number>;
  bapanasByKomoditas: Record<string, number | null>;
  environment: Environment;
  floodedPetak?: Readonly<Record<string, true>>;
  fuzzyByPetak?: Record<string, LandOverride>;
  fuzzyByKolam?: Record<string, WaterOverride>;
  updatedAt: string;
  tick: number;
}

export type { Season, Weather };

export interface CiapusFilters {
  highFloodRisk: boolean;
  highFuzzy: boolean;
  rantaiPasokType: TipeTransaksi | 'Semua';
}

export const DEFAULT_FILTERS: CiapusFilters = {
  highFloodRisk: false,
  highFuzzy: false,
  rantaiPasokType: 'Semua',
};
