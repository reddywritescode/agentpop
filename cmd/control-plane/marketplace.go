package main

import (
	"errors"
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

var recipeSlugUnsafe = regexp.MustCompile(`[^a-z0-9]+`)

// listMarketplace is the canonical catalog endpoint. The older agent-catalog
// and sandbox-catalog endpoints remain as compatibility aliases for clients
// that predate the single-runtime product model.
func (s *server) listMarketplace(w http.ResponseWriter, r *http.Request) {
	kind := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("kind")))
	query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	if kind != "" && kind != "all" && kind != "agent" && kind != "sandbox" {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_kind", "kind must be all, agent, or sandbox")
		return
	}
	items := make([]map[string]any, 0, len(allPackages()))
	for _, pkg := range allPackages() {
		if kind != "" && kind != "all" && pkg.Kind != kind {
			continue
		}
		haystack := strings.ToLower(strings.Join(append([]string{
			pkg.ID, pkg.Name, pkg.Tagline, pkg.Description, pkg.Category,
		}, pkg.UseCases...), " "))
		if query != "" && !strings.Contains(haystack, query) {
			continue
		}
		items = append(items, s.agentPackageWire(pkg))
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"items":   items,
		"filters": []string{"all", "agent", "sandbox"},
	})
}

type generatedRecipe struct {
	ID                 string            `json:"id"`
	Kind               string            `json:"kind"`
	Name               string            `json:"name"`
	Tagline            string            `json:"tagline"`
	Description        string            `json:"description"`
	Category           string            `json:"category"`
	UseCases           []string          `json:"useCases"`
	Definition         string            `json:"definition"`
	GeneratedBy        string            `json:"generatedBy"`
	Credentials        []imageCredential `json:"credentials"`
	Files              []imageFile       `json:"files"`
	PersistenceModes   []string          `json:"persistenceModes"`
	DefaultCommand     string            `json:"defaultCommand,omitempty"`
	RequiredConnectors []string          `json:"requiredConnectors"`
	Ports              []int             `json:"ports"`
}

// generateMarketplaceRecipe asks the configured model planner for a complete,
// reviewable source bundle. There is intentionally no deterministic fallback:
// if the model is unavailable, the API reports that instead of presenting
// generic packages as if they satisfied the customer's intent.
func (s *server) generateMarketplaceRecipe(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Prompt string `json:"prompt"`
		Kind   string `json:"kind,omitempty"`
		Name   string `json:"name,omitempty"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	prompt := strings.TrimSpace(req.Prompt)
	if len(prompt) < 3 || len(prompt) > 1000 {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_prompt", "prompt must contain 3 to 1000 characters")
		return
	}
	kind := strings.ToLower(strings.TrimSpace(req.Kind))
	if kind == "" {
		kind = "sandbox"
	}
	if kind != "agent" && kind != "sandbox" {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_kind", "kind must be agent or sandbox")
		return
	}
	if s.imagePlanner == nil {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "image_generator_not_configured", "configure IMAGE_GENERATOR_API_URL, IMAGE_GENERATOR_API_KEY, and IMAGE_GENERATOR_MODEL")
		return
	}
	recipe, err := s.imagePlanner.Generate(r.Context(), imageGenerationRequest{
		Prompt: prompt,
		Kind:   kind,
		Name:   strings.TrimSpace(req.Name),
	})
	if err != nil {
		status := http.StatusBadGateway
		code := "image_generation_failed"
		if errors.Is(err, errImageGeneratorUnavailable) {
			status = http.StatusServiceUnavailable
			code = "image_generator_not_configured"
		}
		apiutil.WriteError(w, status, code, err.Error())
		return
	}
	_ = s.audit("image.generate", recipe.ID, "ok", map[string]any{
		"kind": recipe.Kind, "generatedBy": recipe.GeneratedBy, "files": len(recipe.Files),
	})
	apiutil.WriteJSON(w, http.StatusOK, recipe)
}

func (s *server) deployMarketplacePackage(w http.ResponseWriter, r *http.Request) {
	pkg, ok := findAgentPackage(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "marketplace recipe not found")
		return
	}
	template, ok := s.store.GetTemplateByName(pkg.ID)
	if !ok || template.Status != model.TemplateStatusReady || template.Deprecated || template.ImageRef == "" {
		apiutil.WriteError(w, http.StatusConflict, "recipe_not_installed", "install and finish building this recipe before deploying it")
		return
	}
	var req model.CreateSandboxRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	req.Kind = pkg.Kind
	req.RecipeID = pkg.ID
	req.Image = template.ImageRef
	if req.Name == "" {
		req.Name = recipeName(pkg.ID, pkg.ID)
	}
	sandbox, err := s.provisionSandbox(r.Context(), req)
	if err != nil {
		if errors.Is(err, errTemplateConflict) {
			apiutil.WriteError(w, http.StatusConflict, "template_unusable", err.Error())
			return
		}
		apiutil.WriteError(w, http.StatusInternalServerError, "sandbox_create_failed", err.Error())
		return
	}
	_ = s.audit("marketplace.deploy", sandbox.ID, "ok", map[string]any{"recipeId": pkg.ID, "kind": pkg.Kind})
	apiutil.WriteJSON(w, http.StatusCreated, sandbox)
}

func (s *server) subscription(w http.ResponseWriter, _ *http.Request) {
	status := "development"
	if os.Getenv("STRIPE_CHECKOUT_URL") != "" {
		status = "available"
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"plan": map[string]any{
			"id": "agentpop-pro", "name": "AgentPop Pro",
			"price": 20, "currency": "USD", "interval": "month",
			"includes": []string{
				"Agent and environment marketplace",
				"Firecracker sandbox orchestration",
				"API, MCP, CLI, and SDK access",
				"Connector broker and encrypted secrets",
			},
		},
		"status":       status,
		"billingModel": "fixed-subscription",
		"usageCredits": false,
	})
}

func (s *server) createSubscriptionCheckout(w http.ResponseWriter, _ *http.Request) {
	checkoutURL := strings.TrimSpace(os.Getenv("STRIPE_CHECKOUT_URL"))
	if checkoutURL == "" {
		apiutil.WriteError(w, http.StatusNotImplemented, "billing_provider_not_configured", "set STRIPE_CHECKOUT_URL to enable hosted subscription checkout")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]string{"url": checkoutURL})
}

func recipeName(preferred, prompt string) string {
	raw := strings.ToLower(strings.TrimSpace(preferred))
	if raw == "" {
		raw = strings.ToLower(strings.TrimSpace(prompt))
	}
	raw = recipeSlugUnsafe.ReplaceAllString(raw, "-")
	raw = strings.Trim(raw, "-")
	if raw == "" {
		raw = "custom-recipe"
	}
	return strings.Trim(truncate(raw, 22), "-")
}

func dedupeStrings(values []string) []string {
	seen := map[string]bool{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		if !seen[value] {
			seen[value] = true
			result = append(result, value)
		}
	}
	return result
}
