package main

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/reddywritescode/agentpop/internal/model"
	"github.com/reddywritescode/agentpop/internal/secretbox"
	"github.com/reddywritescode/agentpop/internal/state"
)

func TestAgentSecretsAreEncryptedOutsidePublicAgentState(t *testing.T) {
	statePath := filepath.Join(t.TempDir(), "state.json")
	store, err := state.Open(statePath)
	if err != nil {
		t.Fatal(err)
	}
	box, err := secretbox.New("test-control-plane-key")
	if err != nil {
		t.Fatal(err)
	}
	srv := &server{store: store, secrets: box}
	values := map[string]string{"ANTHROPIC_API_KEY": "sk-ant-do-not-persist-in-cleartext"}
	encrypted, err := srv.sealAgentSecrets(values)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	agent := model.Agent{
		ID:                       "agt-test",
		Name:                     "test-agent",
		Status:                   "running",
		SandboxID:                "sb-test",
		Template:                 "openclaw-compatible",
		Model:                    "claude-sonnet-4-5",
		SecretNames:              []string{"ANTHROPIC_API_KEY"},
		SecretsGeneration:        1,
		AppliedSecretsGeneration: 1,
		SecretsUpdatedAt:         now,
		CreatedAt:                now,
		UpdatedAt:                now,
	}
	if err := store.UpdateAgentAndSecrets(agent, encrypted); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(statePath)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(raw, []byte(values["ANTHROPIC_API_KEY"])) {
		t.Fatal("control-plane state contains a plaintext agent secret")
	}
	if !bytes.Contains(raw, []byte("ANTHROPIC_API_KEY")) {
		t.Fatal("redacted secret name should remain available as metadata")
	}
	opened, err := srv.openAgentSecrets(agent.ID)
	if err != nil {
		t.Fatal(err)
	}
	if opened["ANTHROPIC_API_KEY"] != values["ANTHROPIC_API_KEY"] {
		t.Fatal("decrypted value did not round trip")
	}
}

func TestNormalizeAgentSecretsRejectsUnsafeRuntimeNames(t *testing.T) {
	for _, values := range []map[string]string{
		{"lowercase": "value"},
		{"AUTHORIZED_KEY": "attacker-key"},
		{"OPENAI_API_KEY": ""},
	} {
		if _, err := normalizeAgentSecrets(values); err == nil {
			t.Fatalf("expected validation error for %#v", values)
		}
	}
}
