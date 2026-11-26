// Command server serves the built CiapusDSS web application.
package main

import (
	"flag"
	"log"
	"net/http"
	"time"

	"commodity/internal/web"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:8090", "listen address")
	flag.Parse()

	srv := &http.Server{
		Addr:              *addr,
		Handler:           web.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("CiapusDSS listening on http://%s", *addr)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
