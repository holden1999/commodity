import { create } from 'zustand';
import type { TipeTransaksi } from '../types.js';
import { createInitialLive, nextLiveState } from '../logic/live.js';
import {
  DEFAULT_FILTERS,
  type CiapusFilters,
  type LiveState,
  type Selection,
} from '../logic/types.js';

interface AppStore {
  selection: Selection | null;
  live: LiveState;
  focusZonaId: string | null;
  focusNonce: number;
  filters: CiapusFilters;
  select: (selection: Selection) => void;
  clearSelection: () => void;
  tick: () => void;
  focusZona: (zonaId: string | null) => void;
  setHighFloodRisk: (value: boolean) => void;
  setHighFuzzy: (value: boolean) => void;
  setRantaiPasokType: (value: TipeTransaksi | 'Semua') => void;
  resetFilters: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  selection: null,
  live: createInitialLive(),
  focusZonaId: null,
  focusNonce: 0,
  filters: DEFAULT_FILTERS,
  select: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
  tick: () => set((state) => ({ live: nextLiveState(state.live) })),
  focusZona: (zonaId) =>
    set((state) => ({
      focusZonaId: zonaId,
      focusNonce: state.focusNonce + 1,
    })),
  setHighFloodRisk: (value) =>
    set((state) => ({
      filters: { ...state.filters, highFloodRisk: value },
    })),
  setHighFuzzy: (value) =>
    set((state) => ({
      filters: { ...state.filters, highFuzzy: value },
    })),
  setRantaiPasokType: (value) =>
    set((state) => ({
      filters: { ...state.filters, rantaiPasokType: value },
    })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
