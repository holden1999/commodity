import { create } from 'zustand';
import type { TipeTransaksi } from '../types.js';
import { fetchSnapshot, postLiveTick, type ServerSnapshot } from '../logic/api.js';
import type { DecisionStatus } from '../logic/decision.js';
import type { RantaiPasokView, SceneVisibility } from '../logic/filters.js';
import type { KpiSummary } from '../logic/kpi.js';
import { createInitialLive, nextLiveState } from '../logic/live.js';
import {
  DEFAULT_FILTERS,
  type CiapusFilters,
  type LiveState,
  type Selection,
} from '../logic/types.js';

export type ThemeMode = 'day' | 'night';
export type SimSpeed = 1 | 2 | 5;

interface AppStore {
  selection: Selection | null;
  live: LiveState;
  kpi: KpiSummary | null;
  visibility: SceneVisibility | null;
  rantaiPasok: RantaiPasokView[] | null;
  decision: DecisionStatus | null;
  focusZonaId: string | null;
  focusNonce: number;
  filters: CiapusFilters;
  theme: ThemeMode;
  cutaway: boolean;
  simPlaying: boolean;
  simSpeed: SimSpeed;
  selectedRantaiId: string | null;
  syncSnapshot: () => Promise<void>;
  select: (selection: Selection) => void;
  clearSelection: () => void;
  tick: () => void;
  focusZona: (zonaId: string | null) => void;
  toggleTheme: () => void;
  toggleCutaway: () => void;
  toggleSimPlaying: () => void;
  setSimSpeed: (speed: SimSpeed) => void;
  selectRantai: (id: string | null) => void;
  setHighFloodRisk: (value: boolean) => void;
  setHighFuzzy: (value: boolean) => void;
  setRantaiPasokType: (value: TipeTransaksi | 'Semua') => void;
  resetFilters: () => void;
}

let requestSeq = 0;

function applyServerSnapshot(
  set: (partial: Partial<AppStore>) => void,
  snapshot: ServerSnapshot,
) {
  set({
    live: snapshot.live,
    kpi: snapshot.kpi,
    visibility: {
      petak: new Set(snapshot.visibility.petak),
      kolam: new Set(snapshot.visibility.kolam),
      ternak: new Set(snapshot.visibility.ternak),
    },
    rantaiPasok: snapshot.rantaiPasok,
    decision: snapshot.decision,
  });
}

export const useAppStore = create<AppStore>((set, get) => {
  const refreshFromServer = async () => {
    const seq = ++requestSeq;
    const { filters, selection } = get();
    const snapshot = await fetchSnapshot(filters, selection);
    if (snapshot && seq === requestSeq) {
      applyServerSnapshot(set, snapshot);
    }
  };

  return {
    selection: null,
    live: createInitialLive(),
    kpi: null,
    visibility: null,
    rantaiPasok: null,
    decision: null,
    focusZonaId: null,
    focusNonce: 0,
    filters: DEFAULT_FILTERS,
    theme: 'day',
    cutaway: false,
    simPlaying: true,
    simSpeed: 1,
    selectedRantaiId: null,
    syncSnapshot: refreshFromServer,
    select: (selection) => {
      set({ selection, decision: null });
      void refreshFromServer();
    },
    clearSelection: () => {
      set({ selection: null, decision: null });
    },
    tick: () => {
      const seq = ++requestSeq;
      const { filters, selection } = get();
      void postLiveTick(filters, selection).then((snapshot) => {
        if (seq !== requestSeq) return;
        if (snapshot) {
          applyServerSnapshot(set, snapshot);
        } else {
          set({
            live: nextLiveState(get().live),
            kpi: null,
            visibility: null,
            rantaiPasok: null,
            decision: null,
          });
        }
      });
    },
    focusZona: (zonaId) =>
      set((state) => ({
        focusZonaId: zonaId,
        focusNonce: state.focusNonce + 1,
      })),
    toggleTheme: () =>
      set((state) => ({
        theme: state.theme === 'day' ? 'night' : 'day',
      })),
    toggleCutaway: () =>
      set((state) => ({
        cutaway: !state.cutaway,
      })),
    toggleSimPlaying: () =>
      set((state) => ({
        simPlaying: !state.simPlaying,
      })),
    setSimSpeed: (simSpeed) => set({ simSpeed }),
    selectRantai: (id) =>
      set((state) => ({
        selectedRantaiId: state.selectedRantaiId === id ? null : id,
      })),
    setHighFloodRisk: (value) => {
      set((state) => ({
        filters: { ...state.filters, highFloodRisk: value },
      }));
      void refreshFromServer();
    },
    setHighFuzzy: (value) => {
      set((state) => ({
        filters: { ...state.filters, highFuzzy: value },
      }));
      void refreshFromServer();
    },
    setRantaiPasokType: (value) => {
      set((state) => ({
        filters: { ...state.filters, rantaiPasokType: value },
      }));
      void refreshFromServer();
    },
    resetFilters: () => {
      set({ filters: DEFAULT_FILTERS });
      void refreshFromServer();
    },
  };
});
