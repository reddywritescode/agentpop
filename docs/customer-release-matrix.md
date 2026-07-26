# AgentPop customer release matrix

This is the release contract for the current AgentPop product. It covers the
hosted customer journey, the open-source self-hosting journey, and every public
developer interface. A rendered screen is not sufficient: state-changing rows
must be backed by durable control-plane state and observable data-plane
behavior.

Product boundary:

- one runtime primitive: a sandbox;
- agents are agent-kind images deployed as sandboxes;
- one image marketplace, filterable by All, Agents, and Sandboxes;
- one hosted plan: AgentPop Pro at a fixed **$20/month**;
- no customer-facing Services, Applications, credits, or usage currency;
- customer UI exposes Marketplace, Sandboxes, Connectors, Developer, Settings;
- owner-only control-plane and data-plane screens live under `/admin`.

Status vocabulary:

- `VERIFYING` — included in the current release audit.
- `PASS` — verified on the running local stack.
- `PASS-LIVE` — verified against Firecracker/KVM or a live third-party provider.
- `PARTIAL` — usable locally, with a named hosted-production gap.
- `SKIP-LIVE` — the compatibility implementation passed, but the destructive or
  Linux/KVM-only proof was intentionally not run in this audit.
- `BLOCKED-EXTERNAL` — implementation is ready but requires DNS, payment, or
  another owner-controlled external action.
- `FAIL` — broken, fake, or contradicted by runtime evidence.

## Public and authentication

| ID | Customer action | Expected result | Contract | Status |
|---|---|---|---|---|
| PUB-001 | Open `/` | Product positioning, open-source model, and fixed pricing render | Web SPA | PASS |
| PUB-002 | Features/Open source/Pricing navigation | Scrolls to the correct section | Browser UI | PASS |
| PUB-003 | Read the API | Opens the real OpenAPI document | `/openapi.yaml` | PASS |
| PUB-004 | Get started | Opens signup | `/signup` | PASS |
| AUTH-001 | Open sign in | Sign-in form renders | `/signin` | PASS |
| AUTH-002 | Open signup | Fixed $20/open-source copy renders; no credit promise | `/signup` | PASS |
| AUTH-003 | Sign out | Clears the customer session and returns to sign in | Customer session | PASS |
| AUTH-004 | Use hosted multi-tenant identity | GitHub signed sessions work; email/Google identity and tenant-scoped resource authorization are still required | Hosted auth | PARTIAL |

## Customer shell and overview

| ID | Customer action | Expected result | Contract | Status |
|---|---|---|---|---|
| NAV-001 | Use sidebar | Only Overview, Marketplace, Sandboxes, Connectors, Developer, Settings appear | App shell | PASS |
| NAV-002 | Inspect plan card | Shows `$20 per month`, never credits | `GET /v1/subscription` | PASS |
| OVR-001 | Open overview | Live sandbox, recipe, connector, and subscription counts render | Public APIs | PASS |
| OVR-002 | Use quick actions | Opens the image marketplace, blank sandbox flow, or connectors | Browser routes | PASS |

## Unified image marketplace

| ID | Customer action | Expected result | Contract | Status |
|---|---|---|---|---|
| IMG-001 | Open Marketplace | Agent and sandbox images render together | `GET /v1/images` | PASS |
| IMG-002 | Filter All/Agents/Sandboxes | Results match image kind | `kind` query | PASS |
| IMG-003 | Search images | Results match text without losing filter | `q` query | PASS |
| IMG-004 | Inspect source | Dockerfile, manifest, README, license, credentials, and connectors render | Image API/UI | PASS |
| IMG-005 | Build curated image | Starts a real immutable image build | `POST .../build` | PASS |
| IMG-006 | Describe a computer | Configured model generates validated multi-file image source; nothing builds before approval | `POST /v1/images/generate` | PASS-LIVE (local Ollama) |
| IMG-007 | Review/edit generated Dockerfile | Nothing builds before explicit approval | Review modal | PASS |
| IMG-008 | Fork image | Creates an independent project-owned image definition | `POST .../fork` | PASS |
| IMG-009 | Deploy image | Creates a sandbox with image kind/id | `POST .../deploy` | PASS |
| IMG-010 | Deploy agent image without key | Deployment succeeds; optional key can be added later | Sandbox secrets API | PASS |
| IMG-011 | Choose lifecycle | Persistent and ephemeral deployments persist the selected policy | Image/sandbox API | PASS |

## Sandbox creation and inventory

| ID | Customer action | Expected result | Contract | Status |
|---|---|---|---|---|
| SBX-001 | Create blank sandbox | Real runtime reaches running state | `POST /v1/sandboxes` | PASS |
| SBX-002 | Configure name/size/image/disk | Requested values persist | Sandbox spec | PASS |
| SBX-003 | Configure environment | Non-secret values are available in guest | Runtime spec | PASS |
| SBX-004 | Configure model/API secrets | Names are returned; values never return | Encrypted write-only secrets | PASS |
| SBX-005 | Configure egress/idle/TTL/public web | Desired policy persists | Sandbox spec | PASS |
| SBX-006 | Search and state-filter rows | Matching sandboxes remain visible | Browser UI | PASS |
| SBX-007 | Inspect runtime row | ID, state, resources, image, address, disk, age render | `GET /v1/sandboxes` | PASS |

## Sandbox detail and lifecycle

| ID | Customer action | Expected result | Contract | Status |
|---|---|---|---|---|
| RUN-001 | Run terminal command | Command executes inside runtime; exit/stdout/stderr render | `POST .../exec` | PASS |
| RUN-002 | Read logs | Persisted real runtime output renders with secrets redacted | `GET .../logs` | PASS |
| RUN-003 | List files | Current `/workspace` contents render | `GET .../files` | PASS |
| RUN-004 | Upload/download file | Guest bytes round-trip exactly | Files API | PASS |
| RUN-005 | Create/delete folder or file | Guest filesystem mutates and refreshes | Files/directories API | PASS |
| RUN-006 | Read metrics | Live memory, disk, process, and CPU samples render | `GET .../metrics` | PASS |
| RUN-007 | Read events | Resource-scoped lifecycle/audit history renders | `GET .../events` | PASS |
| RUN-008 | Request SSH access | Host-local SSH works and the UI returns an executable command; a public customer-laptop SSH gateway/key flow remains | `GET .../ssh` | PARTIAL |
| RUN-009 | Expose public port | Preview route reaches guest HTTP service | Ports/preview gateway | PASS |
| RUN-010 | Remove exposed port | Preview route is revoked | Ports API | PASS |
| RUN-011 | Fork sandbox | Independent runtime contains copied workspace | `POST ...:fork` | PASS |
| RUN-012 | Pause/resume | Runtime and desired state transition correctly | Lifecycle APIs | PASS |
| RUN-013 | Apply settings | Mutable policy persists and affects runtime where supported | `PATCH .../sandboxes/{id}` | PASS |
| RUN-014 | Destroy sandbox | Runtime and desired state are removed after confirmation | `DELETE .../sandboxes/{id}` | PASS |

## Connectors

| ID | Customer action | Expected result | Contract | Status |
|---|---|---|---|---|
| CON-001 | List connectors | Catalog/configuration comes from broker status, not seeded UI data | `GET /v1/connectors` | PASS |
| CON-001A | Search all connectors | Live Composio catalog returns up to 1,000 toolkits | `q` query | PASS-LIVE |
| CON-001B | Inspect connector tools | Real current tool names and schemas render | `GET .../tools` | PASS-LIVE |
| CON-002 | Start OAuth | Real Composio Connect Link and single-use state are created | `POST .../authorize` | PASS-LIVE |
| CON-003 | Complete OAuth | Account is validated upstream before success persists | Callback/broker | PASS-LIVE |
| CON-004 | Edit tool grants | Only allowlisted Composio tools persist | `PATCH .../connections` | PASS-LIVE |
| CON-005 | Invoke granted read tool | Real provider response returns and audit event records success | `POST .../tools/{tool}` | PASS-LIVE |
| CON-006 | Invoke unconnected/ungranted tool | Request is denied without fabricating a connection | Broker policy | PASS |
| CON-007 | Revoke | Upstream account and local/agent grants are removed | `DELETE .../connections` | SKIP-LIVE |

## Developer experience

| ID | Customer action | Expected result | Contract | Status |
|---|---|---|---|---|
| DEV-001 | Open Developer | OpenAPI, MCP, API keys, CLI, TS/Python/Go examples render | Browser UI | PASS |
| DEV-002 | Fetch discovery document | Plain text, not SPA HTML | `/llms.txt` | PASS |
| DEV-003 | Fetch OpenAPI | Valid OpenAPI YAML with images, sandbox secrets, connector tools, and subscription paths | `/openapi.yaml` | PASS |
| DEV-004 | Create scoped API key | Secret is shown once; listing is metadata-only | API key APIs | PASS |
| DEV-005 | Use CLI | Image and full sandbox lifecycle work against live API | `agentpop` | PASS |
| DEV-006 | Use MCP | Image/connector/secret initialize-list-call work over stdio | `agentpop-mcp` | PASS |
| DEV-007 | Use TypeScript SDK | Image, connector, subscription, and sandbox methods call live API | `packages/sdk` | PASS |
| DEV-008 | Use Python SDK | Image, connector, subscription, and sandbox methods call live API | `sdk/python` | PASS |
| DEV-009 | Use Go SDK | Image, connector, subscription, and sandbox methods call live API | `sdk/go` | PASS |

## Subscription, owner plane, and hosted edge

| ID | Customer/owner action | Expected result | Contract | Status |
|---|---|---|---|---|
| SUB-001 | Open Subscription | Exactly one hosted plan at fixed `$20/month`; no credits/meters | `GET /v1/subscription` | PASS |
| SUB-002 | Subscribe hosted | Redirects only when owner configured a Stripe Checkout URL | `POST .../checkout` | BLOCKED-EXTERNAL |
| SUB-003 | Self-host | Core runs without AgentPop subscription gate | Docker Compose | PASS |
| ADM-001 | Owner login | Private session is separate from customer auth | `/admin/login` | PASS |
| ADM-002 | Control-plane UI/API | Health, components, desired state, and audit render | Private API | PASS |
| ADM-003 | Data-plane UI/API | Hosts, capacity, driver, and runtime inventory render | Private API | PASS |
| EDGE-001 | Public domains | Caddy routes marketing/app/admin/API/preview with automatic TLS | Hosted Caddy config | BLOCKED-EXTERNAL |
| EDGE-002 | Firecracker production runtime | Linux/KVM host runs jailed microVMs; local macOS uses Docker compatibility | Host agent | SKIP-LIVE |

## Deliberate exclusions

| ID | Excluded surface | Required behavior | Status |
|---|---|---|---|
| EXC-001 | Customer Services | No sidebar item or deploy flow | PASS |
| EXC-002 | Customer Applications/Apps | No sidebar item or marketplace split | PASS |
| EXC-003 | Credits/usage currency | No balance, top-up, or metered pricing UI | PASS |
| EXC-004 | Separate agent scheduler/runtime | Agent recipes deploy through sandbox APIs | PASS |
| EXC-005 | Workflow builder | No n8n-style workflow editor, scheduler, or customer navigation | PASS |

## Evidence locations

- Automated API/runtime evidence: `docs/acceptance-evidence/latest.json`
- Automated browser evidence: `docs/acceptance-evidence/ui/latest.json`
- Release-candidate screenshots: `docs/acceptance-evidence/customer-image-platform-2026-07-25/`
- Final audit report: `docs/customer-release-report-2026-07-25.md`
