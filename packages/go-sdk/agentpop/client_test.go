package agentpop

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestListMarketplace(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/marketplace" || r.URL.Query().Get("kind") != "agent" {
			t.Fatalf("unexpected request: %s", r.URL.String())
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"items": []map[string]any{{"id": "aider", "kind": "agent", "name": "Aider"}},
		})
	}))
	defer server.Close()

	client := New(server.URL, "pop_test")
	recipes, err := client.ListMarketplace(context.Background(), "agent", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(recipes) != 1 || recipes[0].ID != "aider" {
		t.Fatalf("unexpected recipes: %#v", recipes)
	}
}

func TestLiveReadSurface(t *testing.T) {
	baseURL := os.Getenv("AGENTPOP_LIVE_BASE_URL")
	if baseURL == "" {
		t.Skip("set AGENTPOP_LIVE_BASE_URL to run against a live control plane")
	}

	client := New(baseURL, os.Getenv("AGENTPOP_API_KEY"))
	recipes, err := client.ListMarketplace(context.Background(), "all", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(recipes) == 0 {
		t.Fatal("live marketplace returned no recipes")
	}
}
