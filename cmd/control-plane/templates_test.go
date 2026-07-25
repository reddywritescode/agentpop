package main

import (
	"strings"
	"testing"
)

func TestParseTemplateDefinition(t *testing.T) {
	definition := `# comment
FROM agentpop/devbox:local

RUN apt-get update && apt-get install -y --no-install-recommends \
    ripgrep jq \
 && rm -rf /var/lib/apt/lists/*
RUN echo done > /etc/template-marker
`
	baseImage, steps, err := parseTemplateDefinition(definition)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if baseImage != "agentpop/devbox:local" {
		t.Fatalf("base image = %q", baseImage)
	}
	if len(steps) != 2 {
		t.Fatalf("steps = %d, want 2", len(steps))
	}
	if !strings.Contains(steps[0], "ripgrep jq") || !strings.Contains(steps[0], "rm -rf /var/lib/apt/lists/*") {
		t.Fatalf("continuation was not joined: %q", steps[0])
	}
	if steps[1] != "echo done > /etc/template-marker" {
		t.Fatalf("steps[1] = %q", steps[1])
	}
}

func TestParseTemplateDefinitionRejectsUnsupported(t *testing.T) {
	cases := map[string]string{
		"missing FROM":       "RUN echo hi",
		"copy":               "FROM agentpop/devbox:local\nCOPY a b",
		"add":                "FROM agentpop/devbox:local\nADD a b",
		"multi-stage":        "FROM agentpop/devbox:local\nFROM agentpop/devbox:local",
		"from with alias":    "FROM agentpop/devbox:local AS build",
		"non-agentpop base":  "FROM debian:12",
		"empty":              "",
		"run without a from": "# only a comment",
	}
	for name, definition := range cases {
		if _, _, err := parseTemplateDefinition(definition); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}
