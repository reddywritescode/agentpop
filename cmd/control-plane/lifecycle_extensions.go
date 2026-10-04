package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

func (s *server) sandboxColonAction(w http.ResponseWriter, r *http.Request) {
	value := r.PathValue("action")
	id, action, found := strings.Cut(value, ":")
	if !found || action != "fork" || id == "" {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox action not found")
		return
	}
	r.SetPathValue("id", id)
	s.forkSandbox(w, r)
}

func (s *server) agentColonAction(w http.ResponseWriter, r *http.Request) {
	value := r.PathValue("action")
	name, action, found := strings.Cut(value, ":")
	if !found || name == "" {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent action not found")
		return
	}
	r.SetPathValue("name", name)
	switch action {
	case "stop":
		s.stopAgent(w, r)
	case "restart":
		s.restartAgent(w, r)
	default:
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent action not found")
	}
}

func (s *server) updateSandbox(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sandbox, ok := s.store.GetSandbox(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	previousVCPU, previousMemoryMB := sandbox.VCPU, sandbox.MemoryMB
	var req struct {
		Name           *string            `json:"name"`
		VCPU           *float64           `json:"vcpu"`
		MemoryMB       *int64             `json:"memoryMb"`
		PublicWeb      *bool              `json:"publicWeb"`
		PauseWhenIdle  *bool              `json:"pauseWhenIdle"`
		IdleTimeoutSec *int64             `json:"idleTimeoutSec"`
		TTLSeconds     *int64             `json:"ttlSeconds"`
		AllowedEgress  *[]string          `json:"allowedEgress"`
		Environment    *map[string]string `json:"environment"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if req.Name != nil {
		if !sandboxName.MatchString(*req.Name) {
			apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "name must use lowercase letters, digits, and hyphens")
			return
		}
		sandbox.Name = *req.Name
	}
	if req.VCPU != nil {
		if *req.VCPU < .25 || *req.VCPU > 16 {
			apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "vcpu must be between 0.25 and 16")
			return
		}
		sandbox.VCPU = *req.VCPU
	}
	if req.MemoryMB != nil {
		if *req.MemoryMB < 256 || *req.MemoryMB > 32768 {
			apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "memoryMb must be between 256 and 32768")
			return
		}
		sandbox.MemoryMB = *req.MemoryMB
	}
	if req.PublicWeb != nil {
		sandbox.PublicWeb = *req.PublicWeb
	}
	if req.PauseWhenIdle != nil {
		sandbox.PauseWhenIdle = *req.PauseWhenIdle
	}
	if req.IdleTimeoutSec != nil {
		sandbox.IdleTimeoutSec = *req.IdleTimeoutSec
	}
	if req.TTLSeconds != nil {
		sandbox.TTLSeconds = *req.TTLSeconds
	}
	if req.AllowedEgress != nil {
		sandbox.AllowedEgress = append([]string(nil), (*req.AllowedEgress)...)
	}
	if req.Environment != nil {
		sandbox.Environment = cloneMap(*req.Environment)
	}
	if sandbox.VCPU != previousVCPU || sandbox.MemoryMB != previousMemoryMB {
		runtimeSandbox, err := s.runtime.Update(r.Context(), id, model.RuntimeUpdateRequest{
			VCPU: sandbox.VCPU, MemoryMB: sandbox.MemoryMB,
		})
		if err != nil {
			apiutil.WriteError(w, http.StatusConflict, "runtime_update_failed", err.Error())
			return
		}
		sandbox.Runtime = &runtimeSandbox
	}
	sandbox.Generation++
	sandbox.Observed = sandbox.Generation
	sandbox.UpdatedAt = time.Now().UTC()
	if err := s.store.UpsertSandbox(sandbox); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("sandbox.update", id, "ok", nil)
	apiutil.WriteJSON(w, http.StatusOK, sandbox)
}

func (s *server) forkSandbox(w http.ResponseWriter, r *http.Request) {
	source, ok := s.store.GetSandbox(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	name := ""
	for index := 1; ; index++ {
		name = forkSandboxName(source.Name, index)
		conflict := false
		for _, existing := range s.store.ListSandboxes() {
			if existing.Name == name {
				conflict = true
				break
			}
		}
		if !conflict {
			break
		}
	}
	fork, err := s.provisionSandbox(r.Context(), model.CreateSandboxRequest{
		Name: name, ProjectID: source.ProjectID, Kind: source.Kind, RecipeID: source.RecipeID,
		Image: source.Image, Region: source.Region,
		VCPU: source.VCPU, MemoryMB: source.MemoryMB, DiskGB: source.DiskGB,
		PublicWeb: source.PublicWeb, Lifecycle: source.Lifecycle, PauseWhenIdle: source.PauseWhenIdle,
		IdleTimeoutSec: source.IdleTimeoutSec, TTLSeconds: source.TTLSeconds,
		AllowedEgress: append([]string(nil), source.AllowedEgress...),
		Environment:   cloneMap(source.Environment),
	})
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "sandbox_fork_failed", err.Error())
		return
	}
	// The local Docker compatibility plane can copy a normal-size workspace
	// through the runtime API. Firecracker's production path will replace this
	// transport with a filesystem snapshot/reflink.
	archive, archiveErr := s.runtime.Exec(r.Context(), source.ID, model.ExecRequest{
		Command:        "tar -C /workspace -czf /tmp/agentpop-fork.tgz . && base64 /tmp/agentpop-fork.tgz | tr -d '\\n'",
		TimeoutSeconds: 120,
	})
	copied := false
	if archiveErr == nil && archive.ExitCode == 0 && strings.TrimSpace(archive.Stdout) != "" && len(archive.Stdout) < 8<<20 {
		restore, restoreErr := s.runtime.Exec(r.Context(), fork.ID, model.ExecRequest{
			Command:        "printf '%s' '" + strings.TrimSpace(archive.Stdout) + "' | base64 -d > /tmp/agentpop-fork.tgz && tar -C /workspace -xzf /tmp/agentpop-fork.tgz",
			TimeoutSeconds: 120,
		})
		copied = restoreErr == nil && restore.ExitCode == 0
	}
	_ = s.audit("sandbox.fork", fork.ID, "ok", map[string]any{"sourceId": source.ID, "workspaceCopied": copied})
	apiutil.WriteJSON(w, http.StatusCreated, fork)
}

func forkSandboxName(source string, index int) string {
	suffix := "-fork"
	if index > 1 {
		suffix = fmt.Sprintf("-f%d", index)
	}
	maxBaseLength := 22 - len(suffix)
	base := strings.Trim(strings.TrimSpace(source), "-")
	if len(base) > maxBaseLength {
		base = base[:maxBaseLength]
	}
	base = strings.TrimRight(base, "-")
	if base == "" {
		base = "sandbox"
	}
	return truncate(base+suffix, 22)
}

func (s *server) exposeSandboxPort(w http.ResponseWriter, r *http.Request) {
	sandbox, ok := s.store.GetSandbox(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	if !sandbox.PublicWeb {
		apiutil.WriteError(w, http.StatusConflict, "public_web_disabled", "enable public web access for this sandbox before exposing a port")
		return
	}
	var req struct {
		Port int    `json:"port"`
		Mode string `json:"mode"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if req.Port < 1 || req.Port > 65535 {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_port", "port must be between 1 and 65535")
		return
	}
	switch req.Mode {
	case "", "public", "organization", "signed-link":
	default:
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_mode", "mode must be public, organization, or signed-link")
		return
	}
	if req.Mode == "" {
		req.Mode = "public"
	}
	for _, existing := range sandbox.Ports {
		if existing.Port == req.Port {
			apiutil.WriteError(w, http.StatusConflict, "already_exists", "port is already exposed")
			return
		}
	}
	previewBaseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("PUBLIC_PREVIEW_BASE_URL")), "/")
	if previewBaseURL == "" {
		previewBaseURL = "http://" + r.Host
		if s.mode != "local" {
			previewBaseURL = "https://preview.agentpop.cloud"
		}
	}
	publicURL := fmt.Sprintf("%s/preview/%s/%d/", previewBaseURL, sandbox.ID, req.Port)
	if req.Mode == "signed-link" {
		publicURL += "?token=" + strings.TrimPrefix(apiutil.RandomID("preview"), "preview-")
	}
	sandbox.Ports = append(sandbox.Ports, model.PreviewPort{Port: req.Port, Mode: req.Mode, URL: publicURL})
	sandbox.UpdatedAt = time.Now().UTC()
	if err := s.store.UpsertSandbox(sandbox); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("sandbox.port.expose", sandbox.ID, "ok", map[string]any{"port": req.Port, "mode": req.Mode})
	apiutil.WriteJSON(w, http.StatusOK, sandbox)
}

func (s *server) previewProxy(w http.ResponseWriter, r *http.Request) {
	sandbox, ok := s.store.GetSandbox(r.PathValue("id"))
	if !ok || sandbox.Status != model.StatusRunning {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "running sandbox not found")
		return
	}
	port, err := strconv.Atoi(r.PathValue("port"))
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_port", "invalid preview port")
		return
	}
	var preview *model.PreviewPort
	for index := range sandbox.Ports {
		if sandbox.Ports[index].Port == port {
			preview = &sandbox.Ports[index]
			break
		}
	}
	if preview == nil {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "port is not exposed")
		return
	}
	if preview.Mode == "signed-link" {
		expected, parseErr := url.Parse(preview.URL)
		if parseErr != nil || r.URL.Query().Get("token") == "" || r.URL.Query().Get("token") != expected.Query().Get("token") {
			apiutil.WriteError(w, http.StatusUnauthorized, "invalid_preview_token", "signed preview token is missing or invalid")
			return
		}
	}
	if preview.Mode == "organization" && !s.validCustomerAuthorization(r) {
		apiutil.WriteError(w, http.StatusUnauthorized, "authentication_required", "organization preview requires a valid API key")
		return
	}
	switch r.Method {
	case http.MethodGet, http.MethodHead, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
	default:
		apiutil.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "preview method is not supported")
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	target := "http://127.0.0.1:" + strconv.Itoa(port) + "/" + strings.TrimLeft(r.PathValue("path"), "/")
	if r.URL.RawQuery != "" {
		query := r.URL.Query()
		query.Del("token")
		if encoded := query.Encode(); encoded != "" {
			target += "?" + encoded
		}
	}
	command := "rm -f /tmp/ap-preview-h /tmp/ap-preview-b /tmp/ap-preview-in; "
	if len(body) > 0 {
		command += "printf '%s' " + shellQuote(base64.StdEncoding.EncodeToString(body)) + " | base64 -d > /tmp/ap-preview-in; "
	}
	command += "status=$(curl -sS --max-time 30 -D /tmp/ap-preview-h -o /tmp/ap-preview-b"
	command += " -X " + shellQuote(r.Method)
	if contentType := r.Header.Get("Content-Type"); contentType != "" {
		command += " -H " + shellQuote("Content-Type: "+contentType)
	}
	if len(body) > 0 {
		command += " --data-binary @/tmp/ap-preview-in"
	}
	command += " -w '%{http_code}' " + shellQuote(target) + "); "
	command += "printf 'APSTATUS:%s\\nAPHEADERS:' \"$status\"; base64 /tmp/ap-preview-h | tr -d '\\n'; printf '\\nAPBODY:'; base64 /tmp/ap-preview-b | tr -d '\\n'"
	result, execErr := s.runtime.Exec(r.Context(), sandbox.ID, model.ExecRequest{Command: command, TimeoutSeconds: 40})
	if execErr != nil || result.ExitCode != 0 {
		message := result.Stderr
		if execErr != nil {
			message = execErr.Error()
		}
		apiutil.WriteError(w, http.StatusBadGateway, "preview_unavailable", strings.TrimSpace(message))
		return
	}
	status, headers, responseBody, parseErr := parsePreviewResponse(result.Stdout)
	if parseErr != nil {
		apiutil.WriteError(w, http.StatusBadGateway, "invalid_preview_response", parseErr.Error())
		return
	}
	for key, values := range headers {
		if isHopByHopHeader(key) {
			continue
		}
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	w.Header().Set("X-AgentPop-Preview", sandbox.ID)
	w.WriteHeader(status)
	if r.Method != http.MethodHead {
		_, _ = w.Write(responseBody)
	}
}

func parsePreviewResponse(output string) (int, http.Header, []byte, error) {
	const statusPrefix = "APSTATUS:"
	const headersMarker = "\nAPHEADERS:"
	const bodyMarker = "\nAPBODY:"
	if !strings.HasPrefix(output, statusPrefix) {
		return 0, nil, nil, fmt.Errorf("missing preview status")
	}
	headerAt := strings.Index(output, headersMarker)
	bodyAt := strings.Index(output, bodyMarker)
	if headerAt < 0 || bodyAt < headerAt {
		return 0, nil, nil, fmt.Errorf("malformed preview envelope")
	}
	status, err := strconv.Atoi(strings.TrimSpace(output[len(statusPrefix):headerAt]))
	if err != nil || status < 100 || status > 599 {
		return 0, nil, nil, fmt.Errorf("invalid preview status")
	}
	rawHeaders, err := base64.StdEncoding.DecodeString(strings.TrimSpace(output[headerAt+len(headersMarker) : bodyAt]))
	if err != nil {
		return 0, nil, nil, fmt.Errorf("decode preview headers: %w", err)
	}
	responseBody, err := base64.StdEncoding.DecodeString(strings.TrimSpace(output[bodyAt+len(bodyMarker):]))
	if err != nil {
		return 0, nil, nil, fmt.Errorf("decode preview body: %w", err)
	}
	headers := http.Header{}
	lines := strings.Split(strings.ReplaceAll(string(rawHeaders), "\r\n", "\n"), "\n")
	for _, line := range lines {
		if line == "" || strings.HasPrefix(line, "HTTP/") {
			continue
		}
		key, value, found := strings.Cut(line, ":")
		if found {
			headers.Add(strings.TrimSpace(key), strings.TrimSpace(value))
		}
	}
	return status, headers, responseBody, nil
}

func isHopByHopHeader(name string) bool {
	switch strings.ToLower(name) {
	case "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "content-length":
		return true
	default:
		return false
	}
}

func (s *server) removeSandboxPort(w http.ResponseWriter, r *http.Request) {
	sandbox, ok := s.store.GetSandbox(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	port, err := strconv.Atoi(r.PathValue("port"))
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_port", "port must be a number")
		return
	}
	out := sandbox.Ports[:0]
	for _, preview := range sandbox.Ports {
		if preview.Port != port {
			out = append(out, preview)
		}
	}
	sandbox.Ports = out
	sandbox.UpdatedAt = time.Now().UTC()
	if err := s.store.UpsertSandbox(sandbox); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("sandbox.port.remove", sandbox.ID, "ok", map[string]any{"port": port})
	apiutil.WriteJSON(w, http.StatusOK, sandbox)
}

func (s *server) stopAgent(w http.ResponseWriter, r *http.Request) {
	agent, ok := s.store.GetAgentByName(r.PathValue("name"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent not found")
		return
	}
	if _, err := s.runtime.Pause(r.Context(), agent.SandboxID); err != nil {
		apiutil.WriteError(w, http.StatusBadGateway, "runtime_pause_failed", err.Error())
		return
	}
	if sandbox, exists := s.store.GetSandbox(agent.SandboxID); exists {
		sandbox.Status = model.StatusPaused
		sandbox.DesiredStatus = model.StatusPaused
		sandbox.UpdatedAt = time.Now().UTC()
		_ = s.store.UpsertSandbox(sandbox)
	}
	agent.Status = "stopped"
	agent.LastMessage = "Agent sandbox paused by user."
	agent.UpdatedAt = time.Now().UTC()
	_ = s.store.UpsertAgent(agent)
	_ = s.audit("agent.stop", agent.ID, "ok", map[string]any{"sandboxId": agent.SandboxID})
	apiutil.WriteJSON(w, http.StatusOK, agent)
}

func (s *server) restartAgent(w http.ResponseWriter, r *http.Request) {
	agent, ok := s.store.GetAgentByName(r.PathValue("name"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent not found")
		return
	}
	sandbox, exists := s.store.GetSandbox(agent.SandboxID)
	if !exists {
		apiutil.WriteError(w, http.StatusConflict, "sandbox_missing", "agent sandbox no longer exists")
		return
	}
	var runtimeSandbox model.RuntimeSandbox
	var err error
	if sandbox.Status == model.StatusPaused {
		runtimeSandbox, err = s.runtime.Resume(r.Context(), agent.SandboxID)
	} else {
		_, err = s.runtime.Exec(r.Context(), agent.SandboxID, model.ExecRequest{Command: "true", TimeoutSeconds: 10})
		if err == nil && sandbox.Runtime != nil {
			runtimeSandbox = *sandbox.Runtime
		}
	}
	if err != nil {
		if current, inspectErr := s.runtime.Inspect(r.Context(), agent.SandboxID); inspectErr == nil && current.Status == model.StatusFailed {
			runtimeSandbox, err = s.recoverRuntimeSandbox(r.Context(), sandbox)
		}
	}
	if err != nil {
		apiutil.WriteError(w, http.StatusBadGateway, "runtime_restart_failed", err.Error())
		return
	}
	if err := s.applyStoredAgentSecrets(r.Context(), &agent); err != nil {
		agent.LastMessage = "Agent runtime resumed, but model credentials are still pending application."
		agent.UpdatedAt = time.Now().UTC()
		_ = s.store.UpsertAgent(agent)
		apiutil.WriteError(w, http.StatusBadGateway, "agent_secrets_apply_failed", err.Error())
		return
	}
	sandbox.Status = model.StatusRunning
	sandbox.DesiredStatus = model.StatusRunning
	sandbox.Runtime = &runtimeSandbox
	sandbox.UpdatedAt = time.Now().UTC()
	_ = s.store.UpsertSandbox(sandbox)
	agent.Status = "running"
	agent.LastMessage = "Agent sandbox restarted and health probe succeeded."
	agent.UpdatedAt = time.Now().UTC()
	_ = s.store.UpsertAgent(agent)
	_ = s.audit("agent.restart", agent.ID, "ok", map[string]any{"sandboxId": agent.SandboxID})
	apiutil.WriteJSON(w, http.StatusOK, agent)
}

func (s *server) agentLogs(w http.ResponseWriter, r *http.Request) {
	agent, ok := s.store.GetAgentByName(r.PathValue("name"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent not found")
		return
	}
	lines := []string{fmt.Sprintf("%s agent=%s sandbox=%s status=%s", agent.CreatedAt.Format(time.RFC3339), agent.Name, agent.SandboxID, agent.Status)}
	for _, entry := range s.combinedSandboxLogs(agent.SandboxID, maxSandboxLogLimit) {
		lines = append(lines, fmt.Sprintf("%s [%s/%s] %s", entry.CreatedAt.Format(time.RFC3339), entry.Source, entry.Stream, entry.Message))
	}
	events := s.store.ListAudit()
	for _, event := range events {
		if event.ResourceID == agent.ID {
			lines = append(lines, fmt.Sprintf("%s %s result=%s", event.CreatedAt.Format(time.RFC3339), event.Action, event.Result))
		}
	}
	if agent.LastMessage != "" {
		lines = append(lines, time.Now().UTC().Format(time.RFC3339)+" "+agent.LastMessage)
	}
	apiutil.WriteJSON(w, http.StatusOK, lines)
}

func (s *server) runLifecycleWorker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			s.enforceLifecyclePolicies(ctx, now.UTC())
		}
	}
}

func (s *server) enforceLifecyclePolicies(ctx context.Context, now time.Time) {
	latestActivity := map[string]time.Time{}
	for _, event := range s.store.ListAudit() {
		if _, exists := latestActivity[event.ResourceID]; !exists {
			latestActivity[event.ResourceID] = event.CreatedAt
		}
	}
	for _, sandbox := range s.store.ListSandboxes() {
		if sandbox.TTLSeconds > 0 && !sandbox.CreatedAt.IsZero() && !now.Before(sandbox.CreatedAt.Add(time.Duration(sandbox.TTLSeconds)*time.Second)) {
			if err := s.runtime.Destroy(ctx, sandbox.ID); err == nil {
				_ = s.store.DeleteSandbox(sandbox.ID)
				_ = s.audit("sandbox.ttl.destroy", sandbox.ID, "ok", map[string]any{"ttlSeconds": sandbox.TTLSeconds})
			} else {
				_ = s.audit("sandbox.ttl.destroy", sandbox.ID, "error", map[string]any{"error": err.Error()})
			}
			continue
		}
		if sandbox.Status != model.StatusRunning || !sandbox.PauseWhenIdle || sandbox.IdleTimeoutSec <= 0 {
			continue
		}
		last := sandbox.UpdatedAt
		if activity := latestActivity[sandbox.ID]; activity.After(last) {
			last = activity
		}
		if now.Before(last.Add(time.Duration(sandbox.IdleTimeoutSec) * time.Second)) {
			continue
		}
		runtimeSandbox, err := s.runtime.Pause(ctx, sandbox.ID)
		if err != nil {
			_ = s.audit("sandbox.idle.pause", sandbox.ID, "error", map[string]any{"error": err.Error()})
			continue
		}
		sandbox.Status = model.StatusPaused
		sandbox.DesiredStatus = model.StatusPaused
		sandbox.Runtime = &runtimeSandbox
		sandbox.Generation++
		sandbox.Observed = sandbox.Generation
		sandbox.UpdatedAt = now
		_ = s.store.UpsertSandbox(sandbox)
		_ = s.audit("sandbox.idle.pause", sandbox.ID, "ok", map[string]any{"idleTimeoutSec": sandbox.IdleTimeoutSec})
	}
}
