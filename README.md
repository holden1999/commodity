# Fuzzy Desa

Satu biner Go, satu halaman HTML: kalkulator fuzzy Mamdani untuk memilih
komoditas per petak per periode, paket tumpang sari, dan Harga Desa.

Aplikasi ini bekerja untuk desa mana pun. Nilai bawaan variabel adalah satu
lokasi acuan di dataran tinggi basah (232 mdpl, hujan 3500 mm/tahun, pH 5.5);
ganti lewat slider atau `/api/evaluate`. Dua belas variabel terukur (CHIRPS,
SoilGrids, SRTM, NASA POWER, OSM+BIG, Sentinel-2, Bapanas), delapan belas rule,
agregasi maksimum, dan defuzzifikasi centroid menghasilkan skor 0-100 untuk
tiap komoditas. Bidang tanah dari BHUMI ATR/BPN melengkapi batas dan status
petak (lihat Sumber data).

## Jalankan

```sh
go build -o commodity.exe .     # di Windows: go build -buildvcs=false -o commodity.exe .
./commodity.exe -addr :8080
```

Buka `http://127.0.0.1:8080`. Bendera: `-addr` (alamat dengar) dan `-state`
(berkas checklist, bawaan `data/state.json`).

Butuh Go 1.25 atau lebih baru. Tidak ada dependensi, tidak ada langkah build
untuk frontend.

## Endpoint

| Metode | Path | Isi |
|---|---|---|
| GET | `/` | Halaman HTML (tertanam di biner) |
| GET | `/api/config` | 12 variabel, komoditas, zona, 18 rule, harga, checklist |
| POST | `/api/evaluate` | `{"input":{...}}` → input terpakai, zona, ranking, paket, catatan |
| POST | `/api/price` | `{"hpp":6500,"market":9000}` → `village` dan pembagian 30/70 |
| GET | `/api/checklist` | Status checklist bersama |
| POST | `/api/checklist` | `{"group":"download","id":"srtm","done":true}` |

`/api/evaluate` menerima input parsial: variabel yang hilang memakai nilai
bawaan, nilai di luar rentang dijepit ke batas, kunci tak dikenal ditolak 400.

## Cara kerja model

1. **Fuzzifikasi.** Tiap variabel punya dua atau tiga himpunan segitiga.
   Hujan 3500 mm/tahun adalah `sedang` 1.0, bukan benar/salah.
2. **Bobot kepercayaan.** `trust = bobot / 20`. Hujan (bobot 20) dihitung penuh,
   variabel baru berbobot 10 dihitung separuh. Derajat sebuah syarat adalah
   `mu x trust`.
3. **Rule.** `alpha = min` atas semua syarat (AND = minimum). Delapan belas rule
   ada di `internal/fuzzy/rules.go` dan di `/api/config`.
4. **Agregasi.** Untuk satu komoditas, ambil `max` alpha antar rule yang menuju
   komoditas itu (nilai terkuat yang dipakai).
5. **Defuzzifikasi.** Konsekuen tiap verdict berupa segitiga (`sangat` 62-92-100,
   `cocok` 45-70-90, `kurang` 0-35-62), dipotong pada alpha, lalu skor adalah
   titik pusat massa pada domain 0-100.
6. **Gerbang NDVI.** Bila `mu(ndvi, rendah) > 0.6` (NDVI di bawah 0.16), semua
   skor dibatasi `100 - 40 x mu`. Petak yang vegetasinya buruk tidak boleh
   mendapat skor tinggi.
7. **Paket tumpang sari.** Dua komoditas teratas, atau tiga bila `policy
   diversify >= 0.4`, dengan siklus panen berbeda bila tersedia.
8. **Harga Desa.** `hpp + 0.4 x (market - hpp)`, dibulatkan ke rupiah. Kuota
   jual 30% tetangga desa dan 70% jaringan antar desa.

Komoditas yang tidak punya rule aktif mendapat skor 0 dan tidak masuk ranking.
Karena itu jumlah baris ranking mengikuti rule base, bukan tabel komoditas:
pada nilai bawaan lokasi acuan hanya rule 05, 11, dan 15 yang aktif sehingga
muncul tiga komoditas. Turunkan ketinggian ke 200 mdpl dan naikkan hujan ke
4400 mm/tahun untuk melihat padi masuk lewat rule 01, 09, dan 14.

## Batas yang disengaja

- Rule base tetap 18 baris dari blueprint. Menambah rule adalah keputusan
  musyawarah, bukan default perangkat lunak.
- Singkong hanya tampil di saran zona; rule base belum memberi skor.
- Bobot variabel tetap di kode (rinciannya di `/api/config`), belum bisa diubah
  dari antarmuka.
- Nilai per petak masih perlu validasi lapangan 5-10 sampel tanah. SoilGrids
  250 m dan NASA POWER ~50 km bukan resolusi petak. Harga Bapanas berhenti di
  tingkat kabupaten/provinsi.
- Data petak tidak disimpan. Hanya checklist yang bertahan, di `data/state.json`.

## Struktur

```
main.go                     server HTTP, validasi, embed web/
internal/fuzzy/engine.go    fuzzifikasi, rule, centroid, paket, catatan
internal/fuzzy/rules.go     katalog variabel, 18 rule, zona, harga, checklist
internal/checklist/         penyimpanan checklist atomik (mutex + rename)
web/                        index.html, app.js, app.css
docs/CONTRACT.md            spesifikasi yang diikuti kedua workstream
```

## Sumber data

Delapan langkah di checklist `/api/checklist` adalah sumber datanya: SRTM,
SoilGrids, CHIRPS, NASA POWER, OSM+BIG, BHUMI, Sentinel-2, dan Bapanas.

BHUMI ATR/BPN (`https://bhumi.atrbpn.go.id/peta`) memberi bidang tanah: batas,
luas, dan status tanah per petak. Katalog publiknya terbuka tanpa akun:
`/geonode/api/v2/resources` (7 dataset nasional) dan
`/geonode/api/bhumi/groups_with_resources` (538 kantor pertanahan). Bidang tanah
per wilayah ada di balik login, jadi unduh manual lalu catat hasilnya; aplikasi
tidak memanggil BHUMI saat berjalan. Data BHUMI dipakai untuk memastikan batas
petak yang diukur, bukan sebagai variabel fuzzy. Situsnya menyatakan data
diberikan apa adanya; ketidaksesuaian letak atau bentuk diklarifikasi ke kantor
pertanahan setempat.

## Uji

```sh
go vet ./internal/... ./...
go test ./... -count=1
```
