package dss

func fuzzyPass(score *float64, enabled bool) bool {
	return !enabled || (score != nil && *score > 70)
}

func BuildSceneVisibility(filters CiapusFilters, live LiveState) SceneVisibility {
	petakIDs := make([]string, 0, len(seedPetak))
	kolamIDs := make([]string, 0, len(seedKolam))
	ternakIDs := make([]string, 0, len(seedTernak))

	for _, row := range seedPetak {
		if filters.HighFloodRisk {
			z, ok := zonaByID[row.ZonaID]
			if !ok || z.RisikoBanjir != RisikoTinggi {
				continue
			}
		}

		if row.KomoditasID != nil {
			var score *float64
			if prof, ok := ProfileFor(*row.KomoditasID); ok {
				s := CalculateFuzzyScore(landInput(row, live), prof)
				score = &s
			}
			if fuzzyPass(score, filters.HighFuzzy) {
				petakIDs = append(petakIDs, row.ID)
			}
		}

		for _, pond := range kolamByPetak[row.ID] {
			var score *float64
			if prof, ok := ProfileFor(pond.KomoditasID); ok {
				s := CalculateFuzzyScore(waterInput(pond, row, live), prof)
				score = &s
			}
			if fuzzyPass(score, filters.HighFuzzy) {
				kolamIDs = append(kolamIDs, pond.ID)
			}
		}

		for _, pen := range ternakByPetak[row.ID] {
			var score *float64
			if prof, ok := ProfileFor(pen.KomoditasID); ok {
				s := CalculateFuzzyScore(landInput(row, live), prof)
				score = &s
			}
			if fuzzyPass(score, filters.HighFuzzy) {
				ternakIDs = append(ternakIDs, pen.ID)
			}
		}
	}

	return SceneVisibility{
		Petak:  petakIDs,
		Kolam:  kolamIDs,
		Ternak: ternakIDs,
	}
}

func SelectRantaiPasok(txType string) []RantaiPasokView {
	if txType == "" {
		txType = "Semua"
	}
	views := make([]RantaiPasokView, 0, len(seedRantaiPasok))
	for _, row := range seedRantaiPasok {
		if txType != "Semua" && row.Tipe != txType {
			continue
		}
		dariNama := row.DariID
		if p, ok := pelakuByID[row.DariID]; ok {
			dariNama = p.Nama
		}
		keNama := row.KeID
		if p, ok := pelakuByID[row.KeID]; ok {
			keNama = p.Nama
		}
		komNama := row.KomoditasID
		if k, ok := komoditasByID[row.KomoditasID]; ok {
			komNama = k.Nama
		}
		views = append(views, RantaiPasokView{
			ID:            row.ID,
			Tipe:          row.Tipe,
			DariNama:      dariNama,
			KeNama:        keNama,
			KomoditasNama: komNama,
			MarginRp:      row.MarginRp,
		})
	}
	return views
}
