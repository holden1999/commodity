import type { SeedData } from '../types.js';
import { desa } from './desa.js';
import { zona } from './zona.js';
import { petak } from './petak.js';
import { komoditas } from './komoditas.js';
import { kelompokTani } from './kelompokTani.js';
import { ternak } from './ternak.js';
import { kolam } from './kolam.js';
import { pelaku } from './pelaku.js';
import { rantaiPasok } from './rantaiPasok.js';
import { harga } from './harga.js';

export {
  desa,
  zona,
  petak,
  komoditas,
  kelompokTani,
  ternak,
  kolam,
  pelaku,
  rantaiPasok,
  harga,
};

export const seed: SeedData = {
  desa,
  zona,
  petak,
  komoditas,
  kelompokTani,
  ternak,
  kolam,
  pelaku,
  rantaiPasok,
  harga,
};

export { validateSeed } from './integrity.js';
