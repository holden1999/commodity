import type { SeedData } from '../types.js';

/**
 * Referential and range checks for the seed. The function returns messages
 * instead of throwing so a caller can show every problem at once.
 */
export function validateSeed(data: SeedData): string[] {
  const errors: string[] = [];

  const unique = (label: string, rows: readonly { id: string }[]) => {
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.id)) {
        errors.push(`${label}: duplicate id ${row.id}`);
      }
      seen.add(row.id);
    }
  };

  unique('zona', data.zona);
  unique('petak', data.petak);
  unique('komoditas', data.komoditas);
  unique('kelompokTani', data.kelompokTani);
  unique('ternak', data.ternak);
  unique('kolam', data.kolam);
  unique('pelaku', data.pelaku);
  unique('rantaiPasok', data.rantaiPasok);
  unique('harga', data.harga);

  const expected: readonly (readonly [string, number, number])[] = [
    ['zona', data.zona.length, 4],
    ['petak', data.petak.length, 24],
    ['komoditas', data.komoditas.length, 15],
    ['kelompokTani', data.kelompokTani.length, 6],
    ['ternak', data.ternak.length, 4],
    ['kolam', data.kolam.length, 4],
    ['pelaku', data.pelaku.length, 12],
    ['rantaiPasok', data.rantaiPasok.length, 12],
    ['harga', data.harga.length, 20],
  ];
  for (const [label, actual, wanted] of expected) {
    if (actual !== wanted) {
      errors.push(`${label}: expected ${wanted} rows, got ${actual}`);
    }
  }

  if (data.desa.luasKm2 !== null || data.desa.jumlahPenduduk !== null) {
    errors.push(
      'desa: luasKm2 and jumlahPenduduk must stay null until a cited value is adopted',
    );
  }

  const zonaById = new Map(data.zona.map((row) => [row.id, row]));
  const petakById = new Map(data.petak.map((row) => [row.id, row]));
  const komoditasById = new Map(data.komoditas.map((row) => [row.id, row]));
  const kelompokById = new Map(data.kelompokTani.map((row) => [row.id, row]));
  const pelakuById = new Map(data.pelaku.map((row) => [row.id, row]));

  for (const row of data.zona) {
    if (row.desaId !== data.desa.id) {
      errors.push(`${row.id}: unknown desaId ${row.desaId}`);
    }
    if (row.mdplMin >= row.mdplMax) {
      errors.push(`${row.id}: mdplMin must be below mdplMax`);
    }
  }

  for (const row of data.kelompokTani) {
    if (row.desaId !== data.desa.id) {
      errors.push(`${row.id}: unknown desaId ${row.desaId}`);
    }
    for (const komoditasId of row.komoditasIds) {
      if (!komoditasById.has(komoditasId)) {
        errors.push(`${row.id}: unknown komoditasId ${komoditasId}`);
      }
    }
    if (row.jumlahAnggota <= 0) {
      errors.push(`${row.id}: jumlahAnggota must be positive`);
    }
  }

  for (const row of data.petak) {
    const zona = zonaById.get(row.zonaId);
    if (!zona) {
      errors.push(`${row.id}: unknown zonaId ${row.zonaId}`);
    } else if (row.mdpl < zona.mdplMin || row.mdpl > zona.mdplMax) {
      errors.push(
        `${row.id}: mdpl ${row.mdpl} is outside ${row.zonaId} (${zona.mdplMin}-${zona.mdplMax})`,
      );
    }

    if (!kelompokById.has(row.kelompokTaniId)) {
      errors.push(`${row.id}: unknown kelompokTaniId ${row.kelompokTaniId}`);
    }

    if (row.komoditasId !== null) {
      const komoditas = komoditasById.get(row.komoditasId);
      if (!komoditas) {
        errors.push(`${row.id}: unknown komoditasId ${row.komoditasId}`);
      } else if (komoditas.sektor !== 'Pertanian') {
        errors.push(`${row.id}: crop petak must point to a Pertanian commodity`);
      }
    }

    if (row.luasHa <= 0) {
      errors.push(`${row.id}: luasHa must be positive`);
    }
    if (row.phTanah < 0 || row.phTanah > 14) {
      errors.push(`${row.id}: phTanah must be 0-14`);
    }
    if (row.ndvi < 0 || row.ndvi > 1) {
      errors.push(`${row.id}: ndvi must be 0-1`);
    }
    if (row.slope < 0) {
      errors.push(`${row.id}: slope must not be negative`);
    }
  }

  for (const row of data.ternak) {
    if (!petakById.has(row.petakId)) {
      errors.push(`${row.id}: unknown petakId ${row.petakId}`);
    }
    const komoditas = komoditasById.get(row.komoditasId);
    if (!komoditas) {
      errors.push(`${row.id}: unknown komoditasId ${row.komoditasId}`);
    } else if (komoditas.sektor !== 'Peternakan') {
      errors.push(`${row.id}: commodity must be in the Peternakan sector`);
    }
    if (row.jumlah <= 0) {
      errors.push(`${row.id}: jumlah must be positive`);
    }
    if (row.kebutuhanHijauan <= 0 || row.kebutuhanAirLiterPerHari <= 0) {
      errors.push(`${row.id}: feed and water needs must be positive`);
    }
  }

  for (const row of data.kolam) {
    if (!petakById.has(row.petakId)) {
      errors.push(`${row.id}: unknown petakId ${row.petakId}`);
    }
    const komoditas = komoditasById.get(row.komoditasId);
    if (!komoditas) {
      errors.push(`${row.id}: unknown komoditasId ${row.komoditasId}`);
    } else if (komoditas.sektor !== 'Perikanan') {
      errors.push(`${row.id}: commodity must be in the Perikanan sector`);
    }
    if (row.luasM2 <= 0) {
      errors.push(`${row.id}: luasM2 must be positive`);
    }
    if (row.phAir < 0 || row.phAir > 14) {
      errors.push(`${row.id}: phAir must be 0-14`);
    }
    if (row.do <= 0) {
      errors.push(`${row.id}: dissolved oxygen must be positive`);
    }
    if (row.debit < 0) {
      errors.push(`${row.id}: debit must not be negative`);
    }
  }

  for (const row of data.pelaku) {
    if (row.desaId !== data.desa.id) {
      errors.push(`${row.id}: unknown desaId ${row.desaId}`);
    }
  }

  for (const row of data.rantaiPasok) {
    const from = pelakuById.get(row.dariId);
    const to = pelakuById.get(row.keId);
    if (!from) {
      errors.push(`${row.id}: unknown dariId ${row.dariId}`);
    }
    if (!to) {
      errors.push(`${row.id}: unknown keId ${row.keId}`);
    }
    if (from && from.jenis !== row.pelaku) {
      errors.push(
        `${row.id}: pelaku ${row.pelaku} does not match source actor ${from.id}`,
      );
    }
    if (!komoditasById.has(row.komoditasId)) {
      errors.push(`${row.id}: unknown komoditasId ${row.komoditasId}`);
    }
    if (row.dariId === row.keId) {
      errors.push(`${row.id}: a link cannot point to itself`);
    }
    if (row.marginRp < 0) {
      errors.push(`${row.id}: marginRp must not be negative`);
    }
  }

  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  for (const row of data.harga) {
    if (!komoditasById.has(row.komoditasId)) {
      errors.push(`${row.id}: unknown komoditasId ${row.komoditasId}`);
    }
    if (!isoDate.test(row.tanggal)) {
      errors.push(`${row.id}: tanggal must be YYYY-MM-DD`);
    }
    if (row.hppRp !== null && row.hppRp <= 0) {
      errors.push(`${row.id}: hppRp must be positive or null`);
    }
    if (row.hargaDesaRp <= 0) {
      errors.push(`${row.id}: hargaDesaRp must be positive`);
    }
    if (row.hargaPasarBapanasRp !== null && row.hargaPasarBapanasRp <= 0) {
      errors.push(`${row.id}: hargaPasarBapanasRp must be positive or null`);
    }
    if (row.sumber.trim() === '') {
      errors.push(`${row.id}: sumber must not be empty`);
    }
  }

  return errors;
}
