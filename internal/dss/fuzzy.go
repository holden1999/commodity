package dss

import (
	"math"
	"sort"
)

type FuzzyKind string

const (
	FuzzyKindLahan FuzzyKind = "lahan"
	FuzzyKindAir   FuzzyKind = "air"
)

type FuzzyInput struct {
	Kind         FuzzyKind
	Ph           float64
	CurahHujanMm float64
	NDVI         float64
	Slope        float64
	Mdpl         float64
	SuhuAir      *float64
	DO           *float64
}

type FuzzyProfile struct {
	KomoditasID string
	Sektor      Sektor
	Kind        FuzzyKind
	PhMin       float64
	PhMax       float64
	RainMin     float64
	RainMax     float64
	NdviMin     float64
	SlopeMax    float64
	MdplMin     float64
	MdplMax     float64
	TempMin     *float64
	TempMax     *float64
	DoMin       *float64
}

type RankedCommodity struct {
	KomoditasID string
	Score       float64
}

func landProfile(
	komoditasID string,
	sektor Sektor,
	phMin, phMax, rainMin, rainMax, ndviMin, slopeMax, mdplMin, mdplMax float64,
) FuzzyProfile {
	return FuzzyProfile{
		KomoditasID: komoditasID,
		Sektor:      sektor,
		Kind:        FuzzyKindLahan,
		PhMin:       phMin,
		PhMax:       phMax,
		RainMin:     rainMin,
		RainMax:     rainMax,
		NdviMin:     ndviMin,
		SlopeMax:    slopeMax,
		MdplMin:     mdplMin,
		MdplMax:     mdplMax,
	}
}

func waterProfile(
	komoditasID string,
	phMin, phMax, rainMin, rainMax, tempMin, tempMax, doMin float64,
) FuzzyProfile {
	return FuzzyProfile{
		KomoditasID: komoditasID,
		Sektor:      SektorPerikanan,
		Kind:        FuzzyKindAir,
		PhMin:       phMin,
		PhMax:       phMax,
		RainMin:     rainMin,
		RainMax:     rainMax,
		NdviMin:     0,
		SlopeMax:    100,
		MdplMin:     0,
		MdplMax:     2000,
		TempMin:     f64Ptr(tempMin),
		TempMax:     f64Ptr(tempMax),
		DoMin:       f64Ptr(doMin),
	}
}

var FuzzyProfiles = []FuzzyProfile{
	landProfile("kom-padi", SektorPertanian, 5.5, 7.0, 1500, 4500, 0.6, 8, 0, 800),
	landProfile("kom-jagung", SektorPertanian, 5.5, 7.5, 800, 3000, 0.55, 15, 0, 1200),
	landProfile("kom-cabai", SektorPertanian, 5.5, 6.8, 800, 2800, 0.6, 12, 200, 1200),
	landProfile("kom-singkong", SektorPertanian, 4.5, 6.5, 800, 2800, 0.5, 20, 0, 800),
	landProfile("kom-pisang", SektorPertanian, 5.0, 7.0, 1500, 4000, 0.6, 15, 0, 1000),
	landProfile("kom-kopi", SektorPertanian, 5.0, 6.5, 1500, 3500, 0.6, 25, 200, 800),
	landProfile("kom-sayur-daun", SektorPertanian, 5.5, 7.0, 1000, 3500, 0.65, 12, 200, 1200),
	landProfile("kom-sapi", SektorPeternakan, 5.5, 7.0, 800, 3500, 0.5, 15, 0, 1200),
	landProfile("kom-kambing", SektorPeternakan, 5.5, 7.5, 600, 3000, 0.45, 25, 0, 1200),
	landProfile("kom-ayam", SektorPeternakan, 5.5, 7.5, 600, 3500, 0.4, 10, 0, 1200),
	landProfile("kom-itik", SektorPeternakan, 5.5, 7.5, 1000, 4000, 0.5, 8, 0, 1000),
	waterProfile("kom-nila", 6.5, 8.5, 1000, 4500, 25, 30, 4),
	waterProfile("kom-lele", 6.0, 8.0, 800, 4500, 26, 32, 3),
	waterProfile("kom-mas", 6.5, 8.0, 1000, 4000, 24, 28, 4),
	waterProfile("kom-gurame", 6.5, 8.0, 1000, 4000, 24, 30, 4),
}

var fuzzyProfileByID = func() map[string]FuzzyProfile {
	m := make(map[string]FuzzyProfile, len(FuzzyProfiles))
	for _, p := range FuzzyProfiles {
		m[p.KomoditasID] = p
	}
	return m
}()

func clamp01(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > 1 {
		return 1
	}
	return value
}

func clamp(value, minVal, maxVal float64) float64 {
	if value < minVal {
		return minVal
	}
	if value > maxVal {
		return maxVal
	}
	return value
}

func membership(value, minVal, maxVal, tolerance float64) float64 {
	if value >= minVal && value <= maxVal {
		midpoint := (minVal + maxVal) / 2
		halfRange := (maxVal - minVal) / 2
		if halfRange == 0 {
			return 1
		}
		return 0.8 + 0.2*(1-math.Abs(value-midpoint)/halfRange)
	}
	distance := value - maxVal
	if value < minVal {
		distance = minVal - value
	}
	return math.Max(0, 0.8*(1-distance/tolerance))
}

func CalculateFuzzyScore(input FuzzyInput, profile FuzzyProfile) float64 {
	if profile.Kind != input.Kind {
		return 0
	}

	phTol := 1.2
	if input.Kind == FuzzyKindAir {
		phTol = 1.5
	}
	ph := membership(input.Ph, profile.PhMin, profile.PhMax, phTol)
	rain := membership(input.CurahHujanMm, profile.RainMin, profile.RainMax, 900)

	if input.Kind == FuzzyKindAir {
		var temp float64
		if input.SuhuAir != nil && profile.TempMin != nil && profile.TempMax != nil {
			temp = membership(*input.SuhuAir, *profile.TempMin, *profile.TempMax, 5)
		}
		var oxygen float64
		if input.DO != nil && profile.DoMin != nil {
			oxygen = membership(*input.DO, *profile.DoMin, 12, 2)
		}
		return math.Round(clamp01(ph*0.35+temp*0.3+oxygen*0.25+rain*0.1) * 100)
	}

	ndvi := membership(input.NDVI, profile.NdviMin, 1, 0.2)
	slope := 1.0
	if input.Slope > profile.SlopeMax {
		slope = math.Max(0, 1-(input.Slope-profile.SlopeMax)/12)
	}
	elevation := membership(input.Mdpl, profile.MdplMin, profile.MdplMax, 300)

	return math.Round(clamp01(ph*0.35+rain*0.25+ndvi*0.25+slope*0.1+elevation*0.05) * 100)
}

func RankCommodities(input FuzzyInput, sector Sektor) []RankedCommodity {
	ranked := make([]RankedCommodity, 0, len(FuzzyProfiles))
	for _, p := range FuzzyProfiles {
		if p.Kind != input.Kind {
			continue
		}
		if sector != "" && p.Sektor != sector {
			continue
		}
		ranked = append(ranked, RankedCommodity{
			KomoditasID: p.KomoditasID,
			Score:       CalculateFuzzyScore(input, p),
		})
	}
	sort.SliceStable(ranked, func(i, j int) bool {
		return ranked[i].Score > ranked[j].Score
	})
	return ranked
}

func ProfileFor(komoditasID string) (FuzzyProfile, bool) {
	p, ok := fuzzyProfileByID[komoditasID]
	return p, ok
}

func average(values []float64) *float64 {
	if len(values) == 0 {
		return nil
	}
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	avg := math.Round((sum/float64(len(values)))*100) / 100
	return &avg
}

func landInput(petak Petak, live LiveState) FuzzyInput {
	rain := petak.CurahHujanMm
	if v, ok := live.RainfallByPetak[petak.ID]; ok {
		rain = v
	}
	ndvi := petak.NDVI
	if v, ok := live.NdviByPetak[petak.ID]; ok {
		ndvi = v
	}
	return FuzzyInput{
		Kind:         FuzzyKindLahan,
		Ph:           petak.PhTanah,
		CurahHujanMm: rain,
		NDVI:         ndvi,
		Slope:        petak.Slope,
		Mdpl:         petak.Mdpl,
	}
}

func waterInput(kolam Kolam, petak Petak, live LiveState) FuzzyInput {
	rain := petak.CurahHujanMm
	if v, ok := live.RainfallByPetak[petak.ID]; ok {
		rain = v
	}
	ndvi := petak.NDVI
	if v, ok := live.NdviByPetak[petak.ID]; ok {
		ndvi = v
	}
	suhu := kolam.SuhuAir
	do := kolam.DO
	return FuzzyInput{
		Kind:         FuzzyKindAir,
		Ph:           kolam.PhAir,
		SuhuAir:      &suhu,
		DO:           &do,
		CurahHujanMm: rain,
		NDVI:         ndvi,
		Slope:        petak.Slope,
		Mdpl:         petak.Mdpl,
	}
}

func averageInput(petakRows []Petak, live LiveState) FuzzyInput {
	phVals := make([]float64, 0, len(petakRows))
	rainVals := make([]float64, 0, len(petakRows))
	ndviVals := make([]float64, 0, len(petakRows))
	slopeVals := make([]float64, 0, len(petakRows))
	mdplVals := make([]float64, 0, len(petakRows))

	for _, p := range petakRows {
		phVals = append(phVals, p.PhTanah)
		rain := p.CurahHujanMm
		if v, ok := live.RainfallByPetak[p.ID]; ok {
			rain = v
		}
		rainVals = append(rainVals, rain)
		ndvi := p.NDVI
		if v, ok := live.NdviByPetak[p.ID]; ok {
			ndvi = v
		}
		ndviVals = append(ndviVals, ndvi)
		slopeVals = append(slopeVals, p.Slope)
		mdplVals = append(mdplVals, p.Mdpl)
	}

	ph := 6.0
	if v := average(phVals); v != nil {
		ph = *v
	}
	rain := 3500.0
	if v := average(rainVals); v != nil {
		rain = *v
	}
	ndvi := 0.7
	if v := average(ndviVals); v != nil {
		ndvi = *v
	}
	slope := 0.0
	if v := average(slopeVals); v != nil {
		slope = *v
	}
	mdpl := 250.0
	if v := average(mdplVals); v != nil {
		mdpl = *v
	}

	return FuzzyInput{
		Kind:         FuzzyKindLahan,
		Ph:           ph,
		CurahHujanMm: rain,
		NDVI:         ndvi,
		Slope:        slope,
		Mdpl:         mdpl,
	}
}
