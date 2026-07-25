package main

import (
	"errors"
	"net/http"
	"os"
	"regexp"
	"sort"
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
	ID               string            `json:"id"`
	Kind             string            `json:"kind"`
	Name             string            `json:"name"`
	Tagline          string            `json:"tagline"`
	Description      string            `json:"description"`
	Category         string            `json:"category"`
	UseCases         []string          `json:"useCases"`
	Definition       string            `json:"definition"`
	GeneratedBy      string            `json:"generatedBy"`
	Credentials      []imageCredential `json:"credentials"`
	Files            []imageFile       `json:"files"`
	PersistenceModes []string          `json:"persistenceModes"`
	DefaultCommand   string            `json:"defaultCommand,omitempty"`
}

// generateMarketplaceRecipe turns a short environment description into a
// reviewable Dockerfile. It intentionally uses a deterministic, allowlisted
// generator: the API never pretends an LLM was called, and it never emits an
// unreviewed shell fragment supplied by the prompt.
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

	lower := strings.ToLower(prompt)
	// If the customer names a curated agent, generate a real forkable image
	// from that package instead of guessing a generic Linux tool list.
	for _, known := range agentPackages() {
		if strings.Contains(lower, strings.ToLower(known.ID)) ||
			strings.Contains(lower, strings.ToLower(known.Name)) {
			name := recipeName(req.Name, prompt)
			known.ID = name
			known.Kind = kind
			known.Name = strings.ReplaceAll(name, "-", " ")
			known.Tagline = truncate(prompt, 120)
			apiutil.WriteJSON(w, http.StatusOK, generatedRecipe{
				ID: name, Kind: kind, Name: known.Name, Tagline: known.Tagline,
				Description: "Generated as a forkable AgentPop image from the curated " + known.Name + " base.",
				Category:    known.Category, UseCases: known.UseCases, Definition: known.Definition,
				GeneratedBy: "deterministic-image-catalog-v2", Credentials: imageCredentials(known),
				Files: imageFiles(known), PersistenceModes: []string{"persistent", "ephemeral"},
				DefaultCommand: known.DefaultCommand,
			})
			return
		}
	}
	apt := map[string]bool{"ca-certificates": true, "curl": true, "git": true, "jq": true, "ripgrep": true}
	pip := map[string]bool{}
	category := "development"
	useCases := []string{"custom environment", "isolated execution"}
	if containsAny(lower, "python", "pandas", "numpy", "data", "jupyter") {
		apt["python3"] = true
		apt["python3-pip"] = true
		pip["requests"] = true
		if containsAny(lower, "pandas", "numpy", "data", "jupyter") {
			pip["numpy"] = true
			pip["pandas"] = true
			category = "data"
			useCases = append(useCases, "data analysis")
		}
	}
	if containsAny(lower, "node", "javascript", "typescript", "react", "next.js", "npm") {
		apt["nodejs"] = true
		apt["npm"] = true
		category = "web development"
		useCases = append(useCases, "JavaScript and TypeScript")
	}
	if containsAny(lower, "golang", " go ", "go cli", "go service") {
		apt["golang-go"] = true
		category = "backend"
		useCases = append(useCases, "Go services")
	}
	if containsAny(lower, "rust", "cargo") {
		apt["rustc"] = true
		apt["cargo"] = true
		category = "systems"
		useCases = append(useCases, "Rust development")
	}
	if containsAny(lower, "browser", "playwright", "scrape", "web automation") {
		apt["python3"] = true
		apt["python3-pip"] = true
		pip["playwright"] = true
		category = "web automation"
		useCases = append(useCases, "browser automation")
	}
	if kind == "agent" {
		category = "agent"
		useCases = append(useCases, "agent runtime")
	}

	aptNames := sortedKeys(apt)
	definition := "FROM agentpop/devbox:local\n" +
		"RUN apt-get update && apt-get install -y --no-install-recommends " +
		strings.Join(aptNames, " ") + " && rm -rf /var/lib/apt/lists/*\n"
	if len(pip) > 0 {
		definition += "RUN python3 -m pip install --break-system-packages --no-cache-dir " +
			strings.Join(sortedKeys(pip), " ") + "\n"
	}

	name := recipeName(req.Name, prompt)
	recipe := generatedRecipe{
		ID:               name,
		Kind:             kind,
		Name:             strings.ReplaceAll(name, "-", " "),
		Tagline:          truncate(prompt, 120),
		Description:      "Generated from a reviewed, allowlisted package catalog. Edit the Dockerfile before building.",
		Category:         category,
		UseCases:         dedupeStrings(useCases),
		Definition:       definition,
		GeneratedBy:      "deterministic-image-catalog-v2",
		PersistenceModes: []string{"persistent", "ephemeral"},
	}
	imagePkg := agentPackage{
		ID: recipe.ID, Kind: recipe.Kind, Name: recipe.Name, Tagline: recipe.Tagline,
		Description: recipe.Description, Category: recipe.Category, UseCases: recipe.UseCases,
		Definition: recipe.Definition,
	}
	recipe.Files = imageFiles(imagePkg)
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

func containsAny(value string, candidates ...string) bool {
	for _, candidate := range candidates {
		if strings.Contains(value, candidate) {
			return true
		}
	}
	return false
}

func sortedKeys(values map[string]bool) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
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
