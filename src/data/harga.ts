import type { Harga } from '../types.js';

/**
 * 20 observations: 6 crops on 7 Nov, all 7 crops on 14 and 21 Nov 2026.
 * The 20 rows cover the crop commodities. Livestock and fish have production
 * units but no price series until a cited source is added.
 * hppRp is null where the government sets no HPP. hargaPasarBapanasRp is
 * null where Bapanas does not publish the commodity. hargaDesaRp stays a
 * village/farm-gate observation, so it can differ from both benchmarks.
 */
export const harga: readonly Harga[] = [
  {
    id: 'hrg-01',
    komoditasId: 'kom-padi',
    hppRp: 6500,
    hargaDesaRp: 7900,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-07',
    sumber:
      'HPP GKP Rp6.500/kg (Bapanas); harga GKP Jawa Barat di atas Rp7.000/kg (Bulog Jabar, 6 Nov 2026)',
  },
  {
    id: 'hrg-02',
    komoditasId: 'kom-jagung',
    hppRp: 5500,
    hargaDesaRp: 6900,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-07',
    sumber: 'HPP jagung Rp5.500/kg (Bapanas); harga desa seed',
  },
  {
    id: 'hrg-03',
    komoditasId: 'kom-cabai',
    hppRp: null,
    hargaDesaRp: 65000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-07',
    sumber: 'Harga desa seed; PIHPS 7 Nov 2026: cabai rawit merah Rp96.700/kg',
  },
  {
    id: 'hrg-04',
    komoditasId: 'kom-singkong',
    hppRp: null,
    hargaDesaRp: 3000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-07',
    sumber:
      'Kementan, 26 Okt 2026: harga singkong tingkat petani sekitar Rp3.000/kg',
  },
  {
    id: 'hrg-05',
    komoditasId: 'kom-pisang',
    hppRp: null,
    hargaDesaRp: 8000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-07',
    sumber:
      'Katadata, 19 Nov 2026: pisang Rp9.500/kg eceran Jawa Barat; harga desa di bawah eceran',
  },
  {
    id: 'hrg-06',
    komoditasId: 'kom-kopi',
    hppRp: null,
    hargaDesaRp: 58000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-07',
    sumber:
      'GoodStats/Open Data Jabar 2025: robusta green bean sekitar Rp58.000/kg di pengepul',
  },
  {
    id: 'hrg-07',
    komoditasId: 'kom-padi',
    hppRp: 6500,
    hargaDesaRp: 7900,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-14',
    sumber:
      'HPP GKP Rp6.500/kg (Bapanas); harga GKP Jawa Barat di atas Rp7.000/kg (Bulog Jabar, 6 Nov 2026)',
  },
  {
    id: 'hrg-08',
    komoditasId: 'kom-jagung',
    hppRp: 5500,
    hargaDesaRp: 7000,
    hargaPasarBapanasRp: 7403,
    tanggal: '2026-11-14',
    sumber:
      'Bapanas Panel Harga, 14 Nov 2026: jagung tk peternak Rp7.403/kg; HPP Rp5.500/kg',
  },
  {
    id: 'hrg-09',
    komoditasId: 'kom-cabai',
    hppRp: null,
    hargaDesaRp: 62000,
    hargaPasarBapanasRp: 85968,
    tanggal: '2026-11-14',
    sumber:
      'Bapanas Panel Harga, 14 Nov 2026: cabai rawit merah Rp85.968/kg',
  },
  {
    id: 'hrg-10',
    komoditasId: 'kom-singkong',
    hppRp: null,
    hargaDesaRp: 3000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-14',
    sumber:
      'Kementan, 26 Okt 2026: harga singkong tingkat petani sekitar Rp3.000/kg',
  },
  {
    id: 'hrg-11',
    komoditasId: 'kom-pisang',
    hppRp: null,
    hargaDesaRp: 8000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-14',
    sumber:
      'Katadata, 19 Nov 2026: pisang Rp9.500/kg eceran Jawa Barat; harga desa di bawah eceran',
  },
  {
    id: 'hrg-12',
    komoditasId: 'kom-kopi',
    hppRp: null,
    hargaDesaRp: 58000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-14',
    sumber:
      'GoodStats/Open Data Jabar 2025: robusta green bean sekitar Rp58.000/kg di pengepul',
  },
  {
    id: 'hrg-13',
    komoditasId: 'kom-sayur-daun',
    hppRp: null,
    hargaDesaRp: 4000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-14',
    sumber:
      'Bapokting Garut/Bandung, 25 Nov 2026: kangkung/bayam Rp1.625-Rp4.923/kg',
  },
  {
    id: 'hrg-14',
    komoditasId: 'kom-padi',
    hppRp: 6500,
    hargaDesaRp: 8000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-21',
    sumber:
      'HPP GKP Rp6.500/kg (Bapanas); GKP Cianjur Rp8.000/kg (Bappebti, 18 Nov 2026)',
  },
  {
    id: 'hrg-15',
    komoditasId: 'kom-jagung',
    hppRp: 5500,
    hargaDesaRp: 6900,
    hargaPasarBapanasRp: 7289,
    tanggal: '2026-11-21',
    sumber:
      'Bapanas Panel Harga, 21 Nov 2026: jagung tk peternak Rp7.289/kg; HPP Rp5.500/kg',
  },
  {
    id: 'hrg-16',
    komoditasId: 'kom-cabai',
    hppRp: null,
    hargaDesaRp: 60000,
    hargaPasarBapanasRp: 84648,
    tanggal: '2026-11-21',
    sumber:
      'Bapanas Panel Harga, 21 Nov 2026: cabai rawit merah Rp84.648/kg',
  },
  {
    id: 'hrg-17',
    komoditasId: 'kom-singkong',
    hppRp: null,
    hargaDesaRp: 3000,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-21',
    sumber:
      'Kementan, 26 Okt 2026: harga singkong tingkat petani sekitar Rp3.000/kg',
  },
  {
    id: 'hrg-18',
    komoditasId: 'kom-pisang',
    hppRp: null,
    hargaDesaRp: 8200,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-21',
    sumber:
      'Katadata, 19 Nov 2026: pisang Rp9.500/kg eceran Jawa Barat; harga desa di bawah eceran',
  },
  {
    id: 'hrg-19',
    komoditasId: 'kom-kopi',
    hppRp: null,
    hargaDesaRp: 58500,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-21',
    sumber:
      'GoodStats/Open Data Jabar 2025: robusta green bean sekitar Rp58.000/kg di pengepul',
  },
  {
    id: 'hrg-20',
    komoditasId: 'kom-sayur-daun',
    hppRp: null,
    hargaDesaRp: 4200,
    hargaPasarBapanasRp: null,
    tanggal: '2026-11-21',
    sumber:
      'Bapokting Garut/Bandung, 25 Nov 2026: kangkung/bayam Rp1.625-Rp4.923/kg',
  },
];
