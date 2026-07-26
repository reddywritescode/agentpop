package main

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

// The marketplace is a curated set of packages of two kinds: "agent" packages
// (famous open agent runtimes) and "sandbox" images (preloaded development
// environments). Each package is a reproducible template definition:
// installing it runs the real template build pipeline and produces an
// immutable image, so a package is never "available" by assertion — only by a
// successful build. The same definition is the self-host artifact (docker
// build it anywhere).

type agentPackage struct {
	ID                 string   `json:"id"`
	Kind               string   `json:"kind"`
	Name               string   `json:"name"`
	Tagline            string   `json:"tagline"`
	Description        string   `json:"description"`
	Category           string   `json:"category"`
	UseCases           []string `json:"useCases"`
	Definition         string   `json:"definition"`
	DefaultModel       string   `json:"defaultModel,omitempty"`
	RequiredSecret     string   `json:"requiredSecret,omitempty"`
	SourceURL          string   `json:"sourceUrl,omitempty"`
	License            string   `json:"license,omitempty"`
	HeavyBuild         bool     `json:"heavyBuild,omitempty"`
	DefaultCommand     string   `json:"defaultCommand,omitempty"`
	RequiredConnectors []string `json:"requiredConnectors,omitempty"`
}

type imageCredential struct {
	Name        string `json:"name"`
	Label       string `json:"label"`
	Provider    string `json:"provider,omitempty"`
	Required    bool   `json:"required"`
	Description string `json:"description,omitempty"`
}

type imageFile struct {
	Path     string `json:"path"`
	Language string `json:"language,omitempty"`
	Content  string `json:"content"`
}

// sandboxImages are preloaded development environments: same build pipeline,
// no model binding — they exist so customers can boot a sandbox that already
// has a toolchain installed.
func sandboxImages() []agentPackage {
	return []agentPackage{
		{
			ID: "base-agent", Kind: "sandbox", Name: "Base agent computer",
			Tagline:     "A programmable Linux computer prepared for coding agents.",
			Description: "Python, Node.js, git, curl, jq, ripgrep, SQLite, build tools, and an editable /workspace. Use it as the base for your own agent image.",
			Category:    "agent base",
			UseCases:    []string{"custom agent images", "coding agents", "tool execution", "forkable base"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-venv nodejs npm build-essential sqlite3 && rm -rf /var/lib/apt/lists/*\n",
			DefaultCommand: "/bin/bash",
			License:        "Apache-2.0 platform image",
		},
		{
			ID: "node-dev", Kind: "sandbox", Name: "Node.js dev",
			Tagline:  "Node.js 18, npm, and pnpm preinstalled.",
			Category: "web development",
			UseCases: []string{"JavaScript/TypeScript apps", "frontend builds", "npm tooling"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm && rm -rf /var/lib/apt/lists/*\n" +
				// pnpm 9+ requires a newer Node than Ubuntu 24.04's apt package;
				// pnpm 8 supports Node >= 16.14.
				"RUN npm install -g pnpm@8\n",
			License: "MIT tooling",
		},
		{
			ID: "python-data", Kind: "sandbox", Name: "Python data",
			Tagline:  "NumPy, pandas, matplotlib, requests, BeautifulSoup.",
			Category: "data",
			UseCases: []string{"data analysis", "scraping", "plotting", "ETL scripts"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends python3-pip && rm -rf /var/lib/apt/lists/*\n" +
				"RUN python3 -m pip install --break-system-packages --no-cache-dir numpy pandas matplotlib requests beautifulsoup4\n",
			License: "BSD/PSF tooling",
		},
		{
			ID: "go-dev", Kind: "sandbox", Name: "Go dev",
			Tagline:  "Go toolchain from Ubuntu 24.04.",
			Category: "backend",
			UseCases: []string{"Go services", "CLIs", "compiled tooling"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends golang-go && rm -rf /var/lib/apt/lists/*\n",
			License: "BSD tooling",
		},
		{
			ID: "rust-dev", Kind: "sandbox", Name: "Rust dev",
			Tagline:  "rustc and cargo preinstalled.",
			Category: "backend",
			UseCases: []string{"Rust crates", "systems programming", "wasm builds"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends rustc cargo && rm -rf /var/lib/apt/lists/*\n",
			License: "MIT/Apache tooling",
		},
		{
			ID: "web-fullstack", Kind: "sandbox", Name: "Full-stack web",
			Tagline:  "Node.js, Python venv, and SQLite together.",
			Category: "web development",
			UseCases: []string{"full-stack prototypes", "API + frontend", "hackathon starters"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm python3-venv sqlite3 && rm -rf /var/lib/apt/lists/*\n",
			License: "mixed OSS tooling",
		},
		{
			ID: "devops-toolbox", Kind: "sandbox", Name: "DevOps toolbox",
			Tagline:  "AWS CLI, DNS/net debugging tools, rsync, yq.",
			Category: "operations",
			UseCases: []string{"cloud scripting", "network debugging", "backup jobs", "YAML wrangling"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends python3-pip dnsutils netcat-openbsd rsync && rm -rf /var/lib/apt/lists/*\n" +
				"RUN python3 -m pip install --break-system-packages --no-cache-dir awscli yq\n",
			License: "mixed OSS tooling",
		},
	}
}

func agentPackages() []agentPackage {
	return []agentPackage{
		{
			ID:      "openclaw",
			Name:    "OpenClaw",
			Tagline: "A popular open agent runtime, ready for an isolated cloud computer.",
			Description: "A self-hosted OpenClaw computer with Node.js and the OpenClaw CLI. " +
				"Deploy first, then add a model key and channel credentials whenever you are ready.",
			Category: "general agent",
			UseCases: []string{"personal assistant", "tool-using agent", "chat channels", "always-on automation"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl xz-utils && rm -rf /var/lib/apt/lists/*\n" +
				"RUN NODE_VERSION=24.15.0 && DEB_ARCH=$(dpkg --print-architecture) && case \"$DEB_ARCH\" in amd64) NODE_ARCH=x64 ;; arm64) NODE_ARCH=arm64 ;; *) echo \"unsupported architecture: $DEB_ARCH\" >&2; exit 1 ;; esac && NODE_TARBALL=node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz && curl -fsSLO https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL} && curl -fsSLO https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt && grep \" ${NODE_TARBALL}$\" SHASUMS256.txt | sha256sum -c - && tar -xJf ${NODE_TARBALL} -C /usr/local --strip-components=1 && rm -f ${NODE_TARBALL} SHASUMS256.txt && node --version && npm --version\n" +
				"RUN npm install -g openclaw\n",
			DefaultCommand: "/bin/bash",
			DefaultModel:   "anthropic/claude-sonnet-4-5",
			RequiredSecret: "ANTHROPIC_API_KEY",
			SourceURL:      "https://github.com/openclaw/openclaw",
			License:        "MIT",
		},
		{
			ID:      "claude-code",
			Name:    "Claude Code",
			Tagline: "Anthropic's agentic coding CLI in an isolated sandbox.",
			Description: "Runs Claude Code non-interactively or over SSH inside the sandbox. " +
				"Give it a repository in /workspace and prompts through exec.",
			Category: "coding",
			UseCases: []string{"autonomous coding", "refactoring", "test writing", "repo Q&A", "code review"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm && rm -rf /var/lib/apt/lists/*\n" +
				"RUN npm install -g @anthropic-ai/claude-code\n",
			DefaultModel:   "anthropic/claude-sonnet-4-5",
			RequiredSecret: "ANTHROPIC_API_KEY",
			SourceURL:      "https://github.com/anthropics/claude-code",
			License:        "Anthropic Commercial Terms",
		},
		{
			ID:      "aider",
			Name:    "Aider",
			Tagline: "Open-source AI pair programmer that edits code in git.",
			Description: "aider-chat installed against the sandbox Python runtime. " +
				"Point it at a git repository in /workspace.",
			Category: "coding",
			UseCases: []string{"pair programming", "git-native edits", "bug fixing", "commit hygiene"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends python3-pip && rm -rf /var/lib/apt/lists/*\n" +
				"RUN python3 -m pip install --break-system-packages --ignore-installed --no-cache-dir aider-chat\n",
			DefaultModel:   "anthropic/claude-sonnet-4-5",
			RequiredSecret: "ANTHROPIC_API_KEY",
			SourceURL:      "https://github.com/Aider-AI/aider",
			License:        "Apache-2.0",
		},
		{
			ID:      "open-interpreter",
			Name:    "Open Interpreter",
			Tagline: "Natural-language computer control and data analysis.",
			Description: "Lets a model run Python/shell in the sandbox to analyze data, " +
				"convert files, and automate local tasks.",
			Category: "automation",
			UseCases: []string{"data analysis", "file conversion", "scripting", "report generation"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends python3-pip && rm -rf /var/lib/apt/lists/*\n" +
				"RUN python3 -m pip install --break-system-packages --ignore-installed --no-cache-dir open-interpreter\n",
			DefaultModel:   "openai/gpt-4.1",
			RequiredSecret: "OPENAI_API_KEY",
			SourceURL:      "https://github.com/OpenInterpreter/open-interpreter",
			License:        "AGPL-3.0",
		},
		{
			ID:      "crewai",
			Name:    "CrewAI",
			Tagline: "Multi-agent crews for role-based orchestration.",
			Description: "CrewAI runtime for orchestrating research/writer/reviewer style " +
				"agent teams from a single sandbox.",
			Category: "multi-agent",
			UseCases: []string{"research crews", "content production", "multi-agent coordination"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends python3-pip && rm -rf /var/lib/apt/lists/*\n" +
				"RUN python3 -m pip install --break-system-packages --ignore-installed --no-cache-dir crewai\n",
			DefaultModel:   "openai/gpt-4.1",
			RequiredSecret: "OPENAI_API_KEY",
			SourceURL:      "https://github.com/crewAIInc/crewAI",
			License:        "MIT",
		},
		{
			ID:      "browser-use",
			Name:    "Browser Use",
			Tagline: "Web browsing and form automation with a headless Chromium.",
			Description: "browser-use with Playwright Chromium preinstalled for scraping, " +
				"form filling, and site monitoring. Large image.",
			Category: "web automation",
			UseCases: []string{"web scraping", "form automation", "site monitoring", "QA flows"},
			Definition: "FROM agentpop/devbox:local\n" +
				"RUN apt-get update && apt-get install -y --no-install-recommends python3-pip && rm -rf /var/lib/apt/lists/*\n" +
				"RUN python3 -m pip install --break-system-packages --ignore-installed --no-cache-dir browser-use playwright\n" +
				"RUN python3 -m playwright install --with-deps chromium\n",
			DefaultModel:   "anthropic/claude-sonnet-4-5",
			RequiredSecret: "ANTHROPIC_API_KEY",
			SourceURL:      "https://github.com/browser-use/browser-use",
			License:        "MIT",
			HeavyBuild:     true,
		},
	}
}

func imageCredentials(pkg agentPackage) []imageCredential {
	if pkg.RequiredSecret == "" {
		return []imageCredential{}
	}
	provider := strings.ToLower(strings.TrimSuffix(pkg.RequiredSecret, "_API_KEY"))
	return []imageCredential{{
		Name: pkg.RequiredSecret, Label: strings.ReplaceAll(pkg.RequiredSecret, "_", " "),
		Provider: provider, Required: false,
		Description: "Optional at deploy time. Add or rotate it later without rebuilding the image.",
	}}
}

func imageFiles(pkg agentPackage) []imageFile {
	manifest := "apiVersion: agentpop.cloud/v1\nkind: Image\nmetadata:\n  name: " + pkg.ID +
		"\nspec:\n  type: " + pkg.Kind + "\n  lifecycle:\n    - persistent\n    - ephemeral\n"
	if pkg.DefaultCommand != "" {
		manifest += "  defaultCommand: " + pkg.DefaultCommand + "\n"
	}
	readme := "# " + pkg.Name + "\n\n" + pkg.Tagline + "\n\n" + pkg.Description +
		"\n\n## Build\n\n```sh\ndocker build -t agentpop/" + pkg.ID + ":local .\n```\n\n" +
		"Secrets are excluded from the image. Configure them when deploying or later through the dashboard, API, SDK, CLI, or MCP server.\n"
	return []imageFile{
		{Path: "Dockerfile", Language: "dockerfile", Content: pkg.Definition},
		{Path: "agentpop.yaml", Language: "yaml", Content: manifest},
		{Path: "README.md", Language: "markdown", Content: readme},
	}
}

func allPackages() []agentPackage {
	packages := agentPackages()
	for i := range packages {
		if packages[i].Kind == "" {
			packages[i].Kind = "agent"
		}
	}
	return append(packages, sandboxImages()...)
}

func findAgentPackage(id string) (agentPackage, bool) {
	for _, pkg := range allPackages() {
		if pkg.ID == id {
			return pkg, true
		}
	}
	return agentPackage{}, false
}

// agentPackageWire merges the static package with its live install state,
// which is simply the state of the template that carries the package name.
func (s *server) agentPackageWire(pkg agentPackage) map[string]any {
	wire := map[string]any{
		"id":                 pkg.ID,
		"kind":               pkg.Kind,
		"name":               pkg.Name,
		"tagline":            pkg.Tagline,
		"description":        pkg.Description,
		"category":           pkg.Category,
		"useCases":           pkg.UseCases,
		"definition":         pkg.Definition,
		"defaultModel":       pkg.DefaultModel,
		"requiredSecret":     pkg.RequiredSecret,
		"credentials":        imageCredentials(pkg),
		"requiredConnectors": pkg.RequiredConnectors,
		"files":              imageFiles(pkg),
		"defaultCommand":     pkg.DefaultCommand,
		"persistenceModes":   []string{"persistent", "ephemeral"},
		"programmable":       true,
		"forkable":           true,
		"sourceUrl":          pkg.SourceURL,
		"license":            pkg.License,
		"heavyBuild":         pkg.HeavyBuild,
		"installed":          false,
		"installState":       "not-installed",
		"selfHost":           "Save the definition as a Dockerfile (base image: build images/devbox first) and `docker build -t " + pkg.ID + " .`, or install it here to build a managed immutable image.",
	}
	if template, ok := s.store.GetTemplateByName(pkg.ID); ok {
		state := string(template.Status)
		if template.Deprecated {
			state = "deprecated"
		}
		wire["installState"] = state
		wire["installed"] = template.Status == model.TemplateStatusReady && !template.Deprecated
		wire["templateId"] = template.ID
		wire["imageRef"] = template.ImageRef
		wire["sizeMb"] = template.SizeMB
		wire["latestBuildId"] = template.LatestBuildID
	}
	return wire
}

func (s *server) listAgentCatalog(w http.ResponseWriter, _ *http.Request) {
	s.listCatalogKind(w, "agent")
}

func (s *server) listSandboxCatalog(w http.ResponseWriter, _ *http.Request) {
	s.listCatalogKind(w, "sandbox")
}

func (s *server) listCatalogKind(w http.ResponseWriter, kind string) {
	items := make([]map[string]any, 0)
	for _, pkg := range allPackages() {
		if pkg.Kind == kind {
			items = append(items, s.agentPackageWire(pkg))
		}
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *server) getAgentPackage(w http.ResponseWriter, r *http.Request) {
	pkg, ok := findAgentPackage(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent package not found")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, s.agentPackageWire(pkg))
}

// forkImagePackage materializes a customer-owned, editable image definition
// from a curated image. The returned template can be changed, built, shared,
// and deployed through the same public APIs as any other image.
func (s *server) forkImagePackage(w http.ResponseWriter, r *http.Request) {
	pkg, ok := findAgentPackage(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "image not found")
		return
	}
	var req struct {
		Name       string `json:"name"`
		Definition string `json:"definition,omitempty"`
		Build      bool   `json:"build,omitempty"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if !templateNamePattern.MatchString(req.Name) {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "image name must use lowercase letters, digits, and hyphens (max 32 characters)")
		return
	}
	if _, exists := s.store.GetTemplateByName(req.Name); exists {
		apiutil.WriteError(w, http.StatusConflict, "image_exists", "an image with this name already exists")
		return
	}
	definition := strings.TrimSpace(req.Definition)
	if definition == "" {
		definition = pkg.Definition
	}
	baseImage, steps, err := parseTemplateDefinition(definition)
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_definition", err.Error())
		return
	}
	architecture := ""
	if host, hostErr := s.runtime.HostInfo(r.Context()); hostErr == nil {
		architecture = host.Architecture
	}
	now := time.Now().UTC()
	template := model.Template{
		ID: apiutil.RandomID("tpl"), Name: req.Name,
		Description: "Fork of " + pkg.Name, Source: "custom",
		Status: model.TemplateStatusDraft, Architecture: architecture,
		BaseImage: baseImage, Steps: steps, Definition: definition,
		CreatedAt: now, UpdatedAt: now,
	}
	if err := s.store.UpsertTemplate(template); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("image.fork", template.ID, "ok", map[string]any{"sourceImage": pkg.ID, "name": template.Name})
	if req.Build {
		build, buildErr := s.enqueueTemplateBuild(template)
		if buildErr != nil {
			apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", buildErr.Error())
			return
		}
		apiutil.WriteJSON(w, http.StatusAccepted, map[string]any{"image": templateWire(template, 0), "build": build})
		return
	}
	apiutil.WriteJSON(w, http.StatusCreated, templateWire(template, 0))
}

// installAgentPackage is idempotent: it creates the backing template on first
// use and starts a real build unless one already succeeded or is running.
func (s *server) installAgentPackage(w http.ResponseWriter, r *http.Request) {
	pkg, ok := findAgentPackage(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent package not found")
		return
	}
	template, exists := s.store.GetTemplateByName(pkg.ID)
	if !exists {
		baseImage, steps, err := parseTemplateDefinition(pkg.Definition)
		if err != nil {
			apiutil.WriteError(w, http.StatusInternalServerError, "invalid_package_definition", err.Error())
			return
		}
		architecture := ""
		if host, hostErr := s.runtime.HostInfo(r.Context()); hostErr == nil {
			architecture = host.Architecture
		}
		now := time.Now().UTC()
		template = model.Template{
			ID:           apiutil.RandomID("tpl"),
			Name:         pkg.ID,
			Description:  pkg.Tagline,
			Source:       "custom",
			Status:       model.TemplateStatusDraft,
			Architecture: architecture,
			BaseImage:    baseImage,
			Steps:        steps,
			Definition:   pkg.Definition,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		if err := s.store.UpsertTemplate(template); err != nil {
			apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
			return
		}
		_ = s.audit("template.create", template.ID, "ok", map[string]any{"name": template.Name, "package": pkg.ID})
	}
	if template.Deprecated {
		apiutil.WriteError(w, http.StatusConflict, "template_deprecated", "restore the package template before reinstalling")
		return
	}
	if template.Status == model.TemplateStatusReady {
		apiutil.WriteJSON(w, http.StatusOK, s.agentPackageWire(pkg))
		return
	}
	for _, existing := range s.store.ListTemplateBuilds(template.ID) {
		if existing.Status == model.TemplateBuildQueued || existing.Status == model.TemplateBuildRunning {
			apiutil.WriteJSON(w, http.StatusAccepted, s.agentPackageWire(pkg))
			return
		}
	}
	build, err := s.enqueueTemplateBuild(template)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("template.build", template.ID, "ok", map[string]any{"buildId": build.ID, "package": pkg.ID})
	wire := s.agentPackageWire(pkg)
	wire["latestBuildId"] = build.ID
	apiutil.WriteJSON(w, http.StatusAccepted, wire)
}

// enqueueTemplateBuild persists a queued build, marks the template building,
// and starts the asynchronous build worker.
func (s *server) enqueueTemplateBuild(template model.Template) (model.TemplateBuild, error) {
	now := time.Now().UTC()
	build := model.TemplateBuild{
		ID:           apiutil.RandomID("tbd"),
		TemplateID:   template.ID,
		TemplateName: template.Name,
		Version:      template.Version + 1,
		Status:       model.TemplateBuildQueued,
		BaseImage:    template.BaseImage,
		Steps:        append([]string(nil), template.Steps...),
		Logs: []model.TemplateBuildLogEntry{{
			At: now, Stream: "system", Line: fmt.Sprintf("build queued for template %s (base image %s, %d steps)", template.Name, template.BaseImage, len(template.Steps)),
		}},
		CreatedAt: now,
	}
	if err := s.store.UpsertTemplateBuild(build); err != nil {
		return model.TemplateBuild{}, err
	}
	template.Status = model.TemplateStatusBuilding
	template.LatestBuildID = build.ID
	template.Error = ""
	template.UpdatedAt = now
	if err := s.store.UpsertTemplate(template); err != nil {
		return model.TemplateBuild{}, err
	}
	go s.runTemplateBuild(template.ID, build.ID)
	return build, nil
}
