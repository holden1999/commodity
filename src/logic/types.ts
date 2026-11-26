import type { TipeTransaksi } from '../types.js';

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

export interface LiveState {
  rainfallByPetak: Record<string, number>;
  ndviByPetak: Record<string, number>;
  bapanasByKomoditas: Record<string, number | null>;
  updatedAt: string;
  tick: number;
}

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
