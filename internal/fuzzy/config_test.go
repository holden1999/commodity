package fuzzy

import (
	"math"
	"testing"
)

func TestNormalizeFillsDefaults(t *testing.T) {
	cfg := Config()
	in, echo, err := cfg.Normalize(map[string]float64{"hujan": 3500})
	if err != nil {
		t.Fatalf("Normalize: %v", err)
	}
	if in.Hujan != 3500 {
		t.Errorf("hujan = %v, want 3500", in.Hujan)
	}
	if in.PH != 5.5 || in.NDVI != 0.65 || in.Mdpl != 232 {
		t.Errorf("defaults not applied: %+v", in)
	}
	if len(echo) != len(cfg.Variables) {
		t.Errorf("echo has %d keys, want %d", len(echo), len(cfg.Variables))
	}
}

func TestNormalizeClampsToRange(t *testing.T) {
	cfg := Config()
	in, echo, err := cfg.Normalize(map[string]float64{"ph": 9.5, "mdpl": 10, "ndvi": -1})
	if err != nil {
		t.Fatalf("Normalize: %v", err)
	}
	if in.PH != 7.0 {
		t.Errorf("ph = %v, want 7.0", in.PH)
	}
	if in.Mdpl != 180 {
		t.Errorf("mdpl = %v, want 180", in.Mdpl)
	}
	if in.NDVI != 0 {
		t.Errorf("ndvi = %v, want 0", in.NDVI)
	}
	if echo["ph"] != 7.0 || echo["mdpl"] != 180 {
		t.Errorf("echo not clamped: %v", echo)
	}
}

func TestNormalizeRejectsBadInput(t *testing.T) {
	cfg := Config()
	cases := []struct {
		name   string
		values map[string]float64
	}{
		{"unknown key", map[string]float64{"suhu": 26}},
		{"NaN", map[string]float64{"hujan": math.NaN()}},
		{"inf", map[string]float64{"hujan": math.Inf(1)}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, _, err := cfg.Normalize(tc.values); err == nil {
				t.Fatal("want error, got nil")
			}
		})
	}
}

func TestZoneFor(t *testing.T) {
	cfg := Config()
	cases := map[float64]int{170: 1, 180: 1, 219: 1, 220: 2, 232: 2, 259: 2, 260: 3, 300: 4, 350: 4}
	for mdpl, want := range cases {
		if got := cfg.ZoneFor(mdpl).ID; got != want {
			t.Errorf("ZoneFor(%v) = %d, want %d", mdpl, got, want)
		}
	}
}

func TestHasChecklistItem(t *testing.T) {
	cfg := Config()
	cases := []struct {
		group, id string
		want      bool
	}{
		{"download", "srtm", true},
		{"sop", "evaluasi", true},
		{"download", "sop", false},
		{"sop", "srtm", false},
		{"other", "srtm", false},
		{"download", "", false},
	}
	for _, tc := range cases {
		if got := cfg.HasChecklistItem(tc.group, tc.id); got != tc.want {
			t.Errorf("HasChecklistItem(%q, %q) = %v, want %v", tc.group, tc.id, got, tc.want)
		}
	}
}
