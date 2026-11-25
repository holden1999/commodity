# CONTRACT — Fuzzy Desa (Go + HTML)

This file is the single source of truth for the two build workstreams. Do not
invent behavior that is not here. All content is in Indonesian for the farmer
audience, but code identifiers and JSON keys use ASCII.

Stack: Go 1.25 standard library only, HTML + vanilla JS, no build step, no npm.

## 1. Scope

A single-binary web app for Desa Ciapus. It scores commodities per plot per
period with Mamdani fuzzy logic, returns a ranking and a tumpang sari package,
and calculates Harga Desa. Two reference inputs exist: 12 measured variables
(CHIRPS rain, SoilGrids pH, SOC/N, SRTM elevation, slope, aspect, OSM river
distance, NASA POWER radiation, plot spread, local demand, Sentinel-2 NDVI,
flood risk) and 18 IF-THEN rules from the blueprint.

## 2. Go API (package `commodity/internal/fuzzy`)

```go
type Input struct {
    Hujan         float64 `json:"hujan"`         // mm/tahun
    PH            float64 `json:"ph"`            // 4.5..7.0
    Kesuburan     float64 `json:"kesuburan"`     // indeks 0..100
    Mdpl          float64 `json:"mdpl"`          // 180..320
    Slope         float64 `json:"slope"`         // derajat 0..45
    Aspect        float64 `json:"aspect"`        // derajat 0..360
    JarakSungai   float64 `json:"jarakSungai"`   // meter 0..1000
    Radiasi       float64 `json:"radiasi"`       // kWh/m2/hari 3.0..7.0
    Sebaran       float64 `json:"sebaran"`       // meter 0..1000
    Permintaan    float64 `json:"permintaan"`    // indeks 0..100
    NDVI          float64 `json:"ndvi"`          // 0..1
    RisikoBanjir  float64 `json:"risikoBanjir"`  // indeks 0..100
}

type Fired struct {
    Rule  string  `json:"rule"`
    Alpha float64 `json:"alpha"`
}

type CommodityScore struct {
    Key    string  `json:"key"`
    Label  string  `json:"label"`
    Cycle  string  `json:"cycle"`
    Score  float64 `json:"score"`
    Fired  []Fired `json:"fired"`
}

type Result struct {
    Ranking []CommodityScore `json:"ranking"`
    Package Package          `json:"package"`
    Policy  Policy           `json:"policy"`
    Notes   []string         `json:"notes"`
}

func Evaluate(in Input) Result
func Config() Config   // static metadata, serialized by GET /api/config
```

`Config()` returns the variable, commodity, zone, rule, price and checklist
metadata described in sections 3-7, with `json` tags exactly as in the JSON
examples in section 8. `Evaluate` is pure and deterministic. Do not add
panics, globals, or I/O.

## 3. Variables, membership sets, weights

Each set is a triangle `(a, b, c)`: membership rises from `a` to `b` and falls
from `b` to `c`. A `b == a` shoulder is flat on the left, `b == c` flat on the
right. Membership is clamped to `[0, 1]`.

| key | label | unit | min | max | step | default | weight | sets (a,b,c) |
|---|---|---|---|---|---|---|---|---|
| hujan | Curah hujan (CHIRPS) | mm/tahun | 2300 | 4700 | 50 | 3500 | 20 | rendah (2300,2300,3200), sedang (2800,3500,4200), tinggi (3800,4700,4700) |
| ph | pH tanah (SoilGrids) | pH | 4.5 | 7.0 | 0.1 | 5.5 | 15 | asam (4.5,4.5,5.8), netral (5.2,6.2,6.8), basa (6.4,7.0,7.0) |
| kesuburan | Kesuburan tanah (SOC + N) | indeks | 0 | 100 | 5 | 55 | 15 | rendah (0,0,45), sedang (25,55,80), tinggi (60,100,100) |
| mdpl | Ketinggian (SRTM) | mdpl | 180 | 320 | 1 | 232 | 10 | rendah (180,180,235), menengah (215,260,295), tinggi (275,320,320) |
| slope | Kemiringan lereng (DEM) | derajat | 0 | 45 | 1 | 8 | 10 | datar (0,0,12), sedang (8,18,28), curam (22,45,45) |
| aspect | Arah lereng (DEM) | derajat | 0 | 360 | 15 | 90 | 15 | timur (60,90,120), barat (240,270,300) |
| jarakSungai | Jarak ke sungai (OSM + BIG) | m | 0 | 1000 | 10 | 150 | 15 | dekat (0,0,250), sedang (150,450,750), jauh (600,1000,1000) |
| radiasi | Radiasi matahari (NASA POWER) | kWh/m2/hari | 3.0 | 7.0 | 0.1 | 5.0 | 15 | rendah (3.0,3.0,4.2), sedang (3.6,4.8,6.0), tinggi (5.2,7.0,7.0) |
| sebaran | Sebaran petak (jarak rata-rata) | m | 0 | 1000 | 10 | 200 | 10 | menyatu (0,0,200), agakTerpencar (100,350,600), sangatTerpencar (450,1000,1000) |
| permintaan | Permintaan masakan lokal | indeks | 0 | 100 | 5 | 60 | 15 | rendah (0,0,45), sedang (30,60,85), tinggi (65,100,100) |
| ndvi | NDVI (Sentinel-2) | indeks | 0.0 | 1.0 | 0.01 | 0.65 | 10 | rendah (0,0,0.4), sedang (0.3,0.55,0.75), tinggi (0.6,1.0,1.0) |
| risikoBanjir | Risiko banjir (DEM + CHIRPS) | indeks | 0 | 100 | 5 | 55 | 10 | rendah (0,0,40), sedang (25,55,80), tinggi (65,100,100) |

`aspect` has only two sets. Aspect outside 60-120 and 240-300 has membership 0
in both sets; that is intentional (north and south slopes are neutral).

Trust factor: `trust = weight / 20`, so the heaviest domain (rain) counts fully
and a 10% domain counts half. Effective antecedent membership is
`mu * trust`. Document this rule in the UI legend and README; it is how the
blueprint's weights enter the Mamdani model.

## 4. Rule base (18 rules)

Consequent verdict anchors: `sangat` = 92, `cocok` = 70, `kurang` = 35.
Alpha of a rule = `min` over its terms of `mu * trust` (AND = min, as the
blueprint states). Terms that are identical in effect stay explicit; do not
merge rules.

| id | terms (variable:set) | consequences | policy |
|---|---|---|---|
| 01 | hujan:tinggi, kesuburan:sedang, mdpl:rendah, jarakSungai:dekat | padi:sangat | |
| 02 | radiasi:tinggi, aspect:barat, jarakSungai:jauh | cabai:kurang, kopi:sangat, pisang:sangat | |
| 03 | sebaran:sangatTerpencar | | diversify |
| 04 | jarakSungai:jauh, hujan:rendah | padi:kurang | |
| 05 | hujan:sedang, ph:netral, mdpl:menengah | jagung:sangat | |
| 06 | ph:asam, kesuburan:rendah | cabai:kurang, kacang_tanah:cocok | |
| 07 | mdpl:tinggi, radiasi:sedang | kentang:cocok | |
| 08 | permintaan:tinggi, hujan:sedang, jarakSungai:sedang | cabai:sangat | |
| 09 | sebaran:menyatu, jarakSungai:dekat, mdpl:rendah | padi:sangat | |
| 10 | radiasi:rendah, ndvi:tinggi | kopi:cocok, cabai:kurang | |
| 11 | aspect:timur, radiasi:sedang, kesuburan:sedang | jagung:sangat, cabai:sangat | |
| 12 | sebaran:agakTerpencar, jarakSungai:sedang | bawang_merah:cocok | diversify |
| 13 | radiasi:tinggi, hujan:rendah, jarakSungai:jauh | bawang_merah:cocok | |
| 14 | hujan:tinggi, jarakSungai:dekat | padi:cocok, jagung:kurang | |
| 15 | permintaan:sedang, mdpl:menengah, ph:netral | kacang_tanah:sangat | |
| 16 | radiasi:tinggi, mdpl:tinggi, aspect:barat | pisang:sangat | |
| 17 | kesuburan:tinggi, hujan:sedang | sayur_daun:sangat | |
| 18 | sebaran:sangatTerpencar, jarakSungai:jauh | | perPlot |

Rules 03, 12 and 18 add no commodity score. Rules 03 and 18 set policy.
Rule 12 also carries a commodity.

## 5. Defuzzification (centroid)

Universe of discourse: integers 0..100 inclusive.

Per commodity, collect every firing rule consequence `(alpha, verdict)`. The
consequent fuzzy set is a triangle around the anchor:

- `sangat`: (62, 92, 100)
- `cocok`: (45, 70, 90)
- `kurang`: (0, 35, 62)

Clipped consequent at degree `z`: `min(alpha, triangle(z))`. Aggregation across
rules for one commodity is `max` (the blueprint's aggregation rule). Score is
the centroid `sum(z * agg(z)) / sum(agg(z))`. If no rule fires for a commodity,
the score is 0 and it is omitted from the ranking.

Post-processing gate from the blueprint ("NDVI rendah terus-menerus tidak boleh
skor fuzzy tinggi"): if `mu(ndvi, rendah) > 0.6`, cap every score at
`100 - 40 * mu(ndvi, rendah)`.

Round scores to one decimal, sort descending, break ties by rule count then
label. Include each firing rule id and alpha (`rounded to 3 decimals`) in
`fired`, and keep a commodity in the ranking only when its score > 0.

Package: sort by score. If `policy.diversify >= 0.4`, take 3 commodities, else
2. Never repeat a harvest cycle class if a commodity with another cycle exists
in the ranking (blueprint: different cycles). Commodities scored 0 are not
eligible. `package.reason` is one Indonesian sentence that names the cycles.

`policy`: `{"diversify": <max alpha of rules 03,12>, "perPlot": <max alpha of
rule 18>}`.

Notes: append one Indonesian note for the active zone, one for a pH below 6.0
that recommends liming for cabai, one when `mu(ndvi, rendah) > 0.6` about the
data-quality gate, and one when `policy.perPlot >= 0.4` about scoring plots
separately. No other notes.

## 6. Commodities and zones

| key | label | cycle | cycleDays |
|---|---|---|---|
| padi | Padi | musiman | 120 |
| jagung | Jagung | musiman | 100 |
| cabai | Cabai | bulanan | 90 |
| kopi | Kopi | tahunan | 365 |
| pisang | Pisang | tahunan | 365 |
| kacang_tanah | Kacang Tanah | musiman | 100 |
| kentang | Kentang | musiman | 100 |
| bawang_merah | Bawang Merah | musiman | 60 |
| sayur_daun | Sayur Daun | mingguan | 30 |

Singkong appears only in zone advice text. The rule base does not score it, so
do not add it to the ranking. State that in the README and in the UI footnote.

Zones by elevation (blueprint section 03):

| id | name | min | max | advice |
|---|---|---|---|---|
| 1 | Dataran Sungai | 180 | 220 | Padi sawah + sayur daun. Drainase wajib. |
| 2 | Transisi | 220 | 260 | Padi + jagung + cabai. Paling fleksibel untuk tumpang sari. |
| 3 | Perbukitan | 260 | 300 | Singkong + pisang + kopi + sayur. Teras dan tanaman penahan lereng wajib. |
| 4 | Atas | 300 | 320 | Hutan + kebun campuran + kopi. Konservasi dulu, jangan buka sawah baru. |

Zone of a plot = zone whose `[min, max]` contains `mdpl`. Clamp to zone 1
below 180 and zone 4 above 320. Zone is returned by the server, not by
`Evaluate` (keep the engine free of presentation).

## 7. Harga Desa

`village = hpp + 0.4 * (market - hpp)`, then round to whole rupiah.
Reject (HTTP 400) when `hpp <= 0`, `market <= 0`, or `market < hpp`. Sale
allocation is 30% neighbours and 70% inter-village network; it is displayed,
not computed.

## 8. HTTP API (server, `main.go`)

All responses are `application/json; charset=utf-8`. Unknown method → 405.
Unknown path → 404. Invalid body → 400 with `{"error":"..."}`. Log one line per
request to stdout.

### GET /api/config

```json
{
  "variables": [{"key":"hujan","label":"Curah hujan (CHIRPS)","unit":"mm/tahun",
    "min":2300,"max":4700,"step":50,"default":3500,"weight":20,
    "sets":[{"name":"rendah","label":"Rendah","a":2300,"b":2300,"c":3200}]}],
  "commodities": [{"key":"padi","label":"Padi","cycle":"musiman","cycleDays":120}],
  "zones": [{"id":1,"name":"Dataran Sungai","min":180,"max":220,"advice":"..."}],
  "rules": [{"id":"01","text":"Hujan tinggi AND tanah subur AND mdpl rendah AND air dekat → Padi sangat cocok",
    "consequences":[{"commodity":"padi","verdict":"sangat"}]}],
  "price": {"hpp":6500,"market":9000,"source":"HPP GKP Rp6.500/kg (SE Bapanas 456/2026, 18 Nov 2026)",
    "neighborShare":30,"networkShare":70},
  "checklist": {
    "download":[{"id":"srtm","label":"SRTM","detail":"DEM untuk mdpl, slope, dan aspect. portal.opentopography.org"}],
    "sop":[{"id":"hujan","label":"Update hujan + harga pasar","detail":"Catat hujan terbaru dan harga pasar."}]
  }
}
```

Download checklist ids in order: `srtm`, `soilgrids`, `chirps`, `power`, `osm_big`,
`sentinel2`, `bapanas`. SOP ids in order: `cuaca`, `skor`, `kuota`, `bayar`,
`panen`, `evaluasi`. Labels and details come from blueprint sections 11 and 13.

### POST /api/evaluate

Request: `{"input":{"hujan":3500,"ph":5.5,"kesuburan":55,"mdpl":232,"slope":8,
"aspect":90,"jarakSungai":150,"radiasi":5.0,"sebaran":200,"permintaan":60,
"ndvi":0.65,"risikoBanjir":55}}`. Missing field → server default from the
variable table, so a partial input works. Values outside `min..max` are clamped
to the range before evaluation; the response repeats the clamped input.

Response:

```json
{
  "input": {"hujan":3500,"ph":5.5},
  "zone": {"id":2,"name":"Transisi","min":220,"max":260,"advice":"..."},
  "ranking": [{"key":"padi","label":"Padi","cycle":"musiman","score":82.4,
    "fired":[{"rule":"01","alpha":0.35}]}],
  "package": {"commodities":["padi","sayur_daun"],"reason":"Padi (musiman) + Sayur Daun (mingguan) ..."},
  "policy": {"diversify":0.0,"perPlot":0.0},
  "notes": ["..."]
}
```

### POST /api/price

Request `{"hpp":6500,"market":9000}` → `{"hpp":6500,"market":9000,
"village":7500,"neighborShare":30,"networkShare":70}`.

### GET /api/checklist, POST /api/checklist

State file `data/state.json` (git-ignored), created on first write, writes
atomic (temp file + rename), guarded by one `sync.Mutex`. Shape:
`{"download":["srtm"],"sop":[]}`.

POST body `{"group":"download","id":"srtm","done":true}` → full state.
Reject unknown group or id with 400.

## 9. UI (web/)

One page, Indonesian copy, no framework, no external assets. Load
`/api/config` once, build the sliders from it, then `POST /api/evaluate` with
debounce (150 ms) on every change. Sections, in this order:

1. Header: title `Fuzzy Desa Ciapus`, subtitle `Dari lahan Archipelago ke harga
   desa`, badge `Mamdani • centroid • skor 0–100`.
2. Calculator card: one slider per variable with label, current value + unit,
   min/max labels. Flood risk and other index inputs may be sliders too. Show
   the derived zone name next to the elevation slider.
3. Result card: zone name and advice, top recommendation (label + score),
   ranked list of every scored commodity with a horizontal bar, score number,
   cycle chip, the firing rule ids (`rule 01 · α0.35`), and a `seri` chip on a
   row whose score equals the score of rank 1. Show the tumpang sari package
   and its reason, and the notes.
4. Harga Desa card: HPP and market inputs, computed village price, the 30/70
   split, the formula string, and the Bapanas source line.
5. Checklist card: two groups (download 7, sop 6), checkbox state loaded from
   the server and saved on toggle, with the completion counter `n / m`.
6. Footnote: `Singkong hanya tampil di saran zona; rule base belum memberi skor.`
   plus `Nilai per petak masih perlu validasi lapangan 5–10 sampel tanah.`

Style: dark soil palette, background `#17211A`, card `#24382D`, text `#F3EDD9`,
muted `#9FB3A5`, accent green `#79B98F`, warmth `#E3A97F`, amber `#E9B93C`,
serif display headings (`Georgia, serif`), system sans body. Rounded 16 px
cards, 1 px border `#33503F`. Ranking bars use the accent green; the top item
uses amber. Responsive to 360 px: single column, bars stay readable. Keyboard
accessible sliders and checkboxes. No layout shift while a re-evaluation is in
flight; keep the last result visible and dim it slightly.

Errors: show an inline Indonesian error line inside the affected card, never an
`alert`.

## 10. Acceptance

Server side (engine owner):

- `go vet ./...` and `go test ./...` pass.
- `Evaluate` with defaults fires rules 05, 11 and 15, and returns three
  commodities above 30 (jagung 83.9, cabai 83.9, kacang tanah 82.0). A
  commodity with no firing rule scores 0 and is omitted, so the ranking size
  follows the rule base, not the commodity table. No crash for extreme inputs
  (all mins, all maxs).
- Score is always in `0..100`, and a repeated call returns identical output.
- Fuzzification sanity: `mu(hujan, sedang)` at 3500 == 1, at 2300 == 0.
- The NDVI gate lowers every score when `mu(ndvi, rendah) > 0.6`, which means
  `ndvi` below 0.16; at 0.2 the membership is 0.5 and the gate is off.
- Weights change nothing structurally: `trust` scales alpha only.

UI side: the page works offline against the local server, all six sections
render, sliders update the ranking within 500 ms, checklist state survives a
page reload, and the layout holds at 360 px and 1440 px.

## 11. Non-goals

No auth, no database, no per-plot history, no map, no scraping, no i18n, no
build step, no external JS. Do not add frameworks or dependencies.
