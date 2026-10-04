package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/reddywritescode/agentpop/internal/model"
	"github.com/reddywritescode/agentpop/internal/secretbox"
	"github.com/reddywritescode/agentpop/internal/state"
)

func TestSandboxLogsPersistRealOutputAndRedactAgentSecrets(t *testing.T) {
	store, err := state.Open(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	box, err := secretbox.New("sandbox-log-test-key")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	sandbox := model.Sandbox{ID: "sb-logs", Name: "logs", Status: model.StatusRunning, CreatedAt: now, UpdatedAt: now}
	if err := store.UpsertSandbox(sandbox); err != nil {
		t.Fatal(err)
	}
	agent := model.Agent{ID: "agt-logs", Name: "logger", SandboxID: sandbox.ID, CreatedAt: now, UpdatedAt: now}
	sealed, err := (&server{secrets: box}).sealAgentSecrets(map[string]string{"MODEL_API_KEY": "secret-value-123"})
	if err != nil {
		t.Fatal(err)
	}
	if err := store.UpdateAgentAndSecrets(agent, sealed); err != nil {
		t.Fatal(err)
	}
	srv := &server{store: store, secrets: box}
	srv.recordSandboxExecLogs(sandbox.ID, "customer test", model.ExecResult{
		ExitCode:   7,
		Stdout:     "customer output\nsecret-value-123",
		Stderr:     "provider rejected secret-value-123",
		DurationMS: 42,
		StartedAt:  now,
		FinishedAt: now.Add(42 * time.Millisecond),
	}, nil)

	logs := store.ListSandboxLogs(sandbox.ID, 50)
	raw, err := json.Marshal(logs)
	if err != nil {
		t.Fatal(err)
	}
	body := string(raw)
	if strings.Contains(body, "secret-value-123") {
		t.Fatalf("persisted logs contain the plaintext agent secret: %s", body)
	}
	for _, expected := range []string{"customer output", "[REDACTED]", "provider rejected", "exit=7"} {
		if !strings.Contains(body, expected) {
			t.Fatalf("persisted logs are missing %q: %s", expected, body)
		}
	}
}

func TestSandboxLogsEndpointValidatesLimitAndReturnsEnvelope(t *testing.T) {
	store, err := state.Open(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	sandbox := model.Sandbox{ID: "sb-endpoint", Name: "endpoint", Status: model.StatusRunning, CreatedAt: now, UpdatedAt: now}
	if err := store.UpsertSandbox(sandbox); err != nil {
		t.Fatal(err)
	}
	if err := store.AppendSandboxLogs(sandbox.ID, model.SandboxLogEntry{
		ID: "log-one", SandboxID: sandbox.ID, Source: "exec", Stream: "stdout", Message: "real output", CreatedAt: now,
	}); err != nil {
		t.Fatal(err)
	}
	srv := &server{store: store}

	request := httptest.NewRequest(http.MethodGet, "/v1/sandboxes/"+sandbox.ID+"/logs?limit=10", nil)
	request.SetPathValue("id", sandbox.ID)
	response := httptest.NewRecorder()
	srv.sandboxLogs(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "real output") {
		t.Fatalf("unexpected logs response: code=%d body=%s", response.Code, response.Body.String())
	}

	request = httptest.NewRequest(http.MethodGet, "/v1/sandboxes/"+sandbox.ID+"/logs?limit=9999", nil)
	request.SetPathValue("id", sandbox.ID)
	response = httptest.NewRecorder()
	srv.sandboxLogs(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid limit to return 400, got %d: %s", response.Code, response.Body.String())
	}
}
