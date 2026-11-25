package fuzzy

// Set is one triangular membership set. A flat left shoulder has A == B and a
// flat right shoulder has B == C.
type Set struct {
	Name  string  `json:"name"`
	Label string  `json:"label"`
	A     float64 `json:"a"`
	B     float64 `json:"b"`
	C     float64 `json:"c"`
}

// Variable is one measured input and its membership sets.
type Variable struct {
	Key     string  `json:"key"`
	Label   string  `json:"label"`
	Unit    string  `json:"unit"`
	Min     float64 `json:"min"`
	Max     float64 `json:"max"`
	Step    float64 `json:"step"`
	Default float64 `json:"default"`
	Weight  float64 `json:"weight"`
	Sets    []Set   `json:"sets"`
}

// Commodity is the static catalog entry for one scored crop.
type Commodity struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	Cycle     string `json:"cycle"`
	CycleDays int    `json:"cycleDays"`
}

// Zone is an elevation band with its advice copy.
type Zone struct {
	ID     int     `json:"id"`
	Name   string  `json:"name"`
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	Advice string  `json:"advice"`
}

// Consequence is one commodity verdict produced by a rule.
type Consequence struct {
	Commodity string `json:"commodity"`
	Verdict   string `json:"verdict"`
}

// Rule is the public rule metadata. Terms and policy stay unexported because
// the config API exposes only id, text and consequences.
type Rule struct {
	ID           string        `json:"id"`
	Text         string        `json:"text"`
	Consequences []Consequence `json:"consequences"`

	terms  []term
	policy string
}

type term struct {
	variable string
	set      string
}

// Price is the Harga Desa metadata.
type Price struct {
	HPP           float64 `json:"hpp"`
	Market        float64 `json:"market"`
	Source        string  `json:"source"`
	NeighborShare int     `json:"neighborShare"`
	NetworkShare  int     `json:"networkShare"`
}

// ChecklistItem is one download or SOP step.
type ChecklistItem struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Detail string `json:"detail"`
}

// Checklist groups the download and SOP steps in contract order.
type Checklist struct {
	Download []ChecklistItem `json:"download"`
	SOP      []ChecklistItem `json:"sop"`
}

// ConfigData is the static payload served by GET /api/config. Go does not
// allow a type and a function to share the name Config, so the constructor
// keeps the contract name and the payload type is ConfigData.
type ConfigData struct {
	Variables   []Variable  `json:"variables"`
	Commodities []Commodity `json:"commodities"`
	Zones       []Zone      `json:"zones"`
	Rules       []Rule      `json:"rules"`
	Price       Price       `json:"price"`
	Checklist   Checklist   `json:"checklist"`
}

// Config returns fresh copies of the catalog so callers cannot mutate the
// package's rule base through the returned slices.
func Config() ConfigData {
	return ConfigData{
		Variables:   variables(),
		Commodities: commodities(),
		Zones:       zones(),
		Rules:       rules(),
		Price:       price(),
		Checklist:   checklist(),
	}
}

func set(name, label string, a, b, c float64) Set {
	return Set{Name: name, Label: label, A: a, B: b, C: c}
}

func variable(key, label, unit string, min, max, step, def, weight float64, sets ...Set) Variable {
	return Variable{
		Key: key, Label: label, Unit: unit,
		Min: min, Max: max, Step: step, Default: def, Weight: weight,
		Sets: sets,
	}
}

func variables() []Variable {
	return []Variable{
		variable("hujan", "Curah hujan (CHIRPS)", "mm/tahun", 2300, 4700, 50, 3500, 20,
			set("rendah", "Rendah", 2300, 2300, 3200),
			set("sedang", "Sedang", 2800, 3500, 4200),
			set("tinggi", "Tinggi", 3800, 4700, 4700)),
		variable("ph", "pH tanah (SoilGrids)", "pH", 4.5, 7.0, 0.1, 5.5, 15,
			set("asam", "Asam", 4.5, 4.5, 5.8),
			set("netral", "Netral", 5.2, 6.2, 6.8),
			set("basa", "Basa", 6.4, 7.0, 7.0)),
		variable("kesuburan", "Kesuburan tanah (SOC + N)", "indeks", 0, 100, 5, 55, 15,
			set("rendah", "Rendah", 0, 0, 45),
			set("sedang", "Sedang", 25, 55, 80),
			set("tinggi", "Tinggi", 60, 100, 100)),
		variable("mdpl", "Ketinggian (SRTM)", "mdpl", 180, 320, 1, 232, 10,
			set("rendah", "Rendah", 180, 180, 235),
			set("menengah", "Menengah", 215, 260, 295),
			set("tinggi", "Tinggi", 275, 320, 320)),
		variable("slope", "Kemiringan lereng (DEM)", "derajat", 0, 45, 1, 8, 10,
			set("datar", "Datar", 0, 0, 12),
			set("sedang", "Sedang", 8, 18, 28),
			set("curam", "Curam", 22, 45, 45)),
		variable("aspect", "Arah lereng (DEM)", "derajat", 0, 360, 15, 90, 15,
			set("timur", "Timur", 60, 90, 120),
			set("barat", "Barat", 240, 270, 300)),
		variable("jarakSungai", "Jarak ke sungai (OSM + BIG)", "m", 0, 1000, 10, 150, 15,
			set("dekat", "Dekat", 0, 0, 250),
			set("sedang", "Sedang", 150, 450, 750),
			set("jauh", "Jauh", 600, 1000, 1000)),
		variable("radiasi", "Radiasi matahari (NASA POWER)", "kWh/m2/hari", 3.0, 7.0, 0.1, 5.0, 15,
			set("rendah", "Rendah", 3.0, 3.0, 4.2),
			set("sedang", "Sedang", 3.6, 4.8, 6.0),
			set("tinggi", "Tinggi", 5.2, 7.0, 7.0)),
		variable("sebaran", "Sebaran petak (jarak rata-rata)", "m", 0, 1000, 10, 200, 10,
			set("menyatu", "Menyatu", 0, 0, 200),
			set("agakTerpencar", "Agak Terpencar", 100, 350, 600),
			set("sangatTerpencar", "Sangat Terpencar", 450, 1000, 1000)),
		variable("permintaan", "Permintaan masakan lokal", "indeks", 0, 100, 5, 60, 15,
			set("rendah", "Rendah", 0, 0, 45),
			set("sedang", "Sedang", 30, 60, 85),
			set("tinggi", "Tinggi", 65, 100, 100)),
		variable("ndvi", "NDVI (Sentinel-2)", "indeks", 0.0, 1.0, 0.01, 0.65, 10,
			set("rendah", "Rendah", 0, 0, 0.4),
			set("sedang", "Sedang", 0.3, 0.55, 0.75),
			set("tinggi", "Tinggi", 0.6, 1.0, 1.0)),
		variable("risikoBanjir", "Risiko banjir (DEM + CHIRPS)", "indeks", 0, 100, 5, 55, 10,
			set("rendah", "Rendah", 0, 0, 40),
			set("sedang", "Sedang", 25, 55, 80),
			set("tinggi", "Tinggi", 65, 100, 100)),
	}
}

func commodities() []Commodity {
	return []Commodity{
		{Key: "padi", Label: "Padi", Cycle: "musiman", CycleDays: 120},
		{Key: "jagung", Label: "Jagung", Cycle: "musiman", CycleDays: 100},
		{Key: "cabai", Label: "Cabai", Cycle: "bulanan", CycleDays: 90},
		{Key: "kopi", Label: "Kopi", Cycle: "tahunan", CycleDays: 365},
		{Key: "pisang", Label: "Pisang", Cycle: "tahunan", CycleDays: 365},
		{Key: "kacang_tanah", Label: "Kacang Tanah", Cycle: "musiman", CycleDays: 100},
		{Key: "kentang", Label: "Kentang", Cycle: "musiman", CycleDays: 100},
		{Key: "bawang_merah", Label: "Bawang Merah", Cycle: "musiman", CycleDays: 60},
		{Key: "sayur_daun", Label: "Sayur Daun", Cycle: "mingguan", CycleDays: 30},
	}
}

func zones() []Zone {
	return []Zone{
		{ID: 1, Name: "Dataran Sungai", Min: 180, Max: 220,
			Advice: "Padi sawah + sayur daun. Drainase wajib."},
		{ID: 2, Name: "Transisi", Min: 220, Max: 260,
			Advice: "Padi + jagung + cabai. Paling fleksibel untuk tumpang sari."},
		{ID: 3, Name: "Perbukitan", Min: 260, Max: 300,
			Advice: "Singkong + pisang + kopi + sayur. Teras dan tanaman penahan lereng wajib."},
		{ID: 4, Name: "Atas", Min: 300, Max: 320,
			Advice: "Hutan + kebun campuran + kopi. Konservasi dulu, jangan buka sawah baru."},
	}
}

func t(variable, setName string) term {
	return term{variable: variable, set: setName}
}

func c(commodity, verdict string) Consequence {
	return Consequence{Commodity: commodity, Verdict: verdict}
}

func rule(id, text string, terms []term, cons []Consequence, policy string) Rule {
	if cons == nil {
		cons = []Consequence{}
	}
	return Rule{ID: id, Text: text, Consequences: cons, terms: terms, policy: policy}
}

func rules() []Rule {
	return []Rule{
		rule("01", "Hujan tinggi AND tanah subur AND mdpl rendah AND air dekat → Padi sangat cocok",
			[]term{t("hujan", "tinggi"), t("kesuburan", "sedang"), t("mdpl", "rendah"), t("jarakSungai", "dekat")},
			[]Consequence{c("padi", "sangat")}, ""),
		rule("02", "Penyinaran tinggi AND lereng barat AND air jauh → Cabai kurang cocok, Kopi sangat cocok, Pisang sangat cocok",
			[]term{t("radiasi", "tinggi"), t("aspect", "barat"), t("jarakSungai", "jauh")},
			[]Consequence{c("cabai", "kurang"), c("kopi", "sangat"), c("pisang", "sangat")}, ""),
		rule("03", "Lahan sangat terpencar → Diversifikasi sangat cocok",
			[]term{t("sebaran", "sangatTerpencar")},
			nil, "diversify"),
		rule("04", "Air jauh AND hujan rendah → Padi kurang cocok",
			[]term{t("jarakSungai", "jauh"), t("hujan", "rendah")},
			[]Consequence{c("padi", "kurang")}, ""),
		rule("05", "Hujan sedang AND tanah netral AND mdpl menengah → Jagung sangat cocok",
			[]term{t("hujan", "sedang"), t("ph", "netral"), t("mdpl", "menengah")},
			[]Consequence{c("jagung", "sangat")}, ""),
		rule("06", "pH asam AND tanah kurang subur → Cabai kurang cocok, Kacang Tanah cocok",
			[]term{t("ph", "asam"), t("kesuburan", "rendah")},
			[]Consequence{c("cabai", "kurang"), c("kacang_tanah", "cocok")}, ""),
		rule("07", "Mdpl tinggi AND penyinaran sedang → Kentang cocok",
			[]term{t("mdpl", "tinggi"), t("radiasi", "sedang")},
			[]Consequence{c("kentang", "cocok")}, ""),
		rule("08", "Permintaan tinggi AND hujan sedang AND air sedang → Cabai sangat cocok",
			[]term{t("permintaan", "tinggi"), t("hujan", "sedang"), t("jarakSungai", "sedang")},
			[]Consequence{c("cabai", "sangat")}, ""),
		rule("09", "Lahan menyatu AND air dekat AND mdpl rendah → Padi sangat cocok",
			[]term{t("sebaran", "menyatu"), t("jarakSungai", "dekat"), t("mdpl", "rendah")},
			[]Consequence{c("padi", "sangat")}, ""),
		rule("10", "Penyinaran rendah AND NDVI tinggi → Kopi cocok, Cabai kurang cocok",
			[]term{t("radiasi", "rendah"), t("ndvi", "tinggi")},
			[]Consequence{c("kopi", "cocok"), c("cabai", "kurang")}, ""),
		rule("11", "Lereng timur AND penyinaran sedang AND tanah subur → Jagung sangat cocok, Cabai sangat cocok",
			[]term{t("aspect", "timur"), t("radiasi", "sedang"), t("kesuburan", "sedang")},
			[]Consequence{c("jagung", "sangat"), c("cabai", "sangat")}, ""),
		rule("12", "Lahan agak terpencar AND air sedang → Bawang Merah cocok; diversifikasi dianjurkan",
			[]term{t("sebaran", "agakTerpencar"), t("jarakSungai", "sedang")},
			[]Consequence{c("bawang_merah", "cocok")}, "diversify"),
		rule("13", "Penyinaran tinggi AND hujan rendah AND air jauh → Bawang Merah cocok",
			[]term{t("radiasi", "tinggi"), t("hujan", "rendah"), t("jarakSungai", "jauh")},
			[]Consequence{c("bawang_merah", "cocok")}, ""),
		rule("14", "Hujan tinggi AND air dekat → Padi cocok, Jagung kurang cocok",
			[]term{t("hujan", "tinggi"), t("jarakSungai", "dekat")},
			[]Consequence{c("padi", "cocok"), c("jagung", "kurang")}, ""),
		rule("15", "Permintaan sedang AND mdpl menengah AND tanah netral → Kacang Tanah sangat cocok",
			[]term{t("permintaan", "sedang"), t("mdpl", "menengah"), t("ph", "netral")},
			[]Consequence{c("kacang_tanah", "sangat")}, ""),
		rule("16", "Penyinaran tinggi AND mdpl tinggi AND lereng barat → Pisang sangat cocok",
			[]term{t("radiasi", "tinggi"), t("mdpl", "tinggi"), t("aspect", "barat")},
			[]Consequence{c("pisang", "sangat")}, ""),
		rule("17", "Tanah sangat subur AND hujan sedang → Sayur Daun sangat cocok",
			[]term{t("kesuburan", "tinggi"), t("hujan", "sedang")},
			[]Consequence{c("sayur_daun", "sangat")}, ""),
		rule("18", "Lahan sangat terpencar AND air jauh → Paket per petak berbeda",
			[]term{t("sebaran", "sangatTerpencar"), t("jarakSungai", "jauh")},
			nil, "perPlot"),
	}
}

func price() Price {
	return Price{
		HPP:           6500,
		Market:        9000,
		Source:        "HPP GKP Rp6.500/kg (SE Bapanas 456/2026, 18 Nov 2026)",
		NeighborShare: 30,
		NetworkShare:  70,
	}
}

func checklistItem(id, label, detail string) ChecklistItem {
	return ChecklistItem{ID: id, Label: label, Detail: detail}
}

func checklist() Checklist {
	return Checklist{
		Download: []ChecklistItem{
			checklistItem("srtm", "SRTM", "DEM untuk mdpl, slope, dan aspect. portal.opentopography.org"),
			checklistItem("soilgrids", "SoilGrids", "pH, nitrogen, SOC, liat/pasir. soilgrids.org, rest.isric.org — ingat pH disimpan x10, bagi 10."),
			checklistItem("chirps", "CHIRPS", "Hujan bulanan. data.chc.ucsb.edu/products/CHIRPS-2.0"),
			checklistItem("power", "NASA POWER", "Radiasi, suhu, hujan. power.larc.nasa.gov"),
			checklistItem("osm_big", "OSM + BIG", "Jarak ke sungai/jalan dan batas desa. download.geofabrik.de dan tanahair.indonesia.go.id"),
			checklistItem("sentinel2", "Sentinel-2", "NDVI kesehatan vegetasi. dataspace.copernicus.eu"),
			checklistItem("bapanas", "Bapanas terpisah", "Harga pasar + volatilitas. panelharga.badanpangan.go.id, data.badanpangan.go.id — jangan campur dengan data biofisik."),
		},
		SOP: []ChecklistItem{
			checklistItem("cuaca", "Update hujan + harga pasar", "Catat hujan terbaru dan harga pasar yang masih berlaku di wilayah."),
			checklistItem("skor", "Hitung ulang skor", "Jalankan fuzzifikasi, rule, dan defuzzifikasi untuk tiap petak."),
			checklistItem("kuota", "Tentukan kuota 30% tetangga / 70% jaringan", "Amankan pasokan lokal dulu, lalu salurkan sisanya lewat jaringan antar desa."),
			checklistItem("bayar", "Tentukan pembayaran di muka / langganan", "Sepakati skema pembayaran sebelum tanam atau sebelum panen."),
			checklistItem("panen", "Tentukan jadwal panen", "Selaraskan siklus harian, mingguan, bulanan, musiman, dan tahunan."),
			checklistItem("evaluasi", "Evaluasi bulanan", "Bandingkan rencana, realisasi, harga, dan food loss; perbaiki bobot bila perlu."),
		},
	}
}
