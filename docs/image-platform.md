# AgentPop image platform

AgentPop intentionally has one runtime and one deployable artifact.

An **image** is an inspectable, versionable set of source files that builds an
immutable root filesystem. Its `kind` is either `agent` or `sandbox`, which
changes discovery metadata and suggested inputs—not isolation, scheduling, or
operations. Every deployment becomes a sandbox.

This keeps the customer model close to EC2 AMIs:

1. choose or search for an image;
2. inspect the Dockerfile, manifest, README, license, connectors, and optional
   credentials;
3. build the immutable artifact, or fork/edit it first;
4. deploy it as persistent or ephemeral;
5. use terminal, files, logs, ports, preview URL, SSH, metrics, secrets, API,
   SDK, CLI, or MCP against that sandbox.

There is no workflow builder, application catalog, managed-service catalog,
credit currency, or separate agent runtime.

## Included image types

Agent images include OpenClaw, Claude Code, Aider, Open Interpreter, CrewAI,
and Browser Use. Sandbox images include a programmable base agent computer,
Node.js, Python data, Go, Rust, full-stack web, and operations toolboxes.

Every catalog result contains virtual source files:

- `Dockerfile` — reproducible build source;
- `agentpop.yaml` — kind, lifecycle modes, and default command;
- `README.md` — purpose, source, license, and self-host instructions.

Reference copies of the base agent and OpenClaw files live under
`images/catalog/`.

## Credentials and connectors

Credentials are never baked into an image. Inputs such as
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or a channel token are optional at
deploy time. A customer can boot the computer first and add or rotate secrets
later:

```sh
export ANTHROPIC_API_KEY=...
agentpop sandbox secret set SANDBOX_ID --from-env ANTHROPIC_API_KEY
```

Secret list operations return only names and timestamps. Values are encrypted
by the control plane and passed only to the selected data-plane runtime.

Connector discovery comes from the live Composio toolkit catalog. Each
connector exposes its current tool catalog. Connecting grants all current tools
by default (`*`); customers may narrow the grant later.

## Public API

```text
GET    /v1/images?kind=agent|sandbox&q=...
POST   /v1/images/generate
GET    /v1/images/{imageId}
POST   /v1/images/{imageId}/build
POST   /v1/images/{imageId}/fork
POST   /v1/images/{imageId}/deploy

GET    /v1/sandboxes/{sandboxId}/secrets
PUT    /v1/sandboxes/{sandboxId}/secrets
DELETE /v1/sandboxes/{sandboxId}/secrets/{secretName}

GET    /v1/connectors?q=...
GET    /v1/connectors/{connectorId}/tools?q=...
```

The `/v1/marketplace` routes remain compatibility aliases. New clients should
use `/v1/images`.

## CLI

```sh
agentpop image list --kind agent
agentpop image get openclaw
agentpop image build openclaw
agentpop image fork openclaw --name my-openclaw --definition ./Dockerfile --build
agentpop image deploy openclaw --name personal-agent --lifecycle persistent

agentpop image generate \
  --kind sandbox \
  --prompt "Python computer with pandas and Playwright"
```

The TypeScript, Python, and Go clients expose `listImages`, `getImage`,
`generateImage`, `buildImage`, `forkImage`, and `deployImage` equivalents.
The MCP server exposes matching tools with the `agentpop_` prefix.

## Local and hosted runtime

The local compatibility plane builds Docker images and starts Docker
containers. Hosted Linux/KVM data-plane hosts prepare the same build output as
a Firecracker root filesystem and run it inside a jailed microVM. Caddy only
terminates TLS and routes the dashboard, API, and sandbox preview traffic; it
does not replace Firecracker.

Local preview URLs intentionally use `127.0.0.1`. Hosted compose and systemd
configuration set `PUBLIC_PREVIEW_BASE_URL=https://preview.agentpop.cloud`, so
production responses never advertise a loopback address.
