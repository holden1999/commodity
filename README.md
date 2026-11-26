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
src/scene/mapData.ts    OSM waterways and roads
internal/web/           Go embed handler for the Vite build
cmd/server/             HTTP server
```

The Go server has no API, database, or legacy diorama. It serves the built web
app and falls back to `index.html` for client routes.

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
bands; the local 205–262 m relief is stretched into the seed's 200–325 mdpl
range. Plots are packed inside those cells using their `luasHa` values. The
terrain is padded 12 world units outside the village; only that outer pad fades
to the background. The map is a stylized display, not a survey.
