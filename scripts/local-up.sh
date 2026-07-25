#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_dir}"

if ! docker info >/dev/null 2>&1; then
  echo "Docker Engine is not ready. Start Docker Desktop and retry." >&2
  exit 1
fi
if ! docker image inspect agentpop/devbox:local >/dev/null 2>&1; then
  docker build -t agentpop/devbox:local images/devbox
fi

mkdir -p .local/bin .local/logs
go build -o .local/bin/host-agent ./cmd/host-agent
go build -o .local/bin/control-plane ./cmd/control-plane

CONNECTOR_BROKER_ADDR=127.0.0.1:7070 \
CONNECTOR_BROKER_STATE=.local/connector-broker/state.json \
CONNECTOR_BROKER_TOKEN="${CONNECTOR_BROKER_TOKEN:-agentpop-local-connector-broker-token}" \
COMPOSIO_API_KEY="${COMPOSIO_API_KEY:-}" \
  pnpm --filter @agentpop/connector-broker start >.local/logs/connector-broker.log 2>&1 &
connector_broker_pid=$!

RUNTIME_DRIVER=docker \
HOST_AGENT_ADDR=127.0.0.1:9090 \
HOST_AGENT_TOKEN=agentpop-local-host-token \
HOST_STATE_DIR=.local/host-agent \
DOCKER_SANDBOX_IMAGE=agentpop/devbox:local \
SANDBOX_SSH_KEY=.local/ssh/id_ed25519 \
  .local/bin/host-agent >.local/logs/host-agent.log 2>&1 &
host_agent_pid=$!

HOST_AGENT_URL=http://127.0.0.1:9090 \
HOST_AGENT_TOKEN=agentpop-local-host-token \
CONTROL_PLANE_ADDR=127.0.0.1:8080 \
CONTROL_PLANE_STATE=.local/control-plane/state.json \
CONTROL_PLANE_MODE=local \
PUBLIC_API_URL=http://127.0.0.1:8080 \
PUBLIC_WEB_URL=http://127.0.0.1:5173 \
ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 \
CONNECTOR_BROKER_URL=http://127.0.0.1:7070 \
CONNECTOR_BROKER_TOKEN="${CONNECTOR_BROKER_TOKEN:-agentpop-local-connector-broker-token}" \
  .local/bin/control-plane >.local/logs/control-plane.log 2>&1 &
control_plane_pid=$!

cleanup() {
  kill "${control_plane_pid}" "${host_agent_pid}" "${connector_broker_pid}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in {1..50}; do
  if curl -fsS http://127.0.0.1:8080/healthz >/dev/null; then
    break
  fi
  sleep 0.1
done
curl -fsS http://127.0.0.1:8080/healthz >/dev/null

echo "Dashboard:     http://127.0.0.1:5173"
echo "Owner console: http://127.0.0.1:5173/admin/login"
echo "Control plane: http://127.0.0.1:8080"
echo "Host agent:    http://127.0.0.1:9090"
echo "Local owner:   owner@agentpop.local / agentpop-local-owner"
echo "Logs:          .local/logs/"
echo
echo "Press Ctrl-C to stop the local control plane and dashboard."

VITE_API_URL=http://127.0.0.1:8080 pnpm --filter @agentpop/web dev --host 127.0.0.1
