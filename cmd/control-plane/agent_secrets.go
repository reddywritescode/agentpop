package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

var secretEnvironmentName = regexp.MustCompile(`^[A-Z_][A-Z0-9_]{0,127}$`)

var reservedAgentSecretNames = map[string]bool{
	"AUTHORIZED_KEY": true,
	"SANDBOX_NAME":   true,
}

func normalizeAgentSecrets(input map[string]string) (map[string]string, error) {
	if len(input) > 64 {
		return nil, fmt.Errorf("no more than 64 secrets are allowed per agent")
	}
	output := make(map[string]string, len(input))
	totalBytes := 0
	for rawName, value := range input {
		name := strings.TrimSpace(rawName)
		if !secretEnvironmentName.MatchString(name) {
			return nil, fmt.Errorf("secret name %q must be an uppercase environment variable name", rawName)
		}
		if reservedAgentSecretNames[name] {
			return nil, fmt.Errorf("secret name %q is reserved by the runtime", name)
		}
		if value == "" {
			return nil, fmt.Errorf("secret %q cannot be empty; use DELETE to remove it", name)
		}
		if len(value) > 32<<10 {
			return nil, fmt.Errorf("secret %q exceeds 32 KiB", name)
		}
		totalBytes += len(name) + len(value)
		if totalBytes > 256<<10 {
			return nil, fmt.Errorf("agent secrets exceed the 256 KiB limit")
		}
		output[name] = value
	}
	return output, nil
}

func sortedSecretNames(secrets map[string]string) []string {
	names := make([]string, 0, len(secrets))
	for name := range secrets {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func (s *server) sealAgentSecrets(secrets map[string]string) (string, error) {
	if len(secrets) == 0 {
		return "", nil
	}
	raw, err := json.Marshal(secrets)
	if err != nil {
		return "", err
	}
	return s.secrets.Seal(raw)
}

func (s *server) openAgentSecrets(agentID string) (map[string]string, error) {
	encrypted, ok := s.store.GetAgentSecrets(agentID)
	if !ok || encrypted == "" {
		return map[string]string{}, nil
	}
	raw, err := s.secrets.Open(encrypted)
	if err != nil {
		return nil, fmt.Errorf("decrypt agent secrets: %w", err)
	}
	var values map[string]string
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, fmt.Errorf("decode agent secrets: %w", err)
	}
	if values == nil {
		values = map[string]string{}
	}
	return values, nil
}

func (s *server) openSandboxSecrets(sandboxID string) (map[string]string, error) {
	encrypted, ok := s.store.GetSandboxSecrets(sandboxID)
	if !ok || encrypted == "" {
		return map[string]string{}, nil
	}
	raw, err := s.secrets.Open(encrypted)
	if err != nil {
		return nil, fmt.Errorf("decrypt sandbox secrets: %w", err)
	}
	var values map[string]string
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, fmt.Errorf("decode sandbox secrets: %w", err)
	}
	if values == nil {
		values = map[string]string{}
	}
	return values, nil
}

func agentSecretsResponse(agent model.Agent) map[string]any {
	status := "not_configured"
	if agent.AppliedSecretsGeneration != agent.SecretsGeneration {
		status = "pending"
	} else if len(agent.SecretNames) > 0 {
		status = "applied"
	}
	items := make([]map[string]any, 0, len(agent.SecretNames))
	for _, name := range agent.SecretNames {
		items = append(items, map[string]any{
			"name":       name,
			"configured": true,
			"updatedAt":  agent.SecretsUpdatedAt,
		})
	}
	return map[string]any{
		"items":             items,
		"status":            status,
		"generation":        agent.SecretsGeneration,
		"appliedGeneration": agent.AppliedSecretsGeneration,
		"updatedAt":         agent.SecretsUpdatedAt,
	}
}

func (s *server) listAgentSecrets(w http.ResponseWriter, r *http.Request) {
	agent, ok := s.store.GetAgentByName(r.PathValue("name"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent not found")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, agentSecretsResponse(agent))
}

func sandboxSecretsResponse(sandbox model.Sandbox) map[string]any {
	items := make([]map[string]any, 0, len(sandbox.SecretNames))
	for _, name := range sandbox.SecretNames {
		items = append(items, map[string]any{
			"name": name, "configured": true, "updatedAt": sandbox.SecretsUpdatedAt,
		})
	}
	return map[string]any{
		"items": items, "status": map[bool]string{true: "applied", false: "not_configured"}[len(items) > 0],
		"updatedAt": sandbox.SecretsUpdatedAt,
	}
}

func (s *server) listSandboxSecrets(w http.ResponseWriter, r *http.Request) {
	sandbox, ok := s.store.GetSandbox(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, sandboxSecretsResponse(sandbox))
}

func (s *server) updateSandboxSecrets(w http.ResponseWriter, r *http.Request) {
	sandbox, ok := s.store.GetSandbox(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	var req model.UpdateAgentSecretsRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	incoming, err := normalizeAgentSecrets(req.Secrets)
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_secrets", err.Error())
		return
	}
	values := map[string]string{}
	if !req.Replace {
		values, err = s.openSandboxSecrets(sandbox.ID)
		if err != nil {
			apiutil.WriteError(w, http.StatusInternalServerError, "secret_decryption_failed", err.Error())
			return
		}
	}
	for name, value := range incoming {
		values[name] = value
	}
	s.persistAndApplySandboxSecrets(w, r, sandbox, values, "sandbox.secrets.update")
}

func (s *server) deleteSandboxSecret(w http.ResponseWriter, r *http.Request) {
	sandbox, ok := s.store.GetSandbox(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox not found")
		return
	}
	key := strings.TrimSpace(r.PathValue("key"))
	if !secretEnvironmentName.MatchString(key) {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_secret_name", "invalid secret environment name")
		return
	}
	values, err := s.openSandboxSecrets(sandbox.ID)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "secret_decryption_failed", err.Error())
		return
	}
	if _, exists := values[key]; !exists {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "sandbox secret not found")
		return
	}
	delete(values, key)
	s.persistAndApplySandboxSecrets(w, r, sandbox, values, "sandbox.secrets.delete")
}

func (s *server) persistAndApplySandboxSecrets(
	w http.ResponseWriter,
	r *http.Request,
	sandbox model.Sandbox,
	values map[string]string,
	auditAction string,
) {
	encrypted, err := s.sealAgentSecrets(values)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "secret_encryption_failed", err.Error())
		return
	}
	if err := s.store.SetSandboxSecrets(sandbox.ID, encrypted); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	sandbox.SecretNames = sortedSecretNames(values)
	sandbox.SecretsUpdatedAt = time.Now().UTC()
	sandbox.UpdatedAt = sandbox.SecretsUpdatedAt
	if err := s.store.UpsertSandbox(sandbox); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	status := http.StatusAccepted
	applied := false
	if sandbox.Status == model.StatusRunning {
		if err := s.runtime.SetSecrets(r.Context(), sandbox.ID, values); err == nil {
			status = http.StatusOK
			applied = true
		}
	}
	_ = s.audit(auditAction, sandbox.ID, "ok", map[string]any{
		"secretNames": sandbox.SecretNames, "applied": applied,
	})
	apiutil.WriteJSON(w, status, sandboxSecretsResponse(sandbox))
}

func (s *server) deleteAgent(w http.ResponseWriter, r *http.Request) {
	agent, ok := s.store.GetAgentByName(r.PathValue("name"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent not found")
		return
	}
	if err := s.runtime.Destroy(r.Context(), agent.SandboxID); err != nil {
		apiutil.WriteError(w, http.StatusBadGateway, "runtime_destroy_failed", err.Error())
		return
	}
	if err := s.store.DeleteSandbox(agent.SandboxID); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	if err := s.store.DeleteAgent(agent.ID); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("agent.delete", agent.ID, "ok", map[string]any{"sandboxId": agent.SandboxID})
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) updateAgentSecrets(w http.ResponseWriter, r *http.Request) {
	agent, ok := s.store.GetAgentByName(r.PathValue("name"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent not found")
		return
	}
	var req model.UpdateAgentSecretsRequest
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	incoming, err := normalizeAgentSecrets(req.Secrets)
	if err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_secrets", err.Error())
		return
	}
	values := map[string]string{}
	if !req.Replace {
		values, err = s.openAgentSecrets(agent.ID)
		if err != nil {
			apiutil.WriteError(w, http.StatusInternalServerError, "secret_decryption_failed", err.Error())
			return
		}
	}
	for name, value := range incoming {
		values[name] = value
	}
	s.persistAndApplyAgentSecrets(w, r, agent, values, "agent.secrets.update")
}

func (s *server) deleteAgentSecret(w http.ResponseWriter, r *http.Request) {
	agent, ok := s.store.GetAgentByName(r.PathValue("name"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent not found")
		return
	}
	key := strings.TrimSpace(r.PathValue("key"))
	if !secretEnvironmentName.MatchString(key) {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_secret_name", "invalid secret environment name")
		return
	}
	values, err := s.openAgentSecrets(agent.ID)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "secret_decryption_failed", err.Error())
		return
	}
	if _, exists := values[key]; !exists {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "agent secret not found")
		return
	}
	delete(values, key)
	s.persistAndApplyAgentSecrets(w, r, agent, values, "agent.secrets.delete")
}

func (s *server) persistAndApplyAgentSecrets(
	w http.ResponseWriter,
	r *http.Request,
	agent model.Agent,
	values map[string]string,
	auditAction string,
) {
	encrypted, err := s.sealAgentSecrets(values)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "secret_encryption_failed", err.Error())
		return
	}
	agent.SecretNames = sortedSecretNames(values)
	agent.SecretsGeneration++
	agent.SecretsUpdatedAt = time.Now().UTC()
	agent.UpdatedAt = agent.SecretsUpdatedAt
	if err := s.store.UpdateAgentAndSecrets(agent, encrypted); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}

	applied := false
	if sandbox, exists := s.store.GetSandbox(agent.SandboxID); exists && sandbox.Status == model.StatusRunning {
		if err := s.runtime.SetSecrets(r.Context(), agent.SandboxID, values); err == nil {
			applied = true
			agent.AppliedSecretsGeneration = agent.SecretsGeneration
			agent.LastMessage = "Write-only model credentials were updated and applied to the agent environment."
			_ = s.store.UpsertAgent(agent)
		} else {
			agent.LastMessage = "Model credential update is stored and will be applied when the agent restarts."
			_ = s.store.UpsertAgent(agent)
		}
	}
	_ = s.audit(auditAction, agent.ID, "ok", map[string]any{
		"secretNames": agent.SecretNames,
		"generation":  agent.SecretsGeneration,
		"applied":     applied,
	})
	status := http.StatusAccepted
	if applied {
		status = http.StatusOK
	}
	apiutil.WriteJSON(w, status, agentSecretsResponse(agent))
}

func (s *server) applyStoredAgentSecrets(ctx context.Context, agent *model.Agent) error {
	values, err := s.openAgentSecrets(agent.ID)
	if err != nil {
		return err
	}
	if err := s.runtime.SetSecrets(ctx, agent.SandboxID, values); err != nil {
		return err
	}
	agent.AppliedSecretsGeneration = agent.SecretsGeneration
	agent.UpdatedAt = time.Now().UTC()
	return s.store.UpsertAgent(*agent)
}
