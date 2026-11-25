// Package checklist stores the shared musyawarah checklist state in one JSON file.
package checklist

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

// State mirrors data/state.json: the ids that are marked done, per group.
type State struct {
	Download []string `json:"download"`
	SOP      []string `json:"sop"`
}

// Store guards one JSON file with a single mutex and writes it atomically.
type Store struct {
	mu    sync.Mutex
	path  string
	state State
}

// New loads the state file, or starts empty when the file does not exist yet.
func New(path string) (*Store, error) {
	s := &Store{path: path, state: State{Download: []string{}, SOP: []string{}}}
	raw, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &s.state); err != nil {
		return nil, err
	}
	if s.state.Download == nil {
		s.state.Download = []string{}
	}
	if s.state.SOP == nil {
		s.state.SOP = []string{}
	}
	return s, nil
}

// State returns a copy of the current state.
func (s *Store) State() State {
	s.mu.Lock()
	defer s.mu.Unlock()
	return State{
		Download: append([]string{}, s.state.Download...),
		SOP:      append([]string{}, s.state.SOP...),
	}
}

// Set marks one id done or not done inside a group. An empty result is stored
// as an empty list, never null.
func (s *Store) Set(group, id string, done bool) (State, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var list *[]string
	switch group {
	case "download":
		list = &s.state.Download
	case "sop":
		list = &s.state.SOP
	default:
		return State{}, errors.New("unknown checklist group")
	}

	next := make([]string, 0, len(*list)+1)
	found := false
	for _, have := range *list {
		if have == id {
			found = true
			if !done {
				continue
			}
		}
		next = append(next, have)
	}
	if done && !found {
		next = append(next, id)
	}
	*list = next

	if err := s.save(); err != nil {
		return State{}, err
	}
	return State{
		Download: append([]string{}, s.state.Download...),
		SOP:      append([]string{}, s.state.SOP...),
	}, nil
}

// save writes a temp file in the same directory, syncs it, then renames it over
// the state file so a crash cannot leave a half-written JSON document.
func (s *Store) save() error {
	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, "state-*.json")
	if err != nil {
		return err
	}
	name := tmp.Name()
	defer os.Remove(name)

	if _, err := tmp.Write(raw); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(name, s.path)
}
