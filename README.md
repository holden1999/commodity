# CiapusDSS

Decision support dashboard for Desa Ciapus, Kecamatan Ciomas, Kabupaten Bogor.
The UI is a React + Vite + React Three Fiber application. A small Go server
embeds the production build and serves it as one binary.

## Development

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5178`.

## Production

```sh
npm run build
go run -buildvcs=false ./cmd/server
```

Open `http://127.0.0.1:8090`.

`npm run build` writes the Vite output to `internal/web/dist`. The Go server
embeds that directory, so a built binary does not need the source tree.

```sh
go build -buildvcs=false -o server.exe ./cmd/server
./server.exe -addr 127.0.0.1:8090
```

Docker:

```sh
docker compose up --build
```

## Structure

```text
src/                    React app, data, fuzzy logic, 3D scene
src/data/               Desa, zona, petak, komoditas, harga seed
src/scene/terrainData.ts SRTM elevation grid for the Ciapus bbox
src/scene/villageBoundary.ts OSM administrative boundary
src/scene/mapData.ts    OSM waterways and roads
src/components/FuzzyLab.tsx Adjustable fuzzy inputs and commodity ranking
src/logic/environment.ts Season, weather, sun, and waterflow model
src/logic/api.ts        Snapshot/tick client
internal/api/           Go HTTP API
internal/dss/           Go decision engine
internal/web/           Go embed handler for the Vite build
cmd/server/             HTTP server
```

The Go server serves the built web app, a small DSS API
(`/api/snapshot`, `/api/live/tick`), and falls back to `index.html` for client
routes. It has no database or legacy diorama.

The simulation is the fuzzy land/water scenario in `FuzzyLab`. Season and
weather drive solar altitude, sunlight exposure, and surface waterflow from
slope. Adjusting pH, rainfall, NDVI, slope, elevation, water temperature, or
dissolved oxygen recomputes suitability locally and recolors the petak icons.
The view dock only toggles day/night and cutaway; no moving vehicles are drawn.

## Checks

```sh
npm run typecheck
npm run validate
go test -buildvcs=false ./...
```

## Data notes

`desa.luasKm2` and `desa.jumlahPenduduk` stay `null` because the cited
Wikipedia article leaves them blank. The seed validator rejects non-null values
until a cited source replaces them.

The terrain grid comes from OpenTopoData SRTM 30 m for the Ciapus bounding box
from OpenStreetMap relation 19957780, sampled at 100 columns by 86 rows. Rivers
and roads come from OpenStreetMap/Overpass. Zone cells follow the DEM elevation
bands and are clipped to the OSM village boundary; the local 205–262 m relief is
stretched into the seed's 200–325 mdpl range. Every zone cell belongs to exactly
one petak, so plots fill the zone instead of sitting in fixed rectangles. The
zone panel reports the share of each zone used by each commodity. The terrain is
padded 12 world units outside the village; only that outer pad fades to the
background. The map is a stylized display, not a survey.


### Sumber meteorologi

Mode **Otomatis** memakai [BMKG PSIIDN Meteorologi](https://psimkg.bmkg.go.id/psiidn/meteorology),
produk prakiraan eksperimental InaNWP domain Jabodetabek (d03). Go mengambil deret prakiraan
titik Ciapus yang digunakan peta PSIIDN dan menyajikan satu langkah yang paling dekat
dengan waktu sekarang melalui `/api/weather/psiidn`. Curah hujan per jam, kelembapan,
dan angin menggerakkan cuaca 3D dan kondisi lingkungan fuzzy. Suhu ditampilkan
di kontrol cuaca. Mode manual tetap tersedia untuk simulasi.

Curah hujan tahunan pada seed adalah baseline kesesuaian lahan. Nilai itu tidak
diacak setiap tick dan tidak digantikan dengan prakiraan hujan per jam.


### Geometri jalan dan tepi sungai

Ekstrak Ciapus dari OpenStreetMap API, 27 November 2026, diproyeksikan ke batas
DEM yang sudah dipakai aplikasi. Lebar yang tidak tercatat diperkirakan menurut
kelas jalan atau alur. Area air multipoligon mempertahankan pulau di dalamnya.
Tiga label sungai dan sambungan hilir mengikuti skema desa pada aplikasi.
Data peta © OpenStreetMap contributors, ODbL.
