package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/reddywritescode/agentpop/internal/adminauth"
	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
	runtimeapi "github.com/reddywritescode/agentpop/internal/runtime"
	"github.com/reddywritescode/agentpop/internal/secretbox"
	"github.com/reddywritescode/agentpop/internal/state"
)

const version = "0.1.0"

var sandboxName = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,20}[a-z0-9])?$`)

type server struct {
	store        *state.Store
	runtime      *runtimeapi.Client
	hostAgentURL string
	mode         string
	idempotency  sync.Mutex
	metricsMu    sync.Mutex
	metrics      map[string]metricsPoint
	admin        *adminauth.Manager
	customers    *customerAuth
	secrets      *secretbox.Box
	connectors   *connectorBroker
	imagePlanner marketplaceImageGenerator
	startedAt    time.Time
}

func main() {
	logger := log.New(os.Stdout, "control-plane ", log.LstdFlags|log.LUTC)
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	statePath := env("CONTROL_PLANE_STATE", ".local/control-plane/state.json")
	store, err := state.Open(statePath)
	if err != nil {
		logger.Fatalf("open control-plane state: %v", err)
	}
	hostAgentURL := env("HOST_AGENT_URL", "http://127.0.0.1:9090")
	mode := env("CONTROL_PLANE_MODE", "local")
	if mode != "local" && os.Getenv("HOST_AGENT_TOKEN") == "" {
		logger.Fatal("HOST_AGENT_TOKEN is required outside local mode")
	}
	admin, err := configureAdmin(mode)
	if err != nil {
		logger.Fatalf("configure owner console: %v", err)
	}
	encryptionSecret := os.Getenv("CONTROL_PLANE_ENCRYPTION_KEY")
	if encryptionSecret == "" && mode == "local" {
		encryptionSecret = "agentpop-local-encryption-key"
	}
	secrets, err := secretbox.New(encryptionSecret)
	if err != nil {
		logger.Fatalf("configure credential encryption: %v", err)
	}
	srv := &server{
		store:        store,
		runtime:      runtimeapi.NewAuthenticatedClient(hostAgentURL, os.Getenv("HOST_AGENT_TOKEN")),
		hostAgentURL: hostAgentURL,
		mode:         mode,
		admin:        admin,
		customers:    newCustomerAuth(mode),
		secrets:      secrets,
		connectors: newConnectorBroker(
			os.Getenv("CONNECTOR_BROKER_URL"),
			os.Getenv("CONNECTOR_BROKER_TOKEN"),
		),
		imagePlanner: newMarketplaceImageGeneratorFromEnv(),
		startedAt:    time.Now().UTC(),
		metrics:      map[string]metricsPoint{},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", srv.index)
	mux.HandleFunc("GET /llms.txt", srv.llms)
	mux.HandleFunc("GET /healthz", srv.health)
	mux.HandleFunc("GET /v1/control-plane/status", srv.controlPlaneStatus)
	mux.HandleFunc("GET /v1/data-plane/hosts", srv.dataPlaneHosts)
	mux.HandleFunc("GET /v1/platform/health", srv.platformHealth)
	mux.HandleFunc("GET /preview/{id}/{port}/{path...}", srv.previewProxy)
	mux.HandleFunc("HEAD /preview/{id}/{port}/{path...}", srv.previewProxy)
	mux.HandleFunc("POST /preview/{id}/{port}/{path...}", srv.previewProxy)
	mux.HandleFunc("PUT /preview/{id}/{port}/{path...}", srv.previewProxy)
	mux.HandleFunc("PATCH /preview/{id}/{port}/{path...}", srv.previewProxy)
	mux.HandleFunc("DELETE /preview/{id}/{port}/{path...}", srv.previewProxy)
	mux.HandleFunc("GET /v1/auth/github/start", srv.customerAuthStartGitHub)
	mux.HandleFunc("GET /v1/auth/github/callback", srv.customerAuthCallbackGitHub)
	mux.HandleFunc("GET /v1/auth/session", srv.customerAuthSession)
	mux.HandleFunc("POST /v1/auth/logout", srv.customerAuthLogout)
	mux.HandleFunc("GET /v1/catalog", srv.catalog)
	mux.HandleFunc("GET /v1/marketplace", srv.listMarketplace)
	mux.HandleFunc("POST /v1/marketplace/generate", srv.generateMarketplaceRecipe)
	mux.HandleFunc("GET /v1/marketplace/{id}", srv.getAgentPackage)
	mux.HandleFunc("POST /v1/marketplace/{id}/install", srv.installAgentPackage)
	mux.HandleFunc("POST /v1/marketplace/{id}/deploy", srv.deployMarketplacePackage)
	// Images are the canonical API name. Marketplace routes remain stable
	// compatibility aliases for existing clients.
	mux.HandleFunc("GET /v1/images", srv.listMarketplace)
	mux.HandleFunc("POST /v1/images/generate", srv.generateMarketplaceRecipe)
	mux.HandleFunc("GET /v1/images/{id}", srv.getAgentPackage)
	mux.HandleFunc("POST /v1/images/{id}/build", srv.installAgentPackage)
	mux.HandleFunc("POST /v1/images/{id}/deploy", srv.deployMarketplacePackage)
	mux.HandleFunc("POST /v1/images/{id}/fork", srv.forkImagePackage)
	mux.HandleFunc("GET /v1/subscription", srv.subscription)
	mux.HandleFunc("POST /v1/subscription/checkout", srv.createSubscriptionCheckout)
	mux.HandleFunc("GET /v1/sandboxes", srv.listSandboxes)
	mux.HandleFunc("POST /v1/sandboxes", srv.createSandbox)
	mux.HandleFunc("GET /v1/sandboxes/{id}", srv.getSandbox)
	mux.HandleFunc("PATCH /v1/sandboxes/{id}", srv.updateSandbox)
	mux.HandleFunc("DELETE /v1/sandboxes/{id}", srv.destroySandbox)
	mux.HandleFunc("POST /v1/sandboxes/{action}", srv.sandboxColonAction)
	mux.HandleFunc("POST /v1/sandboxes/{id}/ports", srv.exposeSandboxPort)
	mux.HandleFunc("DELETE /v1/sandboxes/{id}/ports/{port}", srv.removeSandboxPort)
	mux.HandleFunc("POST /v1/sandboxes/{id}/exec", srv.execSandbox)
	mux.HandleFunc("GET /v1/sandboxes/{id}/logs", srv.sandboxLogs)
	mux.HandleFunc("GET /v1/sandboxes/{id}/secrets", srv.listSandboxSecrets)
	mux.HandleFunc("PUT /v1/sandboxes/{id}/secrets", srv.updateSandboxSecrets)
	mux.HandleFunc("DELETE /v1/sandboxes/{id}/secrets/{key}", srv.deleteSandboxSecret)
	mux.HandleFunc("GET /v1/sandboxes/{id}/files", srv.sandboxFiles)
	mux.HandleFunc("PUT /v1/sandboxes/{id}/files", srv.uploadSandboxFile)
	mux.HandleFunc("DELETE /v1/sandboxes/{id}/files", srv.deleteSandboxFile)
	mux.HandleFunc("POST /v1/sandboxes/{id}/directories", srv.createSandboxDirectory)
	mux.HandleFunc("GET /v1/sandboxes/{id}/metrics", srv.sandboxMetrics)
	mux.HandleFunc("GET /v1/sandboxes/{id}/events", srv.sandboxEvents)
	mux.HandleFunc("GET /v1/sandboxes/{id}/ssh", srv.sshSandbox)
	mux.HandleFunc("POST /v1/sandboxes/{id}/pause", srv.pauseSandbox)
	mux.HandleFunc("POST /v1/sandboxes/{id}/resume", srv.resumeSandbox)
	mux.HandleFunc("GET /v1/agents", srv.listAgents)
	mux.HandleFunc("POST /v1/agents", srv.createAgent)
	mux.HandleFunc("GET /v1/agent-catalog", srv.listAgentCatalog)
	mux.HandleFunc("GET /v1/agent-catalog/{id}", srv.getAgentPackage)
	mux.HandleFunc("POST /v1/agent-catalog/{id}/install", srv.installAgentPackage)
	mux.HandleFunc("GET /v1/sandbox-catalog", srv.listSandboxCatalog)
	mux.HandleFunc("GET /v1/sandbox-catalog/{id}", srv.getAgentPackage)
	mux.HandleFunc("POST /v1/sandbox-catalog/{id}/install", srv.installAgentPackage)
	mux.HandleFunc("DELETE /v1/agents/{name}", srv.deleteAgent)
	mux.HandleFunc("POST /v1/agents/{action}", srv.agentColonAction)
	mux.HandleFunc("GET /v1/agents/{name}/logs", srv.agentLogs)
	mux.HandleFunc("GET /v1/agents/{name}/secrets", srv.listAgentSecrets)
	mux.HandleFunc("PUT /v1/agents/{name}/secrets", srv.updateAgentSecrets)
	mux.HandleFunc("DELETE /v1/agents/{name}/secrets/{key}", srv.deleteAgentSecret)
	mux.HandleFunc("GET /v1/agents/{name}/eval-suites", srv.listAgentEvalSuites)
	mux.HandleFunc("POST /v1/agents/{name}/eval-suites", srv.createAgentEvalSuite)
	mux.HandleFunc("GET /v1/agents/{name}/eval-runs", srv.listAgentEvalRuns)
	mux.HandleFunc("GET /v1/eval-suites/{id}", srv.getEvalSuite)
	mux.HandleFunc("DELETE /v1/eval-suites/{id}", srv.deleteEvalSuite)
	mux.HandleFunc("GET /v1/eval-suites/{id}/runs", srv.listEvalSuiteRuns)
	mux.HandleFunc("POST /v1/eval-suites/{id}/runs", srv.createEvalRun)
	mux.HandleFunc("GET /v1/eval-runs/{id}", srv.getEvalRun)
	mux.HandleFunc("GET /v1/connectors", srv.listConnectors)
	mux.HandleFunc("GET /v1/connectors/catalog", srv.listConnectorCatalog)
	mux.HandleFunc("GET /v1/connectors/{id}/tools", srv.listConnectorTools)
	mux.HandleFunc("POST /v1/connectors/{id}/authorize", srv.authorizeConnector)
	mux.HandleFunc("GET /v1/connectors/composio/callback", srv.connectorCallback)
	mux.HandleFunc("POST /v1/connectors/{id}/tools/{tool}", srv.invokeConnector)
	mux.HandleFunc("POST /v1/connectors/{id}/connections", srv.connectConnector)
	mux.HandleFunc("PATCH /v1/connectors/{id}/connections", srv.updateConnector)
	mux.HandleFunc("DELETE /v1/connectors/{id}/connections", srv.disconnectConnector)
	mux.HandleFunc("GET /v1/templates", srv.listTemplates)
	mux.HandleFunc("POST /v1/templates", srv.createTemplate)
	mux.HandleFunc("GET /v1/templates/{id}", srv.getTemplate)
	mux.HandleFunc("DELETE /v1/templates/{id}", srv.deleteTemplate)
	mux.HandleFunc("POST /v1/templates/{id}/builds", srv.startTemplateBuild)
	mux.HandleFunc("GET /v1/templates/{id}/builds", srv.listTemplateBuilds)
	mux.HandleFunc("GET /v1/template-builds/{id}", srv.getTemplateBuild)
	mux.HandleFunc("GET /v1/template-builds/{id}/logs", srv.getTemplateBuildLogs)
	mux.HandleFunc("POST /v1/templates/{id}/deprecate", srv.deprecateTemplate)
	mux.HandleFunc("POST /v1/templates/{id}/restore", srv.restoreTemplate)
	mux.HandleFunc("GET /v1/networks", srv.listNetworks)
	mux.HandleFunc("POST /v1/networks", srv.createNetwork)
	mux.HandleFunc("DELETE /v1/networks/{id}", srv.deleteNetwork)
	mux.HandleFunc("POST /v1/networks/{id}/members", srv.attachNetworkSandbox)
	mux.HandleFunc("DELETE /v1/networks/{id}/members/{sandboxId}", srv.detachNetworkSandbox)
	mux.HandleFunc("GET /v1/storages", srv.listStorages)
	mux.HandleFunc("POST /v1/storages", srv.createStorage)
	mux.HandleFunc("DELETE /v1/storages/{id}", srv.deleteStorage)
	mux.HandleFunc("POST /v1/storages/{id}/attachments", srv.attachStorage)
	mux.HandleFunc("DELETE /v1/storages/{id}/attachments/{sandboxId}", srv.detachStorage)
	mux.HandleFunc("GET /v1/webhooks", srv.listWebhooks)
	mux.HandleFunc("POST /v1/webhooks", srv.createWebhook)
	mux.HandleFunc("DELETE /v1/webhooks/{id}", srv.deleteWebhook)
	mux.HandleFunc("POST /v1/webhooks/{id}/test", srv.testWebhook)
	mux.HandleFunc("GET /v1/audit-events", srv.listAudit)
	mux.HandleFunc("GET /v1/members", srv.listMembers)
	mux.HandleFunc("POST /v1/members", srv.inviteMember)
	mux.HandleFunc("PATCH /v1/members/{email}", srv.updateMember)
	mux.HandleFunc("DELETE /v1/members/{email}", srv.removeMember)
	mux.HandleFunc("GET /v1/api-keys", srv.listAPIKeys)
	mux.HandleFunc("POST /v1/api-keys", srv.createAPIKey)
	mux.HandleFunc("DELETE /v1/api-keys/{id}", srv.deleteAPIKey)
	mux.HandleFunc("GET /v1/usage", srv.usage)
	mux.HandleFunc("GET /v1/quotas", srv.quotas)
	mux.HandleFunc("POST /v1/quota-requests", srv.createQuotaRequest)
	mux.HandleFunc("POST /v1/billing/credits", srv.addCredits)
	mux.HandleFunc("GET /v1/project", srv.getProject)
	mux.HandleFunc("PATCH /v1/project", srv.updateProject)
	mux.HandleFunc("DELETE /v1/project", srv.deleteProject)
	mux.HandleFunc("POST /private/v1/auth/login", srv.adminLogin)
	mux.HandleFunc("GET /private/v1/auth/session", srv.adminSession)
	mux.HandleFunc("POST /private/v1/auth/logout", srv.adminLogout)
	mux.HandleFunc("GET /private/v1/overview", srv.adminOverview)
	mux.HandleFunc("GET /private/v1/control-plane", srv.adminControlPlane)
	mux.HandleFunc("GET /private/v1/data-plane/hosts", srv.adminDataPlaneHosts)
	mux.HandleFunc("GET /private/v1/data-plane/sandboxes", srv.adminRuntimeSandboxes)
	mux.HandleFunc("POST /private/v1/data-plane/hosts/{id}/drain", srv.adminDrainHost)
	mux.HandleFunc("POST /private/v1/reconcile", srv.adminReconcile)
	mux.HandleFunc("GET /private/v1/audit", srv.adminAudit)
	mux.HandleFunc("GET /private/v1/operations", srv.adminOperations)
	mux.HandleFunc("GET /private/v1/config", srv.adminConfig)

	addr := env("CONTROL_PLANE_ADDR", "127.0.0.1:8080")
	httpServer := &http.Server{
		Addr:              addr,
		Handler:           apiutil.RequestID(apiutil.CORS(srv.adminAuth(srv.customerAuth(mux)))),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       90 * time.Second,
	}
	go func() {
		logger.Printf("version=%s mode=%s listen=%s host_agent=%s", version, srv.mode, addr, hostAgentURL)
		if err := httpServer.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			logger.Fatalf("serve: %v", err)
		}
	}()
	go srv.runLifecycleWorker(ctx)

	<-ctx.Done()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = httpServer.Shutdown(shutdownCtx)
}

func (s *server) index(w http.ResponseWriter, _ *http.Request) {
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"name":    "AgentPop control plane",
		"version": version,
		"docs": map[string]string{
			"status":       "/v1/control-plane/status",
			"hosts":        "/v1/data-plane/hosts",
			"marketplace":  "/v1/marketplace",
			"sandboxes":    "/v1/sandboxes",
			"connectors":   "/v1/connectors",
			"subscription": "/v1/subscription",
			"openapi":      "/openapi.yaml",
		},
	})
}

func (s *server) llms(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = io.WriteString(w, `# AgentPop

AgentPop is an open-source control plane and Firecracker data plane for
isolated development environments and long-running cloud agents.

Runtime model: every deployment is a sandbox. Agent recipes use kind=agent;
environment recipes use kind=sandbox. The unified marketplace is the canonical
discovery and deployment surface.

Public API: https://api.agentpop.cloud
OpenAPI: https://agentpop.cloud/openapi.yaml
Source: https://github.com/reddywritescode/agentpop

Authentication: Authorization: Bearer $AGENTPOP_API_KEY
Idempotency: send Idempotency-Key on mutations

Core resources:
- GET /v1/marketplace?kind=agent|sandbox&q=...
- POST /v1/marketplace/generate
- POST /v1/marketplace/{id}/install
- POST /v1/marketplace/{id}/deploy
- GET/POST /v1/sandboxes
- GET/PATCH/DELETE /v1/sandboxes/{id}
- POST /v1/sandboxes/{id}/exec
- GET/PUT/DELETE /v1/sandboxes/{id}/files
- POST /v1/sandboxes/{id}/pause
- POST /v1/sandboxes/{id}/resume
- POST /v1/sandboxes/{id}:fork
- POST /v1/sandboxes/{id}/ports
- GET /v1/connectors
- GET/POST /v1/templates
- POST /v1/templates/{id}/builds
- GET /v1/template-builds/{id}/logs
- GET /v1/subscription
- POST /v1/subscription/checkout
- GET /v1/audit-events
- GET/POST /v1/api-keys

Developer surfaces:
- OpenAPI: /openapi.yaml
- MCP server: agentpop-mcp (stdio)
- CLI: agentpop
- TypeScript, Python, and Go SDKs
`)
}

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	host, err := s.runtime.HostInfo(r.Context())
	status := http.StatusOK
	if err != nil || !host.Healthy {
		status = http.StatusServiceUnavailable
	}
	apiutil.WriteJSON(w, status, map[string]any{
		"healthy": status == http.StatusOK,
		"version": version,
	})
}

func (s *server) controlPlaneStatus(w http.ResponseWriter, r *http.Request) {
	sandboxes := s.store.ListSandboxes()
	running := 0
	for _, sb := range sandboxes {
		if sb.Status == model.StatusRunning {
			running++
		}
	}
	hosts := []model.HostInfo{}
	healthy := true
	if host, err := s.runtime.HostInfo(r.Context()); err == nil {
		hosts = append(hosts, host)
		healthy = host.Healthy
	} else {
		healthy = false
	}
	apiutil.WriteJSON(w, http.StatusOK, model.ControlPlaneStatus{
		Name:          "AgentPop",
		Version:       version,
		Mode:          s.mode,
		API:           valueOr(os.Getenv("PUBLIC_API_URL"), "http://"+r.Host),
		StateStore:    s.store.Path(),
		HostAgentURL:  s.hostAgentURL,
		Healthy:       healthy,
		SandboxCount:  len(sandboxes),
		RunningCount:  running,
		DataPlaneHost: hosts,
		UpdatedAt:     time.Now().UTC(),
	})
}

func valueOr(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimRight(value, "/")
}

func (s *server) dataPlaneHosts(w http.ResponseWriter, r *http.Request) {
	host, err := s.runtime.HostInfo(r.Context())
	if err != nil {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "data_plane_unavailable", err.Error())
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": []model.HostInfo{host}})
}

func (s *server) platformHealth(w http.ResponseWriter, r *http.Request) {
	host, err := s.runtime.HostInfo(r.Context())
	healthy := err == nil && host.Healthy
	sandboxes := s.store.ListSandboxes()
	running := 0
	var allocatedVCPU float64
	var allocatedMemory int64
	for _, sb := range sandboxes {
		if sb.Status == model.StatusRunning {
			running++
			allocatedVCPU += sb.VCPU
			allocatedMemory += sb.MemoryMB
		}
	}
	serviceHealth := "healthy"
	detail := "Desired state, API, audit, and runtime reconciliation are available."
	if !healthy {
		serviceHealth = "error"
		detail = errorString(err)
	}
	memoryTotal := host.Capacity.MemoryMB
	if memoryTotal == 0 {
		memoryTotal = 8192
	}
	capacity := 40
	if host.Driver == "docker" {
		capacity = 8
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"controlPlane": []map[string]any{
			{"name": "Control-plane API", "mode": "api", "health": serviceHealth, "instances": 1, "detail": detail, "latencyMs": 1},
			{"name": "Lifecycle reconciler", "mode": "scheduler", "health": serviceHealth, "instances": 1, "detail": "Synchronous local reconciler; split worker mode is the hosted deployment target."},
			{"name": "State store", "mode": "datastore", "health": "healthy", "instances": 1, "detail": s.store.Path()},
		},
		"dataPlane": []map[string]any{
			{
				"id": host.ID, "region": host.Region, "az": host.Region,
				"instance": host.Driver + "/" + host.Architecture,
				"health":   serviceHealth, "draining": false,
				"vcpuTotal": host.Capacity.CPUCores, "vcpuUsed": allocatedVCPU,
				"memTotalGiB": float64(memoryTotal) / 1024, "memUsedGiB": float64(allocatedMemory) / 1024,
				"sandboxes": running, "sandboxCap": capacity, "heartbeat": "now",
			},
		},
		"capacity": map[string]any{
			"region": host.Region, "activeSandboxes": running, "sandboxCap": capacity,
			"hostsUp": boolInt(healthy), "hostsTotal": 1,
			"createP95Ms": 0, "execFirstByteP95Ms": 0, "apiAvailability": 100,
		},
	})
}

func (s *server) catalog(w http.ResponseWriter, _ *http.Request) {
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"sizes": []map[string]string{
			{"id": "s-0.25vcpu-512mb", "cpu": "0.25 vCPU", "ram": "512 MiB"},
			{"id": "s-0.5vcpu-1gb", "cpu": "0.5 vCPU", "ram": "1 GiB"},
			{"id": "s-1vcpu-1gb", "cpu": "1 vCPU", "ram": "1 GiB"},
			{"id": "s-2vcpu-4gb", "cpu": "2 vCPU", "ram": "4 GiB"},
		},
		"events": []string{
			"sandbox.create", "sandbox.destroy", "sandbox.pause", "sandbox.resume",
			"agent.create", "agent.secrets.update", "agent.secrets.delete",
			"eval_suite.create", "eval_suite.delete", "eval_run.complete",
			"template.create", "template.build", "template.build.succeeded",
			"template.build.failed", "template.deprecate", "template.restore",
		},
		"scopes": []string{"sandbox:read", "sandbox:write", "sandbox:exec", "agent:read", "agent:write", "connector:read", "connector:invoke", "audit:read", "project:admin"},
		"roles":  []string{"Owner", "Admin", "Developer", "Operator", "Viewer"},
		"org":    map[string]string{"name": "Local organization", "project": "local"},
	})
}

func (s *server) listSandboxes(w http.ResponseWriter, _ *http.Request) {
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": s.store.ListSandboxes()})
}

func (s *server) createSandbox(w http.ResponseWriter, r *http.Request) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(idempotencyKey) > 200 {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_idempotency_key", "Idempotency-Key must not exceed 200 characters")
		return
	}
	if idempotencyKey != "" {
		s.idempotency.Lock()
		defer s.idempotency.Unlock()
		stateKey := "sandbox.create:" + idempotencyKey
		if id, ok := s.store.GetIdempotency(stateKey); ok {
			if sb, exists := s.store.GetSandbox(id); exists {
				w.Header().Set("Idempotent-Replayed", "true")
				apiutil.WriteJSON(w, http.StatusOK, sb)
				return
			}
		}
	}
	var req model.CreateSandboxRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	sb, err := s.provisionSandbox(r.Context(), req)
	if err != nil {
		if errors.Is(err, errTemplateConflict) {
			apiutil.WriteError(w, http.StatusConflict, "template_unusable", err.Error())
			return
		}
		apiutil.WriteError(w, http.StatusInternalServerError, "sandbox_create_failed", err.Error())
		return
	}
	if idempotencyKey != "" {
		if err := s.store.PutIdempotency("sandbox.create:"+idempotencyKey, sb.ID); err != nil {
			apiutil.WriteError(w, http.StatusInternalServerError, "idempotency_write_failed", err.Error())
			return
		}
	}
	apiutil.WriteJSON(w, http.StatusCreated, sb)
}

func (s *server) provisionSandbox(ctx context.Context, req model.CreateSandboxRequest) (model.Sandbox, error) {
	applySandboxDefaults(&req)
	if !sandboxName.MatchString(req.Name) {
		return model.Sandbox{}, errors.New("name must use lowercase letters, digits, and hyphens and be at most 22 characters")
	}
	resolvedImage, err := s.resolveSandboxImage(req.Image)
	if err != nil {
		return model.Sandbox{}, err
	}
	req.Image = resolvedImage
	if host, err := s.runtime.HostInfo(ctx); err == nil && s.store.OperatorState().DrainingHosts[host.ID] {
		return model.Sandbox{}, errors.New("data-plane host is draining; new sandbox scheduling is disabled")
	}
	now := time.Now().UTC()
	sb := model.Sandbox{
		ID:             apiutil.RandomID("sb"),
		ProjectID:      req.ProjectID,
		Name:           req.Name,
		Kind:           valueOr(req.Kind, "sandbox"),
		RecipeID:       req.RecipeID,
		Status:         model.StatusProvisioning,
		DesiredStatus:  model.StatusRunning,
		Generation:     1,
		Image:          req.Image,
		Region:         req.Region,
		VCPU:           req.VCPU,
		MemoryMB:       req.MemoryMB,
		DiskGB:         req.DiskGB,
		PublicWeb:      req.PublicWeb,
		Lifecycle:      req.Lifecycle,
		PauseWhenIdle:  req.PauseWhenIdle,
		IdleTimeoutSec: req.IdleTimeoutSec,
		TTLSeconds:     req.TTLSeconds,
		AllowedEgress:  append([]string(nil), req.AllowedEgress...),
		Environment:    cloneMap(req.Environment),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	secrets := mergeStringMaps(req.SecretEnvironment, req.Secrets)
	if len(secrets) > 0 {
		normalized, normalizeErr := normalizeAgentSecrets(secrets)
		if normalizeErr != nil {
			return model.Sandbox{}, normalizeErr
		}
		secrets = normalized
		encrypted, sealErr := s.sealAgentSecrets(secrets)
		if sealErr != nil {
			return model.Sandbox{}, sealErr
		}
		sb.SecretNames = sortedSecretNames(secrets)
		sb.SecretsUpdatedAt = now
		if secretErr := s.store.SetSandboxSecrets(sb.ID, encrypted); secretErr != nil {
			return model.Sandbox{}, secretErr
		}
	}
	if err := s.store.UpsertSandbox(sb); err != nil {
		return model.Sandbox{}, err
	}
	runtimeSB, err := s.runtime.Create(ctx, model.RuntimeCreateRequest{
		ID:            sb.ID,
		Name:          sb.Name,
		Image:         sb.Image,
		VCPU:          sb.VCPU,
		MemoryMB:      sb.MemoryMB,
		DiskGB:        sb.DiskGB,
		AllowedEgress: sb.AllowedEgress,
		Environment:   sb.Environment,
		Secrets:       secrets,
	})
	if err != nil {
		sb.Status = model.StatusFailed
		sb.Error = err.Error()
		sb.UpdatedAt = time.Now().UTC()
		_ = s.store.UpsertSandbox(sb)
		_ = s.audit("sandbox.create", sb.ID, "error", map[string]any{"error": err.Error()})
		return sb, err
	}
	host, hostErr := s.runtime.HostInfo(ctx)
	if hostErr == nil {
		sb.HostID = host.ID
		decorateRuntimeSSH(&runtimeSB, host)
	}
	sb.Runtime = &runtimeSB
	sb.Status = runtimeSB.Status
	sb.Observed = sb.Generation
	sb.UpdatedAt = time.Now().UTC()
	if err := s.store.UpsertSandbox(sb); err != nil {
		return model.Sandbox{}, err
	}
	_ = s.audit("sandbox.create", sb.ID, "ok", map[string]any{"driver": runtimeSB.Driver, "hostId": sb.HostID})
	return sb, nil
}

func (s *server) recoverRuntimeSandbox(ctx context.Context, sandbox model.Sandbox) (model.RuntimeSandbox, error) {
	secrets, err := s.openSandboxSecrets(sandbox.ID)
	if err != nil {
		return model.RuntimeSandbox{}, err
	}
	var boundAgent *model.Agent
	for _, candidate := range s.store.ListAgents() {
		if candidate.SandboxID != sandbox.ID {
			continue
		}
		agent := candidate
		boundAgent = &agent
		agentSecrets, agentErr := s.openAgentSecrets(agent.ID)
		if agentErr != nil {
			return model.RuntimeSandbox{}, agentErr
		}
		for name, value := range agentSecrets {
			secrets[name] = value
		}
		break
	}
	runtimeSandbox, err := s.runtime.Create(ctx, model.RuntimeCreateRequest{
		ID:            sandbox.ID,
		Name:          sandbox.Name,
		Image:         sandbox.Image,
		VCPU:          sandbox.VCPU,
		MemoryMB:      sandbox.MemoryMB,
		DiskGB:        sandbox.DiskGB,
		AllowedEgress: append([]string(nil), sandbox.AllowedEgress...),
		Environment:   cloneMap(sandbox.Environment),
		Secrets:       cloneMap(secrets),
	})
	if err != nil {
		return model.RuntimeSandbox{}, err
	}
	if boundAgent != nil {
		if err := s.applyStoredAgentSecrets(ctx, boundAgent); err != nil {
			boundAgent.LastMessage = "Agent runtime recovered, but model credentials are pending application."
			boundAgent.UpdatedAt = time.Now().UTC()
			_ = s.store.UpsertAgent(*boundAgent)
		}
	}
	return runtimeSandbox, nil
}

func (s *server) getSandbox(w http.ResponseWriter, r *http.Request) {
	sb, ok := s.store.GetSandbox(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, sb)
}

func (s *server) execSandbox(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sb, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	if sb.Status != model.StatusRunning {
		apiutil.WriteError(w, http.StatusConflict, "invalid_state", "sandbox must be running")
		return
	}
	var req model.ExecRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if strings.TrimSpace(req.Command) == "" {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "command is required")
		return
	}
	result, err := s.runtime.Exec(r.Context(), id, req)
	s.recordSandboxExecLogs(id, req.Label, result, err)
	auditResult := "ok"
	if err != nil || result.ExitCode != 0 {
		auditResult = "error"
	}
	_ = s.audit("sandbox.exec", id, auditResult, map[string]any{
		"exitCode":   result.ExitCode,
		"durationMs": result.DurationMS,
	})
	if err != nil {
		apiutil.WriteError(w, http.StatusBadGateway, "runtime_exec_failed", err.Error())
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, result)
}

func (s *server) sandboxFiles(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Has("path") {
		s.downloadSandboxFile(w, r)
		return
	}
	id := r.PathValue("id")
	if _, ok := s.store.GetSandbox(id); !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	result, err := s.runtime.Exec(r.Context(), id, model.ExecRequest{
		Command: "find /workspace -mindepth 1 -maxdepth 1 -printf '%f\\t%y\\t%s\\t%TY-%Tm-%TdT%TH:%TM:%TSZ\\n' 2>/dev/null | sort",
	})
	if err != nil && result.ExitCode == 0 {
		apiutil.WriteError(w, http.StatusInternalServerError, "files_failed", err.Error())
		return
	}
	items := make([]map[string]any, 0)
	for _, line := range strings.Split(strings.TrimSpace(result.Stdout), "\n") {
		if line == "" {
			continue
		}
		fields := strings.SplitN(line, "\t", 4)
		if len(fields) != 4 {
			continue
		}
		size := fields[2] + " B"
		if fields[1] == "d" {
			size = "—"
		}
		items = append(items, map[string]any{
			"name": fields[0], "dir": fields[1] == "d", "size": size, "mtime": fields[3],
		})
	}
	apiutil.WriteJSON(w, http.StatusOK, items)
}

func (s *server) uploadSandboxFile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sb, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	if sb.Status != model.StatusRunning {
		apiutil.WriteError(w, http.StatusConflict, "invalid_state", "sandbox must be running")
		return
	}
	guestPath, err := runtimeapi.NormalizeGuestFilePath(r.URL.Query().Get("path"))
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_path", err.Error())
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 32<<20)
	data, err := io.ReadAll(r.Body)
	if err != nil {
		apiutil.WriteError(w, http.StatusRequestEntityTooLarge, "file_too_large", "file must not exceed 32 MiB")
		return
	}
	if err := s.runtime.WriteFile(r.Context(), id, guestPath, data); err != nil {
		_ = s.audit("sandbox.file.upload", id, "error", map[string]any{"path": guestPath})
		apiutil.WriteError(w, http.StatusInternalServerError, "file_write_failed", err.Error())
		return
	}
	_ = s.audit("sandbox.file.upload", id, "ok", map[string]any{"path": guestPath, "size": len(data)})
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) createSandboxDirectory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sb, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	if sb.Status != model.StatusRunning {
		apiutil.WriteError(w, http.StatusConflict, "invalid_state", "sandbox must be running")
		return
	}
	var req struct {
		Path string `json:"path"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	guestPath, err := runtimeapi.NormalizeGuestFilePath(req.Path)
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_path", err.Error())
		return
	}
	result, err := s.runtime.Exec(r.Context(), id, model.ExecRequest{Command: "mkdir -p -- " + shellQuote(guestPath)})
	if err != nil || result.ExitCode != 0 {
		apiutil.WriteError(w, http.StatusInternalServerError, "directory_create_failed", firstNonEmpty(result.Stderr, errorString(err)))
		return
	}
	_ = s.audit("sandbox.directory.create", id, "ok", map[string]any{"path": guestPath})
	apiutil.WriteJSON(w, http.StatusCreated, map[string]string{"path": guestPath})
}

func (s *server) deleteSandboxFile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sb, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	if sb.Status != model.StatusRunning {
		apiutil.WriteError(w, http.StatusConflict, "invalid_state", "sandbox must be running")
		return
	}
	guestPath, err := runtimeapi.NormalizeGuestFilePath(r.URL.Query().Get("path"))
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_path", err.Error())
		return
	}
	result, err := s.runtime.Exec(r.Context(), id, model.ExecRequest{Command: "rm -rf -- " + shellQuote(guestPath)})
	if err != nil || result.ExitCode != 0 {
		apiutil.WriteError(w, http.StatusInternalServerError, "file_delete_failed", firstNonEmpty(result.Stderr, errorString(err)))
		return
	}
	_ = s.audit("sandbox.file.delete", id, "ok", map[string]any{"path": guestPath})
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) sandboxMetrics(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sb, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	if sb.Status != model.StatusRunning {
		apiutil.WriteError(w, http.StatusConflict, "invalid_state", "sandbox must be running")
		return
	}
	command := `mem_total_kib=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo); mem_avail_kib=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo); mem_used_bytes=$(((mem_total_kib-mem_avail_kib)*1024)); mem_total_bytes=$((mem_total_kib*1024)); if [ -r /sys/fs/cgroup/memory.current ]; then mem_used_bytes=$(cat /sys/fs/cgroup/memory.current); fi; if [ -r /sys/fs/cgroup/memory.max ]; then cgroup_max=$(cat /sys/fs/cgroup/memory.max); if [ "$cgroup_max" != "max" ]; then mem_total_bytes=$cgroup_max; fi; fi; cpu_usec=$(awk '/^usage_usec / {print $2}' /sys/fs/cgroup/cpu.stat 2>/dev/null); cpu_usec=${cpu_usec:-0}; load=$(awk '{print $1}' /proc/loadavg); disk=$(df -k /workspace | awk 'NR==2 {print $3" "$2}'); net=$(awk -F'[: ]+' 'NR>2 && $1!="lo" {rx+=$3; tx+=$11} END {print rx+0" "tx+0}' /proc/net/dev); procs=$(find /proc -maxdepth 1 -type d -name '[0-9]*' | wc -l); set -- $disk $net; printf '{"cpuLoad":%s,"cpuUsageUsec":%s,"memoryUsedBytes":%s,"memoryTotalBytes":%s,"diskUsedKib":%s,"diskTotalKib":%s,"networkRxBytes":%s,"networkTxBytes":%s,"processCount":%s}\n' "$load" "$cpu_usec" "$mem_used_bytes" "$mem_total_bytes" "$1" "$2" "$3" "$4" "$procs"`
	result, err := s.runtime.Exec(r.Context(), id, model.ExecRequest{Command: command, TimeoutSeconds: 10})
	if err != nil || result.ExitCode != 0 {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "metrics_unavailable", firstNonEmpty(result.Stderr, errorString(err)))
		return
	}
	var sample struct {
		CPULoad          float64 `json:"cpuLoad"`
		CPUUsageUsec     float64 `json:"cpuUsageUsec"`
		MemoryUsedBytes  float64 `json:"memoryUsedBytes"`
		MemoryTotalBytes float64 `json:"memoryTotalBytes"`
		DiskUsedKiB      float64 `json:"diskUsedKib"`
		DiskTotalKiB     float64 `json:"diskTotalKib"`
		NetworkRxBytes   float64 `json:"networkRxBytes"`
		NetworkTxBytes   float64 `json:"networkTxBytes"`
		ProcessCount     int     `json:"processCount"`
	}
	if err := json.Unmarshal([]byte(strings.TrimSpace(result.Stdout)), &sample); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "metrics_decode_failed", err.Error())
		return
	}
	now := time.Now().UTC()
	cpuPercent := 0.0
	s.metricsMu.Lock()
	if previous, exists := s.metrics[id]; exists && now.After(previous.at) && sample.CPUUsageUsec >= previous.cpuUsageUsec {
		usedSeconds := (sample.CPUUsageUsec - previous.cpuUsageUsec) / 1_000_000
		cpuPercent = usedSeconds / now.Sub(previous.at).Seconds() / sb.VCPU * 100
	}
	s.metrics[id] = metricsPoint{cpuUsageUsec: sample.CPUUsageUsec, at: now}
	s.metricsMu.Unlock()
	if cpuPercent > 100 {
		cpuPercent = 100
	}
	metrics := model.SandboxMetrics{
		CPULoad:        sample.CPULoad,
		CPUPercent:     cpuPercent,
		MemoryUsedMB:   sample.MemoryUsedBytes / 1024 / 1024,
		MemoryTotalMB:  sample.MemoryTotalBytes / 1024 / 1024,
		DiskUsedMB:     sample.DiskUsedKiB / 1024,
		DiskTotalMB:    sample.DiskTotalKiB / 1024,
		NetworkRxBytes: sample.NetworkRxBytes,
		NetworkTxBytes: sample.NetworkTxBytes,
		ProcessCount:   sample.ProcessCount,
		SampledAt:      now,
	}
	apiutil.WriteJSON(w, http.StatusOK, metrics)
}

func (s *server) sandboxEvents(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sb, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	items := make([]model.AuditEvent, 0)
	for _, event := range s.store.ListAudit() {
		if event.ResourceID == id {
			items = append(items, event)
		}
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"sandbox": map[string]any{
			"id": sb.ID, "status": sb.Status, "generation": sb.Generation,
			"observedGeneration": sb.Observed, "updatedAt": sb.UpdatedAt,
		},
	})
}

func (s *server) downloadSandboxFile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sb, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	if sb.Status != model.StatusRunning {
		apiutil.WriteError(w, http.StatusConflict, "invalid_state", "sandbox must be running")
		return
	}
	guestPath, err := runtimeapi.NormalizeGuestFilePath(r.URL.Query().Get("path"))
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_path", err.Error())
		return
	}
	data, err := s.runtime.ReadFile(r.Context(), id, guestPath)
	if err != nil {
		_ = s.audit("sandbox.file.download", id, "error", map[string]any{"path": guestPath})
		apiutil.WriteError(w, http.StatusInternalServerError, "file_read_failed", err.Error())
		return
	}
	_ = s.audit("sandbox.file.download", id, "ok", map[string]any{"path": guestPath, "size": len(data)})
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", "attachment; filename="+strconv.Quote(pathBase(guestPath)))
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func pathBase(value string) string {
	if idx := strings.LastIndex(value, "/"); idx >= 0 {
		return value[idx+1:]
	}
	return value
}

func (s *server) sshSandbox(w http.ResponseWriter, r *http.Request) {
	sb, ok := s.store.GetSandbox(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	if sb.Runtime == nil || sb.Runtime.SSH == nil {
		apiutil.WriteError(w, http.StatusConflict, "ssh_unavailable", "SSH is not available for this sandbox")
		return
	}
	access := *sb.Runtime.SSH
	if host, err := s.runtime.HostInfo(r.Context()); err == nil {
		decorateSSH(&access, host)
	}
	apiutil.WriteJSON(w, http.StatusOK, access)
}

func (s *server) pauseSandbox(w http.ResponseWriter, r *http.Request) {
	s.lifecycle(w, r, model.StatusPausing, model.StatusPaused, s.runtime.Pause, "sandbox.pause")
}

func (s *server) resumeSandbox(w http.ResponseWriter, r *http.Request) {
	s.lifecycle(w, r, model.StatusResuming, model.StatusRunning, s.runtime.Resume, "sandbox.resume")
}

func (s *server) lifecycle(
	w http.ResponseWriter,
	r *http.Request,
	transitional model.SandboxStatus,
	target model.SandboxStatus,
	action func(context.Context, string) (model.RuntimeSandbox, error),
	auditAction string,
) {
	id := r.PathValue("id")
	sb, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	sb.Status = transitional
	sb.DesiredStatus = target
	sb.Generation++
	sb.UpdatedAt = time.Now().UTC()
	_ = s.store.UpsertSandbox(sb)
	runtimeSB, err := action(r.Context(), id)
	if err != nil && target == model.StatusRunning {
		if current, inspectErr := s.runtime.Inspect(r.Context(), id); inspectErr == nil && current.Status == model.StatusFailed {
			runtimeSB, err = s.recoverRuntimeSandbox(r.Context(), sb)
		}
	}
	if err != nil {
		sb.Status = model.StatusFailed
		sb.Error = err.Error()
		sb.UpdatedAt = time.Now().UTC()
		_ = s.store.UpsertSandbox(sb)
		_ = s.audit(auditAction, id, "error", map[string]any{"error": err.Error()})
		apiutil.WriteError(w, http.StatusInternalServerError, "runtime_action_failed", err.Error())
		return
	}
	if host, hostErr := s.runtime.HostInfo(r.Context()); hostErr == nil {
		decorateRuntimeSSH(&runtimeSB, host)
	}
	sb.Status = target
	sb.Runtime = &runtimeSB
	sb.Observed = sb.Generation
	sb.Error = ""
	sb.UpdatedAt = time.Now().UTC()
	_ = s.store.UpsertSandbox(sb)
	_ = s.audit(auditAction, id, "ok", nil)
	apiutil.WriteJSON(w, http.StatusOK, sb)
}

func (s *server) destroySandbox(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sb, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	sb.Status = model.StatusDeleting
	sb.DesiredStatus = model.StatusDeleted
	sb.Generation++
	sb.UpdatedAt = time.Now().UTC()
	_ = s.store.UpsertSandbox(sb)
	if err := s.runtime.Destroy(r.Context(), id); err != nil {
		sb.Status = model.StatusFailed
		sb.Error = err.Error()
		sb.UpdatedAt = time.Now().UTC()
		_ = s.store.UpsertSandbox(sb)
		_ = s.audit("sandbox.destroy", id, "error", map[string]any{"error": err.Error()})
		apiutil.WriteError(w, http.StatusInternalServerError, "runtime_destroy_failed", err.Error())
		return
	}
	if err := s.store.DeleteSandbox(id); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("sandbox.destroy", id, "ok", nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) listAgents(w http.ResponseWriter, _ *http.Request) {
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": s.store.ListAgents()})
}

func (s *server) createAgent(w http.ResponseWriter, r *http.Request) {
	var req model.CreateAgentRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if !sandboxName.MatchString(req.Name) {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "agent name must use lowercase letters, digits, and hyphens")
		return
	}
	if req.Template == "" {
		req.Template = "openclaw-compatible"
	}
	if req.Model == "" {
		req.Model = "provider/model"
	}
	normalizedConnectors := make([]string, 0, len(req.Connectors))
	for _, connectorID := range req.Connectors {
		connectorID = normalizeConnectorID(connectorID)
		connection, connected := s.store.GetConnectorConnection(connectorID)
		if !connected || connection.Status != "success" {
			apiutil.WriteError(w, http.StatusConflict, "connector_not_connected", "agent connector is not connected: "+connectorID)
			return
		}
		if !containsString(normalizedConnectors, connectorID) {
			normalizedConnectors = append(normalizedConnectors, connectorID)
		}
	}
	req.Connectors = normalizedConnectors
	agentSecrets, err := normalizeAgentSecrets(req.Secrets)
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_secrets", err.Error())
		return
	}
	encryptedSecrets, err := s.sealAgentSecrets(agentSecrets)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "secret_encryption_failed", err.Error())
		return
	}
	agentImage := env("AGENT_RUNTIME_IMAGE", "agentpop/devbox:local")
	if template, ok := s.store.GetTemplateByName(req.Template); ok {
		if template.Deprecated {
			apiutil.WriteError(w, http.StatusConflict, "template_deprecated", "agent template is deprecated: "+template.Name)
			return
		}
		if template.Status != model.TemplateStatusReady || template.ImageRef == "" {
			apiutil.WriteError(w, http.StatusConflict, "template_not_built", "agent template has no successful build: "+template.Name)
			return
		}
		agentImage = template.ImageRef
	}
	sbReq := model.CreateSandboxRequest{
		Name:              truncate(req.Name+"-vm", 22),
		Image:             agentImage,
		Region:            "local",
		VCPU:              req.VCPU,
		MemoryMB:          req.MemoryMB,
		DiskGB:            req.DiskGB,
		Environment:       req.Environment,
		SecretEnvironment: agentSecrets,
	}
	sb, err := s.provisionSandbox(r.Context(), sbReq)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "agent_sandbox_failed", err.Error())
		return
	}
	now := time.Now().UTC()
	agent := model.Agent{
		ID:          apiutil.RandomID("agt"),
		Name:        req.Name,
		Status:      "running",
		SandboxID:   sb.ID,
		Template:    req.Template,
		Model:       req.Model,
		Connectors:  append([]string(nil), req.Connectors...),
		SecretNames: sortedSecretNames(agentSecrets),
		CreatedAt:   now,
		UpdatedAt:   now,
		LastMessage: "Managed sandbox is running; connector grants are evaluated by the control plane.",
	}
	if len(agentSecrets) > 0 {
		agent.SecretsGeneration = 1
		agent.AppliedSecretsGeneration = 1
		agent.SecretsUpdatedAt = now
		agent.LastMessage = "Managed sandbox is running with customer-supplied, write-only model credentials."
	}
	if err := s.store.UpdateAgentAndSecrets(agent, encryptedSecrets); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("agent.create", agent.ID, "ok", map[string]any{
		"sandboxId":   sb.ID,
		"secretNames": agent.SecretNames,
	})
	apiutil.WriteJSON(w, http.StatusCreated, agent)
}

func (s *server) listAudit(w http.ResponseWriter, _ *http.Request) {
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": s.store.ListAudit()})
}

func (s *server) usage(w http.ResponseWriter, _ *http.Request) {
	active := 0
	for _, sb := range s.store.ListSandboxes() {
		if sb.Status == model.StatusRunning {
			active++
		}
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"credits": s.store.Credits(), "plan": "Community",
		"meters": []map[string]any{
			{"label": "Active sandboxes", "used": strconv.Itoa(active), "pct": min(active*10, 100), "cost": 0, "unit": "current"},
			{"label": "Storage", "used": "0", "pct": 0, "cost": 0, "unit": "GiB-hour"},
			{"label": "Egress", "used": "0", "pct": 0, "cost": 0, "unit": "GiB"},
		},
	})
}

func (s *server) quotas(w http.ResponseWriter, _ *http.Request) {
	apiutil.WriteJSON(w, http.StatusOK, []map[string]any{
		{"label": "Running sandboxes", "used": len(s.store.ListSandboxes()), "cap": 8, "note": "Local compatibility data plane"},
		{"label": "vCPU per sandbox", "used": 1, "cap": 16, "unit": "vCPU"},
		{"label": "Memory per sandbox", "used": 1, "cap": 32, "unit": "GiB"},
	})
}

func (s *server) audit(action, resourceID, result string, metadata map[string]any) error {
	event := model.AuditEvent{
		ID:         apiutil.RandomID("evt"),
		Action:     action,
		Actor:      "local:developer",
		Resource:   strings.Split(action, ".")[0],
		ResourceID: resourceID,
		Result:     result,
		Metadata:   metadata,
		CreatedAt:  time.Now().UTC(),
	}
	if err := s.store.AppendAudit(event); err != nil {
		return err
	}
	for _, webhook := range s.store.ListWebhooks() {
		if webhook.Status == "disabled" || !containsEvent(webhook.Events, action) {
			continue
		}
		webhook := webhook
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			_, err := s.deliverWebhook(ctx, webhook, event)
			if err != nil {
				webhook.Status = "failing"
				webhook.Last = err.Error()
			} else {
				webhook.Status = "active"
				webhook.Last = "delivered now"
			}
			webhook.UpdatedAt = time.Now().UTC()
			_ = s.store.UpsertWebhook(webhook)
		}()
	}
	return nil
}

func containsEvent(events []string, action string) bool {
	for _, event := range events {
		if event == "*" || event == action {
			return true
		}
	}
	return false
}

func applySandboxDefaults(req *model.CreateSandboxRequest) {
	if req.Name == "" {
		req.Name = "sandbox-" + apiutil.RandomID("x")[2:8]
	}
	if req.ProjectID == "" {
		req.ProjectID = "local"
	}
	if req.Image == "" {
		req.Image = "agentpop/devbox:local"
	}
	if req.Region == "" {
		req.Region = "local"
	}
	if req.VCPU <= 0 {
		req.VCPU = 1
	}
	if req.MemoryMB <= 0 {
		req.MemoryMB = 1024
	}
	if req.DiskGB <= 0 {
		req.DiskGB = 10
	}
	switch strings.ToLower(strings.TrimSpace(req.Lifecycle)) {
	case "", "persistent":
		req.Lifecycle = "persistent"
	case "ephemeral":
		req.Lifecycle = "ephemeral"
		if req.TTLSeconds <= 0 {
			req.TTLSeconds = 3600
		}
	default:
		// Invalid lifecycle values are normalized to the safest non-expiring
		// mode. Public handlers and SDKs only expose the two valid choices.
		req.Lifecycle = "persistent"
	}
	if req.MemoryMB < 256 || req.MemoryMB > 32768 {
		req.MemoryMB = 1024
	}
	if req.VCPU < 0.25 || req.VCPU > 16 {
		req.VCPU = 1
	}
}

func cloneMap(src map[string]string) map[string]string {
	if src == nil {
		return nil
	}
	dst := make(map[string]string, len(src))
	for key, value := range src {
		dst[key] = value
	}
	return dst
}

func mergeStringMaps(sources ...map[string]string) map[string]string {
	var merged map[string]string
	for _, source := range sources {
		if len(source) == 0 {
			continue
		}
		if merged == nil {
			merged = make(map[string]string)
		}
		for key, value := range source {
			merged[key] = value
		}
	}
	return merged
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return strings.TrimRight(value[:max], "-")
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

func decorateRuntimeSSH(runtimeSB *model.RuntimeSandbox, host model.HostInfo) {
	if runtimeSB.SSH != nil {
		decorateSSH(runtimeSB.SSH, host)
	}
}

func decorateSSH(access *model.SSHAccess, host model.HostInfo) {
	if host.SSHCommand == "" || access.HostCommand != "" {
		return
	}
	access.HostCommand = access.Command
	quoted := shellQuote(access.HostCommand)
	if strings.Contains(host.SSHCommand, "{command}") {
		access.Command = strings.ReplaceAll(host.SSHCommand, "{command}", quoted)
		return
	}
	access.Command = host.SSHCommand + " --command " + quoted
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return "runtime operation failed"
}

type metricsPoint struct {
	cpuUsageUsec float64
	at           time.Time
}
