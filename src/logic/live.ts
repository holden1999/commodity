import { seed } from '../data/index.js';
import type { LiveState } from './types.js';
import { latestHarga } from './prices.js';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const INITIAL_BAPANAS: Record<string, number | null> = Object.fromEntries(
  seed.komoditas.map((komoditas) => [
    komoditas.id,
    latestHarga(komoditas.id)?.hargaPasarBapanasRp ?? null,
  ]),
);

export function createInitialLive(): LiveState {
  return {
    rainfallByPetak: Object.fromEntries(
      seed.petak.map((petak) => [petak.id, petak.curahHujanMm]),
    ),
    ndviByPetak: Object.fromEntries(
      seed.petak.map((petak) => [petak.id, petak.ndvi]),
    ),
    bapanasByKomoditas: { ...INITIAL_BAPANAS },
    updatedAt: new Date().toISOString(),
    tick: 0,
  };
}

/**
 * One simulated observation step. The random source is injectable so the
 * update rule can be tested without a timer or a browser.
 */
export function nextLiveState(
  state: LiveState,
  random: () => number = Math.random,
): LiveState {
  const rainfallByPetak: Record<string, number> = {};
  for (const petak of seed.petak) {
    const current = state.rainfallByPetak[petak.id] ?? petak.curahHujanMm;
    rainfallByPetak[petak.id] = Math.round(
      clamp(current + (random() - 0.5) * 240, 2600, 4600),
    );
  }

  const ndviByPetak: Record<string, number> = {};
  for (const petak of seed.petak) {
    const current = state.ndviByPetak[petak.id] ?? petak.ndvi;
    ndviByPetak[petak.id] = round(
      clamp(current + (random() - 0.5) * 0.06, 0.3, 0.95),
      3,
    );
  }

  const bapanasByKomoditas: Record<string, number | null> = {};
  for (const [komoditasId, baseline] of Object.entries(INITIAL_BAPANAS)) {
    if (baseline === null) {
      bapanasByKomoditas[komoditasId] = null;
      continue;
    }
    const current =
      state.bapanasByKomoditas[komoditasId] ?? baseline;
    bapanasByKomoditas[komoditasId] = Math.round(
      clamp(current * (1 + (random() - 0.5) * 0.03), baseline * 0.8, baseline * 1.2),
    );
  }

  return {
    rainfallByPetak,
    ndviByPetak,
    bapanasByKomoditas,
    updatedAt: new Date().toISOString(),
    tick: state.tick + 1,
  };
}
