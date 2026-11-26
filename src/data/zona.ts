import type { Zona } from '../types.js';

/**
 * Ciomas District sits at 207-325 mdpl (BPS Ciomas, 2013).
 * The four bands follow the river-to-ridge sequence in the village.
 */
export const zona: readonly Zona[] = [
  {
    id: 'zona-1',
    desaId: 'desa-ciapus',
    nama: 'Zona 1 Dataran Sungai',
    mdplMin: 200,
    mdplMax: 230,
    risikoBanjir: 'Tinggi',
  },
  {
    id: 'zona-2',
    desaId: 'desa-ciapus',
    nama: 'Zona 2 Transisi',
    mdplMin: 230,
    mdplMax: 260,
    risikoBanjir: 'Sedang',
  },
  {
    id: 'zona-3',
    desaId: 'desa-ciapus',
    nama: 'Zona 3 Perbukitan',
    mdplMin: 260,
    mdplMax: 300,
    risikoBanjir: 'Rendah',
  },
  {
    id: 'zona-4',
    desaId: 'desa-ciapus',
    nama: 'Zona 4 Atas / Konservasi',
    mdplMin: 300,
    mdplMax: 325,
    risikoBanjir: 'Rendah',
  },
];
