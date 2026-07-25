# AgentPop customer acceptance evidence — 2026-07-25

These screenshots were captured from the running local AgentPop stack at
`http://127.0.0.1:8088`. They accompany the machine-readable API/runtime and
browser acceptance results in the parent evidence directory.

Sensitive connector output is intentionally not shown. The Gmail connection
was exercised through the live Composio broker, but the screenshot records
only its connected state.

| # | Evidence | What it proves |
|---:|---|---|
| 01 | [Marketplace](01-marketplace.png) | Agents and environments share one searchable, filterable marketplace. |
| 02 | [Generated recipe review](02-generated-recipe-review.png) | Prompt output becomes a reviewable Dockerfile before any build begins. |
| 03 | [Immutable image build](03-image-building.png) | Approved recipe build has real progress and durable logs. |
| 04 | [Custom recipe ready](04-custom-recipe-ready.png) | The generated full-stack engineering image completed and is deployable. |
| 05 | [Complex sandbox configuration](05-create-complex-sandbox.png) | Name, image, 2 vCPU, 4 GiB, disk, environment, secret, port, idle, TTL, and egress controls are available. |
| 06 | [Live terminal/toolchain](06-runtime-terminal-toolchain.png) | Commands execute inside the deployed runtime; Python, Node, Go, Rust, files, environment, and secret injection were checked. |
| 07 | [Files](07-files.png) | Guest workspace files are listed through the Files API. |
| 08 | [Logs](08-logs.png) | Persisted runtime/exec logs are visible. |
| 09 | [Ports and preview](09-ports-preview.png) | A guest HTTP server is reachable through the AgentPop preview gateway. |
| 10 | [Metrics](10-metrics.png) | CPU, memory, disk, network, and process samples come from the runtime. |
| 11 | [SSH access](11-ssh-access.png) | The control plane returns an executable host-local SSH command. |
| 12 | [Events](12-events.png) | Resource-scoped lifecycle and command history is queryable. |
| 13 | [Sandbox settings](13-sandbox-settings.png) | Mutable runtime policy is inspectable and editable. |
| 14 | [Forked sandbox](14-forked-sandbox.png) | Fork created an independent runtime with copied workspace content. |
| 15 | [Live connectors](15-connectors-live.png) | Gmail is connected through Composio; no seeded/mock connection is displayed. |
| 16 | [Developer SDKs](16-developer-sdks.png) | TypeScript, Python, Go, CLI, OpenAPI, and examples are exposed to customers. |
| 17 | [MCP-first developer view](17-developer-mcp.png) | MCP discovery/configuration is a first-class customer surface. |
| 18 | [Fixed subscription](18-subscription-settings.png) | Hosted pricing is one fixed $20/month plan with no credits or usage currency. |
| 19 | [Customer overview](19-overview.png) | Live sandbox, recipe, connector, and plan state is summarized. |
| 20 | [Owner data plane](20-admin-data-plane.png) | The private owner UI exposes driver, host health, capacity, KVM truth, and runtime inventory. |
| 21 | [Owner control plane](21-admin-control-plane.png) | The private owner UI exposes control-plane health, components, desired state, and reconciliation. |

The retained validation sandbox is:

- ID: `sb-426b5c6485e155a6d819d675`
- Name: `customer-fullstack-e2e`
- Image: `agentpop/tpl-a-full-stack-agent-eng:v2`
- Resources: 2 vCPU, 4 GiB memory, 10 GB disk
- Preview: `http://127.0.0.1:8088/preview/sb-426b5c6485e155a6d819d675/19090/`
