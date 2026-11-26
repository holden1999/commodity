import { seed } from './index.js';
import { validateSeed } from './integrity.js';

declare const process: { exitCode?: number };

const errors = validateSeed(seed);

if (errors.length > 0) {
  console.error(`Seed validation failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log('Seed validation passed.');
  console.log(
    [
      `zona=${seed.zona.length}`,
      `petak=${seed.petak.length}`,
      `komoditas=${seed.komoditas.length}`,
      `kelompokTani=${seed.kelompokTani.length}`,
      `ternak=${seed.ternak.length}`,
      `kolam=${seed.kolam.length}`,
      `pelaku=${seed.pelaku.length}`,
      `rantaiPasok=${seed.rantaiPasok.length}`,
      `harga=${seed.harga.length}`,
    ].join(' '),
  );
}
