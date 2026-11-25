package fuzzy

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

// Input is one complete plot measurement. Evaluate expects every field to be
// filled; partial-input defaults and range clamping belong to the HTTP layer.
type Input struct {
	Hujan        float64 `json:"hujan"`        // mm/tahun
	PH           float64 `json:"ph"`           // 4.5..7.0
	Kesuburan    float64 `json:"kesuburan"`    // indeks 0..100
	Mdpl         float64 `json:"mdpl"`         // 180..320
	Slope        float64 `json:"slope"`        // derajat 0..45
	Aspect       float64 `json:"aspect"`       // derajat 0..360
	JarakSungai  float64 `json:"jarakSungai"`  // meter 0..1000
	Radiasi      float64 `json:"radiasi"`      // kWh/m2/hari 3.0..7.0
	Sebaran      float64 `json:"sebaran"`      // meter 0..1000
	Permintaan   float64 `json:"permintaan"`   // indeks 0..100
	NDVI         float64 `json:"ndvi"`         // 0..1
	RisikoBanjir float64 `json:"risikoBanjir"` // indeks 0..100
}

// Fired is one rule id and its antecedent alpha for a commodity.
type Fired struct {
	Rule  string  `json:"rule"`
	Alpha float64 `json:"alpha"`
}

// CommodityScore is one ranked commodity with the rules that fired for it.
type CommodityScore struct {
	Key   string  `json:"key"`
	Label string  `json:"label"`
	Cycle string  `json:"cycle"`
	Score float64 `json:"score"`
	Fired []Fired `json:"fired"`
}

// Package is the tumpang sari recommendation.
type Package struct {
	Commodities []string `json:"commodities"`
	Reason      string   `json:"reason"`
}

// Policy carries the aggregate alphas of the diversification rules.
type Policy struct {
	Diversify float64 `json:"diversify"`
	PerPlot   float64 `json:"perPlot"`
}

// Result is the complete evaluation output.
type Result struct {
	Ranking []CommodityScore `json:"ranking"`
	Package Package          `json:"package"`
	Policy  Policy           `json:"policy"`
	Notes   []string         `json:"notes"`
}

// verdict thresholds from the blueprint.
const (
	anchorSangat = 92.0
	anchorCocok  = 70.0
	anchorKurang = 35.0
)

func clamp01(x float64) float64 {
	if x < 0 {
		return 0
	}
	if x > 1 {
		return 1
	}
	return x
}

// triangle evaluates a triangular membership set. A == B is a flat left
// shoulder, B == C is a flat right shoulder, and membership is clamped.
func triangle(a, b, c, x float64) float64 {
	if math.IsNaN(x) {
		return 0
	}
	switch {
	case a == b && b == c:
		if x == b {
			return 1
		}
		return 0
	case a == b:
		if x <= b {
			return 1
		}
		if x >= c {
			return 0
		}
		return clamp01((c - x) / (c - b))
	case b == c:
		if x >= b {
			return 1
		}
		if x <= a {
			return 0
		}
		return clamp01((x - a) / (b - a))
	default:
		if x <= a || x >= c {
			return 0
		}
		if x <= b {
			return clamp01((x - a) / (b - a))
		}
		return clamp01((c - x) / (c - b))
	}
}

// mu is the membership of x in this set.
func (s Set) mu(x float64) float64 {
	return triangle(s.A, s.B, s.C, x)
}

func valueOf(in Input, key string) float64 {
	switch key {
	case "hujan":
		return in.Hujan
	case "ph":
		return in.PH
	case "kesuburan":
		return in.Kesuburan
	case "mdpl":
		return in.Mdpl
	case "slope":
		return in.Slope
	case "aspect":
		return in.Aspect
	case "jarakSungai":
		return in.JarakSungai
	case "radiasi":
		return in.Radiasi
	case "sebaran":
		return in.Sebaran
	case "permintaan":
		return in.Permintaan
	case "ndvi":
		return in.NDVI
	case "risikoBanjir":
		return in.RisikoBanjir
	}
	return 0
}

func roundTo(x float64, places int) float64 {
	f := math.Pow(10, float64(places))
	return math.Round(x*f) / f
}

// verdictTriangle is the consequent fuzzy set for one verdict.
func verdictTriangle(verdict string) (a, b, c float64) {
	switch verdict {
	case "sangat":
		return 62, anchorSangat, 100
	case "cocok":
		return 45, anchorCocok, 90
	case "kurang":
		return 0, anchorKurang, 62
	}
	return 0, 0, 0
}

func centroid(cons []firedConsequence) float64 {
	var num, den float64
	for z := 0; z <= 100; z++ {
		var agg float64
		for _, f := range cons {
			a, b, c := verdictTriangle(f.verdict)
			v := math.Min(f.alpha, triangle(a, b, c, float64(z)))
			if v > agg {
				agg = v
			}
		}
		num += float64(z) * agg
		den += agg
	}
	if den == 0 {
		return 0
	}
	return num / den
}

type firedConsequence struct {
	alpha   float64
	verdict string
}

// Evaluate scores every commodity for one complete input. It is pure: it reads
// only its argument and package-level functions that rebuild the catalog.
func Evaluate(in Input) Result {
	vars := variables()
	mu := make(map[string]map[string]float64, len(vars))
	trust := make(map[string]float64, len(vars))
	for _, v := range vars {
		x := valueOf(in, v.Key)
		m := make(map[string]float64, len(v.Sets))
		for _, s := range v.Sets {
			m[s.Name] = s.mu(x)
		}
		mu[v.Key] = m
		trust[v.Key] = v.Weight / 20
	}

	cons := make(map[string][]firedConsequence)
	fired := make(map[string][]Fired)
	var diversify, perPlot float64

	for _, r := range rules() {
		var alpha float64
		if len(r.terms) > 0 {
			alpha = 1
			for _, t := range r.terms {
				eff := mu[t.variable][t.set] * trust[t.variable]
				if eff < alpha {
					alpha = eff
				}
			}
		}

		switch r.policy {
		case "diversify":
			if alpha > diversify {
				diversify = alpha
			}
		case "perPlot":
			if alpha > perPlot {
				perPlot = alpha
			}
		}
		if alpha <= 0 {
			continue
		}
		for _, cc := range r.Consequences {
			cons[cc.Commodity] = append(cons[cc.Commodity], firedConsequence{alpha: alpha, verdict: cc.Verdict})
			fired[cc.Commodity] = append(fired[cc.Commodity], Fired{Rule: r.ID, Alpha: roundTo(alpha, 3)})
		}
	}

	muNDVIRendah := mu["ndvi"]["rendah"]
	var capScore float64 = math.Inf(1)
	if muNDVIRendah > 0.6 {
		capScore = 100 - 40*muNDVIRendah
	}

	ranking := make([]CommodityScore, 0, len(commodities()))
	for _, cm := range commodities() {
		fs := cons[cm.Key]
		if len(fs) == 0 {
			continue
		}
		score := centroid(fs)
		if score > capScore {
			score = capScore
		}
		score = roundTo(score, 1)
		if score <= 0 {
			continue
		}
		ranking = append(ranking, CommodityScore{
			Key:   cm.Key,
			Label: cm.Label,
			Cycle: cm.Cycle,
			Score: score,
			Fired: fired[cm.Key],
		})
	}

	sort.SliceStable(ranking, func(i, j int) bool {
		if ranking[i].Score != ranking[j].Score {
			return ranking[i].Score > ranking[j].Score
		}
		if len(ranking[i].Fired) != len(ranking[j].Fired) {
			return len(ranking[i].Fired) > len(ranking[j].Fired)
		}
		return ranking[i].Label < ranking[j].Label
	})

	policy := Policy{Diversify: roundTo(diversify, 3), PerPlot: roundTo(perPlot, 3)}

	notes := make([]string, 0, 4)
	z := zoneFor(in.Mdpl)
	notes = append(notes, fmt.Sprintf("Zona %d %s: %s", z.ID, z.Name, z.Advice))
	if in.PH < 6.0 {
		notes = append(notes, fmt.Sprintf("pH tanah %.1f di bawah 6,0; untuk cabai pertimbangkan pengapuran agar pH mendekati netral.", in.PH))
	}
	if muNDVIRendah > 0.6 {
		notes = append(notes, fmt.Sprintf("NDVI %.2f rendah: skor dibatasi gate kualitas data (maksimum %.1f).", in.NDVI, capScore))
	}
	if policy.PerPlot >= 0.4 {
		notes = append(notes, "Petak sangat terpencar: nilai setiap petak terpisah, bukan satu rekomendasi desa.")
	}

	return Result{
		Ranking: ranking,
		Package: buildPackage(ranking, policy.Diversify),
		Policy:  policy,
		Notes:   notes,
	}
}

// buildPackage takes the highest-scoring commodities and avoids repeating a
// cycle class while a different class is still available.
func buildPackage(ranking []CommodityScore, diversify float64) Package {
	n := 2
	if diversify >= 0.4 {
		n = 3
	}
	if n > len(ranking) {
		n = len(ranking)
	}

	picked := make([]CommodityScore, 0, n)
	taken := make(map[string]bool, n)
	usedCycle := make(map[string]bool, n)

	for len(picked) < n {
		idx := -1
		for i, cs := range ranking {
			if taken[cs.Key] || usedCycle[cs.Cycle] {
				continue
			}
			idx = i
			break
		}
		if idx < 0 {
			for i, cs := range ranking {
				if taken[cs.Key] {
					continue
				}
				idx = i
				break
			}
		}
		if idx < 0 {
			break
		}
		cs := ranking[idx]
		picked = append(picked, cs)
		taken[cs.Key] = true
		usedCycle[cs.Cycle] = true
	}

	keys := make([]string, len(picked))
	for i, cs := range picked {
		keys[i] = cs.Key
	}
	return Package{Commodities: keys, Reason: packageReason(picked)}
}

func packageReason(picked []CommodityScore) string {
	if len(picked) == 0 {
		return "Belum ada komoditas yang cocok; lengkapi data biofisik atau longgarkan kriteria."
	}
	parts := make([]string, len(picked))
	for i, cs := range picked {
		parts[i] = fmt.Sprintf("%s (%s)", cs.Label, cs.Cycle)
	}
	return "Paket tumpang sari " + strings.Join(parts, " + ") + " disusun dari skor tertinggi dengan siklus panen berbeda bila tersedia."
}

// zoneFor mirrors the zone table for note wording. Evaluate does not return a
// zone; the HTTP layer owns that presentation field.
func zoneFor(mdpl float64) Zone {
	zs := zones()
	if mdpl < zs[0].Min {
		return zs[0]
	}
	for _, z := range zs {
		if mdpl >= z.Min && mdpl <= z.Max {
			return z
		}
	}
	return zs[len(zs)-1]
}
