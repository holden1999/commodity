package dss

func strPtr(v string) *string    { return &v }
func f64Ptr(v float64) *float64 { return &v }

var seedZonas = []Zona{
	{ID: "zona-1", DesaID: "desa-ciapus", Nama: "Zona 1 Dataran Sungai", MdplMin: 200, MdplMax: 230, RisikoBanjir: RisikoTinggi},
	{ID: "zona-2", DesaID: "desa-ciapus", Nama: "Zona 2 Transisi", MdplMin: 230, MdplMax: 260, RisikoBanjir: RisikoSedang},
	{ID: "zona-3", DesaID: "desa-ciapus", Nama: "Zona 3 Perbukitan", MdplMin: 260, MdplMax: 300, RisikoBanjir: RisikoRendah},
	{ID: "zona-4", DesaID: "desa-ciapus", Nama: "Zona 4 Atas / Konservasi", MdplMin: 300, MdplMax: 325, RisikoBanjir: RisikoRendah},
}

var seedKomoditas = []Komoditas{
	{ID: "kom-padi", Nama: "Padi", Sektor: SektorPertanian, FuzzyScore: 88},
	{ID: "kom-jagung", Nama: "Jagung", Sektor: SektorPertanian, FuzzyScore: 82},
	{ID: "kom-cabai", Nama: "Cabai", Sektor: SektorPertanian, FuzzyScore: 74},
	{ID: "kom-singkong", Nama: "Singkong", Sektor: SektorPertanian, FuzzyScore: 78},
	{ID: "kom-pisang", Nama: "Pisang", Sektor: SektorPertanian, FuzzyScore: 85},
	{ID: "kom-kopi", Nama: "Kopi", Sektor: SektorPertanian, FuzzyScore: 72},
	{ID: "kom-sayur-daun", Nama: "Sayur Daun", Sektor: SektorPertanian, FuzzyScore: 80},
	{ID: "kom-sapi", Nama: "Sapi", Sektor: SektorPeternakan, FuzzyScore: 66},
	{ID: "kom-kambing", Nama: "Kambing", Sektor: SektorPeternakan, FuzzyScore: 75},
	{ID: "kom-ayam", Nama: "Ayam", Sektor: SektorPeternakan, FuzzyScore: 84},
	{ID: "kom-itik", Nama: "Itik", Sektor: SektorPeternakan, FuzzyScore: 71},
	{ID: "kom-nila", Nama: "Ikan Nila", Sektor: SektorPerikanan, FuzzyScore: 83},
	{ID: "kom-lele", Nama: "Ikan Lele", Sektor: SektorPerikanan, FuzzyScore: 87},
	{ID: "kom-mas", Nama: "Ikan Mas", Sektor: SektorPerikanan, FuzzyScore: 70},
	{ID: "kom-gurame", Nama: "Ikan Gurame", Sektor: SektorPerikanan, FuzzyScore: 64},
}

var seedPetak = []Petak{
	{ID: "ptk-01", ZonaID: "zona-1", KelompokTaniID: "kt-01", Nama: "Sawah Utara", LuasHa: 1.8, JenisTanah: "Regosol", PhTanah: 6.4, CurahHujanMm: 3500, Mdpl: 212, Slope: 1, JarakKeSungaiM: 120, NDVI: 0.81, KomoditasID: strPtr("kom-padi")},
	{ID: "ptk-02", ZonaID: "zona-1", KelompokTaniID: "kt-01", Nama: "Sawah Tengah", LuasHa: 1.6, JenisTanah: "Regosol", PhTanah: 6.5, CurahHujanMm: 3500, Mdpl: 218, Slope: 1, JarakKeSungaiM: 90, NDVI: 0.82, KomoditasID: strPtr("kom-padi")},
	{ID: "ptk-03", ZonaID: "zona-1", KelompokTaniID: "kt-01", Nama: "Sawah Hilir", LuasHa: 1.4, JenisTanah: "Regosol", PhTanah: 6.3, CurahHujanMm: 3550, Mdpl: 208, Slope: 0.5, JarakKeSungaiM: 60, NDVI: 0.79, KomoditasID: strPtr("kom-padi")},
	{ID: "ptk-04", ZonaID: "zona-1", KelompokTaniID: "kt-06", Nama: "Kebun Sayur Sungai", LuasHa: 0.9, JenisTanah: "Regosol", PhTanah: 6.6, CurahHujanMm: 3500, Mdpl: 225, Slope: 2, JarakKeSungaiM: 150, NDVI: 0.76, KomoditasID: strPtr("kom-sayur-daun")},
	{ID: "ptk-05", ZonaID: "zona-1", KelompokTaniID: "kt-04", Nama: "Kolam Nila Hilir", LuasHa: 0.5, JenisTanah: "Regosol", PhTanah: 6.2, CurahHujanMm: 3500, Mdpl: 210, Slope: 0, JarakKeSungaiM: 40, NDVI: 0.72, KomoditasID: nil},
	{ID: "ptk-06", ZonaID: "zona-1", KelompokTaniID: "kt-04", Nama: "Kolam Lele Hilir", LuasHa: 0.4, JenisTanah: "Regosol", PhTanah: 6.1, CurahHujanMm: 3500, Mdpl: 214, Slope: 0, JarakKeSungaiM: 70, NDVI: 0.70, KomoditasID: nil},
	{ID: "ptk-07", ZonaID: "zona-2", KelompokTaniID: "kt-01", Nama: "Sawah Transisi", LuasHa: 1.7, JenisTanah: "Latosol", PhTanah: 6.2, CurahHujanMm: 3700, Mdpl: 238, Slope: 3, JarakKeSungaiM: 320, NDVI: 0.78, KomoditasID: strPtr("kom-padi")},
	{ID: "ptk-08", ZonaID: "zona-2", KelompokTaniID: "kt-05", Nama: "Ladang Jagung Barat", LuasHa: 1.5, JenisTanah: "Latosol", PhTanah: 6.0, CurahHujanMm: 3700, Mdpl: 245, Slope: 5, JarakKeSungaiM: 380, NDVI: 0.74, KomoditasID: strPtr("kom-jagung")},
	{ID: "ptk-09", ZonaID: "zona-2", KelompokTaniID: "kt-05", Nama: "Ladang Jagung Timur", LuasHa: 1.3, JenisTanah: "Latosol", PhTanah: 5.9, CurahHujanMm: 3700, Mdpl: 252, Slope: 6, JarakKeSungaiM: 420, NDVI: 0.72, KomoditasID: strPtr("kom-jagung")},
	{ID: "ptk-10", ZonaID: "zona-2", KelompokTaniID: "kt-02", Nama: "Kebun Cabai Transisi", LuasHa: 0.8, JenisTanah: "Latosol", PhTanah: 6.1, CurahHujanMm: 3700, Mdpl: 248, Slope: 5, JarakKeSungaiM: 360, NDVI: 0.70, KomoditasID: strPtr("kom-cabai")},
	{ID: "ptk-11", ZonaID: "zona-2", KelompokTaniID: "kt-05", Nama: "Kebun Singkong", LuasHa: 1.2, JenisTanah: "Latosol", PhTanah: 5.7, CurahHujanMm: 3700, Mdpl: 255, Slope: 7, JarakKeSungaiM: 480, NDVI: 0.68, KomoditasID: strPtr("kom-singkong")},
	{ID: "ptk-12", ZonaID: "zona-2", KelompokTaniID: "kt-04", Nama: "Kebun Pisang Transisi", LuasHa: 1.0, JenisTanah: "Latosol", PhTanah: 6.0, CurahHujanMm: 3700, Mdpl: 258, Slope: 6, JarakKeSungaiM: 450, NDVI: 0.75, KomoditasID: strPtr("kom-pisang")},
	{ID: "ptk-13", ZonaID: "zona-2", KelompokTaniID: "kt-04", Nama: "Kolam Mas Transisi", LuasHa: 0.6, JenisTanah: "Latosol", PhTanah: 5.8, CurahHujanMm: 3700, Mdpl: 242, Slope: 4, JarakKeSungaiM: 300, NDVI: 0.69, KomoditasID: nil},
	{ID: "ptk-14", ZonaID: "zona-3", KelompokTaniID: "kt-03", Nama: "Kebun Kopi Salak", LuasHa: 1.9, JenisTanah: "Andosol", PhTanah: 5.5, CurahHujanMm: 3900, Mdpl: 268, Slope: 10, JarakKeSungaiM: 620, NDVI: 0.72, KomoditasID: strPtr("kom-kopi")},
	{ID: "ptk-15", ZonaID: "zona-3", KelompokTaniID: "kt-03", Nama: "Kebun Kopi Lereng", LuasHa: 1.6, JenisTanah: "Andosol", PhTanah: 5.4, CurahHujanMm: 3900, Mdpl: 278, Slope: 13, JarakKeSungaiM: 700, NDVI: 0.70, KomoditasID: strPtr("kom-kopi")},
	{ID: "ptk-16", ZonaID: "zona-3", KelompokTaniID: "kt-04", Nama: "Kebun Pisang Lereng", LuasHa: 1.1, JenisTanah: "Latosol", PhTanah: 5.8, CurahHujanMm: 3900, Mdpl: 272, Slope: 12, JarakKeSungaiM: 680, NDVI: 0.71, KomoditasID: strPtr("kom-pisang")},
	{ID: "ptk-17", ZonaID: "zona-3", KelompokTaniID: "kt-02", Nama: "Kebun Cabai Lereng", LuasHa: 0.9, JenisTanah: "Andosol", PhTanah: 5.6, CurahHujanMm: 3900, Mdpl: 286, Slope: 14, JarakKeSungaiM: 760, NDVI: 0.66, KomoditasID: strPtr("kom-cabai")},
	{ID: "ptk-18", ZonaID: "zona-3", KelompokTaniID: "kt-05", Nama: "Ladang Jagung Lereng", LuasHa: 1.4, JenisTanah: "Latosol", PhTanah: 5.5, CurahHujanMm: 3900, Mdpl: 294, Slope: 15, JarakKeSungaiM: 800, NDVI: 0.64, KomoditasID: strPtr("kom-jagung")},
	{ID: "ptk-19", ZonaID: "zona-3", KelompokTaniID: "kt-05", Nama: "Kandang Sapi", LuasHa: 0.7, JenisTanah: "Andosol", PhTanah: 5.3, CurahHujanMm: 3900, Mdpl: 276, Slope: 11, JarakKeSungaiM: 720, NDVI: 0.58, KomoditasID: nil},
	{ID: "ptk-20", ZonaID: "zona-3", KelompokTaniID: "kt-05", Nama: "Kandang Kambing", LuasHa: 0.5, JenisTanah: "Latosol", PhTanah: 5.6, CurahHujanMm: 3900, Mdpl: 288, Slope: 13, JarakKeSungaiM: 780, NDVI: 0.60, KomoditasID: nil},
	{ID: "ptk-21", ZonaID: "zona-4", KelompokTaniID: "kt-03", Nama: "Kebun Kopi Atas", LuasHa: 1.5, JenisTanah: "Andosol", PhTanah: 5.2, CurahHujanMm: 4000, Mdpl: 306, Slope: 18, JarakKeSungaiM: 950, NDVI: 0.67, KomoditasID: strPtr("kom-kopi")},
	{ID: "ptk-22", ZonaID: "zona-4", KelompokTaniID: "kt-06", Nama: "Kebun Sayur Atas", LuasHa: 0.8, JenisTanah: "Andosol", PhTanah: 5.3, CurahHujanMm: 4000, Mdpl: 318, Slope: 20, JarakKeSungaiM: 1020, NDVI: 0.62, KomoditasID: strPtr("kom-sayur-daun")},
	{ID: "ptk-23", ZonaID: "zona-4", KelompokTaniID: "kt-05", Nama: "Kandang Ayam", LuasHa: 0.4, JenisTanah: "Andosol", PhTanah: 5.4, CurahHujanMm: 4000, Mdpl: 314, Slope: 17, JarakKeSungaiM: 980, NDVI: 0.55, KomoditasID: nil},
	{ID: "ptk-24", ZonaID: "zona-4", KelompokTaniID: "kt-06", Nama: "Embung & Itik", LuasHa: 0.6, JenisTanah: "Andosol", PhTanah: 5.5, CurahHujanMm: 4000, Mdpl: 302, Slope: 16, JarakKeSungaiM: 900, NDVI: 0.60, KomoditasID: nil},
}

var seedTernak = []Ternak{
	{ID: "trn-01", PetakID: "ptk-19", KomoditasID: "kom-sapi", Jenis: "Sapi", Jumlah: 12, KebutuhanHijauan: 420, KebutuhanAirLiterPerHari: 480},
	{ID: "trn-02", PetakID: "ptk-20", KomoditasID: "kom-kambing", Jenis: "Kambing", Jumlah: 40, KebutuhanHijauan: 160, KebutuhanAirLiterPerHari: 160},
	{ID: "trn-03", PetakID: "ptk-23", KomoditasID: "kom-ayam", Jenis: "Ayam", Jumlah: 500, KebutuhanHijauan: 50, KebutuhanAirLiterPerHari: 150},
	{ID: "trn-04", PetakID: "ptk-24", KomoditasID: "kom-itik", Jenis: "Itik", Jumlah: 200, KebutuhanHijauan: 30, KebutuhanAirLiterPerHari: 100},
}

var seedKolam = []Kolam{
	{ID: "klm-01", PetakID: "ptk-05", KomoditasID: "kom-nila", Tipe: "KJA Sungai", LuasM2: 400, PhAir: 7.2, SuhuAir: 28, DO: 5.5, Debit: 120},
	{ID: "klm-02", PetakID: "ptk-06", KomoditasID: "kom-lele", Tipe: "Bioflok", LuasM2: 120, PhAir: 6.8, SuhuAir: 29, DO: 4.2, Debit: 1.5},
	{ID: "klm-03", PetakID: "ptk-13", KomoditasID: "kom-mas", Tipe: "Kolam Tanah", LuasM2: 600, PhAir: 7.0, SuhuAir: 27, DO: 5.0, Debit: 3.0},
	{ID: "klm-04", PetakID: "ptk-24", KomoditasID: "kom-gurame", Tipe: "Embung", LuasM2: 900, PhAir: 6.9, SuhuAir: 26.5, DO: 5.8, Debit: 4.5},
}

var seedPelaku = []Pelaku{
	{ID: "pel-01", DesaID: "desa-ciapus", Nama: "Petani Padi Ciapus", Jenis: "Petani"},
	{ID: "pel-02", DesaID: "desa-ciapus", Nama: "Petani Hortikultura Ciapus", Jenis: "Petani"},
	{ID: "pel-03", DesaID: "desa-ciapus", Nama: "Petani Kopi Ciapus", Jenis: "Petani"},
	{ID: "pel-04", DesaID: "desa-ciapus", Nama: "Petani Singkong Ciapus", Jenis: "Petani"},
	{ID: "pel-05", DesaID: "desa-ciapus", Nama: "Tengkulak Padi Pak Asep", Jenis: "Tengkulak"},
	{ID: "pel-06", DesaID: "desa-ciapus", Nama: "Tengkulak Cabai Bu Enok", Jenis: "Tengkulak"},
	{ID: "pel-07", DesaID: "desa-ciapus", Nama: "Tengkulak Singkong Pak Dedi", Jenis: "Tengkulak"},
	{ID: "pel-08", DesaID: "desa-ciapus", Nama: "Pengepul Kopi Ciapus", Jenis: "Tengkulak"},
	{ID: "pel-09", DesaID: "desa-ciapus", Nama: "Penggilingan Padi Sumber Rezeki", Jenis: "Penggilingan"},
	{ID: "pel-10", DesaID: "desa-ciapus", Nama: "Pasar Desa Ciapus", Jenis: "Pasar"},
	{ID: "pel-11", DesaID: "desa-ciapus", Nama: "Pasar Ciomas", Jenis: "Pasar"},
	{ID: "pel-12", DesaID: "desa-ciapus", Nama: "Warung Tetangga Bu Iyah", Jenis: "Tetangga"},
}

var seedRantaiPasok = []RantaiPasok{
	{ID: "rp-01", DariID: "pel-01", KeID: "pel-05", KomoditasID: "kom-padi", Tipe: "B2B", Pelaku: "Petani", MarginRp: 500},
	{ID: "rp-02", DariID: "pel-05", KeID: "pel-09", KomoditasID: "kom-padi", Tipe: "B2B", Pelaku: "Tengkulak", MarginRp: 400},
	{ID: "rp-03", DariID: "pel-09", KeID: "pel-10", KomoditasID: "kom-padi", Tipe: "B2B", Pelaku: "Penggilingan", MarginRp: 700},
	{ID: "rp-04", DariID: "pel-10", KeID: "pel-12", KomoditasID: "kom-padi", Tipe: "B2C", Pelaku: "Pasar", MarginRp: 300},
	{ID: "rp-05", DariID: "pel-02", KeID: "pel-06", KomoditasID: "kom-cabai", Tipe: "B2B", Pelaku: "Petani", MarginRp: 1500},
	{ID: "rp-06", DariID: "pel-06", KeID: "pel-11", KomoditasID: "kom-cabai", Tipe: "B2B", Pelaku: "Tengkulak", MarginRp: 2500},
	{ID: "rp-07", DariID: "pel-11", KeID: "pel-12", KomoditasID: "kom-cabai", Tipe: "B2C", Pelaku: "Pasar", MarginRp: 1000},
	{ID: "rp-08", DariID: "pel-02", KeID: "pel-10", KomoditasID: "kom-sayur-daun", Tipe: "C2C", Pelaku: "Petani", MarginRp: 800},
	{ID: "rp-09", DariID: "pel-04", KeID: "pel-07", KomoditasID: "kom-singkong", Tipe: "B2B", Pelaku: "Petani", MarginRp: 400},
	{ID: "rp-10", DariID: "pel-07", KeID: "pel-10", KomoditasID: "kom-singkong", Tipe: "B2B", Pelaku: "Tengkulak", MarginRp: 600},
	{ID: "rp-11", DariID: "pel-03", KeID: "pel-08", KomoditasID: "kom-kopi", Tipe: "B2B", Pelaku: "Petani", MarginRp: 2000},
	{ID: "rp-12", DariID: "pel-08", KeID: "pel-11", KomoditasID: "kom-kopi", Tipe: "B2B", Pelaku: "Tengkulak", MarginRp: 3000},
}

var seedHarga = []Harga{
	{ID: "hrg-01", KomoditasID: "kom-padi", HppRp: f64Ptr(6500), HargaDesaRp: 7900, HargaPasarBapanasRp: nil, Tanggal: "2026-11-07"},
	{ID: "hrg-02", KomoditasID: "kom-jagung", HppRp: f64Ptr(5500), HargaDesaRp: 6900, HargaPasarBapanasRp: nil, Tanggal: "2026-11-07"},
	{ID: "hrg-03", KomoditasID: "kom-cabai", HppRp: nil, HargaDesaRp: 65000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-07"},
	{ID: "hrg-04", KomoditasID: "kom-singkong", HppRp: nil, HargaDesaRp: 3000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-07"},
	{ID: "hrg-05", KomoditasID: "kom-pisang", HppRp: nil, HargaDesaRp: 8000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-07"},
	{ID: "hrg-06", KomoditasID: "kom-kopi", HppRp: nil, HargaDesaRp: 58000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-07"},
	{ID: "hrg-07", KomoditasID: "kom-padi", HppRp: f64Ptr(6500), HargaDesaRp: 7900, HargaPasarBapanasRp: nil, Tanggal: "2026-11-14"},
	{ID: "hrg-08", KomoditasID: "kom-jagung", HppRp: f64Ptr(5500), HargaDesaRp: 7000, HargaPasarBapanasRp: f64Ptr(7403), Tanggal: "2026-11-14"},
	{ID: "hrg-09", KomoditasID: "kom-cabai", HppRp: nil, HargaDesaRp: 62000, HargaPasarBapanasRp: f64Ptr(85968), Tanggal: "2026-11-14"},
	{ID: "hrg-10", KomoditasID: "kom-singkong", HppRp: nil, HargaDesaRp: 3000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-14"},
	{ID: "hrg-11", KomoditasID: "kom-pisang", HppRp: nil, HargaDesaRp: 8000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-14"},
	{ID: "hrg-12", KomoditasID: "kom-kopi", HppRp: nil, HargaDesaRp: 58000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-14"},
	{ID: "hrg-13", KomoditasID: "kom-sayur-daun", HppRp: nil, HargaDesaRp: 4000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-14"},
	{ID: "hrg-14", KomoditasID: "kom-padi", HppRp: f64Ptr(6500), HargaDesaRp: 8000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-21"},
	{ID: "hrg-15", KomoditasID: "kom-jagung", HppRp: f64Ptr(5500), HargaDesaRp: 6900, HargaPasarBapanasRp: f64Ptr(7289), Tanggal: "2026-11-21"},
	{ID: "hrg-16", KomoditasID: "kom-cabai", HppRp: nil, HargaDesaRp: 60000, HargaPasarBapanasRp: f64Ptr(84648), Tanggal: "2026-11-21"},
	{ID: "hrg-17", KomoditasID: "kom-singkong", HppRp: nil, HargaDesaRp: 3000, HargaPasarBapanasRp: nil, Tanggal: "2026-11-21"},
	{ID: "hrg-18", KomoditasID: "kom-pisang", HppRp: nil, HargaDesaRp: 8200, HargaPasarBapanasRp: nil, Tanggal: "2026-11-21"},
	{ID: "hrg-19", KomoditasID: "kom-kopi", HppRp: nil, HargaDesaRp: 58500, HargaPasarBapanasRp: nil, Tanggal: "2026-11-21"},
	{ID: "hrg-20", KomoditasID: "kom-sayur-daun", HppRp: nil, HargaDesaRp: 4200, HargaPasarBapanasRp: nil, Tanggal: "2026-11-21"},
}
