package web

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed all:dist
var assets embed.FS

// Handler serves the Vite build and falls back to index.html for client routes.
func Handler() http.Handler {
	root, err := fs.Sub(assets, "dist")
	if err != nil {
		panic(err)
	}
	files := http.FileServer(http.FS(root))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		clean := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if clean == "." || clean == "" {
			clean = "index.html"
		}

		if info, err := fs.Stat(root, clean); err == nil && !info.IsDir() {
			if strings.HasPrefix(r.URL.Path, "/assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			} else {
				w.Header().Set("Cache-Control", "no-cache")
			}
			files.ServeHTTP(w, r)
			return
		}

		if strings.Contains(path.Base(clean), ".") {
			http.NotFound(w, r)
			return
		}

		index := r.Clone(r.Context())
		index.URL.Path = "/"
		index.URL.RawPath = ""
		w.Header().Set("Cache-Control", "no-cache")
		files.ServeHTTP(w, index)
	})
}
