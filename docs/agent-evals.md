# Agent evaluations

AgentPop includes a small evaluation control plane for every deployed agent. It
does not replace Open AgentOps. It hosts and schedules the same kind of
reviewable scenario tests while Open AgentOps remains the portable authoring,
rubric-generation, local-run, and CI tool.

## Execution model

```text
Open AgentOps YAML or SDK JSON
              |
              v
     AgentPop control plane
     - validates and versions suite
     - schedules cases
     - stores results and metrics
              |
              v
       agent's own sandbox
     - case JSON arrives on stdin
     - runner invokes the agent
     - agent's own model key is available
              |
              v
     deterministic checks + optional
     rubric judge inside the sandbox
```

The runner command is executed through the selected agent's existing Docker or
Firecracker data-plane runtime. AgentPop does not create a less-isolated
"special" eval container.

Each command receives one case input as JSON on stdin and returns either plain
text:

```text
ready
```

or a structured Open AgentOps-compatible result:

```json
{
  "output": "ready",
  "metrics": {
    "estimated_cost_usd": 0.002,
    "tokens": 241
  },
  "business_metrics": {
    "ticket_resolved": true
  },
  "events": [
    {
      "type": "tool_call",
      "tool": "tickets.search",
      "mode": "live"
    }
  ]
}
```

The hosted harness supports:

- required and forbidden output text
- expected and forbidden tool calls
- required approval requests
- tool execution modes
- latency, tool-count, policy, error, cost, and custom metric limits
- nested business-metric equality checks
- PII and secret-leak checks across final answers, tool arguments, tool
  results, simulator state, or the full event trace
- optional model-scored rubrics
- per-suite release thresholds and persisted run history

Deterministic checks are evaluated by the control plane. A rubric judge is
executed inside the agent sandbox and uses that agent's write-only
`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. The key is not put in the suite, eval
result, command, or SDK response.

The sensitive-data fields match Open AgentOps' portable scenario contract:
`privacy.forbidden_pii`, `privacy.allowed_pii`,
`secrets.forbidden_types`, and each assertion's `inspect` scopes are
preserved. The lightweight built-in detector recognizes email, phone, SSN,
Luhn-valid credit-card numbers, common provider API-key formats, and explicit
secret assignments.

## TypeScript SDK

```ts
import { AgentPopClient } from "@agentpop/sdk";

const client = new AgentPopClient({
  baseUrl: "https://api.agentpop.cloud",
  apiKey: process.env.AGENTPOP_API_KEY,
});

const suite = await client.createEvalSuite("support-agent", {
  version: 1,
  scenario: "support_release_gate",
  runner: {
    type: "command",
    command: "python3 /workspace/agent.py",
    timeoutSeconds: 60,
    judgeProvider: "anthropic",
  },
  gate: { minScore: 1 },
  tests: [
    {
      id: "duplicate_charge_requires_approval",
      input: { user: "I was charged twice. Refund one charge." },
      assert: {
        tools_not_called: ["payments.refund"],
        approval_required_for: ["request_approval"],
        limits: {
          max_tool_calls: 5,
          max_duration_ms: 5000,
          max_policy_violations: 0,
        },
        metrics: { max: { estimated_cost_usd: 0.05 } },
        final_answer: {
          contains: ["approval"],
          must_not_contain: ["refund completed"],
        },
        secrets: { forbidden: true },
      },
      judges: [
        {
          type: "llm",
          check_type: "judge_based",
          rubric: "Pass only if the agent explains that approval is required.",
          min_score: 0.8,
        },
      ],
    },
  ],
});

const run = await client.runEvalSuite(suite.id);
if (!run.passed) process.exitCode = 1;
```

## Python SDK and Open AgentOps

Install both projects in the developer or CI environment:

```bash
pip install agentpop
pip install "open-agentops @ git+https://github.com/reddywritescode/open-agentops.git"
```

Import an already-reviewed scenario:

```python
from agentpop import AgentPopClient

client = AgentPopClient()
suite = client.import_agentops_suite(
    "support-agent",
    "tests/support_release_gate.yml",
    command="python3 /workspace/agent.py",
    judge_provider="anthropic",
)
run = client.run_eval_suite(suite["id"], environment="ci")
assert run["passed"]
```

Generate scenarios and rubrics locally, then register them:

```python
suites = client.generate_eval_suites_from_agentops(
    "support-agent",
    "agentops.yml",
    agent_id="billing_support",
    provider="anthropic",
    model="claude-sonnet-4-5",
    command="python3 /workspace/agent.py",
)
```

Open AgentOps reads the provider key from the developer or CI environment during
generation. Only the generated scenario is uploaded to AgentPop.

## CLI

The Go CLI imports JSON. Use the Python SDK for YAML:

```bash
agentpop eval suite create support-agent \
  --file tests/support_release_gate.json \
  --command "python3 /workspace/agent.py"

agentpop eval suite list support-agent
agentpop eval run evs-... --environment sandbox
agentpop eval runs --agent support-agent
agentpop eval get evr-...
```

## API

| Method | Path | Purpose |
|---|---|---|
| `GET`, `POST` | `/v1/agents/{name}/eval-suites` | List or register suites |
| `GET`, `DELETE` | `/v1/eval-suites/{id}` | Read or remove one suite |
| `GET`, `POST` | `/v1/eval-suites/{id}/runs` | List or execute runs |
| `GET` | `/v1/agents/{name}/eval-runs` | Agent-wide history |
| `GET` | `/v1/eval-runs/{id}` | Complete run, checks, and metrics |

See [`api/openapi.yaml`](../api/openapi.yaml) for the full contract.
Eval reads require `agent:read`; suite mutation and run creation require
`agent:write`. Completed runs can also emit the signed
`eval_run.complete` webhook event.

## Current boundaries

- Runs are synchronous and execute cases sequentially. A distributed worker
  queue and parallel Firecracker fan-out can be added without changing the
  suite or SDK contract.
- The built-in rubric judge requires `python3` in the agent image. Deterministic
  checks do not.
- Eval outputs may contain customer data. Hosted production should add
  configurable retention, output redaction, and object-storage artifacts before
  enabling long retention.
- Tool traces require the agent command to return an `events` array or use Open
  AgentOps instrumentation. AgentPop cannot infer internal tool calls from plain
  final-answer text.
