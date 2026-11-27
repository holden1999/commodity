package api

import (
	"encoding/json"
	"net/http"
	"time"

	"commodity/internal/dss"
)

func NewHandler(engine *dss.Engine) http.Handler {
	mux := http.NewServeMux()
	forecast := &psiidnForecast{client: http.Client{Timeout: 10 * time.Second}}
	mux.HandleFunc("/api/weather/psiidn", forecast.serveHTTP)

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{
			"status": "ok",
			"engine": "go",
		})
	})

	mux.HandleFunc("/api/snapshot", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		filters, selection := parseQuery(r)
		writeJSON(w, http.StatusOK, engine.Snapshot(filters, selection))
	})

	mux.HandleFunc("/api/live/tick", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		filters, selection := parseQuery(r)
		writeJSON(w, http.StatusOK, engine.TickAndSnapshot(filters, selection))
	})

	return mux
}

func parseQuery(r *http.Request) (dss.CiapusFilters, *dss.Selection) {
	q := r.URL.Query()
	txType := q.Get("rantaiPasokType")
	if txType == "" {
		txType = "Semua"
	}
	filters := dss.CiapusFilters{
		HighFloodRisk:   q.Get("highFloodRisk") == "true" || q.Get("highFloodRisk") == "1",
		HighFuzzy:       q.Get("highFuzzy") == "true" || q.Get("highFuzzy") == "1",
		RantaiPasokType: txType,
	}

	kind := dss.SelectionKind(q.Get("selectionKind"))
	id := q.Get("selectionId")
	if kind != "" && id != "" {
		return filters, &dss.Selection{Kind: kind, ID: id}
	}
	return filters, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
