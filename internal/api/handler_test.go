package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"commodity/internal/dss"
)

func TestHealthAndSnapshotEndpoints(t *testing.T) {
	engine := dss.NewEngine()
	handler := NewHandler(engine)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("health status=%d, want 200", rec.Code)
	}

	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/snapshot?selectionKind=petak&selectionId=ptk-01", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("snapshot status=%d, want 200", rec.Code)
	}

	var snap dss.Snapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snap); err != nil {
		t.Fatalf("decode snapshot: %v", err)
	}
	if snap.Decision == nil || snap.Decision.ID != "ptk-01" {
		t.Fatalf("expected decision for ptk-01, got %+v", snap.Decision)
	}
	if snap.Kpi.ActiveKolam != 4 {
		t.Fatalf("activeKolam=%d, want 4", snap.Kpi.ActiveKolam)
	}

	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/live/tick", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("tick status=%d, want 200", rec.Code)
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &snap); err != nil {
		t.Fatalf("decode tick snapshot: %v", err)
	}
	if snap.Live.Tick != 1 {
		t.Fatalf("tick=%d, want 1", snap.Live.Tick)
	}
}
