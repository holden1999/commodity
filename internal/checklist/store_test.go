package checklist

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"sync"
	"testing"
)

// newStore returns a Store backed by a fresh temp directory.
func newStore(t *testing.T) *Store {
	t.Helper()
	store, err := New(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return store
}

func TestFirstWriteCreatesFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data", "state.json")
	store, err := New(path)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("state file exists before first write: %v", err)
	}

	if _, err := store.Set("download", "srtm", true); err != nil {
		t.Fatalf("Set: %v", err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read state file: %v", err)
	}
	var got State
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatalf("state file is not valid JSON: %v\n%s", err, raw)
	}
	want := State{Download: []string{"srtm"}, SOP: []string{}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("state file = %#v, want %#v", got, want)
	}
}

type setStep struct {
	group string
	id    string
	done  bool
}

func TestSetToggleIsIdempotent(t *testing.T) {
	empty := []string{}
	tests := []struct {
		name  string
		steps []setStep
		want  State
	}{
		{
			name:  "turning on twice stores one copy",
			steps: []setStep{{"download", "srtm", true}, {"download", "srtm", true}},
			want:  State{Download: []string{"srtm"}, SOP: empty},
		},
		{
			name: "turning off twice removes the id",
			steps: []setStep{
				{"download", "srtm", true},
				{"download", "srtm", false},
				{"download", "srtm", false},
			},
			want: State{Download: empty, SOP: empty},
		},
		{
			name:  "turning off an id that was never on is a no-op",
			steps: []setStep{{"sop", "cuaca", false}},
			want:  State{Download: empty, SOP: empty},
		},
		{
			name: "groups are independent and keep order",
			steps: []setStep{
				{"download", "chirps", true},
				{"sop", "cuaca", true},
				{"download", "srtm", true},
			},
			want: State{Download: []string{"chirps", "srtm"}, SOP: []string{"cuaca"}},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newStore(t)
			for _, st := range tt.steps {
				if _, err := store.Set(st.group, st.id, st.done); err != nil {
					t.Fatalf("Set(%q, %q, %v): %v", st.group, st.id, st.done, err)
				}
			}
			if got := store.State(); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("state = %#v, want %#v", got, tt.want)
			}
		})
	}
}

func TestSetUnknownGroupIsRejected(t *testing.T) {
	for _, group := range []string{"", "bogus", "Download", "download ", "downloads"} {
		t.Run("group="+group, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "state.json")
			store, err := New(path)
			if err != nil {
				t.Fatalf("New: %v", err)
			}
			if _, err := store.Set(group, "srtm", true); err == nil {
				t.Fatalf("Set(%q, ...) = nil error, want rejection", group)
			}
			if _, err := os.Stat(path); !os.IsNotExist(err) {
				t.Fatalf("rejected Set touched the file: %v", err)
			}
			if got := store.State(); len(got.Download) != 0 || len(got.SOP) != 0 {
				t.Fatalf("rejected Set changed state: %#v", got)
			}
		})
	}
}

func TestStateSurvivesReload(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	store, err := New(path)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	steps := []setStep{
		{"download", "srtm", true},
		{"download", "chirps", true},
		{"sop", "cuaca", true},
		{"sop", "bayar", true},
		{"sop", "cuaca", false},
	}
	for _, st := range steps {
		if _, err := store.Set(st.group, st.id, st.done); err != nil {
			t.Fatalf("Set(%q, %q, %v): %v", st.group, st.id, st.done, err)
		}
	}

	reloaded, err := New(path)
	if err != nil {
		t.Fatalf("reload New(%q): %v", path, err)
	}
	want := State{Download: []string{"srtm", "chirps"}, SOP: []string{"bayar"}}
	if got := reloaded.State(); !reflect.DeepEqual(got, want) {
		t.Fatalf("reloaded state = %#v, want %#v", got, want)
	}
	if got, live := reloaded.State(), store.State(); !reflect.DeepEqual(got, live) {
		t.Fatalf("reloaded state = %#v, live state = %#v", got, live)
	}
}

func TestEmptyListsAreArrays(t *testing.T) {
	tests := []struct {
		name  string
		state func(t *testing.T) State
	}{
		{
			name: "loaded from a file that stored null",
			state: func(t *testing.T) State {
				path := filepath.Join(t.TempDir(), "state.json")
				if err := os.WriteFile(path, []byte(`{"download":null,"sop":null}`), 0o644); err != nil {
					t.Fatalf("seed state file: %v", err)
				}
				store, err := New(path)
				if err != nil {
					t.Fatalf("New: %v", err)
				}
				return store.State()
			},
		},
		{
			name:  "fresh store",
			state: func(t *testing.T) State { return newStore(t).State() },
		},
		{
			name: "store emptied by a toggle",
			state: func(t *testing.T) State {
				store := newStore(t)
				if _, err := store.Set("download", "srtm", true); err != nil {
					t.Fatalf("Set on: %v", err)
				}
				if _, err := store.Set("download", "srtm", false); err != nil {
					t.Fatalf("Set off: %v", err)
				}
				return store.State()
			},
		},
	}
	const want = `{"download":[],"sop":[]}`
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw, err := json.Marshal(tt.state(t))
			if err != nil {
				t.Fatalf("json.Marshal: %v", err)
			}
			if got := string(raw); got != want {
				t.Fatalf("json = %s, want %s", got, want)
			}
		})
	}
}

func TestConcurrentSetKeepsFileValid(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	store, err := New(path)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	ids := []string{"srtm", "soilgrids", "chirps", "power", "osm_big", "sentinel2", "bapanas", "ndvi"}
	if len(ids) != 8 {
		t.Fatalf("want 8 workers, have %d ids", len(ids))
	}

	var wg sync.WaitGroup
	for _, id := range ids {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			for i := 0; i < 20; i++ {
				if _, err := store.Set("download", id, true); err != nil {
					t.Errorf("Set(%q, true): %v", id, err)
					return
				}
				if _, err := store.Set("download", id, false); err != nil {
					t.Errorf("Set(%q, false): %v", id, err)
					return
				}
			}
		}(id)
	}
	wg.Wait()

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read state file: %v", err)
	}
	var onDisk State
	if err := json.Unmarshal(raw, &onDisk); err != nil {
		t.Fatalf("state file is not valid JSON after concurrent writes: %v\n%s", err, raw)
	}

	seen := map[string]bool{}
	for _, id := range onDisk.Download {
		if seen[id] {
			t.Fatalf("duplicate id %q in state file: %s", id, raw)
		}
		seen[id] = true
	}
	// Every worker ends with its id off, so both lists must be empty.
	if len(onDisk.Download) != 0 || len(onDisk.SOP) != 0 {
		t.Fatalf("state file after concurrent writes = %#v", onDisk)
	}

	reloaded, err := New(path)
	if err != nil {
		t.Fatalf("reload New(%q): %v", path, err)
	}
	if got, live := reloaded.State(), store.State(); !reflect.DeepEqual(got, live) {
		t.Fatalf("reloaded state = %#v, live state = %#v", got, live)
	}
}
