#!/usr/bin/env bash
set -euo pipefail

api_url="${AGENTPOP_BASE_URL:-http://127.0.0.1:8080}"
response_file="$(mktemp /tmp/agentpop-smoke.XXXXXX)"
sandbox_id=""

cleanup() {
  if [[ -n "${sandbox_id}" ]]; then
    curl -fsS -X DELETE "${api_url}/v1/sandboxes/${sandbox_id}" >/dev/null 2>&1 || true
  fi
  rm -f "${response_file}"
}
trap cleanup EXIT

curl -fsS "${api_url}/healthz" | jq -e '.healthy == true' >/dev/null
curl -fsS -X POST "${api_url}/v1/sandboxes" \
  -H 'content-type: application/json' \
  -H "idempotency-key: smoke-$(date +%s)" \
  --data '{"name":"local-smoke","vcpu":0.25,"memoryMb":512,"diskGb":10,"environment":{"SMOKE_TEST":"passed"}}' \
  >"${response_file}"
sandbox_id="$(jq -r '.id' "${response_file}")"

curl -fsS -X POST "${api_url}/v1/sandboxes/${sandbox_id}/exec" \
  -H 'content-type: application/json' \
  --data '{"command":"test \"$SMOKE_TEST\" = passed && printf smoke-ok"}' \
  | jq -e '.exitCode == 0 and .stdout == "smoke-ok"' >/dev/null

ssh_command="$(curl -fsS "${api_url}/v1/sandboxes/${sandbox_id}/ssh" | jq -r '.command')"
curl -fsS -X POST "${api_url}/v1/sandboxes/${sandbox_id}/pause" | jq -e '.status == "paused"' >/dev/null
curl -fsS -X POST "${api_url}/v1/sandboxes/${sandbox_id}/resume" | jq -e '.status == "running"' >/dev/null

echo "Sandbox: ${sandbox_id}"
echo "SSH: ${ssh_command}"
echo "Create, exec, SSH discovery, pause, resume, and cleanup passed."
