import type { Komoditas } from '../types.js';

/**
 * 7 crops, 4 livestock products, and 4 fish products.
 * fuzzyScore is a 0-100 suitability seed, not an official statistic.
 */
export const komoditas: readonly Komoditas[] = [
  { id: 'kom-padi', nama: 'Padi', sektor: 'Pertanian', fuzzyScore: 88 },
  { id: 'kom-jagung', nama: 'Jagung', sektor: 'Pertanian', fuzzyScore: 82 },
  { id: 'kom-cabai', nama: 'Cabai', sektor: 'Pertanian', fuzzyScore: 74 },
  { id: 'kom-singkong', nama: 'Singkong', sektor: 'Pertanian', fuzzyScore: 78 },
  { id: 'kom-pisang', nama: 'Pisang', sektor: 'Pertanian', fuzzyScore: 85 },
  { id: 'kom-kopi', nama: 'Kopi', sektor: 'Pertanian', fuzzyScore: 72 },
  { id: 'kom-sayur-daun', nama: 'Sayur Daun', sektor: 'Pertanian', fuzzyScore: 80 },
  { id: 'kom-sapi', nama: 'Sapi', sektor: 'Peternakan', fuzzyScore: 66 },
  { id: 'kom-kambing', nama: 'Kambing', sektor: 'Peternakan', fuzzyScore: 75 },
  { id: 'kom-ayam', nama: 'Ayam', sektor: 'Peternakan', fuzzyScore: 84 },
  { id: 'kom-itik', nama: 'Itik', sektor: 'Peternakan', fuzzyScore: 71 },
  { id: 'kom-nila', nama: 'Ikan Nila', sektor: 'Perikanan', fuzzyScore: 83 },
  { id: 'kom-lele', nama: 'Ikan Lele', sektor: 'Perikanan', fuzzyScore: 87 },
  { id: 'kom-mas', nama: 'Ikan Mas', sektor: 'Perikanan', fuzzyScore: 70 },
  { id: 'kom-gurame', nama: 'Ikan Gurame', sektor: 'Perikanan', fuzzyScore: 64 },
];
