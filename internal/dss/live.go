package dss

import (
	"math"
	"math/rand/v2"
	"time"
)

var initialBapanas = func() map[string]*float64 {
	m := make(map[string]*float64, len(seedKomoditas))
	for _, k := range seedKomoditas {
		if h, ok := LatestHarga(k.ID); ok && h.HargaPasarBapanasRp != nil {
			v := *h.HargaPasarBapanasRp
			m[k.ID] = &v
		} else {
			m[k.ID] = nil
		}
	}
	return m
}()

func roundDigits(value float64, digits int) float64 {
	factor := math.Pow10(digits)
	return math.Round(value*factor) / factor
}

func CreateInitialLive() LiveState {
	rainfall := make(map[string]float64, len(seedPetak))
	ndvi := make(map[string]float64, len(seedPetak))
	for _, p := range seedPetak {
		rainfall[p.ID] = p.CurahHujanMm
		ndvi[p.ID] = p.NDVI
	}

	bapanas := make(map[string]*float64, len(initialBapanas))
	for k, v := range initialBapanas {
		if v != nil {
			cp := *v
			bapanas[k] = &cp
		} else {
			bapanas[k] = nil
		}
	}

	return LiveState{
		RainfallByPetak:    rainfall,
		NdviByPetak:        ndvi,
		BapanasByKomoditas: bapanas,
		UpdatedAt:          time.Now().UTC().Format(time.RFC3339Nano),
		Tick:               0,
	}
}

func NextLiveState(state LiveState, randomFn func() float64) LiveState {
	if randomFn == nil {
		randomFn = rand.Float64
	}

	rainfall := make(map[string]float64, len(seedPetak))
	ndvi := make(map[string]float64, len(seedPetak))
	for _, p := range seedPetak {
		curRain := p.CurahHujanMm
		if v, ok := state.RainfallByPetak[p.ID]; ok {
			curRain = v
		}
		rainfall[p.ID] = curRain

		curNdvi := p.NDVI
		if v, ok := state.NdviByPetak[p.ID]; ok {
			curNdvi = v
		}
		ndvi[p.ID] = roundDigits(clamp(curNdvi+(randomFn()-0.5)*0.06, 0.3, 0.95), 3)
	}

	bapanas := make(map[string]*float64, len(initialBapanas))
	for komID, baseline := range initialBapanas {
		if baseline == nil {
			bapanas[komID] = nil
			continue
		}
		cur := *baseline
		if v, ok := state.BapanasByKomoditas[komID]; ok && v != nil {
			cur = *v
		}
		nextVal := math.Round(clamp(cur*(1+(randomFn()-0.5)*0.03), *baseline*0.8, *baseline*1.2))
		bapanas[komID] = &nextVal
	}

	return LiveState{
		RainfallByPetak:    rainfall,
		NdviByPetak:        ndvi,
		BapanasByKomoditas: bapanas,
		UpdatedAt:          time.Now().UTC().Format(time.RFC3339Nano),
		Tick:               state.Tick + 1,
	}
}
