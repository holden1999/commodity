import type { Kolam } from '../types.js';

/** Four fish units: river cage, biofloc, earthen pond, and village reservoir. */
export const kolam: readonly Kolam[] = [
  {
    id: 'klm-01',
    petakId: 'ptk-05',
    komoditasId: 'kom-nila',
    tipe: 'KJA Sungai',
    luasM2: 400,
    phAir: 7.2,
    suhuAir: 28,
    do: 5.5,
    debit: 120,
  },
  {
    id: 'klm-02',
    petakId: 'ptk-06',
    komoditasId: 'kom-lele',
    tipe: 'Bioflok',
    luasM2: 120,
    phAir: 6.8,
    suhuAir: 29,
    do: 4.2,
    debit: 1.5,
  },
  {
    id: 'klm-03',
    petakId: 'ptk-13',
    komoditasId: 'kom-mas',
    tipe: 'Kolam Tanah',
    luasM2: 600,
    phAir: 7.0,
    suhuAir: 27,
    do: 5.0,
    debit: 3.0,
  },
  {
    id: 'klm-04',
    petakId: 'ptk-24',
    komoditasId: 'kom-gurame',
    tipe: 'Embung',
    luasM2: 900,
    phAir: 6.9,
    suhuAir: 26.5,
    do: 5.8,
    debit: 4.5,
  },
];
