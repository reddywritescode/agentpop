# Unified runtime and image contract

AgentPop has one runtime primitive: an isolated sandbox. An “agent” is a
sandbox created from an agent image, with optional model credentials and connector
grants. It is not a separate scheduler, VM type, or billing unit.

## Customer surface

- **Images** — search All, Agents, or Sandboxes; inspect and build curated
  Dockerfile images; generate or fork reviewable source before building.
- **Sandboxes** — every running environment or agent; terminal, commands,
  files, logs, metrics, preview ports, SSH, pause/resume, and fork.
- **Connectors** — real OAuth/API-key connections through the connector broker,
  with explicit action grants.
- **Developer** — OpenAPI, API keys, MCP, CLI, TypeScript, Python, and Go.
- **Settings** — fixed AgentPop Pro subscription at $20/month for the hosted
  service. The open-source self-hosted build has no AgentPop subscription gate.

There are no customer-facing Services, Applications, credits, or usage-meter
screens. Network, storage, webhook, audit, and platform topology APIs remain
available to the owner/operator plane and for backward compatibility.

## Control plane

The Go control plane owns authentication, tenant-scoped state, recipes,
template builds, scheduling, encrypted secret storage, connector grants,
audit events, subscription metadata, and API idempotency. Customer APIs never
return secret values.

Canonical product endpoints:

```text
GET  /v1/images?kind=agent|sandbox&q=...
POST /v1/images/generate
GET  /v1/images/{id}
POST /v1/images/{id}/build
POST /v1/images/{id}/fork
POST /v1/images/{id}/deploy

GET  /v1/sandboxes
POST /v1/sandboxes
GET  /v1/sandboxes/{id}
POST /v1/sandboxes/{id}/exec
GET  /v1/sandboxes/{id}/secrets
PUT  /v1/sandboxes/{id}/secrets
GET  /v1/sandboxes/{id}/ssh
POST /v1/sandboxes/{id}:fork

GET  /v1/subscription
POST /v1/subscription/checkout
```

The generator is deliberately deterministic and allowlisted. A prompt chooses
known packages; user-supplied shell fragments are never copied into the
Dockerfile. The user reviews and can edit the Dockerfile before a real template
build starts. Model and channel keys are optional at deployment and can be
added or rotated later without rebuilding the image.

## Data plane

The data plane receives a normalized sandbox spec and the decrypted secrets
needed only for that boot. Local development uses Docker. Production Linux KVM
hosts use jailed Firecracker microVMs. The host agent owns guest lifecycle,
disk/image preparation, networking, command execution, files, SSH, metrics,
and port exposure. Caddy is the HTTPS edge and preview router; it does not
replace Firecracker isolation.

## Public clients

The same contract is implemented by:

- `api/openapi.yaml`
- `packages/sdk` — TypeScript
- `sdk/python` — Python
- `sdk/go` — Go
- `cmd/agentpop` — CLI
- `cmd/agentpop-mcp` — stdio MCP server

Legacy `/v1/marketplace`, `/v1/agents`, catalog, topology, and credit endpoints remain compatibility
surfaces but are not the product’s primary information architecture.

There is deliberately no n8n-style workflow product. Multi-agent frameworks
such as CrewAI are simply agent images deployed through this same contract.
