package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCompatibleImageGeneratorSendsReferencesAndValidatesBundle(t *testing.T) {
	definition := "FROM agentpop/devbox:local\nRUN npm install -g openclaw\n"
	planned := generatedRecipe{
		ID: "openclaw-custom", Kind: "agent", Name: "OpenClaw custom",
		Tagline:     "OpenClaw in an isolated computer",
		Description: "Installs the referenced OpenClaw package and boots without credentials.",
		Category:    "general agent", UseCases: []string{"personal assistant"},
		Definition: definition,
		Credentials: []imageCredential{{
			Name: "ANTHROPIC_API_KEY", Label: "Anthropic API key", Provider: "anthropic",
			Required: true, Description: "Optional at deployment and configurable later.",
		}},
		RequiredConnectors: []string{"github"}, Ports: []int{3000},
		Files: []imageFile{
			{Path: "Dockerfile", Language: "dockerfile", Content: definition},
			{Path: "agentpop.yaml", Language: "yaml", Content: "apiVersion: agentpop.cloud/v1\nkind: Image\n"},
			{Path: "README.md", Language: "markdown", Content: "# OpenClaw custom\n\nBuild and deploy instructions.\n"},
		},
		PersistenceModes: []string{"persistent", "ephemeral"}, DefaultCommand: "/bin/bash",
	}
	content, err := json.Marshal(planned)
	if err != nil {
		t.Fatal(err)
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer planner-key" {
			t.Errorf("authorization = %q", r.Header.Get("Authorization"))
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), "openclaw") ||
			!strings.Contains(string(body), "agentpop.yaml") ||
			!strings.Contains(string(body), "json_schema") {
			t.Errorf("planner request lacks intent, references, or strict schema: %s", body)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]string{"content": string(content)}},
			},
		})
	}))
	defer upstream.Close()

	generator := &compatibleImageGenerator{
		apiURL: upstream.URL, apiKey: "planner-key", model: "planner-test",
		client: upstream.Client(),
	}
	result, err := generator.Generate(context.Background(), imageGenerationRequest{
		Prompt: "Need OpenClaw installed and deployed as an agent", Kind: "agent",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.GeneratedBy != "model:planner-test" || result.Definition != agentPackages()[0].Definition {
		t.Fatalf("unexpected generated image: %#v", result)
	}
	if result.Credentials[0].Required {
		t.Fatal("model credentials must remain optional at deployment")
	}
	if len(result.Files) != 3 || result.Files[0].Path != "Dockerfile" {
		t.Fatalf("unexpected files: %#v", result.Files)
	}
}

func TestValidateGeneratedImageRejectsUnsupportedDockerfile(t *testing.T) {
	definition := "FROM debian:12\nRUN echo unsafe\n"
	planned := generatedRecipe{
		ID: "bad", Kind: "sandbox", Name: "Bad", Tagline: "Bad image",
		Description: "Bad base image.", Category: "test", Definition: definition,
		Files: []imageFile{
			{Path: "Dockerfile", Content: definition},
			{Path: "agentpop.yaml", Content: "kind: Image\n"},
			{Path: "README.md", Content: "# Bad\n"},
		},
	}
	err := validateGeneratedImage(&planned, imageGenerationRequest{Prompt: "bad", Kind: "sandbox"})
	if err == nil || !strings.Contains(err.Error(), "AgentPop base") {
		t.Fatalf("error = %v", err)
	}
}

func TestNormalizeGeneratedFilePathsRepairsTypedMandatoryFiles(t *testing.T) {
	planned := generatedRecipe{Files: []imageFile{
		{Language: "dockerfile", Content: "FROM agentpop/devbox:local\n"},
		{Language: "yaml", Content: "apiVersion: agentpop.cloud/v1\n"},
		{Language: "markdown", Content: "# Image\n"},
		{Content: "discarded model artifact"},
		{Path: "README.md", Language: "markdown", Content: "duplicate"},
	}}
	normalizeGeneratedFilePaths(&planned)
	if len(planned.Files) != 3 {
		t.Fatalf("file count = %d, want 3", len(planned.Files))
	}
	got := []string{planned.Files[0].Path, planned.Files[1].Path, planned.Files[2].Path}
	want := []string{"Dockerfile", "agentpop.yaml", "README.md"}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("paths = %#v, want %#v", got, want)
		}
	}
}
