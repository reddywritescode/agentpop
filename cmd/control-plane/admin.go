package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	goruntime "runtime"
	"strings"
	"time"

	"github.com/reddywritescode/agentpop/internal/adminauth"
	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

type adminContextKey struct{}

func configureAdmin(mode string) (*adminauth.Manager, error) {
	email := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
	password := os.Getenv("ADMIN_PASSWORD")
	passwordHash := strings.TrimSpace(os.Getenv("ADMIN_PASSWORD_SHA256"))
	secret := os.Getenv("ADMIN_SESSION_SECRET")

	if mode == "local" {
		if email == "" {
			email = "owner@agentpop.local"
		}
		if password == "" && passwordHash == "" {
			password = "agentpop-local-owner"
		}
		if secret == "" {
			secret = "agentpop-local-session-secret-change-me"
		}
	} else {
		missing := make([]string, 0, 3)
		if email == "" {
			missing = append(missing, "ADMIN_EMAIL")
		}
		if password == "" && passwordHash == "" {
			missing = append(missing, "ADMIN_PASSWORD_SHA256")
		}
		if secret == "" {
			missing = append(missing, "ADMIN_SESSION_SECRET")
		}
		if len(missing) > 0 {
			return nil, errors.New("hosted mode requires explicit " + strings.Join(missing, ", "))
		}
	}
	return adminauth.New(email, password, passwordHash, secret, 12*time.Hour)
}

func (s *server) adminAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/private/v1/") || r.URL.Path == "/private/v1/auth/login" {
			next.ServeHTTP(w, r)
			return
		}
		token := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		claims, err := s.admin.Validate(token)
		if err != nil {
			apiutil.WriteError(w, http.StatusUnauthorized, "owner_session_required", "valid owner session required")
			return
		}
		ctx := context.WithValue(r.Context(), adminContextKey{}, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *server) adminLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if !s.admin.Authenticate(req.Email, req.Password) {
		apiutil.WriteError(w, http.StatusUnauthorized, "invalid_credentials", "invalid owner credentials")
		return
	}
	token, claims, err := s.admin.Issue()
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "session_issue_failed", err.Error())
		return
	}
	_ = s.auditAs("operator.login", "operator", claims.Subject, "ok", nil)
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"token":     token,
		"expiresAt": time.Unix(claims.ExpiresAt, 0).UTC(),
		"owner": map[string]string{
			"email": claims.Subject,
			"role":  claims.Role,
		},
	})
}

func (s *server) adminSession(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(adminContextKey{}).(adminauth.Claims)
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"email":     claims.Subject,
		"role":      claims.Role,
		"expiresAt": time.Unix(claims.ExpiresAt, 0).UTC(),
	})
}

func (s *server) adminLogout(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(adminContextKey{}).(adminauth.Claims)
	_ = s.auditAs("operator.logout", "operator", claims.Subject, "ok", nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) adminOverview(w http.ResponseWriter, r *http.Request) {
	sandboxes := s.store.ListSandboxes()
	agents := s.store.ListAgents()
	audit := s.store.ListAudit()
	statuses := map[model.SandboxStatus]int{}
	var allocatedVCPU float64
	var allocatedMemory int64
	for _, sandbox := range sandboxes {
		statuses[sandbox.Status]++
		if sandbox.Status == model.StatusRunning || sandbox.Status == model.StatusPaused {
			allocatedVCPU += sandbox.VCPU
			allocatedMemory += sandbox.MemoryMB
		}
	}
	host, hostErr := s.runtime.HostInfo(r.Context())
	runtimes, runtimeErr := s.runtime.List(r.Context())
	operator := s.store.OperatorState()
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"version":          version,
		"mode":             s.mode,
		"uptimeSeconds":    int64(time.Since(s.startedAt).Seconds()),
		"desiredSandboxes": len(sandboxes),
		"runtimeSandboxes": len(runtimes),
		"agents":           len(agents),
		"auditEvents":      len(audit),
		"statuses":         statuses,
		"allocated": map[string]any{
			"vcpu":     allocatedVCPU,
			"memoryMb": allocatedMemory,
		},
		"resources": map[string]any{
			"networks":             len(s.store.ListNetworks()),
			"storages":             len(s.store.ListStorages()),
			"webhooks":             len(s.store.ListWebhooks()),
			"connectorConnections": len(s.store.ListConnectorConnections()),
			"apiKeys":              len(s.store.ListAPIKeys()),
			"quotaRequests":        len(s.store.ListQuotaRequests()),
		},
		"host":          host,
		"hostError":     errorString(hostErr),
		"runtimeError":  errorString(runtimeErr),
		"draining":      operator.DrainingHosts[host.ID],
		"lastReconcile": operator.LastReconcile,
		"updatedAt":     time.Now().UTC(),
	})
}

func (s *server) adminControlPlane(w http.ResponseWriter, r *http.Request) {
	var memory goruntime.MemStats
	goruntime.ReadMemStats(&memory)
	host, hostErr := s.runtime.HostInfo(r.Context())
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"name":          "AgentPop control plane",
		"version":       version,
		"mode":          s.mode,
		"healthy":       hostErr == nil && host.Healthy,
		"startedAt":     s.startedAt,
		"uptimeSeconds": int64(time.Since(s.startedAt).Seconds()),
		"process": map[string]any{
			"pid":        os.Getpid(),
			"goVersion":  goruntime.Version(),
			"goroutines": goruntime.NumGoroutine(),
			"heapBytes":  memory.HeapAlloc,
			"sysBytes":   memory.Sys,
		},
		"components": []map[string]any{
			{"name": "HTTP API", "health": "healthy", "detail": "Public /v1 and private /private/v1 routers"},
			{"name": "State store", "health": "healthy", "detail": s.store.Path()},
			{"name": "Host agent", "health": healthLabel(hostErr == nil && host.Healthy), "detail": safeEndpoint(s.hostAgentURL)},
			{"name": "Lifecycle worker", "health": "healthy", "detail": "Idle-pause and TTL reconciliation every 5 seconds"},
			{"name": "Secret store", "health": "healthy", "detail": "AES-GCM encrypted connector, storage, and webhook material"},
			{"name": "Owner auth", "health": "healthy", "detail": "HMAC-SHA256 signed 12-hour sessions"},
		},
		"updatedAt": time.Now().UTC(),
	})
}

func (s *server) adminDataPlaneHosts(w http.ResponseWriter, r *http.Request) {
	host, err := s.runtime.HostInfo(r.Context())
	if err != nil {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "data_plane_unavailable", err.Error())
		return
	}
	operator := s.store.OperatorState()
	runtimes, runtimeErr := s.runtime.List(r.Context())
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"items": []map[string]any{{
			"id": host.ID, "name": host.Name, "region": host.Region, "driver": host.Driver,
			"os": host.OS, "architecture": host.Architecture, "healthy": host.Healthy,
			"kvmAvailable": host.KVMAvailable, "firecrackerVersion": host.FirecrackerVersion,
			"message": host.Message, "sshCommand": host.SSHCommand, "capacity": host.Capacity,
			"updatedAt": host.UpdatedAt, "draining": operator.DrainingHosts[host.ID],
			"runtimeSandboxes": len(runtimes), "runtimeError": errorString(runtimeErr),
		}},
	})
}

func (s *server) adminRuntimeSandboxes(w http.ResponseWriter, r *http.Request) {
	items, err := s.runtime.List(r.Context())
	if err != nil {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "data_plane_unavailable", err.Error())
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *server) adminDrainHost(w http.ResponseWriter, r *http.Request) {
	host, err := s.runtime.HostInfo(r.Context())
	if err != nil {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "data_plane_unavailable", err.Error())
		return
	}
	if r.PathValue("id") != host.ID {
		apiutil.WriteError(w, http.StatusNotFound, "host_not_found", "data-plane host not found")
		return
	}
	var req struct {
		Draining bool `json:"draining"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if err := s.store.SetHostDraining(host.ID, req.Draining); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.adminAuditEvent(r, "host.drain", host.ID, "ok", map[string]any{"draining": req.Draining})
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"id": host.ID, "draining": req.Draining, "updatedAt": time.Now().UTC(),
	})
}

func (s *server) adminReconcile(w http.ResponseWriter, r *http.Request) {
	desired := s.store.ListSandboxes()
	runtimeItems, err := s.runtime.List(r.Context())
	if err != nil {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "data_plane_unavailable", err.Error())
		return
	}
	runtimeByID := make(map[string]model.RuntimeSandbox, len(runtimeItems))
	for _, item := range runtimeItems {
		runtimeByID[item.ID] = item
	}
	desiredByID := make(map[string]bool, len(desired))
	repaired := 0
	recovered := make([]string, 0)
	recoveryFailed := make(map[string]string)
	missing := make([]string, 0)
	for _, sandbox := range desired {
		desiredByID[sandbox.ID] = true
		item, ok := runtimeByID[sandbox.ID]
		if !ok {
			missing = append(missing, sandbox.ID)
			continue
		}
		recoveryAttempted := false
		// Reconcile is an explicit owner action. When a sandbox should be
		// running but its Firecracker process disappeared, ask the host agent
		// to restart the existing jailed rootfs instead of replacing its disk.
		if item.Status == model.StatusFailed && sandbox.DesiredStatus == model.StatusRunning {
			recoveryAttempted = true
			var recoveryErr error
			item, recoveryErr = s.recoverRuntimeSandbox(r.Context(), sandbox)
			if recoveryErr != nil {
				recoveryFailed[sandbox.ID] = recoveryErr.Error()
				sandbox.Status = model.StatusFailed
				sandbox.Error = recoveryErr.Error()
			} else {
				runtimeByID[sandbox.ID] = item
				recovered = append(recovered, sandbox.ID)
				sandbox.Error = ""
			}
		}
		if recoveryAttempted || sandbox.Status != item.Status || sandbox.Runtime == nil || sandbox.Observed != sandbox.Generation {
			sandbox.Runtime = &item
			sandbox.Status = item.Status
			sandbox.Observed = sandbox.Generation
			if _, failed := recoveryFailed[sandbox.ID]; !failed {
				sandbox.Error = ""
			}
			sandbox.UpdatedAt = time.Now().UTC()
			if err := s.store.UpsertSandbox(sandbox); err == nil {
				repaired++
			}
		}
	}
	orphaned := make([]string, 0)
	for _, item := range runtimeItems {
		// tplb-* sandboxes are transient template builders owned by the
		// control plane's build worker, not desired-state drift.
		if strings.HasPrefix(item.ID, "tplb-") {
			continue
		}
		if !desiredByID[item.ID] {
			orphaned = append(orphaned, item.ID)
		}
	}
	now := time.Now().UTC()
	_ = s.store.SetLastReconcile(now)
	result := "ok"
	if len(missing) > 0 || len(orphaned) > 0 || len(recoveryFailed) > 0 {
		result = "drift"
	}
	_ = s.adminAuditEvent(r, "platform.reconcile", "local", result, map[string]any{
		"repaired": repaired, "recovered": len(recovered), "recoveryFailed": len(recoveryFailed),
		"missing": len(missing), "orphaned": len(orphaned),
	})
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"result": result, "desired": len(desired), "runtime": len(runtimeItems),
		"repaired": repaired, "recoveredRuntime": recovered, "recoveryFailed": recoveryFailed,
		"missingRuntime": missing, "orphanedRuntime": orphaned,
		"completedAt": now,
	})
}

func (s *server) adminAudit(w http.ResponseWriter, _ *http.Request) {
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": s.store.ListAudit()})
}

func (s *server) adminOperations(w http.ResponseWriter, _ *http.Request) {
	audit := s.store.ListAudit()
	if len(audit) > 100 {
		audit = audit[:100]
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": audit})
}

func (s *server) adminConfig(w http.ResponseWriter, _ *http.Request) {
	operator := s.store.OperatorState()
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"mode":                      s.mode,
		"apiVersion":                "v1",
		"privateApiPrefix":          "/private/v1",
		"stateStore":                s.store.Path(),
		"hostAgentEndpoint":         safeEndpoint(s.hostAgentURL),
		"hostAgentAuthentication":   os.Getenv("HOST_AGENT_TOKEN") != "",
		"customerApiAuthentication": os.Getenv("CONTROL_PLANE_API_KEY") != "",
		"ownerEmail":                s.admin.Email(),
		"ownerSessionTtlHours":      12,
		"drainingHosts":             operator.DrainingHosts,
		"secretValuesExposed":       false,
	})
}

func (s *server) adminAuditEvent(r *http.Request, action, resourceID, result string, metadata map[string]any) error {
	claims, _ := r.Context().Value(adminContextKey{}).(adminauth.Claims)
	return s.auditAs(action, resourceID, claims.Subject, result, metadata)
}

func (s *server) auditAs(action, resourceID, actor, result string, metadata map[string]any) error {
	return s.store.AppendAudit(model.AuditEvent{
		ID: apiutil.RandomID("evt"), Action: action, Actor: "owner:" + actor,
		Resource: strings.Split(action, ".")[0], ResourceID: resourceID,
		Result: result, Metadata: metadata, CreatedAt: time.Now().UTC(),
	})
}

func healthLabel(healthy bool) string {
	if healthy {
		return "healthy"
	}
	return "error"
}

func safeEndpoint(value string) string {
	if value == "" {
		return ""
	}
	// Hostnames and ports are useful to the operator. Query strings and fragments
	// can contain credentials and are deliberately stripped.
	if idx := strings.IndexAny(value, "?#"); idx >= 0 {
		value = value[:idx]
	}
	return value
}
