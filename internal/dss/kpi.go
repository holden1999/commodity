package dss

import "math"

func BuildKpi(live LiveState) KpiSummary {
	scores := make([]float64, 0, len(seedPetak)+len(seedKolam)+len(seedTernak))

	for _, p := range seedPetak {
		if p.KomoditasID == nil {
			continue
		}
		if prof, ok := ProfileFor(*p.KomoditasID); ok {
			scores = append(scores, CalculateFuzzyScore(landInput(p, live), prof))
		}
	}

	for _, k := range seedKolam {
		p, okP := petakByID[k.PetakID]
		prof, okProf := ProfileFor(k.KomoditasID)
		if okP && okProf {
			scores = append(scores, CalculateFuzzyScore(waterInput(k, p, live), prof))
		}
	}

	for _, t := range seedTernak {
		p, okP := petakByID[t.PetakID]
		prof, okProf := ProfileFor(t.KomoditasID)
		if okP && okProf {
			scores = append(scores, CalculateFuzzyScore(landInput(p, live), prof))
		}
	}

	margins := make([]float64, 0, len(seedKomoditas))
	for _, k := range seedKomoditas {
		latest, ok := LatestHarga(k.ID)
		if ok && latest.HppRp != nil && *latest.HppRp > 0 {
			margins = append(margins, ((latest.HargaDesaRp-*latest.HppRp)/(*latest.HppRp))*100)
		}
	}

	highRisk := 0
	lowWaterAlerts := 0
	for _, p := range seedPetak {
		if z, ok := zonaByID[p.ZonaID]; ok && z.RisikoBanjir == RisikoTinggi {
			highRisk++
		}
		curRain := p.CurahHujanMm
		if v, ok := live.RainfallByPetak[p.ID]; ok {
			curRain = v
		}
		if curRain < p.CurahHujanMm*0.9 {
			lowWaterAlerts++
		}
	}

	var highFloodRiskPct *float64
	if len(seedPetak) > 0 {
		v := math.Round((float64(highRisk)/float64(len(seedPetak)))*1000) / 10
		highFloodRiskPct = &v
	}

	activeKolam := 0
	for _, k := range seedKolam {
		if k.DO > 0 {
			activeKolam++
		}
	}

	totalTernak := 0
	for _, t := range seedTernak {
		totalTernak += t.Jumlah
	}

	return KpiSummary{
		AverageFuzzyScore:  average(scores),
		HargaDesaMarginPct: average(margins),
		HighFloodRiskPct:   highFloodRiskPct,
		ActiveKolam:        activeKolam,
		TotalTernak:        totalTernak,
		LowWaterAlerts:     lowWaterAlerts,
	}
}
