// Command commodity serves the Ciapus fuzzy village dashboard: one Go binary,
// one HTML page, the Mamdani engine from internal/fuzzy.
package main

import (
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"io"
	"io/fs"
	"log"
	"math"
	"net/http"
	"os"
	"time"

	"commodity/internal/checklist"
	"commodity/internal/fuzzy"
)

//go:embed web
var webFiles embed.FS

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	statePath := flag.String("state", "data/state.json", "checklist state file")
	flag.Parse()

	store, err := checklist.New(*statePath)
	if err != nil {
		log.Fatalf("load checklist state: %v", err)
	}

	app := &server{store: store, cfg: fuzzy.Config()}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/config", app.handleConfig)
	mux.HandleFunc("POST /api/evaluate", app.handleEvaluate)
	mux.HandleFunc("POST /api/price", app.handlePrice)
	mux.HandleFunc("GET /api/checklist", app.handleChecklistGet)
	mux.HandleFunc("POST /api/checklist", app.handleChecklistSet)

	page, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatalf("embed web files: %v", err)
	}
	mux.Handle("GET /", http.FileServer(http.FS(page)))

	log.Printf("fuzzy desa listening on %s", *addr)
	srv := &http.Server{
		Addr:              *addr,
		Handler:           logRequests(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

type server struct {
	store *checklist.Store
	cfg   fuzzy.ConfigData
}

func (s *server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.cfg)
}

// evaluateRequest carries a partial or full set of plot measurements.
type evaluateRequest struct {
	Input map[string]float64 `json:"input"`
}

func (s *server) handleEvaluate(w http.ResponseWriter, r *http.Request) {
	var req evaluateRequest
	if err := readJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	in, echoed, err := s.cfg.Normalize(req.Input)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	result := fuzzy.Evaluate(in)
	zone := s.cfg.ZoneFor(in.Mdpl)

	writeJSON(w, http.StatusOK, struct {
		Input map[string]float64 `json:"input"`
		Zone  fuzzy.Zone         `json:"zone"`
		fuzzy.Result
	}{Input: echoed, Zone: zone, Result: result})
}

type priceRequest struct {
	HPP    float64 `json:"hpp"`
	Market float64 `json:"market"`
}

type priceResponse struct {
	HPP           float64 `json:"hpp"`
	Market        float64 `json:"market"`
	Village       float64 `json:"village"`
	NeighborShare int     `json:"neighborShare"`
	NetworkShare  int     `json:"networkShare"`
}

func (s *server) handlePrice(w http.ResponseWriter, r *http.Request) {
	var req priceRequest
	if err := readJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.HPP <= 0 || req.Market <= 0 {
		writeError(w, http.StatusBadRequest, "HPP dan harga pasar harus lebih besar dari nol")
		return
	}
	if req.Market < req.HPP {
		writeError(w, http.StatusBadRequest, "harga pasar tidak boleh di bawah HPP")
		return
	}

	writeJSON(w, http.StatusOK, priceResponse{
		HPP:           req.HPP,
		Market:        req.Market,
		Village:       math.Round(req.HPP + 0.4*(req.Market-req.HPP)),
		NeighborShare: s.cfg.Price.NeighborShare,
		NetworkShare:  s.cfg.Price.NetworkShare,
	})
}

func (s *server) handleChecklistGet(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.State())
}

type checklistRequest struct {
	Group string `json:"group"`
	ID    string `json:"id"`
	Done  bool   `json:"done"`
}

func (s *server) handleChecklistSet(w http.ResponseWriter, r *http.Request) {
	var req checklistRequest
	if err := readJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !s.cfg.HasChecklistItem(req.Group, req.ID) {
		writeError(w, http.StatusBadRequest, "item checklist tidak dikenal")
		return
	}
	state, err := s.store.Set(req.Group, req.ID, req.Done)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, state)
}

const maxBodyBytes = 1 << 20

func readJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	body := http.MaxBytesReader(w, r.Body, maxBodyBytes)
	defer body.Close()
	dec := json.NewDecoder(body)
	if err := dec.Decode(dst); err != nil {
		if errors.Is(err, io.EOF) {
			return errors.New("body JSON kosong")
		}
		return errors.New("body JSON tidak valid: " + err.Error())
	}
	if err := dec.Decode(new(any)); !errors.Is(err, io.EOF) {
		return errors.New("body JSON harus berisi satu nilai")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		log.Printf("write JSON: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Millisecond))
	})
}

func init() {
	log.SetOutput(os.Stdout)
	log.SetFlags(log.Ltime)
}
