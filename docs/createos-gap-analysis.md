# CreateOS capability gap analysis

Last verified: 2026-07-23

This document is the implementation contract for one milestone: deliver an
open-source, self-hostable, and commercially hosted CreateOS-class product.
It is a capability comparison, not a plan to copy CreateOS source code,
trademarks, response formats, or visual identity.

Managed databases, caches, queues, and the broader application PaaS are outside
this product boundary. Sandboxes, cloud agents, connectors, the dashboard,
public API, SDKs, CLI, MCP server, and visible control/data planes are inside it.

## Evidence used

Primary public sources:

- [CreateOS developer hub](https://createos.sh/docs)
- [CreateOS Sandbox REST overview](https://nodeops.network/createos/docs/Sandbox/REST-API/Overview)
- [CreateOS API authentication and response format](https://nodeops.network/createos/docs/API-MCP/CreateOS-API)
- [CreateOS MCP documentation](https://nodeops.network/createos/docs/API-MCP/CreateOS-MCP)
- [CreateOS Sandbox SDK](https://github.com/NodeOps-app/createos-sandbox-sdk)
- [CreateOS CLI](https://github.com/NodeOps-app/createos-cli)
- [CreateOS MCP server](https://github.com/NodeOps-app/createos-mcp)
- [CreateOS sandbox-agent](https://github.com/NodeOps-app/sandbox-agent)

The public repositories are developer-facing clients and integrations. They do
not expose enough code to establish CreateOS's private control-plane or
data-plane implementation. Any infrastructure comparison below is therefore
about observable behavior and documented contracts, not an assertion about
their internals.

## Public product comparison

Legend:

- **Implemented**: works end to end against the local runtime.
- **Partial**: some real behavior exists, but it does not satisfy the target.
- **Missing**: UI-only, static data, or absent.
- **Excluded**: deliberately outside this product boundary.

| Capability | CreateOS public behavior | AgentPop today | Required clone-complete behavior |
|---|---|---:|---|
| Dashboard shell and sandbox screens | Human dashboard for create/list/detail/lifecycle | Implemented | Keep every displayed action backed by the API |
| Docker-compatible local runtime | Sandbox abstraction presented through API/SDK | Implemented | Retain as the macOS/local compatibility runtime |
| Firecracker data plane | CreateOS does not publicly document Firecracker as its runtime | Partial | Firecracker is our production Linux runtime; pass the same conformance tests as Docker |
| Exposed control/data planes | CreateOS hides infrastructure topology | Implemented | Preserve host inventory, capacity, driver, health, and placement visibility |
| Owner operations console | CreateOS does not expose its internal fleet UI publicly | Implemented | Keep `/admin` and `/private/v1` isolated from customer auth; add multi-host placement and fleet upgrades |
| Sandbox create/get/list/destroy | Documented REST and SDK operations | Implemented | Add tenant ownership, pagination, async operations, and stable errors |
| Buffered command execution | Documented exec API | Implemented | Keep; dashboard Terminal now calls this real endpoint |
| Streaming exec and interactive PTY | NDJSON streaming, shell/tunnel workflows in public clients | Missing | WebSocket or SSE stream with resize, stdin, stdout, stderr, exit, cancel |
| SSH access | CLI supports shell-style access; product UI exposes terminal | Implemented | Keep exact SSH command, scoped temporary credentials, expiry, and audit |
| File list/upload/download | Raw file upload/download APIs are documented | Implemented | Binary list/upload/download/delete/mkdir work through UI, REST, SDKs, CLI, and MCP; add resumable large-object handoff |
| Pause/resume | Durable CPU, memory, and disk checkpoint behavior is documented | Partial | Firecracker snapshot to object storage, release host resources, compatible restore |
| Fork | Documented asynchronous fork | Partial | Docker and Firecracker copy `/workspace` and inherited policy through the runtime contract; production needs durable snapshot/reflink fork and async operations |
| Lifecycle operations | Documented operations can return `202` with polling guidance | Partial | Operation resources, `Location`, retry/poll hints, cancellation, reconciliation |
| Sandbox status model | Includes creating, pausing, paused, resuming, forking, destroying, failed | Partial | Align public state machine without copying response envelopes |
| Idempotency and retries | SDK exposes retry/error behavior | Partial | Persist mutation keys, replay exact result, SDK retry policy, conflict detection |
| Shapes/root filesystems/hosts | Catalog and identity endpoints are documented | Partial | Versioned catalog with regions, availability, architecture, image digest, deprecation |
| Templates | Asynchronous Dockerfile builds and build logs are documented | Partial | Build service, immutable image artifacts, signed metadata, streamed logs |
| Resize | Disk and compute resize behavior is documented | Partial | Docker CPU/memory limits update live and are audited; Firecracker needs stop/snapshot/restore and disk resize |
| Auto-pause and TTL | Creation controls are exposed | Implemented | Five-second reconciler enforces idle pause and TTL destroy with audit events; hosted scheduling still needs a durable worker |
| Public preview ports | Dashboard shows public web URLs | Partial | Local gateway implements public/org/signed modes and revocation; hosted needs regional routing, wildcard DNS/TLS, and abuse controls |
| Private networks | Network create/attach/detach are documented | Partial | Persistent network objects and attachment topology work; per-VM interfaces, cross-host encryption, and isolation enforcement remain |
| Egress policy | Allow/deny egress is exposed at create and update time | Partial | Enforced for Docker and Firecracker, DNS-safe rules, live updates, audit |
| Persistent/S3 storage | S3-compatible disk registration/attachment is documented | Partial | S3 credentials are AES-GCM encrypted and never returned; attachment topology works, but guest mounting and a credential broker remain |
| Metrics and usage | Account, sandbox, and time-series metrics are documented | Partial | Live guest/cgroup metrics replaced random dashboard charts; add durable time series, metering ledger, and exports |
| Events and audit | Lifecycle events and dashboard audit log are exposed | Partial | Per-resource persisted operations replaced canned event timeline; add durable stream retention and SSE |
| Webhooks | Signed lifecycle webhooks are documented | Partial | Persistent subscriptions, secret-once creation, HMAC-SHA256 delivery, test, and SSRF checks work; add durable retries, replay, and delivery log |
| Self-signal | Loopback pause/delete signal is documented | Missing | Guest-scoped identity endpoint with narrow self lifecycle actions |
| API authentication | API/access token headers are documented | Partial | Owner console has signed expiring sessions, host agents use bearer auth, and customer keys are hashed/expiring/scoped; add user OIDC, rotation, and rate limits |
| Authorization | Observable product has account/project resources | Missing | Server-side tenant isolation and RBAC on every resource and stream |
| Error contract | SDK publishes typed errors | Partial | Stable error schema, request ID, retryability, field errors, generated typed errors |
| Pagination/filtering | REST lists document `limit` and `offset` | Missing | Cursor pagination, filters, ordering, consistent list envelope |
| OpenAPI | Public docs cover APIs but no single complete spec was found in the inspected repos | Implemented | Public spec covers all 54 shipped public path templates; private operator API has a separate 12-path spec; add generated contract tests and stream handshakes |
| TypeScript SDK | Public zero-runtime-dependency SDK with stateful sandbox helper | Implemented | Current public resource routes and ergonomic sandbox helpers compile; add generated retries, pagination, and streaming clients with the production contract |
| Python SDK | Comparable developer expectation for agent ecosystems | Implemented | Standard-library sync client covers current public resources; add async, retries, pagination, and streaming with the production contract |
| CLI | Public Go CLI covers sandbox plus broader deployment workflows | Implemented | Current local product surface works, including resources and agents; auth onboarding, interactive tunnel/PTY, operation polling, and owner admin remain production extensions |
| MCP | Public server advertises a broad tool catalog | Implemented | Stdio server exposes 50 tools with risk hints across sandbox, agent, connector, network, storage, webhook, member, key, project, quota, host, and audit surfaces; add HTTP transport and stream tools |
| Cloud agent creation | Dashboard exposes an OpenClaw-style deployment | Partial | Actually run and supervise the selected agent inside its sandbox |
| Agent sessions/events | `sandbox-agent` exposes HTTP/SSE sessions for coding agents | Missing | Guest agent service for session lifecycle, events, permissions, cancel, and reconnect |
| Agent evaluations | No comparable eval harness was found in the inspected CreateOS public surface | Implemented | Keep Open AgentOps-compatible suites, per-agent sandbox execution, deterministic and rubric checks, SDK/CLI automation, release gates, and retained history |
| Connectors | Dashboard catalog lists productivity/developer systems | Implemented | Live Composio catalog, OAuth Connect Links, single-use callback state, durable MCP sessions, validated grants, invocation, audit, and upstream revocation |
| Managed databases/caches/queues | CreateOS dashboard advertises managed services | Excluded | Do not implement |
| General application PaaS | CreateOS CLI/MCP include deployments, domains, environments, cron, logs | Excluded | Do not implement except what is necessary for sandbox preview routing |

## API contract comparison

The goal is analogous coverage with our own coherent contract. We should not
copy CreateOS's JSend envelope, header names, or identifiers simply for visual
parity.

| Contract concern | CreateOS observable contract | AgentPop target |
|---|---|---|
| Base path | Dedicated sandbox API host | `/v1` on a regional control-plane host |
| Authentication | `X-Api-Key`, `X-Auth-Token`, or `X-Access-Token` | Standard `Authorization: Bearer`, scoped project keys, and OIDC user sessions |
| Success envelope | JSend-style responses | Direct resources and `{items, nextCursor}` lists |
| Mutation replay | Client retry behavior is documented | Required `Idempotency-Key` with durable replay |
| Long operations | `202` plus poll guidance | `202`, `Location: /v1/operations/{id}`, `Retry-After`, operation event stream |
| Lists | `limit`/`offset` | Cursor pagination with explicit filters and stable ordering |
| Exec | Buffered JSON and NDJSON streaming | Buffered JSON plus WebSocket multiplexing |
| Files | Raw binary HTTP bodies | Raw binary bodies, checksums, byte limits, and resumable object-store handoff for large files |
| Errors | Typed client errors | RFC 9457-style problem details with stable AgentPop codes |
| Events | Webhooks and runtime streams | Signed webhooks, SSE resource events, WebSocket interactive streams |

## Repository comparison

The number of repositories is not a parity requirement. CreateOS has separate
public repositories for its CLI, sandbox SDK, MCP server, agent integration,
Claude plugin, template, package distribution, and related utilities. Its core
platform is not present in those public repositories.

AgentPop should remain a monorepo until a component needs an independent
release cadence:

```text
api/openapi.yaml             public API source of truth
apps/web                     hosted and self-hosted dashboard
cmd/control-plane            public API, desired state, reconciliation
cmd/host-agent               privileged data-plane service
cmd/firecracker-runtime      Firecracker lifecycle helper
cmd/guest-agent              in-VM exec/files/agent sessions
cmd/agentpop               Go CLI
packages/sdk                 TypeScript SDK
sdk/python                   Python SDK
packages/mcp                 MCP server
images                       kernel/rootfs/template builds
deploy                       local, GCP test host, and hosted deployment
docs                         product, operations, security, API, and UI handoff
```

Release automation may publish these as separate packages and binaries without
splitting source ownership across repositories.

## Current dashboard truth table

| Screen/action | Current behavior |
|---|---|
| Sign in and dashboard shell | Local session UI; not real identity |
| Sandbox list/create/pause/resume/destroy | Real control-plane and runtime |
| Sandbox Terminal | Real buffered exec after the 2026-07-23 wiring change |
| Sandbox SSH | Real control-plane SSH metadata and verified smoke-test access |
| Sandbox Files | Real list/upload/download/delete/mkdir through the data plane |
| Ports | Real expose/revoke APIs and a functioning local preview proxy; hosted DNS/TLS is not implemented |
| Metrics | Real live guest/cgroup resource samples; historical storage is not implemented |
| Events | Real persisted resource operations; SSE streaming is not implemented |
| Fork | Docker and Firecracker workspace fork with inherited sandbox policy are verified; production still needs snapshot/reflink efficiency and durable async operations |
| Shape/idle/network/storage settings | Shape and lifecycle mutations are real; network/storage attachments persist but are not enforced/mounted in the runtime |
| Agents | Create/list/stop/restart/lifecycle logs are real; no supervised in-guest agent process yet |
| Agent evaluations | Create/list/delete suites, execute them inside the selected agent sandbox, persist case metrics/checks, and inspect results are real; distributed fan-out and artifact retention remain hosted extensions |
| Connectors | Catalog, OAuth connection state, tool grants, brokered invocation, revoke, and audit are real; live provider proof requires user OAuth |
| Networks/storage/webhooks | Persistent CRUD/attachment/delivery UI is functional; runtime enforcement/mounting and durable webhook retries remain |
| Audit/health/capacity/usage/quotas | Real local state and audit; quota requests persist, while hosted metering and billing processor remain |
| Owner operator console | Real signed login, private APIs, process/host inventory, drain, reconcile, runtime inventory, audit, and safe configuration |
| Team/API keys/billing mutations | Member roles, hashed scoped API keys, local credit simulator, project defaults, and project deletion are functional |

Every simulated or non-functional item above must either become real or be
removed before the product is called clone-complete.

## The one acceptance gate

The single milestone is complete only when all of the following are true:

- Every visible dashboard control has a real, authorized API operation and
  accurate loading, error, and lifecycle state. There is no fake terminal,
  random metric, canned event, or success-only mutation.
- OpenAPI describes every public route. Contract tests run the same scenario
  suite through raw HTTP, TypeScript SDK, Python SDK, Go CLI, and MCP.
- Local Docker and hosted Firecracker data planes pass the same create, exec,
  files, SSH, preview, pause/resume, fork, network, egress, storage, and destroy
  conformance suite.
- Organizations, projects, scoped credentials, RBAC, quotas, idempotency,
  pagination, operation resources, audit, signed webhooks, and metering are
  enforced server-side.
- A cloud agent is a supervised process inside an isolated sandbox, supports
  sessions/events/logs/restart, and can use connector grants without receiving
  provider refresh tokens.
- The open-source distribution installs locally and on a supported Linux/KVM
  host; the hosted distribution uses the same code plus managed fleet, billing,
  abuse, backup, and operations integrations.
- Security tests cover cross-tenant compute, network, storage, metadata,
  connector token, snapshot, and preview isolation.
- Managed databases, caches, queues, and a general application PaaS remain out
  of scope.

## Workstreams inside the milestone

These are parallel parts of the same deliverable, not separate milestones:

1. Contract: complete OpenAPI, operation model, auth/RBAC, pagination, errors,
   idempotency, SDK generation, CLI, MCP, and served documentation.
2. Sandbox runtime: streaming terminal, files, previews, durable pause/resume,
   fork, resize, auto-pause/TTL, templates, metrics, events, cleanup.
3. Network/storage: private networks, cross-host routing, egress enforcement,
   persistent disks, snapshots, and signed preview access.
4. Agents/connectors: guest agent service, agent supervision, sessions, logs,
   OAuth broker, grants, token proxy, revocation, and audit.
5. Product UI: remove all simulation and make every reference screen functional
   in both self-hosted and hosted configurations.
6. Hosted operations: scheduler/reconciler, Postgres state, queue, object store,
   fleet lifecycle, billing/metering, rate limits, abuse controls, backup,
   observability, and support tooling.
7. Verification: contract, conformance, isolation, load, chaos, upgrade,
   recovery, and clean-machine installation tests.
