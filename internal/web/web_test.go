package web

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func request(t *testing.T, handler http.Handler, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(method, path, nil))
	return recorder
}

func TestHandlerServesIndexAndRoutes(t *testing.T) {
	handler := Handler()

	for _, path := range []string{"/", "/dashboard"} {
		response := request(t, handler, http.MethodGet, path)
		if response.Code != http.StatusOK {
			t.Fatalf("%s: status %d, want 200", path, response.Code)
		}
		if !strings.Contains(response.Body.String(), `id="root"`) {
			t.Fatalf("%s: response is not the Vite index", path)
		}
	}
}

func TestHandlerServesHashedAsset(t *testing.T) {
	root, err := fs.Sub(assets, "dist")
	if err != nil {
		t.Fatal(err)
	}
	matches, err := fs.Glob(root, "assets/*.js")
	if err != nil {
		t.Fatal(err)
	}
	if len(matches) == 0 {
		t.Skip("run npm run build first")
	}

	response := request(t, Handler(), http.MethodGet, "/"+matches[0])
	if response.Code != http.StatusOK {
		t.Fatalf("asset: status %d, want 200", response.Code)
	}
	if response.Body.Len() == 0 {
		t.Fatal("asset: empty body")
	}
	if got := response.Header().Get("Cache-Control"); !strings.Contains(got, "immutable") {
		t.Fatalf("asset: Cache-Control %q, want immutable", got)
	}
}

func TestHandlerRejectsMissingAssetAndWrite(t *testing.T) {
	handler := Handler()

	missing := request(t, handler, http.MethodGet, "/assets/missing.js")
	if missing.Code != http.StatusNotFound {
		t.Fatalf("missing asset: status %d, want 404", missing.Code)
	}

	write := request(t, handler, http.MethodPost, "/")
	if write.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST /: status %d, want 405", write.Code)
	}
}
