import type { Desa } from '../types.js';

/**
 * Identity from the Ciapus village article and the Kemendagri code.
 * Wikipedia leaves luas and jumlah penduduk blank, so both stay null.
 */
export const desa: Desa = {
  id: 'desa-ciapus',
  nama: 'Ciapus',
  kecamatan: 'Ciomas',
  kabupaten: 'Bogor',
  provinsi: 'Jawa Barat',
  kodePos: '16614',
  kodeKemendagri: '32.01.29.2008',
  lat: -6.59667,
  lon: 106.74722,
  luasKm2: null,
  jumlahPenduduk: null,
};
