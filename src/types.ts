/**
 * CiapusDSS data model.
 *
 * All money values are Indonesian rupiah (IDR). All prices are per kilogram
 * unless a row says otherwise. Dates are ISO calendar dates (YYYY-MM-DD).
 */

export type Sektor = 'Pertanian' | 'Peternakan' | 'Perikanan';

export type RisikoBanjir = 'Rendah' | 'Sedang' | 'Tinggi';

export type JenisTanah = 'Latosol' | 'Andosol' | 'Regosol';

export type JenisTernak = 'Sapi' | 'Kambing' | 'Ayam' | 'Itik';

export type TipeKolam =
  | 'Kolam Tanah'
  | 'Kolam Terpal'
  | 'Bioflok'
  | 'KJA Sungai'
  | 'Embung';

export type TipeTransaksi = 'B2B' | 'B2C' | 'C2C';

export type JenisPelaku =
  | 'Petani'
  | 'Tengkulak'
  | 'Penggilingan'
  | 'Pasar'
  | 'Tetangga';

/** Root administrative record. */
export interface Desa {
  id: string;
  nama: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
  kodeKemendagri: string;
  lat: number;
  lon: number;
  /** null = not published by the cited source. Do not replace with a guess. */
  luasKm2: number | null;
  /** null = not published by the cited source. Do not replace with a guess. */
  jumlahPenduduk: number | null;
}

/** Elevation band inside one desa. */
export interface Zona {
  id: string;
  /** FK -> Desa.id */
  desaId: string;
  nama: string;
  mdplMin: number;
  mdplMax: number;
  risikoBanjir: RisikoBanjir;
}

/** Land unit. A petak belongs to one zona and one farmer group. */
export interface Petak {
  id: string;
  /** FK -> Zona.id */
  zonaId: string;
  /** FK -> KelompokTani.id */
  kelompokTaniId: string;
  nama: string;
  luasHa: number;
  jenisTanah: JenisTanah;
  /** Soil pH, 0-14. */
  phTanah: number;
  /** Annual rainfall, mm/year. */
  curahHujanMm: number;
  mdpl: number;
  /** Slope, percent. */
  slope: number;
  jarakKeSungaiM: number;
  /** Normalized difference vegetation index, 0-1. */
  ndvi: number;
  /** FK -> Komoditas.id. null for a production unit without a crop. */
  komoditasId: string | null;
}

/** Crop, livestock, or fish product that can be scored and priced. */
export interface Komoditas {
  id: string;
  nama: string;
  sektor: Sektor;
  /** Suitability score, 0-100. */
  fuzzyScore: number;
}

/** Farmer group that manages one or more petak. */
export interface KelompokTani {
  id: string;
  /** FK -> Desa.id */
  desaId: string;
  nama: string;
  ketua: string;
  jumlahAnggota: number;
  /** FK -> Komoditas.id */
  komoditasIds: readonly string[];
}

/** Livestock unit attached to a petak. */
export interface Ternak {
  id: string;
  /** FK -> Petak.id */
  petakId: string;
  /** FK -> Komoditas.id, sektor must be Peternakan. */
  komoditasId: string;
  jenis: JenisTernak;
  jumlah: number;
  /** Feed requirement for the whole unit, kg/day. */
  kebutuhanHijauan: number;
  /** Water requirement for the whole unit, liters/day. */
  kebutuhanAirLiterPerHari: number;
}

/** Fish pond or water body attached to a petak. */
export interface Kolam {
  id: string;
  /** FK -> Petak.id */
  petakId: string;
  /** FK -> Komoditas.id, sektor must be Perikanan. */
  komoditasId: string;
  tipe: TipeKolam;
  luasM2: number;
  phAir: number;
  /** Water temperature, degrees Celsius. */
  suhuAir: number;
  /** Dissolved oxygen, mg/L. */
  do: number;
  /** Water flow, liters/second. */
  debit: number;
}

/** Supply-chain actor. */
export interface Pelaku {
  id: string;
  /** FK -> Desa.id */
  desaId: string;
  nama: string;
  jenis: JenisPelaku;
}

/** Directed trade link between two actors for one commodity. */
export interface RantaiPasok {
  id: string;
  /** FK -> Pelaku.id */
  dariId: string;
  /** FK -> Pelaku.id */
  keId: string;
  /** FK -> Komoditas.id */
  komoditasId: string;
  tipe: TipeTransaksi;
  /** Role of the source actor at this link. */
  pelaku: JenisPelaku;
  /** Margin at this link, IDR/kg. */
  marginRp: number;
}

/** One price observation for one commodity on one date. */
export interface Harga {
  id: string;
  /** FK -> Komoditas.id */
  komoditasId: string;
  /** Government purchase price, IDR/kg. null = no HPP for this commodity. */
  hppRp: number | null;
  /** Village or farm-gate price, IDR/kg. */
  hargaDesaRp: number;
  /** Bapanas market price, IDR/kg. null = Bapanas does not publish this series. */
  hargaPasarBapanasRp: number | null;
  /** Observation date, YYYY-MM-DD. */
  tanggal: string;
  /** Source note for the observation. */
  sumber: string;
}

export interface SeedData {
  desa: Desa;
  zona: readonly Zona[];
  petak: readonly Petak[];
  komoditas: readonly Komoditas[];
  kelompokTani: readonly KelompokTani[];
  ternak: readonly Ternak[];
  kolam: readonly Kolam[];
  pelaku: readonly Pelaku[];
  rantaiPasok: readonly RantaiPasok[];
  harga: readonly Harga[];
}
