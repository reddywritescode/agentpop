package runtime

import (
	"errors"
	"path/filepath"
	"testing"

	"github.com/reddywritescode/agentpop/internal/model"
)

func TestRegistryRefreshRemovesMissingRuntimeAndPersistsObservedState(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "registry.json")
	registry, err := OpenRegistry(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := registry.Put(model.RuntimeSandbox{ID: "live", Status: model.StatusProvisioning}); err != nil {
		t.Fatal(err)
	}
	if err := registry.Put(model.RuntimeSandbox{ID: "gone", Status: model.StatusRunning}); err != nil {
		t.Fatal(err)
	}

	items := registry.Refresh(func(id string) (model.RuntimeSandbox, error) {
		if id == "gone" {
			return model.RuntimeSandbox{}, ErrNotFound
		}
		if id != "live" {
			return model.RuntimeSandbox{}, errors.New("unexpected runtime")
		}
		return model.RuntimeSandbox{ID: "live", Status: model.StatusRunning, VCPU: 2}, nil
	})
	if len(items) != 1 || items[0].ID != "live" || items[0].Status != model.StatusRunning || items[0].VCPU != 2 {
		t.Fatalf("Refresh() = %#v, want one refreshed live runtime", items)
	}

	reopened, err := OpenRegistry(path)
	if err != nil {
		t.Fatal(err)
	}
	persisted := reopened.List()
	if len(persisted) != 1 || persisted[0].ID != "live" || persisted[0].VCPU != 2 {
		t.Fatalf("persisted registry = %#v, want refreshed live runtime only", persisted)
	}
}
