# @agentpop/sdk

Zero-dependency TypeScript SDK for the AgentPop control plane.

```ts
import { AgentPopClient } from "@agentpop/sdk";

const client = new AgentPopClient({
  baseUrl: "http://127.0.0.1:8080",
});

const images = await client.listImages({ kind: "agent", q: "coding" });
const generated = await client.generateImage({
  kind: "sandbox",
  prompt: "Python data environment with pandas, NumPy, jq, and ripgrep",
});
console.log(generated.definition); // review before building

await client.buildImage("python-data");
const imageSandbox = await client.deployImage("python-data", {
  name: "analysis",
  lifecycle: "persistent",
});
await imageSandbox.setSecrets({ OPENAI_API_KEY: process.env.OPENAI_API_KEY! });

const sandbox = await client.createSandbox({
  name: "sdk-demo",
  image: "agentpop/devbox:local",
  vcpu: 1,
  memoryMb: 1024,
  diskGb: 10,
  allowedEgress: ["github.com:443"],
});

try {
  const result = await sandbox.sh("uname -a");
  console.log(result.stdout);
  console.log((await sandbox.ssh()).command);
  await sandbox.uploadFile("/workspace/input.txt", new TextEncoder().encode("hello\n"));
  console.log(new TextDecoder().decode(await sandbox.downloadFile("/workspace/input.txt")));
  await sandbox.update({ vcpu: 0.5, memoryMb: 512, pauseWhenIdle: true, idleTimeoutSec: 900 });
  const fork = await sandbox.fork();
  await fork.destroy();
} finally {
  await sandbox.destroy();
}
```

Configuration can also come from `AGENTPOP_BASE_URL` and
`AGENTPOP_API_KEY`. The API key is sent as a bearer token. Mutations include
an idempotency key. Secret values are write-only; sandbox reads expose
`secretNames` only. `AgentPopClient` also covers connectors and explicit grants,
networks, S3-compatible storage registrations, signed webhooks, members,
hashed scoped API keys, project defaults, quota requests, health, usage, and
audit events.

## Customer-supplied model keys

Model credentials are write-only per-agent environment secrets. The create
response contains only `secretNames`; the SDK never offers a method that reads
their values.

```ts
const agent = await client.createAgent({
  name: "issue-triage",
  template: "openclaw-compatible",
  model: "claude-sonnet-4-5",
  secrets: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
  },
});

// Rotate without replacing unrelated keys.
await client.setAgentSecrets(agent.name, {
  ANTHROPIC_API_KEY: process.env.NEW_ANTHROPIC_API_KEY!,
});

console.log(await client.listAgentSecrets(agent.name)); // names/status only
await client.deleteAgentSecret(agent.name, "ANTHROPIC_API_KEY");
```

Use `{ replace: true }` as the third argument to `setAgentSecrets` to replace
the complete secret set. Never log the input map or commit model keys to source
control.

## Agent evals

```ts
const suite = await client.createEvalSuite("issue-triage", {
  version: 1,
  scenario: "issue_triage_release",
  runner: {
    type: "command",
    command: "python3 /workspace/agent.py",
    judgeProvider: "anthropic",
  },
  gate: { minScore: 1 },
  tests: [{
    id: "safe_write_path",
    input: { user: "Close duplicate issue 42." },
    assert: {
      approval_required_for: ["request_approval"],
      tools_not_called: ["issues.close"],
      limits: { max_duration_ms: 5000 },
      final_answer: { contains: ["approval"] },
      secrets: { forbidden: true },
    },
  }],
});

const run = await client.runEvalSuite(suite.id);
console.log(run.passed, run.score, run.cases);
```

The suite schema intentionally follows Open AgentOps. See
[`docs/agent-evals.md`](../../docs/agent-evals.md) for YAML import, local rubric
generation, runner output, metrics, and security boundaries.
