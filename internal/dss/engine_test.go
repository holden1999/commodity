package dss

import (
	"testing"
)

func TestSeedCountsMatchModel(t *testing.T) {
	if len(seedZonas) != 4 {
		t.Fatalf("zona=%d, want 4", len(seedZonas))
	}
	if len(seedPetak) != 24 {
		t.Fatalf("petak=%d, want 24", len(seedPetak))
	}
	if len(seedKomoditas) != 15 {
		t.Fatalf("komoditas=%d, want 15", len(seedKomoditas))
	}
	if len(seedKolam) != 4 {
		t.Fatalf("kolam=%d, want 4", len(seedKolam))
	}
	if len(seedTernak) != 4 {
		t.Fatalf("ternak=%d, want 4", len(seedTernak))
	}
	if len(seedPelaku) != 12 {
		t.Fatalf("pelaku=%d, want 12", len(seedPelaku))
	}
	if len(seedRantaiPasok) != 12 {
		t.Fatalf("rantaiPasok=%d, want 12", len(seedRantaiPasok))
	}
	if len(seedHarga) != 20 {
		t.Fatalf("harga=%d, want 20", len(seedHarga))
	}
}

func TestFuzzyAndKpi(t *testing.T) {
	live := CreateInitialLive()
	kpi := BuildKpi(live)

	if kpi.AverageFuzzyScore == nil || *kpi.AverageFuzzyScore <= 0 {
		t.Fatalf("unexpected averageFuzzyScore: %v", kpi.AverageFuzzyScore)
	}
	if kpi.ActiveKolam != 4 {
		t.Fatalf("activeKolam=%d, want 4", kpi.ActiveKolam)
	}
	if kpi.TotalTernak != 752 {
		t.Fatalf("totalTernak=%d, want 752", kpi.TotalTernak)
	}
	if kpi.HighFloodRiskPct == nil || *kpi.HighFloodRiskPct != 25.0 {
		t.Fatalf("highFloodRiskPct=%v, want 25.0", kpi.HighFloodRiskPct)
	}
}

func TestDecisionStatusForAllKinds(t *testing.T) {
	live := CreateInitialLive()

	cases := []Selection{
		{Kind: SelectionPetak, ID: "ptk-01"},
		{Kind: SelectionKolam, ID: "klm-01"},
		{Kind: SelectionTernak, ID: "trn-01"},
		{Kind: SelectionZona, ID: "zona-1"},
		{Kind: SelectionPasar, ID: "pasar-desa-ciapus"},
		{Kind: SelectionSungai, ID: "cisadane"},
	}

	for _, sel := range cases {
		status := BuildDecisionStatus(sel, live)
		if status == nil {
			t.Fatalf("BuildDecisionStatus(%v) returned nil", sel)
		}
		if status.Name == "" {
			t.Fatalf("BuildDecisionStatus(%v) returned empty name", sel)
		}
	}

	river := BuildDecisionStatus(Selection{Kind: SelectionSungai, ID: "cisadane"}, live)
	if river.Name != "Sungai Cisadane" {
		t.Fatalf("river.Name=%q, want Sungai Cisadane", river.Name)
	}
}

func TestNextLiveStateDeterministic(t *testing.T) {
	initial := CreateInitialLive()
	next := NextLiveState(initial, func() float64 { return 0.5 })
	if next.Tick != 1 {
		t.Fatalf("tick=%d, want 1", next.Tick)
	}
	if next.RainfallByPetak["ptk-01"] != initial.RainfallByPetak["ptk-01"] {
		t.Fatalf("expected neutral random=0.5 to preserve rainfall")
	}
}

func TestSceneVisibilityFilters(t *testing.T) {
	live := CreateInitialLive()
	all := BuildSceneVisibility(CiapusFilters{RantaiPasokType: "Semua"}, live)
	if len(all.Petak) != 17 || len(all.Kolam) != 4 || len(all.Ternak) != 4 {
		t.Fatalf("unexpected unfiltered visibility counts: %+v", all)
	}

	floodOnly := BuildSceneVisibility(CiapusFilters{HighFloodRisk: true, RantaiPasokType: "Semua"}, live)
	if len(floodOnly.Petak) != 4 || len(floodOnly.Kolam) != 2 || len(floodOnly.Ternak) != 0 {
		t.Fatalf("unexpected flood-filtered visibility counts: %+v", floodOnly)
	}
}

func BenchmarkBuildKpi(b *testing.B) {
	live := CreateInitialLive()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = BuildKpi(live)
	}
}

func BenchmarkBuildSceneVisibility(b *testing.B) {
	live := CreateInitialLive()
	filters := CiapusFilters{HighFuzzy: true, RantaiPasokType: "Semua"}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = BuildSceneVisibility(filters, live)
	}
}

func BenchmarkBuildDecisionStatusPetak(b *testing.B) {
	live := CreateInitialLive()
	sel := Selection{Kind: SelectionPetak, ID: "ptk-01"}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = BuildDecisionStatus(sel, live)
	}
}

func BenchmarkNextLiveState(b *testing.B) {
	live := CreateInitialLive()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		live = NextLiveState(live, nil)
	}
}
