package dss

type Sektor string

const (
	SektorPertanian  Sektor = "Pertanian"
	SektorPeternakan Sektor = "Peternakan"
	SektorPerikanan  Sektor = "Perikanan"
)

type RisikoBanjir string

const (
	RisikoRendah RisikoBanjir = "Rendah"
	RisikoSedang RisikoBanjir = "Sedang"
	RisikoTinggi RisikoBanjir = "Tinggi"
)

type SelectionKind string

const (
	SelectionZona   SelectionKind = "zona"
	SelectionPetak  SelectionKind = "petak"
	SelectionKolam  SelectionKind = "kolam"
	SelectionTernak SelectionKind = "ternak"
	SelectionPasar  SelectionKind = "pasar"
	SelectionSungai SelectionKind = "sungai"
)

type Zona struct {
	ID           string       `json:"id"`
	DesaID       string       `json:"desaId"`
	Nama         string       `json:"nama"`
	MdplMin      float64      `json:"mdplMin"`
	MdplMax      float64      `json:"mdplMax"`
	RisikoBanjir RisikoBanjir `json:"risikoBanjir"`
}

type Petak struct {
	ID             string  `json:"id"`
	ZonaID         string  `json:"zonaId"`
	KelompokTaniID string  `json:"kelompokTaniId"`
	Nama           string  `json:"nama"`
	LuasHa         float64 `json:"luasHa"`
	JenisTanah     string  `json:"jenisTanah"`
	PhTanah        float64 `json:"phTanah"`
	CurahHujanMm   float64 `json:"curahHujanMm"`
	Mdpl           float64 `json:"mdpl"`
	Slope          float64 `json:"slope"`
	JarakKeSungaiM float64 `json:"jarakKeSungaiM"`
	NDVI           float64 `json:"ndvi"`
	KomoditasID    *string `json:"komoditasId"`
}

type Komoditas struct {
	ID         string  `json:"id"`
	Nama       string  `json:"nama"`
	Sektor     Sektor  `json:"sektor"`
	FuzzyScore float64 `json:"fuzzyScore"`
}

type Ternak struct {
	ID                       string  `json:"id"`
	PetakID                  string  `json:"petakId"`
	KomoditasID              string  `json:"komoditasId"`
	Jenis                    string  `json:"jenis"`
	Jumlah                   int     `json:"jumlah"`
	KebutuhanHijauan         float64 `json:"kebutuhanHijauan"`
	KebutuhanAirLiterPerHari float64 `json:"kebutuhanAirLiterPerHari"`
}

type Kolam struct {
	ID          string  `json:"id"`
	PetakID     string  `json:"petakId"`
	KomoditasID string  `json:"komoditasId"`
	Tipe        string  `json:"tipe"`
	LuasM2      float64 `json:"luasM2"`
	PhAir       float64 `json:"phAir"`
	SuhuAir     float64 `json:"suhuAir"`
	DO          float64 `json:"do"`
	Debit       float64 `json:"debit"`
}

type Pelaku struct {
	ID     string `json:"id"`
	DesaID string `json:"desaId"`
	Nama   string `json:"nama"`
	Jenis  string `json:"jenis"`
}

type RantaiPasok struct {
	ID          string  `json:"id"`
	DariID      string  `json:"dariId"`
	KeID        string  `json:"keId"`
	KomoditasID string  `json:"komoditasId"`
	Tipe        string  `json:"tipe"`
	Pelaku      string  `json:"pelaku"`
	MarginRp    float64 `json:"marginRp"`
}

type Harga struct {
	ID                  string   `json:"id"`
	KomoditasID         string   `json:"komoditasId"`
	HppRp               *float64 `json:"hppRp"`
	HargaDesaRp         float64  `json:"hargaDesaRp"`
	HargaPasarBapanasRp *float64 `json:"hargaPasarBapanasRp"`
	Tanggal             string   `json:"tanggal"`
}

type LiveState struct {
	RainfallByPetak    map[string]float64  `json:"rainfallByPetak"`
	NdviByPetak        map[string]float64  `json:"ndviByPetak"`
	BapanasByKomoditas map[string]*float64 `json:"bapanasByKomoditas"`
	UpdatedAt          string              `json:"updatedAt"`
	Tick               int                 `json:"tick"`
}

type Selection struct {
	Kind SelectionKind `json:"kind"`
	ID   string        `json:"id"`
}

type CiapusFilters struct {
	HighFloodRisk   bool   `json:"highFloodRisk"`
	HighFuzzy       bool   `json:"highFuzzy"`
	RantaiPasokType string `json:"rantaiPasokType"`
}

type DecisionStatus struct {
	ID                   string        `json:"id"`
	Kind                 SelectionKind `json:"kind"`
	Name                 string        `json:"name"`
	Zona                 string        `json:"zona"`
	FuzzyScore           *float64      `json:"fuzzyScore"`
	RecommendedKomoditas *string       `json:"recommendedKomoditas"`
	SoilPh               *float64      `json:"soilPh"`
	WaterPh              *float64      `json:"waterPh"`
	RainfallMm           *float64      `json:"rainfallMm"`
	NDVI                 *float64      `json:"ndvi"`
	HargaDesaRp          *float64      `json:"hargaDesaRp"`
	HppRp                *float64      `json:"hppRp"`
	HargaPasarBapanasRp  *float64      `json:"hargaPasarBapanasRp"`
	HargaKomoditas       *string       `json:"hargaKomoditas"`
	LastUpdated          string        `json:"lastUpdated"`
}

type KpiSummary struct {
	AverageFuzzyScore  *float64 `json:"averageFuzzyScore"`
	HargaDesaMarginPct *float64 `json:"hargaDesaMarginPct"`
	HighFloodRiskPct   *float64 `json:"highFloodRiskPct"`
	ActiveKolam        int      `json:"activeKolam"`
	TotalTernak        int      `json:"totalTernak"`
	LowWaterAlerts     int      `json:"lowWaterAlerts"`
}

type SceneVisibility struct {
	Petak  []string `json:"petak"`
	Kolam  []string `json:"kolam"`
	Ternak []string `json:"ternak"`
}

type RantaiPasokView struct {
	ID            string  `json:"id"`
	Tipe          string  `json:"tipe"`
	DariNama      string  `json:"dariNama"`
	KeNama        string  `json:"keNama"`
	KomoditasNama string  `json:"komoditasNama"`
	MarginRp      float64 `json:"marginRp"`
}
