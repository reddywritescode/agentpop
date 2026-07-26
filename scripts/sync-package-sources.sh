#!/usr/bin/env bash
set -euo pipefail

workspace="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$workspace"

mkdir -p \
  packages/agentpop-cli/cmd/agentpop \
  packages/agentpop-mcp \
  packages/python-sdk/agentpop \
  packages/go-sdk/agentpop \
  packages/openapi \
  packages/self-host \
  packages/claude-plugin/skills/agentpop

cp cmd/agentpop/main.go packages/agentpop-cli/cmd/agentpop/main.go
cp cmd/agentpop/main_test.go packages/agentpop-cli/cmd/agentpop/main_test.go
cp cmd/agentpop-mcp/main.go packages/agentpop-mcp/main.go

for package_dir in \
  packages/agentpop-cli \
  packages/agentpop-mcp \
  packages/go-sdk \
  packages/openapi \
  packages/self-host \
  packages/claude-plugin \
  packages/homebrew-agentpop; do
  cp LICENSE "$package_dir/LICENSE"
done

cp sdk/python/agentpop/__init__.py packages/python-sdk/agentpop/__init__.py
cp sdk/python/agentpop/client.py packages/python-sdk/agentpop/client.py
cp sdk/python/LICENSE packages/python-sdk/LICENSE
cp sdk/python/README.md packages/python-sdk/README.md
cp sdk/python/pyproject.toml packages/python-sdk/pyproject.toml

cp sdk/go/agentpop/client.go packages/go-sdk/agentpop/client.go
cp sdk/go/agentpop/client_test.go packages/go-sdk/agentpop/client_test.go
cp sdk/go/README.md packages/go-sdk/README.md

cp api/openapi.yaml packages/openapi/openapi.yaml
cp api/private-openapi.yaml packages/openapi/private-openapi.yaml
cp api/host-agent-openapi.yaml packages/openapi/host-agent-openapi.yaml

cp deploy/hosted/Caddyfile packages/self-host/Caddyfile
cp deploy/hosted/compose.hosted.yaml packages/self-host/compose.yaml
cp deploy/hosted/.env.example packages/self-host/.env.example

cp SKILL.md packages/claude-plugin/skills/agentpop/SKILL.md

printf 'Synchronized AgentPop package sources.\n'
