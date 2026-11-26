package dss

type PriceSnapshot struct {
	HargaDesaRp         *float64
	HppRp               *float64
	HargaPasarBapanasRp *float64
	Tanggal             *string
}

var latestHargaByKomoditas = func() map[string]Harga {
	m := make(map[string]Harga, len(seedKomoditas))
	for _, row := range seedHarga {
		prev, exists := m[row.KomoditasID]
		if !exists || row.Tanggal > prev.Tanggal {
			m[row.KomoditasID] = row
		}
	}
	return m
}()

func LatestHarga(komoditasID string) (Harga, bool) {
	h, ok := latestHargaByKomoditas[komoditasID]
	return h, ok
}

func GetPriceSnapshot(komoditasID string, liveBapanas *float64) PriceSnapshot {
	latest, ok := LatestHarga(komoditasID)
	if !ok {
		return PriceSnapshot{
			HargaPasarBapanasRp: liveBapanas,
		}
	}
	desa := latest.HargaDesaRp
	tanggal := latest.Tanggal
	bapanas := latest.HargaPasarBapanasRp
	if liveBapanas != nil {
		bapanas = liveBapanas
	}
	return PriceSnapshot{
		HargaDesaRp:         &desa,
		HppRp:               latest.HppRp,
		HargaPasarBapanasRp: bapanas,
		Tanggal:             &tanggal,
	}
}
