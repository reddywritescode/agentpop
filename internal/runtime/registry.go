package runtime

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"

	"github.com/reddywritescode/agentpop/internal/model"
)

type Registry struct {
	mu    sync.RWMutex
	path  string
	items map[string]model.RuntimeSandbox
}

func OpenRegistry(path string) (*Registry, error) {
	r := &Registry{path: path, items: map[string]model.RuntimeSandbox{}}
	raw, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return r, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read runtime registry: %w", err)
	}
	if err := json.Unmarshal(raw, &r.items); err != nil {
		return nil, fmt.Errorf("decode runtime registry: %w", err)
	}
	return r, nil
}

func (r *Registry) Put(item model.RuntimeSandbox) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.items[item.ID] = item
	return r.saveLocked()
}

func (r *Registry) Get(id string) (model.RuntimeSandbox, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	item, ok := r.items[id]
	return item, ok
}

func (r *Registry) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.items, id)
	return r.saveLocked()
}

func (r *Registry) List() []model.RuntimeSandbox {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]model.RuntimeSandbox, 0, len(r.items))
	for _, item := range r.items {
		out = append(out, item)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartedAt.After(out[j].StartedAt) })
	return out
}

// Refresh reconciles the persisted registry against the runtime driver. It
// removes records whose container or microVM no longer exists and refreshes
// the observed state of records that are still live.
func (r *Registry) Refresh(inspect func(string) (model.RuntimeSandbox, error)) []model.RuntimeSandbox {
	for _, item := range r.List() {
		current, err := inspect(item.ID)
		switch {
		case errors.Is(err, ErrNotFound):
			_ = r.Delete(item.ID)
		case err == nil:
			_ = r.Put(current)
		}
	}
	return r.List()
}

func (r *Registry) saveLocked() error {
	if err := os.MkdirAll(filepath.Dir(r.path), 0o700); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(r.items, "", "  ")
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(r.path), ".runtime-*.json")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err := tmp.Chmod(0o600); err != nil {
		_ = tmp.Close()
		return err
	}
	if _, err := tmp.Write(raw); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, r.path)
}
