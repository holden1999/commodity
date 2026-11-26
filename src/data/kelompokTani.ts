import type { KelompokTani } from '../types.js';

/** Six farmer groups, one per production cluster. Names are seed labels. */
export const kelompokTani: readonly KelompokTani[] = [
  {
    id: 'kt-01',
    desaId: 'desa-ciapus',
    nama: 'Kelompok Tani Ciapus Makmur',
    ketua: 'Asep Saepudin',
    jumlahAnggota: 42,
    komoditasIds: ['kom-padi'],
  },
  {
    id: 'kt-02',
    desaId: 'desa-ciapus',
    nama: 'Kelompok Tani Tunas Harapan',
    ketua: 'Enok Nurhayati',
    jumlahAnggota: 36,
    komoditasIds: ['kom-cabai', 'kom-sayur-daun'],
  },
  {
    id: 'kt-03',
    desaId: 'desa-ciapus',
    nama: 'Kelompok Tani Gunung Salak',
    ketua: 'Dedi Mulyana',
    jumlahAnggota: 28,
    komoditasIds: ['kom-kopi'],
  },
  {
    id: 'kt-04',
    desaId: 'desa-ciapus',
    nama: 'Kelompok Tani Mekar Sari',
    ketua: 'Iyah Suryani',
    jumlahAnggota: 31,
    komoditasIds: ['kom-pisang', 'kom-nila', 'kom-lele', 'kom-mas'],
  },
  {
    id: 'kt-05',
    desaId: 'desa-ciapus',
    nama: 'Kelompok Tani Lembah Ciapus',
    ketua: 'Rahmat Hidayat',
    jumlahAnggota: 25,
    komoditasIds: ['kom-jagung', 'kom-singkong', 'kom-sapi', 'kom-kambing', 'kom-ayam'],
  },
  {
    id: 'kt-06',
    desaId: 'desa-ciapus',
    nama: 'Kelompok Tani Mitra Tani',
    ketua: 'Siti Aminah',
    jumlahAnggota: 22,
    komoditasIds: ['kom-sayur-daun', 'kom-padi', 'kom-gurame', 'kom-itik'],
  },
];
