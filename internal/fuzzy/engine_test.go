package fuzzy

import (
	"encoding/json"
	"math"
	"reflect"
	"strings"
	"testing"
)

func defaultInput() Input {
	return Input{
		Hujan: 3500, PH: 5.5, Kesuburan: 55, Mdpl: 232, Slope: 8,
		Aspect: 90, JarakSungai: 150, Radiasi: 5.0, Sebaran: 200,
		Permintaan: 60, NDVI: 0.65, RisikoBanjir: 55,
	}
}

func muOf(t *testing.T, key, setName string, x float64) float64 {
	t.Helper()
	for _, v := range variables() {
		if v.Key != key {
			continue
		}
		for _, s := range v.Sets {
			if s.Name == setName {
				return s.mu(x)
			}
		}
	}
	t.Fatalf("unknown set %s:%s", key, setName)
	return 0
}

func weightOf(t *testing.T, key string) float64 {
	t.Helper()
	for _, v := range variables() {
		if v.Key == key {
			return v.Weight
		}
	}
	t.Fatalf("unknown variable %s", key)
	return 0
}

func TestMembershipPeaksEdgesAndShoulders(t *testing.T) {
	tests := []struct {
		key, set string
		x        float64
		want     float64
	}{
		{"hujan", "sedang", 3500, 1},
		{"hujan", "sedang", 2300, 0},
		{"hujan", "rendah", 2300, 1}, // flat left shoulder
		{"hujan", "rendah", 2750, 0.5},
		{"hujan", "rendah", 3200, 0},
		{"hujan", "tinggi", 3800, 0},
		{"hujan", "tinggi", 4700, 1}, // flat right shoulder
		{"ph", "asam", 4.5, 1},
		{"ph", "netral", 6.2, 1},
		{"ph", "basa", 7.0, 1},
		{"radiasi", "sedang", 4.8, 1},
		{"aspect", "timur", 30, 0},
		{"aspect", "timur", 90, 1},
		{"aspect", "timur", 120, 0},
		{"aspect", "barat", 270, 1},
		{"ndvi", "rendah", 0.2, 0.5},
	}
	for _, tc := range tests {
		if got := muOf(t, tc.key, tc.set, tc.x); math.Abs(got-tc.want) > 1e-12 {
			t.Errorf("mu(%s:%s, %v) = %v, want %v", tc.key, tc.set, tc.x, got, tc.want)
		}
	}
}

func TestAlphaIsMinEffectiveMembership(t *testing.T) {
	res := Evaluate(defaultInput())
	byKey := map[string]CommodityScore{}
	for _, cs := range res.Ranking {
		byKey[cs.Key] = cs
	}

	checks := []struct {
		commodity, rule string
	}{
		{"cabai", "11"},
		{"jagung", "05"},
		{"kacang_tanah", "15"},
	}
	for _, ch := range checks {
		cs, ok := byKey[ch.commodity]
		if !ok {
			t.Fatalf("%s not ranked", ch.commodity)
		}
		found := false
		for _, f := range cs.Fired {
			if f.Rule != ch.rule {
				continue
			}
			found = true
			var want float64
			for _, r := range rules() {
				if r.ID != ch.rule {
					continue
				}
				want = 1
				for _, tm := range r.terms {
					eff := muOf(t, tm.variable, tm.set, valueOf(defaultInput(), tm.variable)) * weightOf(t, tm.variable) / 20
					if eff < want {
						want = eff
					}
				}
			}
			if math.Abs(f.Alpha-roundTo(want, 3)) > 1e-9 {
				t.Errorf("%s rule %s alpha = %v, want %v", ch.commodity, ch.rule, f.Alpha, roundTo(want, 3))
			}
		}
		if !found {
			t.Errorf("%s did not fire rule %s", ch.commodity, ch.rule)
		}
	}

	if got := byKey["cabai"].Fired[0].Alpha; got != 0.625 {
		t.Errorf("cabai rule 11 alpha = %v, want 0.625", got)
	}
}

func TestCentroidSingleFiringRule(t *testing.T) {
	tests := []struct {
		verdict string
		alpha   float64
		want    float64
	}{
		{"sangat", 1, 84.66666666666667},
		{"cocok", 1, 68.33333333333333},
		{"kurang", 1, 32.33333333333333},
		{"sangat", 0.5, 83.44444444444444},
	}
	for _, tc := range tests {
		got := centroid([]firedConsequence{{alpha: tc.alpha, verdict: tc.verdict}})
		if math.Abs(got-tc.want) > 1e-9 {
			t.Errorf("centroid(%s, alpha %v) = %v, want %v", tc.verdict, tc.alpha, got, tc.want)
		}
	}
	if got := centroid(nil); got != 0 {
		t.Errorf("centroid(no consequences) = %v, want 0", got)
	}
}

func TestScoresBoundedAtInputExtremes(t *testing.T) {
	minIn := Input{
		Hujan: 2300, PH: 4.5, Kesuburan: 0, Mdpl: 180, Slope: 0,
		Aspect: 0, JarakSungai: 0, Radiasi: 3.0, Sebaran: 0,
		Permintaan: 0, NDVI: 0, RisikoBanjir: 0,
	}
	maxIn := Input{
		Hujan: 4700, PH: 7.0, Kesuburan: 100, Mdpl: 320, Slope: 45,
		Aspect: 360, JarakSungai: 1000, Radiasi: 7.0, Sebaran: 1000,
		Permintaan: 100, NDVI: 1, RisikoBanjir: 100,
	}

	for name, in := range map[string]Input{"all-min": minIn, "all-max": maxIn} {
		res := Evaluate(in)
		for _, cs := range res.Ranking {
			if math.IsNaN(cs.Score) || math.IsInf(cs.Score, 0) {
				t.Fatalf("%s: %s score is not finite: %v", name, cs.Key, cs.Score)
			}
			if cs.Score < 0 || cs.Score > 100 {
				t.Errorf("%s: %s score %v outside 0..100", name, cs.Key, cs.Score)
			}
		}
		if name == "all-min" {
			if len(res.Ranking) == 0 {
				t.Fatal("all-min fired no rule")
			}
			if res.Ranking[0].Score != 60 {
				t.Errorf("all-min top score = %v, want 60 (NDVI gate cap)", res.Ranking[0].Score)
			}
		}
	}
}

func TestExoticFloatsDoNotPanic(t *testing.T) {
	nan := math.NaN()
	inputs := []Input{
		{Hujan: nan, PH: nan, NDVI: nan},
		{Hujan: math.Inf(1), PH: math.Inf(-1), NDVI: math.Inf(1)},
	}
	for _, in := range inputs {
		res := Evaluate(in)
		for _, cs := range res.Ranking {
			if math.IsNaN(cs.Score) || math.IsInf(cs.Score, 0) {
				t.Fatalf("non-finite score %#v for input %#v", cs.Score, in)
			}
		}
	}
}

func TestDeterministic(t *testing.T) {
	a := Evaluate(defaultInput())
	b := Evaluate(defaultInput())
	if !reflect.DeepEqual(a, b) {
		t.Fatalf("Evaluate is not deterministic:\n%#v\n%#v", a, b)
	}
}

func TestNDVIGateLowersEveryScore(t *testing.T) {
	base := Evaluate(defaultInput())
	lowIn := defaultInput()
	lowIn.NDVI = 0.05
	gated := Evaluate(lowIn)

	if len(base.Ranking) == 0 || len(gated.Ranking) == 0 {
		t.Fatal("expected rankings for both inputs")
	}
	baseByKey := map[string]float64{}
	for _, cs := range base.Ranking {
		baseByKey[cs.Key] = cs.Score
	}
	for _, cs := range gated.Ranking {
		before, ok := baseByKey[cs.Key]
		if !ok {
			t.Fatalf("%s appeared only under the gate", cs.Key)
		}
		if cs.Score >= before {
			t.Errorf("%s: gated score %v not below ungated %v", cs.Key, cs.Score, before)
		}
		if cs.Score > 65 {
			t.Errorf("%s: gated score %v above cap 65", cs.Key, cs.Score)
		}
	}
	if !hasNote(gated.Notes, "gate kualitas data") {
		t.Errorf("missing gate note: %v", gated.Notes)
	}
}

func TestUnfiredCommoditiesOmitted(t *testing.T) {
	res := Evaluate(defaultInput())
	want := []string{"jagung", "cabai", "kacang_tanah"}
	got := make([]string, len(res.Ranking))
	for i, cs := range res.Ranking {
		got[i] = cs.Key
		if cs.Score <= 0 {
			t.Errorf("%s ranked with score %v", cs.Key, cs.Score)
		}
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("ranking keys = %v, want %v", got, want)
	}
	for _, absent := range []string{"padi", "kopi", "pisang", "kentang", "bawang_merah", "sayur_daun", "singkong"} {
		for _, cs := range res.Ranking {
			if cs.Key == absent {
				t.Errorf("%s should not be ranked", absent)
			}
		}
	}
}

func TestPackageCycleDiversity(t *testing.T) {
	fired := []Fired{{Rule: "01", Alpha: 1}}
	ranking := []CommodityScore{
		{Key: "jagung", Label: "Jagung", Cycle: "musiman", Score: 90, Fired: fired},
		{Key: "kentang", Label: "Kentang", Cycle: "musiman", Score: 80, Fired: fired},
		{Key: "kopi", Label: "Kopi", Cycle: "tahunan", Score: 70, Fired: fired},
	}
	pkg := buildPackage(ranking, 0)
	if !reflect.DeepEqual(pkg.Commodities, []string{"jagung", "kopi"}) {
		t.Fatalf("two-item package = %v, want [jagung kopi]", pkg.Commodities)
	}
	if !strings.Contains(pkg.Reason, "(musiman)") || !strings.Contains(pkg.Reason, "(tahunan)") {
		t.Errorf("reason does not name cycles: %q", pkg.Reason)
	}

	pkg3 := buildPackage(ranking, 0.4)
	if !reflect.DeepEqual(pkg3.Commodities, []string{"jagung", "kopi", "kentang"}) {
		t.Fatalf("three-item package = %v, want [jagung kopi kentang]", pkg3.Commodities)
	}

	def := Evaluate(defaultInput()).Package
	if !reflect.DeepEqual(def.Commodities, []string{"jagung", "cabai"}) {
		t.Errorf("default package = %v, want [jagung cabai]", def.Commodities)
	}
}

func TestScoreAndAlphaRounding(t *testing.T) {
	res := Evaluate(defaultInput())
	for _, cs := range res.Ranking {
		if math.Abs(cs.Score*10-math.Round(cs.Score*10)) > 1e-9 {
			t.Errorf("%s score %v is not rounded to 1 decimal", cs.Key, cs.Score)
		}
		for _, f := range cs.Fired {
			if math.Abs(f.Alpha*1000-math.Round(f.Alpha*1000)) > 1e-9 {
				t.Errorf("%s rule %s alpha %v is not rounded to 3 decimals", cs.Key, f.Rule, f.Alpha)
			}
		}
	}
	got := map[string]float64{}
	for _, cs := range res.Ranking {
		got[cs.Key] = cs.Score
	}
	if got["cabai"] != 83.9 || got["jagung"] != 83.9 || got["kacang_tanah"] != 82.0 {
		t.Errorf("default scores = %v, want cabai 83.9 jagung 83.9 kacang_tanah 82.0", got)
	}
}

func TestPolicy(t *testing.T) {
	def := Evaluate(defaultInput()).Policy
	if def.Diversify != 0 || def.PerPlot != 0 {
		t.Errorf("default policy = %#v, want zeros", def)
	}
	maxIn := Input{
		Hujan: 4700, PH: 7, Kesuburan: 100, Mdpl: 320, Slope: 45,
		Aspect: 360, JarakSungai: 1000, Radiasi: 7, Sebaran: 1000,
		Permintaan: 100, NDVI: 1, RisikoBanjir: 100,
	}
	pol := Evaluate(maxIn).Policy
	if pol.Diversify != 0.5 || pol.PerPlot != 0.5 {
		t.Errorf("all-max policy = %#v, want diversify 0.5 perPlot 0.5", pol)
	}
}

func TestNotes(t *testing.T) {
	def := Evaluate(defaultInput())
	if len(def.Notes) != 2 {
		t.Errorf("default notes = %v, want zone + pH", def.Notes)
	}
	if !hasNote(def.Notes, "Zona 2 Transisi") || !hasNote(def.Notes, "pengapuran") {
		t.Errorf("default notes missing zone or liming copy: %v", def.Notes)
	}

	minIn := Input{
		Hujan: 2300, PH: 4.5, Kesuburan: 0, Mdpl: 180, Slope: 0,
		Aspect: 0, JarakSungai: 0, Radiasi: 3, Sebaran: 0,
		Permintaan: 0, NDVI: 0, RisikoBanjir: 0,
	}
	if notes := Evaluate(minIn).Notes; len(notes) != 3 || !hasNote(notes, "gate kualitas data") {
		t.Errorf("all-min notes = %v, want zone + pH + gate", notes)
	}
}

func TestConfigCatalog(t *testing.T) {
	cfg := Config()
	if len(cfg.Variables) != 12 {
		t.Errorf("variables = %d, want 12", len(cfg.Variables))
	}
	if len(cfg.Commodities) != 9 {
		t.Errorf("commodities = %d, want 9", len(cfg.Commodities))
	}
	if len(cfg.Zones) != 4 {
		t.Errorf("zones = %d, want 4", len(cfg.Zones))
	}
	if len(cfg.Rules) != 18 {
		t.Errorf("rules = %d, want 18", len(cfg.Rules))
	}
	for i, r := range cfg.Rules {
		if want := []string{"01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18"}[i]; r.ID != want {
			t.Errorf("rule[%d] id = %q, want %q", i, r.ID, want)
		}
	}
	if len(cfg.Rules[2].Consequences) != 0 || cfg.Rules[2].Text == "" {
		t.Errorf("rule 03 must have text and no consequences: %#v", cfg.Rules[2])
	}
	if len(cfg.Checklist.Download) != 8 || len(cfg.Checklist.SOP) != 6 {
		t.Errorf("checklist = %d download / %d sop, want 8 / 6", len(cfg.Checklist.Download), len(cfg.Checklist.SOP))
	}
	if cfg.Checklist.Download[0].ID != "srtm" || cfg.Checklist.SOP[0].ID != "cuaca" {
		t.Errorf("checklist order wrong: %q / %q", cfg.Checklist.Download[0].ID, cfg.Checklist.SOP[0].ID)
	}
	if cfg.Price.HPP != 6500 || cfg.Price.Market != 9000 || cfg.Price.NeighborShare != 30 || cfg.Price.NetworkShare != 70 {
		t.Errorf("price metadata = %#v", cfg.Price)
	}
	if cfg.Variables[0].Key != "hujan" || cfg.Variables[0].Weight != 20 || cfg.Variables[0].Default != 3500 {
		t.Errorf("first variable = %#v", cfg.Variables[0])
	}

	// Config must serialize with the contract's key names and no null arrays.
	b, err := json.Marshal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	var doc map[string]any
	if err := json.Unmarshal(b, &doc); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"variables", "commodities", "zones", "rules", "price", "checklist"} {
		if _, ok := doc[key]; !ok {
			t.Errorf("config JSON missing %q", key)
		}
	}
	if strings.Contains(string(b), `"consequences":null`) {
		t.Error("config JSON contains null consequences")
	}
}

func TestConfigReturnsFreshCopies(t *testing.T) {
	a := Config()
	a.Variables[0].Label = "mutated"
	a.Rules[0].Consequences[0].Commodity = "mutated"
	b := Config()
	if b.Variables[0].Label == "mutated" || b.Rules[0].Consequences[0].Commodity == "mutated" {
		t.Fatal("Config leaked mutable catalog state")
	}
}

func hasNote(notes []string, sub string) bool {
	for _, n := range notes {
		if strings.Contains(n, sub) {
			return true
		}
	}
	return false
}
