#!/usr/bin/env bash
set -euo pipefail

api_url="${AGENTPOP_BASE_URL:-http://127.0.0.1:8080}"
agent_name="eval-smoke-${RANDOM}"
suite_id=""

cleanup() {
  curl -fsS -X DELETE "${api_url}/v1/agents/${agent_name}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

jq -n --arg name "${agent_name}" '{
  name: $name,
  model: "provider/model",
  vcpu: 0.25,
  memoryMb: 512,
  diskGb: 5
}' | curl -fsS -X POST "${api_url}/v1/agents" \
  -H 'content-type: application/json' \
  --data @- >/dev/null

runner_command='python3 -c '"'"'import json,sys; p=json.load(sys.stdin); print(json.dumps({"output": "ready: " + p.get("user", ""), "metrics": {"estimated_cost_usd": 0.001}, "business_metrics": {"ready": True}, "events": []}))'"'"

suite_id="$(
  jq -n \
    --arg scenario "readiness" \
    --arg command "${runner_command}" \
    '{
      version: 1,
      scenario: $scenario,
      description: "AgentPop eval smoke test",
      runner: {
        type: "command",
        command: $command,
        timeoutSeconds: 30
      },
      gate: {minScore: 1},
      tests: [{
        id: "responds_ready",
        input: {user: "health check"},
        assert: {
          limits: {
            max_duration_ms: 5000,
            max_agent_errors: 0
          },
          metrics: {
            max: {estimated_cost_usd: 0.01}
          },
          business_metrics: {ready: true},
          final_answer: {
            contains: ["ready"],
            must_not_contain: ["failed"]
          },
          secrets: {forbidden: true}
        },
        judges: [{type: "deterministic"}]
      }]
    }' |
    curl -fsS -X POST "${api_url}/v1/agents/${agent_name}/eval-suites" \
      -H 'content-type: application/json' \
      --data @- |
    jq -r '.id'
)"

curl -fsS -X POST "${api_url}/v1/eval-suites/${suite_id}/runs" \
  -H 'content-type: application/json' \
  --data '{"environment":"sandbox"}' |
  jq -e '
    .passed == true and
    .score == 1 and
    .metrics.cases_passed == 1 and
    .cases[0].metrics.estimated_cost_usd == 0.001
  ' >/dev/null

curl -fsS "${api_url}/v1/agents/${agent_name}/eval-runs" |
  jq -e --arg suite "${suite_id}" '
    (.items | length) == 1 and
    .items[0].suiteId == $suite and
    .items[0].passed == true
  ' >/dev/null

echo "Agent: ${agent_name}"
echo "Suite: ${suite_id}"
echo "Sandbox execution, deterministic scoring, custom metrics, persistence, and cleanup passed."
