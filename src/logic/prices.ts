import { seed } from '../data/index.js';
import type { Harga } from '../types.js';

/** Latest dated row for one commodity, or null when no series exists. */
export function latestHarga(komoditasId: string): Harga | null {
  return (
    seed.harga
      .filter((row) => row.komoditasId === komoditasId)
      .sort((left, right) => left.tanggal.localeCompare(right.tanggal))
      .at(-1) ?? null
  );
}

export interface PriceSnapshot {
  hargaDesaRp: number | null;
  hppRp: number | null;
  hargaPasarBapanasRp: number | null;
  tanggal: string | null;
}

export function priceSnapshot(
  komoditasId: string,
  liveBapanas: number | null,
): PriceSnapshot {
  const latest = latestHarga(komoditasId);
  return {
    hargaDesaRp: latest?.hargaDesaRp ?? null,
    hppRp: latest?.hppRp ?? null,
    hargaPasarBapanasRp:
      liveBapanas ?? latest?.hargaPasarBapanasRp ?? null,
    tanggal: latest?.tanggal ?? null,
  };
}
