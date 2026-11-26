import type { Ternak } from '../types.js';

/** Four livestock units. Feed and water are totals for the whole unit. */
export const ternak: readonly Ternak[] = [
  {
    id: 'trn-01',
    petakId: 'ptk-19',
    komoditasId: 'kom-sapi',
    jenis: 'Sapi',
    jumlah: 12,
    kebutuhanHijauan: 420,
    kebutuhanAirLiterPerHari: 480,
  },
  {
    id: 'trn-02',
    petakId: 'ptk-20',
    komoditasId: 'kom-kambing',
    jenis: 'Kambing',
    jumlah: 40,
    kebutuhanHijauan: 160,
    kebutuhanAirLiterPerHari: 160,
  },
  {
    id: 'trn-03',
    petakId: 'ptk-23',
    komoditasId: 'kom-ayam',
    jenis: 'Ayam',
    jumlah: 500,
    kebutuhanHijauan: 50,
    kebutuhanAirLiterPerHari: 150,
  },
  {
    id: 'trn-04',
    petakId: 'ptk-24',
    komoditasId: 'kom-itik',
    jenis: 'Itik',
    jumlah: 200,
    kebutuhanHijauan: 30,
    kebutuhanAirLiterPerHari: 100,
  },
];
