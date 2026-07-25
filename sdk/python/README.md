# AgentPop Python SDK

The Python SDK uses only the standard library and supports Python 3.11+.

```python
import os

from agentpop import AgentPopClient

client = AgentPopClient(base_url="http://127.0.0.1:8080")

images = client.list_images(kind="agent", query="coding")
generated = client.generate_image(
    "Python data environment with pandas, NumPy, jq, and ripgrep",
    kind="sandbox",
)
print(generated["definition"])  # review before building

client.build_image("python-data")
image_sandbox = client.deploy_image(
    "python-data",
    name="analysis",
    lifecycle="persistent",
)
image_sandbox.set_secrets({"OPENAI_API_KEY": os.environ["OPENAI_API_KEY"]})

with client.create_sandbox(
    name="python-demo",
    vcpu=1,
    memoryMb=1024,
    diskGb=10,
) as sandbox:
    print(sandbox.sh("uname -a")["stdout"])
    print(sandbox.ssh()["command"])
    sandbox.upload_file("/workspace/input.txt", b"hello\n")
    print(sandbox.download_file("/workspace/input.txt").decode())
    sandbox.update(vcpu=0.5, memoryMb=512, pauseWhenIdle=True, idleTimeoutSec=900)
    fork = sandbox.fork()
    fork.destroy()
```

The client also reads `AGENTPOP_BASE_URL` and `AGENTPOP_API_KEY`.
It also covers reusable images, connectors and grants, networks, S3-compatible storage
registrations, signed webhooks, members, hashed scoped API keys, project
defaults, quota requests, health, usage, and audit events.

## Customer-supplied model keys

```python
import os

agent = client.create_agent(
    name="issue-triage",
    template="openclaw-compatible",
    model="claude-sonnet-4-5",
    secrets={"ANTHROPIC_API_KEY": os.environ["ANTHROPIC_API_KEY"]},
)

client.set_agent_secrets(
    agent["name"],
    {"ANTHROPIC_API_KEY": os.environ["NEW_ANTHROPIC_API_KEY"]},
)
print(client.list_agent_secrets(agent["name"]))  # names/status only
client.delete_agent_secret(agent["name"], "ANTHROPIC_API_KEY")
```

Secret values are write-only: they are encrypted in control-plane state and
never returned by the API or SDK.

## Agent evals

Create suites directly as JSON or import/generate Open AgentOps scenarios:

```python
suite = client.import_agentops_suite(
    "issue-triage",
    "tests/issue_triage.yml",
    command="python3 /workspace/agent.py",
    judge_provider="anthropic",
)
run = client.run_eval_suite(suite["id"], environment="ci")
assert run["passed"]
```

`generate_eval_suites_from_agentops(...)` calls the user's local Open AgentOps
installation, so scenario-generation credentials remain in the developer or CI
environment. Rubric judges run inside the agent sandbox with that agent's
write-only model key. See [`docs/agent-evals.md`](../../docs/agent-evals.md).
