package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"sync"
	"time"
)

// Public endpoint used by the PSIIDN meteorology map for the Ciapus point.
const psiidnForecastURL = "https://psimkg.bmkg.go.id/psiidn/api/forecast?lat=-6.59667&lon=106.74722&level=1000&domain=d03"

type forecastSample struct {
	ValidAt     time.Time `json:"validAt"`
	RainRate    float64   `json:"rainRateMmH"`
	Humidity    float64   `json:"humidityPct"`
	Wind        float64   `json:"windMps"`
	Temperature float64   `json:"temperatureC"`
}

type psiidnPayload struct {
	Times       []string          `json:"times"`
	TimeZone    string            `json:"timeZone"`
	Units       map[string]string `json:"units"`
	Rain        []*float64        `json:"rr"`
	Humidity    []*float64        `json:"rh"`
	Wind        []*float64        `json:"wspd"`
	Temperature []*float64        `json:"tc"`
}

type psiidnForecast struct {
	mu      sync.Mutex
	client  http.Client
	retryAt time.Time
	samples []forecastSample
}

func (f *psiidnForecast) serveHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	sample, ok := f.current(time.Now())
	if !ok {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "PSIIDN forecast unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, sample)
}

func (f *psiidnForecast) current(now time.Time) (forecastSample, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if !now.Before(f.retryAt) {
		next, err := f.fetch()
		if err != nil {
			f.retryAt = now.Add(time.Minute)
		} else {
			f.samples = next
			f.retryAt = now.Add(5 * time.Minute)
		}
	}
	var best forecastSample
	minDistance := 90 * time.Minute
	for _, sample := range f.samples {
		if distance := now.Sub(sample.ValidAt).Abs(); distance < minDistance {
			best, minDistance = sample, distance
		}
	}
	return best, !best.ValidAt.IsZero()
}

func (f *psiidnForecast) fetch() ([]forecastSample, error) {
	res, err := f.client.Get(psiidnForecastURL)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, errors.New("PSIIDN forecast request failed")
	}
	return decodePSIIDN(io.LimitReader(res.Body, 256<<10))
}

func decodePSIIDN(body io.Reader) ([]forecastSample, error) {
	var payload psiidnPayload
	if err := json.NewDecoder(body).Decode(&payload); err != nil {
		return nil, err
	}
	n := len(payload.Times)
	if payload.TimeZone != "UTC" || payload.Units["rr"] != "mm/h" ||
		payload.Units["rh"] != "%" || payload.Units["wspd"] != "m/s" ||
		payload.Units["tc"] != "°C" || n != len(payload.Rain) ||
		n != len(payload.Humidity) || n != len(payload.Wind) || n != len(payload.Temperature) {
		return nil, errors.New("unexpected PSIIDN forecast schema")
	}
	var samples []forecastSample
	for i, rawTime := range payload.Times {
		validAt, err := time.Parse("2006-01-02_15:04:05", rawTime)
		rain, humidity, wind, temperature := payload.Rain[i], payload.Humidity[i], payload.Wind[i], payload.Temperature[i]
		if err != nil || rain == nil || humidity == nil || wind == nil || temperature == nil ||
			*rain < 0 || *humidity < 0 || *humidity > 100 || *wind < 0 {
			continue
		}
		samples = append(samples, forecastSample{
			ValidAt: validAt, RainRate: *rain, Humidity: *humidity, Wind: *wind, Temperature: *temperature,
		})
	}
	if len(samples) == 0 {
		return nil, errors.New("no usable PSIIDN forecast steps")
	}
	return samples, nil
}
