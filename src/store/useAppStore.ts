import { create } from 'zustand';
import type { TipeTransaksi } from '../types.js';
import { fetchSnapshot, postLiveTick, type ServerSnapshot } from '../logic/api.js';
import { DEFAULT_ENVIRONMENT, type DayPeriod, type PsiidnForecast } from '../logic/environment.js';
import type { RantaiPasokView } from '../logic/filters.js';
import { createInitialLive, nextLiveState } from '../logic/live.js';
import {
  DEFAULT_FILTERS,
  type CiapusFilters,
  type LandOverride,
  type LiveState,
  type Season,
  type Selection,
  type WaterOverride,
  type Weather,
} from '../logic/types.js';

export type ThemeMode = 'day' | 'night';

interface AppStore {
  selection: Selection | null;
  live: LiveState;
  rantaiPasok: RantaiPasokView[] | null;
  focusZonaId: string | null;
  focusNonce: number;
  filters: CiapusFilters;
  theme: ThemeMode;
  cutaway: boolean;
  viewTurns: number;
  viewAzimuth: number;
  selectedRantaiId: string | null;
  fuzzyDirty: boolean;
  syncSnapshot: () => Promise<void>;
  select: (selection: Selection) => void;
  clearSelection: () => void;
  tick: () => void;
  focusZona: (zonaId: string | null) => void;
  toggleTheme: () => void;
  toggleCutaway: () => void;
  rotateView: (delta: 1 | -1) => void;
  setViewAzimuth: (degrees: number) => void;
  setSeason: (season: Season) => void;
  growth: number;
  setGrowth: (growth: number) => void;
  setForecast: (forecast: PsiidnForecast | undefined) => void;
  setPeriod: (period: DayPeriod) => void;
  setClimate: (mode: Weather | 'Kemarau' | 'Otomatis') => void;
  setFloodedPetak: (floodedPetak: LiveState['floodedPetak']) => void;
  setWeather: (weather: Weather) => void;
  selectRantai: (id: string | null) => void;
  setLandInput: (petakId: string, key: keyof LandOverride, value: number) => void;
  setWaterInput: (kolamId: string, key: keyof WaterOverride, value: number) => void;
  resetFuzzy: () => void;
  setHighFloodRisk: (value: boolean) => void;
  setHighFuzzy: (value: boolean) => void;
  setRantaiPasokType: (value: TipeTransaksi | 'Semua') => void;
  resetFilters: () => void;
}

let requestSeq = 0;

function applyServerSnapshot(
  set: (partial: Partial<AppStore>) => void,
  snapshot: ServerSnapshot,
  current: LiveState,
) {
  set({
    live: {
      ...snapshot.live,
      environment: current.environment,
      floodedPetak: current.floodedPetak,
      fuzzyByPetak: current.fuzzyByPetak,
      fuzzyByKolam: current.fuzzyByKolam,
    },
    rantaiPasok: snapshot.rantaiPasok,
  });
}

export const useAppStore = create<AppStore>((set, get) => {
  const refreshFromServer = async () => {
    const seq = ++requestSeq;
    const { filters, selection } = get();
    const snapshot = await fetchSnapshot(filters, selection);
    if (snapshot && seq === requestSeq) {
      applyServerSnapshot(set, snapshot, get().live);
    }
  };

  return {
    selection: null,
    live: createInitialLive(),
    rantaiPasok: null,
    focusZonaId: null,
    focusNonce: 0,
    filters: DEFAULT_FILTERS,
    theme: 'day',
    cutaway: false,
    viewTurns: 0,
    // matches CameraRig DEFAULT_AZIMUTH (PI/4)
    viewAzimuth: 45,
    selectedRantaiId: null,
    fuzzyDirty: false,
    growth: 65,
    setGrowth: (growth) => set({ growth }),
    setForecast: (forecast) => set((state) => ({
      live: { ...state.live, environment: { ...state.live.environment, forecast } },
    })),
    setPeriod: (period) => set((state) => ({
      fuzzyDirty: true,
      theme: 'day',
      live: { ...state.live, environment: { ...state.live.environment, period } },
    })),
    setClimate: (mode) => set((state) => ({
      fuzzyDirty: true,
      live: {
        ...state.live,
        environment: {
          ...state.live.environment,
          season: mode === 'Hujan' ? 'Hujan' : 'Kemarau',
          weather: mode === 'Hujan' || mode === 'Berawan' ? mode : 'Cerah',
          weatherOverride: mode === 'Otomatis' ? undefined : mode === 'Kemarau' ? 'Cerah' : mode,
          dryOverride: mode === 'Kemarau',
        },
      },
    })),
    setFloodedPetak: (floodedPetak) => set((state) => ({
      live: { ...state.live, floodedPetak },
    })),
    syncSnapshot: refreshFromServer,
    select: (selection) => {
      set({ selection });
      void refreshFromServer();
    },
    clearSelection: () => {
      set({ selection: null });
    },
    tick: () => {
      const seq = ++requestSeq;
      const { filters, selection } = get();
      void postLiveTick(filters, selection).then((snapshot) => {
        if (seq !== requestSeq) return;
        if (snapshot) {
          applyServerSnapshot(set, snapshot, get().live);
        } else {
          set({
            live: nextLiveState(get().live),
            rantaiPasok: null,
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
    rotateView: (delta) =>
      set((state) => ({
        viewTurns: state.viewTurns + delta,
      })),
    setViewAzimuth: (degrees) => set({ viewAzimuth: degrees }),
    setSeason: (season) =>
      set((state) => ({
        fuzzyDirty: true,
        live: { ...state.live, environment: { ...state.live.environment, season } },
      })),
    setWeather: (weather) =>
      set((state) => ({
        fuzzyDirty: true,
        live: { ...state.live, environment: { ...state.live.environment, weather, weatherOverride: weather, dryOverride: false } },
      })),
    selectRantai: (id) =>
      set((state) => ({
        selectedRantaiId: state.selectedRantaiId === id ? null : id,
      })),
    setLandInput: (petakId, key, value) =>
      set((state) => {
        const previous = state.live.fuzzyByPetak?.[petakId] ?? {};
        return {
          fuzzyDirty: true,
          live: {
            ...state.live,
            fuzzyByPetak: {
              ...state.live.fuzzyByPetak,
              [petakId]: { ...previous, [key]: value },
            },
          },
        };
      }),
    setWaterInput: (kolamId, key, value) =>
      set((state) => {
        const previous = state.live.fuzzyByKolam?.[kolamId] ?? {};
        return {
          fuzzyDirty: true,
          live: {
            ...state.live,
            fuzzyByKolam: {
              ...state.live.fuzzyByKolam,
              [kolamId]: { ...previous, [key]: value },
            },
          },
        };
      }),
    resetFuzzy: () =>
      set((state) => ({
        fuzzyDirty: false,
        live: {
          ...state.live,
          environment: { ...DEFAULT_ENVIRONMENT, forecast: state.live.environment.forecast },
          fuzzyByPetak: {},
          fuzzyByKolam: {},
        },
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
