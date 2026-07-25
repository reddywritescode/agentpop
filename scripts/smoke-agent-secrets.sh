#!/usr/bin/env bash
set -euo pipefail

api_url="${AGENTPOP_BASE_URL:-http://127.0.0.1:8080}"
agent_name="byok-smoke-${RANDOM}"
first_value="agentpop-test-first-${RANDOM}"
rotated_value="agentpop-test-rotated-${RANDOM}"
response_file="$(mktemp /tmp/agentpop-agent-secrets.XXXXXX)"
sandbox_id=""

cleanup() {
  curl -fsS -X DELETE "${api_url}/v1/agents/${agent_name}" >/dev/null 2>&1 || true
  rm -f "${response_file}"
}
trap cleanup EXIT

create_body="$(jq -n \
  --arg name "${agent_name}" \
  --arg value "${first_value}" \
  '{
    name: $name,
    template: "openclaw-compatible",
    model: "claude-sonnet-4-5",
    vcpu: 0.25,
    memoryMb: 512,
    diskGb: 5,
    secrets: {ANTHROPIC_API_KEY: $value}
  }')"

curl -fsS -X POST "${api_url}/v1/agents" \
  -H 'content-type: application/json' \
  -H "idempotency-key: ${agent_name}" \
  --data "${create_body}" >"${response_file}"

sandbox_id="$(jq -r '.sandboxId' "${response_file}")"
jq -e '.secretNames == ["ANTHROPIC_API_KEY"] and has("secrets") == false' "${response_file}" >/dev/null

curl -fsS "${api_url}/v1/agents/${agent_name}/secrets" \
  | jq -e '.status == "applied" and .items[0].name == "ANTHROPIC_API_KEY" and (.items[0] | has("value") | not)' >/dev/null

curl -fsS -X POST "${api_url}/v1/sandboxes/${sandbox_id}/exec" \
  -H 'content-type: application/json' \
  --data "$(jq -n --arg value "${first_value}" '{command: ("test \"$ANTHROPIC_API_KEY\" = " + ($value | @sh))}')" \
  | jq -e '.exitCode == 0' >/dev/null

curl -fsS -X PUT "${api_url}/v1/agents/${agent_name}/secrets" \
  -H 'content-type: application/json' \
  --data "$(jq -n --arg value "${rotated_value}" '{secrets: {ANTHROPIC_API_KEY: $value}}')" \
  | jq -e '.status == "applied" and .generation == 2 and .appliedGeneration == 2' >/dev/null

curl -fsS -X POST "${api_url}/v1/sandboxes/${sandbox_id}/exec" \
  -H 'content-type: application/json' \
  --data "$(jq -n --arg value "${rotated_value}" '{command: ("test \"$ANTHROPIC_API_KEY\" = " + ($value | @sh))}')" \
  | jq -e '.exitCode == 0' >/dev/null

if [[ -n "${AGENTPOP_STATE_PATH:-}" ]]; then
  if grep -Fq "${first_value}" "${AGENTPOP_STATE_PATH}" || grep -Fq "${rotated_value}" "${AGENTPOP_STATE_PATH}"; then
    echo "plaintext model key found in control-plane state" >&2
    exit 1
  fi
fi

curl -fsS -X DELETE "${api_url}/v1/agents/${agent_name}/secrets/ANTHROPIC_API_KEY" \
  | jq -e '.status == "not_configured" and (.items | length) == 0' >/dev/null

curl -fsS -X POST "${api_url}/v1/sandboxes/${sandbox_id}/exec" \
  -H 'content-type: application/json' \
  --data '{"command":"test -z \"${ANTHROPIC_API_KEY:-}\""}' \
  | jq -e '.exitCode == 0' >/dev/null

echo "Agent: ${agent_name}"
echo "Create, redacted read, guest injection, rotation, deletion, and cleanup passed."
