package dss

import "sync"

var (
	zonaByID = func() map[string]Zona {
		m := make(map[string]Zona, len(seedZonas))
		for _, z := range seedZonas {
			m[z.ID] = z
		}
		return m
	}()

	petakByID = func() map[string]Petak {
		m := make(map[string]Petak, len(seedPetak))
		for _, p := range seedPetak {
			m[p.ID] = p
		}
		return m
	}()

	komoditasByID = func() map[string]Komoditas {
		m := make(map[string]Komoditas, len(seedKomoditas))
		for _, k := range seedKomoditas {
			m[k.ID] = k
		}
		return m
	}()

	kolamByID = func() map[string]Kolam {
		m := make(map[string]Kolam, len(seedKolam))
		for _, k := range seedKolam {
			m[k.ID] = k
		}
		return m
	}()

	ternakByID = func() map[string]Ternak {
		m := make(map[string]Ternak, len(seedTernak))
		for _, t := range seedTernak {
			m[t.ID] = t
		}
		return m
	}()

	pelakuByID = func() map[string]Pelaku {
		m := make(map[string]Pelaku, len(seedPelaku))
		for _, p := range seedPelaku {
			m[p.ID] = p
		}
		return m
	}()

	kolamByPetak = func() map[string][]Kolam {
		m := make(map[string][]Kolam, len(seedKolam))
		for _, k := range seedKolam {
			m[k.PetakID] = append(m[k.PetakID], k)
		}
		return m
	}()

	ternakByPetak = func() map[string][]Ternak {
		m := make(map[string][]Ternak, len(seedTernak))
		for _, t := range seedTernak {
			m[t.PetakID] = append(m[t.PetakID], t)
		}
		return m
	}()
)

type Snapshot struct {
	Live        LiveState         `json:"live"`
	Kpi         KpiSummary        `json:"kpi"`
	Visibility  SceneVisibility   `json:"visibility"`
	RantaiPasok []RantaiPasokView `json:"rantaiPasok"`
	Decision    *DecisionStatus   `json:"decision"`
}

// Engine manages live simulation state and computes DSS views concurrently.
type Engine struct {
	mu   sync.RWMutex
	live LiveState
}

func NewEngine() *Engine {
	return &Engine{
		live: CreateInitialLive(),
	}
}

func (e *Engine) Live() LiveState {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.live
}

func (e *Engine) Tick() LiveState {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.live = NextLiveState(e.live, nil)
	return e.live
}

func (e *Engine) Snapshot(filters CiapusFilters, selection *Selection) Snapshot {
	live := e.Live()
	return computeSnapshot(live, filters, selection)
}

func (e *Engine) TickAndSnapshot(filters CiapusFilters, selection *Selection) Snapshot {
	live := e.Tick()
	return computeSnapshot(live, filters, selection)
}

func computeSnapshot(live LiveState, filters CiapusFilters, selection *Selection) Snapshot {
	var decision *DecisionStatus
	if selection != nil && selection.Kind != "" && selection.ID != "" {
		decision = BuildDecisionStatus(*selection, live)
	}
	return Snapshot{
		Live:        live,
		Kpi:         BuildKpi(live),
		Visibility:  BuildSceneVisibility(filters, live),
		RantaiPasok: SelectRantaiPasok(filters.RantaiPasokType),
		Decision:    decision,
	}
}
