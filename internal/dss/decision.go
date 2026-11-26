package dss

var riverNames = map[string]string{
	"cisadane":        "Sungai Cisadane",
	"cisindangbarang": "Sungai Cisindangbarang",
	"cikarti":         "Sungai Cikarti",
	"ci-apus":         "Ci Apus",
	"ciapus":          "Ciapus",
}

func commodityName(komoditasID *string) *string {
	if komoditasID == nil {
		return nil
	}
	if k, ok := komoditasByID[*komoditasID]; ok {
		name := k.Nama
		return &name
	}
	return nil
}

func recommendedID(ranked []RankedCommodity, assignedID *string) *string {
	if len(ranked) == 0 {
		return nil
	}
	top := ranked[0]
	if assignedID != nil {
		for _, row := range ranked {
			if row.KomoditasID == *assignedID {
				if row.Score >= top.Score-2 {
					id := row.KomoditasID
					return &id
				}
				break
			}
		}
	}
	id := top.KomoditasID
	return &id
}

func pricedStatus(komoditasID *string, live LiveState) (hargaDesa, hpp, bapanas *float64, hargaKomoditas *string) {
	if komoditasID == nil {
		return nil, nil, nil, nil
	}
	snap := GetPriceSnapshot(*komoditasID, live.BapanasByKomoditas[*komoditasID])
	return snap.HargaDesaRp, snap.HppRp, snap.HargaPasarBapanasRp, commodityName(komoditasID)
}

func statusFromPetak(p Petak, live LiveState) DecisionStatus {
	zonaNama := "—"
	if z, ok := zonaByID[p.ZonaID]; ok {
		zonaNama = z.Nama
	}
	input := landInput(p, live)
	ranked := RankCommodities(input, SektorPertanian)

	var assignedID *string
	if p.KomoditasID != nil {
		assignedID = p.KomoditasID
	} else if len(ranked) > 0 {
		id := ranked[0].KomoditasID
		assignedID = &id
	}

	var score *float64
	if assignedID != nil {
		if prof, ok := ProfileFor(*assignedID); ok {
			s := CalculateFuzzyScore(input, prof)
			score = &s
		} else if len(ranked) > 0 {
			s := ranked[0].Score
			score = &s
		}
	} else if len(ranked) > 0 {
		s := ranked[0].Score
		score = &s
	}

	soilPh := p.PhTanah
	rain := input.CurahHujanMm
	ndvi := input.NDVI
	hd, hpp, bap, hk := pricedStatus(assignedID, live)

	return DecisionStatus{
		ID:                   p.ID,
		Kind:                 SelectionPetak,
		Name:                 p.Nama,
		Zona:                 zonaNama,
		FuzzyScore:           score,
		RecommendedKomoditas: commodityName(recommendedID(ranked, p.KomoditasID)),
		SoilPh:               &soilPh,
		WaterPh:              nil,
		RainfallMm:           &rain,
		NDVI:                 &ndvi,
		HargaDesaRp:          hd,
		HppRp:                hpp,
		HargaPasarBapanasRp:  bap,
		HargaKomoditas:       hk,
		LastUpdated:          live.UpdatedAt,
	}
}

func statusFromKolam(kolamID string, live LiveState) *DecisionStatus {
	k, ok := kolamByID[kolamID]
	if !ok {
		return nil
	}
	p, ok := petakByID[k.PetakID]
	if !ok {
		return nil
	}
	zonaNama := "—"
	if z, ok := zonaByID[p.ZonaID]; ok {
		zonaNama = z.Nama
	}
	input := waterInput(k, p, live)
	ranked := RankCommodities(input, SektorPerikanan)

	var score *float64
	if prof, ok := ProfileFor(k.KomoditasID); ok {
		s := CalculateFuzzyScore(input, prof)
		score = &s
	}

	komNama := "Kolam"
	if n := commodityName(&k.KomoditasID); n != nil {
		komNama = *n
	}

	waterPh := k.PhAir
	rain := input.CurahHujanMm
	ndvi := input.NDVI
	komID := k.KomoditasID
	hd, hpp, bap, hk := pricedStatus(&komID, live)

	return &DecisionStatus{
		ID:                   k.ID,
		Kind:                 SelectionKolam,
		Name:                 komNama + " · " + k.Tipe,
		Zona:                 zonaNama,
		FuzzyScore:           score,
		RecommendedKomoditas: commodityName(recommendedID(ranked, &komID)),
		SoilPh:               nil,
		WaterPh:              &waterPh,
		RainfallMm:           &rain,
		NDVI:                 &ndvi,
		HargaDesaRp:          hd,
		HppRp:                hpp,
		HargaPasarBapanasRp:  bap,
		HargaKomoditas:       hk,
		LastUpdated:          live.UpdatedAt,
	}
}

func statusFromTernak(ternakID string, live LiveState) *DecisionStatus {
	t, ok := ternakByID[ternakID]
	if !ok {
		return nil
	}
	p, ok := petakByID[t.PetakID]
	if !ok {
		return nil
	}
	zonaNama := "—"
	if z, ok := zonaByID[p.ZonaID]; ok {
		zonaNama = z.Nama
	}
	input := landInput(p, live)
	ranked := RankCommodities(input, SektorPeternakan)

	var score *float64
	if prof, ok := ProfileFor(t.KomoditasID); ok {
		s := CalculateFuzzyScore(input, prof)
		score = &s
	}

	soilPh := p.PhTanah
	rain := input.CurahHujanMm
	ndvi := input.NDVI
	komID := t.KomoditasID
	hd, hpp, bap, hk := pricedStatus(&komID, live)

	return &DecisionStatus{
		ID:                   t.ID,
		Kind:                 SelectionTernak,
		Name:                 "Kandang " + t.Jenis,
		Zona:                 zonaNama,
		FuzzyScore:           score,
		RecommendedKomoditas: commodityName(recommendedID(ranked, &komID)),
		SoilPh:               &soilPh,
		WaterPh:              nil,
		RainfallMm:           &rain,
		NDVI:                 &ndvi,
		HargaDesaRp:          hd,
		HppRp:                hpp,
		HargaPasarBapanasRp:  bap,
		HargaKomoditas:       hk,
		LastUpdated:          live.UpdatedAt,
	}
}

func statusFromZona(zonaID string, live LiveState) *DecisionStatus {
	z, ok := zonaByID[zonaID]
	if !ok {
		return nil
	}
	petakRows := make([]Petak, 0)
	cropRows := make([]Petak, 0)
	for _, p := range seedPetak {
		if p.ZonaID == zonaID {
			petakRows = append(petakRows, p)
			if p.KomoditasID != nil {
				cropRows = append(cropRows, p)
			}
		}
	}

	inputRows := petakRows
	if len(cropRows) > 0 {
		inputRows = cropRows
	}
	input := averageInput(inputRows, live)
	ranked := RankCommodities(input, SektorPertanian)

	var recommended *string
	if len(ranked) > 0 {
		id := ranked[0].KomoditasID
		recommended = &id
	}

	scores := make([]float64, 0, len(cropRows))
	phVals := make([]float64, 0, len(cropRows))
	for _, p := range cropRows {
		phVals = append(phVals, p.PhTanah)
		if p.KomoditasID != nil {
			if prof, ok := ProfileFor(*p.KomoditasID); ok {
				scores = append(scores, CalculateFuzzyScore(landInput(p, live), prof))
			}
		}
	}

	rain := input.CurahHujanMm
	ndvi := input.NDVI
	hd, hpp, bap, hk := pricedStatus(recommended, live)

	return &DecisionStatus{
		ID:                   z.ID,
		Kind:                 SelectionZona,
		Name:                 z.Nama,
		Zona:                 z.Nama,
		FuzzyScore:           average(scores),
		RecommendedKomoditas: commodityName(recommended),
		SoilPh:               average(phVals),
		WaterPh:              nil,
		RainfallMm:           &rain,
		NDVI:                 &ndvi,
		HargaDesaRp:          hd,
		HppRp:                hpp,
		HargaPasarBapanasRp:  bap,
		HargaKomoditas:       hk,
		LastUpdated:          live.UpdatedAt,
	}
}

func statusFromPasar(live LiveState) DecisionStatus {
	cropRows := make([]Petak, 0, len(seedPetak))
	for _, p := range seedPetak {
		if p.KomoditasID != nil {
			cropRows = append(cropRows, p)
		}
	}
	input := averageInput(cropRows, live)
	ranked := RankCommodities(input, SektorPertanian)

	var recommended *string
	if len(ranked) > 0 {
		id := ranked[0].KomoditasID
		recommended = &id
	}

	scores := make([]float64, 0, len(cropRows))
	phVals := make([]float64, 0, len(cropRows))
	for _, p := range cropRows {
		phVals = append(phVals, p.PhTanah)
		if p.KomoditasID != nil {
			if prof, ok := ProfileFor(*p.KomoditasID); ok {
				scores = append(scores, CalculateFuzzyScore(landInput(p, live), prof))
			}
		}
	}

	zonaNama := "—"
	if z, ok := zonaByID["zona-1"]; ok {
		zonaNama = z.Nama
	}

	rain := input.CurahHujanMm
	ndvi := input.NDVI
	hd, hpp, bap, hk := pricedStatus(recommended, live)

	return DecisionStatus{
		ID:                   "pasar-desa-ciapus",
		Kind:                 SelectionPasar,
		Name:                 "Pasar Desa Ciapus",
		Zona:                 zonaNama,
		FuzzyScore:           average(scores),
		RecommendedKomoditas: commodityName(recommended),
		SoilPh:               average(phVals),
		WaterPh:              nil,
		RainfallMm:           &rain,
		NDVI:                 &ndvi,
		HargaDesaRp:          hd,
		HppRp:                hpp,
		HargaPasarBapanasRp:  bap,
		HargaKomoditas:       hk,
		LastUpdated:          live.UpdatedAt,
	}
}

func statusFromSungai(sungaiID string, live LiveState) DecisionStatus {
	rainVals := make([]float64, 0, len(seedPetak))
	for _, p := range seedPetak {
		r := p.CurahHujanMm
		if v, ok := live.RainfallByPetak[p.ID]; ok {
			r = v
		}
		rainVals = append(rainVals, r)
	}
	name := "Sungai " + sungaiID
	if n, ok := riverNames[sungaiID]; ok {
		name = n
	}

	return DecisionStatus{
		ID:          sungaiID,
		Kind:        SelectionSungai,
		Name:        name,
		Zona:        "Lintas zona",
		RainfallMm:  average(rainVals),
		LastUpdated: live.UpdatedAt,
	}
}

func BuildDecisionStatus(selection Selection, live LiveState) *DecisionStatus {
	switch selection.Kind {
	case SelectionPetak:
		if p, ok := petakByID[selection.ID]; ok {
			st := statusFromPetak(p, live)
			return &st
		}
		return nil
	case SelectionKolam:
		return statusFromKolam(selection.ID, live)
	case SelectionTernak:
		return statusFromTernak(selection.ID, live)
	case SelectionZona:
		return statusFromZona(selection.ID, live)
	case SelectionPasar:
		st := statusFromPasar(live)
		return &st
	case SelectionSungai:
		st := statusFromSungai(selection.ID, live)
		return &st
	default:
		return nil
	}
}
