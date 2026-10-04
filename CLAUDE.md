# AgentPop Claude Code handoff

Last verified: July 24-25, 2026 (America/Los_Angeles)

## Mission

There is one milestone: finish AgentPop as an open-source, self-hostable and
hosted product for cloud agents and isolated sandboxes. Do not rebuild the
project as a UI mock. Continue from the functioning control plane, data plane,
dashboard, SDKs, CLI, connector broker, eval harness, and Firecracker work
already present.

AgentPop is inspired by CreateOS's product scope and information architecture,
but it has original branding, code, API contracts, and implementation.

Read these before changing code:

1. `CLAUDE.md` (this file)
2. `docs/claude-repair-audit.md`
3. `docs/implementation-handoff.md`
4. `docs/product-acceptance-matrix.md`
5. `docs/product-and-architecture-plan.md`
6. `docs/createos-gap-analysis.md`
7. `ui_kits/dashboard/README.md`

The production React application is `apps/web`. The static files under
`ui_kits/dashboard` are a design/flow reference, not the production app.

## Repository condition

- Workspace: `/Users/sreeja/Documents/cloud-agents`
- Branch: `main`
- At handoff, the repository has no committed baseline: `git status --short`
  reports the project files as untracked. Do not discard them.
- Create a deliberate baseline commit before risky or broad rewrites if the
  user authorizes a commit.
- Do not run `git reset --hard`, `git clean`, or overwrite unrelated work.

## What is implemented

### Customer product

- Marketing, sign-in/sign-up, and the complete customer dashboard shell.
- Overview, sandboxes, sandbox detail, agents, connectors, templates,
  networks, storage, webhooks, audit, health, developer, and settings screens.
- Real sandbox create/list/detail/update/delete, pause/resume, fork, exec,
  terminal, secret-redacted stdout/stderr logs, files, directories, metrics,
  events, port exposure, preview proxy, and SSH command discovery.
- Cloud agent deployment backed by a sandbox, lifecycle controls, logs,
  connector grants, per-agent model keys, and key rotation.
- SDK-driven eval suites with deterministic assertions, optional model rubric
  scoring, custom metrics, release gates, persisted runs, and AgentOps-shaped
  scenario imports.
- Project settings, team membership, quotas, usage/credits, API keys, audit
  events, and signed webhooks.

### Control plane and data plane

- Go control plane: `cmd/control-plane`
- Go host agent: `cmd/host-agent`
- Durable developer state: `internal/state`
- Runtime abstraction: `internal/runtime`
- Local Docker compatibility driver for macOS.
- Linux/KVM Firecracker helper with jailer, cloned ext4 rootfs, TAP/NAT,
  metadata denial, egress policy, generated SSH credentials, lifecycle and
  cleanup.
- Owner-only operator console and `/private/v1/*` API for control-plane, host,
  runtime, reconcile, audit, operations, and redacted configuration views.

The control plane must not manipulate Firecracker or host networking directly.
It calls the host agent; the host agent selects Docker or Firecracker.

### Real connectors

The connector flow is not a local label or fake “connected” toggle.

- Broker: `services/connector-broker/src/server.mjs`
- Customer API: `cmd/control-plane/connectors.go`
- UI: `apps/web/src/pages/dashboard/Connectors.tsx`
- TypeScript SDK: `packages/sdk/src/client.ts`
- Python SDK: `sdk/python/agentpop/client.py`
- Go CLI: `cmd/agentpop/main.go`
- Contract: `api/openapi.yaml`

Implemented lifecycle:

1. `POST /v1/connectors/{id}/authorize` asks the server-side broker for a real
   Composio Connect Link.
2. The broker creates single-use, 15-minute OAuth state and never exposes
   `COMPOSIO_API_KEY` to the web app, SDK, agent, or sandbox.
3. `/v1/connectors/composio/callback` consumes state and verifies that the
   returned Composio connected account is active and matches owner/toolkit.
4. Exact Composio tool slugs are stored as centrally governed grants.
5. `/v1/connectors/{id}/tools/{tool}` validates connector and optional
   per-agent grants before invoking Composio MCP.
6. Revoke deletes the upstream connected account, local grant record, pending
   authorization state, and grants from agents.

Launch connectors: GitHub, Slack, Gmail, Google Drive, Notion, and Linear. The
live Composio catalog endpoint exposes the broader provider catalog.

“No provider accounts connected” is a valid empty state until a user clicks
**Connect with OAuth** and completes the provider's authorization screen. Do
not mark a provider connected before that callback succeeds.

The current connector owner is the developer-preview constant `local`.
Production work must scope owners/connections to organization and project.

### Developer surfaces

- OpenAPI 3.1 contract: `api/openapi.yaml`
- Zero-dependency TypeScript SDK: `packages/sdk`
- Python SDK: `sdk/python`
- Go CLI: `cmd/agentpop`
- MCP server: `cmd/agentpop-mcp`

## Current local runtime

The fully containerized stack was left healthy at:

- Product: `http://127.0.0.1:8088`
- Connector-enabled API through the web proxy:
  `http://127.0.0.1:8088/v1`
- Hot-reload dashboard: `http://127.0.0.1:5173`

Services:

- `agentpop-web`
- `agentpop-control-plane`
- `agentpop-host-agent`
- `agentpop-connector-broker`

The port `5173` Vite server was deliberately started with:

```bash
VITE_API_URL=http://127.0.0.1:8088 \
  pnpm --filter @agentpop/web dev --host 127.0.0.1
```

`compose.yaml` allows the `5173` origins so that hot reload can call the
connector-enabled `8088` stack. If a new terminal/session replaces the current
Vite process, start it with the same command.

The running connector broker received `COMPOSIO_API_KEY` server-side by
sourcing the existing local Agent Mason environment:

```bash
set -a
source /Users/sreeja/Downloads/kr-agents-mockup-20260622-144428/.env.local
set +a
docker compose up -d --build
```

Never print, commit, copy into a `VITE_*` variable, return through an API, or
inject the Composio platform key into a sandbox. For a durable local restart,
the user may put only `COMPOSIO_API_KEY=...` in an ignored `.env` file or use a
secret manager. `.env.example` documents the variable but contains no secret.

Customer model-provider keys are separate. They are accepted per agent as
write-only secrets, encrypted by the control plane, redacted on reads, and
injected only into that agent's sandbox.

## Current hosted test runtime

- Product: `http://35.252.115.228`
- Edge: Caddy v2.11.4 on public 80/443, Nginx on `127.0.0.1:8088`,
  control plane on `127.0.0.1:8080`, and connector broker on
  `127.0.0.1:7070`.
- Static address: `35.252.115.228`, reserved as
  `agentpop-management-ip`.
- Domain state: Caddy routing is installed; IONOS still needs the apex and
  `app`, `admin`, `api`, `preview`, and `www` records in
  `docs/hosting-agentpop-cloud.md`.
- Customer access: real GitHub OAuth session, restricted by
  `CUSTOMER_ALLOWED_GITHUB_LOGINS`; anonymous API requests are rejected.
- Owner console: `http://35.252.115.228/admin`, using a separate owner session.
- Management plane: `agentpop-control`.
- Firecracker data plane: `agentpop-firecracker-test` at private
  `10.138.0.2`.
- Cost-control state: `agentpop-firecracker-test` was stopped after validation
  on July 25, 2026 and is currently `TERMINATED`. Start it only for data-plane
  work and stop it again immediately after validation unless the user
  explicitly asks to keep it running.
- A new hosted smoke-test microVM (`hosted-logs`) was created with driver
  `firecracker`; real exec stdout/stderr, sandbox logs, SSH metadata, and its
  public preview were verified.
- Owner two-hop SSH into recovered guests works. The customer SDK/UI does not
  yet provision each customer's SSH public key.

Do not restore nginx key injection, `VITE_DISABLE_AUTH`, or browser-local
identity. Do not describe metadata records as live VMs without checking the
Firecracker PID identity, TAP device, and guest reachability. See
`docs/claude-repair-audit.md`.

## Verification status

Run:

```bash
go test ./...
pnpm install --frozen-lockfile
pnpm typecheck
pnpm qa:product
```

Latest full product acceptance evidence:

- File: `docs/acceptance-evidence/latest.jsonl`
- Passed: 82
- Failed: 0
- Partial: 3
- Skipped live: 2 (destructive provider revoke; local macOS KVM)
- Existing UI audit: 50 browser route/control checks passed with screenshots
  in `docs/acceptance-evidence/ui`

All connector acceptance rows pass:

- Composio-backed inventory
- Real Connect Link and pending OAuth state
- Safe callback consumption/redirect
- Live Composio catalog
- Invocation guard plus real read-only provider results (Gmail locally,
  GitHub on the hosted control plane)
- Grant mutation guard
- Upstream revoke implementation; destructive live revoke is opt-in in
  acceptance via `AGENTPOP_ALLOW_CONNECTOR_REVOKE=1`

Browser verification also clicked GitHub **Connect with OAuth** from both
`8088` and `5173` and reached the real GitHub authorization screen through
Composio. The running broker has real connected accounts: Gmail was invoked
read-only locally and GitHub read-only on hosted. Provider content was not
printed or stored in acceptance evidence.

`TPL-001/002/003` now pass against a real build pipeline: template
definitions (FROM + RUN subset) build inside a data-plane build sandbox, are
committed into an immutable image through the host agent (`docker commit`
locally; template-rootfs snapshot on the Firecracker helper), with persisted
per-step logs, deprecation enforcement on new sandbox creation, and
SDK/CLI/OpenAPI/UI coverage.

## Known unfinished work

These are current evidence-backed gaps, in priority order:

1. **AUTH-001 — customer identity/tenancy (PARTIAL).**
   Hosted sign-in now uses a signed GitHub OAuth session and explicit login
   allowlist. Email/Google login, organizations/projects, membership, and
   tenant-scoped authorization remain. The owner/operator login is a separate
   signed private session; preserve that boundary.
2. **NET-003 — enforced sandbox networking (PARTIAL).**
   Network membership is persistent topology metadata; runtime overlay
   isolation/routing is not enforced.
3. **STO-003 — guest storage attachment (PARTIAL).**
   S3-compatible credentials are encrypted/redacted and attachments persist,
   but buckets are not credential-brokered or mounted in the guest.
4. **FIRE-001 — repeatable live proof and host hardening.**
   The current recovery code is live on `agentpop-firecracker-test`: existing
   disks were preserved, SSH works, agent secrets were reapplied, and
   pause/resume was exercised. The data plane is currently active for the
   hosted test. Capture a durable evidence file for this repair and stop it
   when the hosted demo is not needed.

Additional production gates remain in `docs/implementation-handoff.md`:
PostgreSQL/multi-tenancy, durable reconciliation jobs, host mTLS, vsock guest
agent, stronger jail/network hardening, the pending IONOS DNS cutover, durable
webhook delivery, billing ledger, backups, leak/isolation tests, and density
benchmarks.

## Recommended continuation order

Do not split the work into cosmetic milestones. Continue against the single
product acceptance gate:

1. Extend GitHub identity to organization/project tenancy without weakening
   the separate owner console.
2. Replace JSON state with PostgreSQL and a reconciliation queue; migrate
   connector ownership from `local` to organization/project.
3. Enforce data-plane networks and mount/credential-broker registered storage.
4. Repeat the complete GCP Firecracker sandbox, template build/commit, SSH,
   file, preview, fork, pause/resume, agent, connector-grant, and eval flows
   before a release; the hosted create/exec/logs/preview path currently passes.
   Stop `agentpop-firecracker-test` after the run to avoid idle N2 compute cost.
5. Complete the IONOS DNS records. The management build, static IP, firewall,
   Caddy edge, web app, control plane, connector broker, and Firecracker host
   are already deployed.

After each material change:

```bash
gofmt -w cmd/control-plane/*.go cmd/host-agent/*.go cmd/agentpop/*.go internal/*/*.go
go test ./...
pnpm typecheck
pnpm qa:product
```

Use `pnpm qa:ui` for the repository's screenshot/control inventory when
browser automation is available.

## Product and security invariants

- No fake success states. UI success must be backed by a real API transition.
- No provider/platform secret in browser bundles or `VITE_*`.
- No secret values in list/get responses, logs, audit metadata, or screenshots.
- Agent model keys are scoped per agent and write-only after submission.
- Connector calls require both a connected provider and an allowed tool slug;
  agent calls additionally require the connector on that agent.
- Public customer API keys cannot access `/private/v1/*`.
- Control-plane and data-plane state must remain visibly separate in both API
  and owner UI.
- Firecracker is the Linux production isolation target. Docker is the macOS
  compatibility driver, not a claim of microVM isolation.
- Caddy/nginx are edge proxies only; neither replaces Firecracker.
- Keep the core open source. Hosted AgentPop should run the same source with
  managed operations, capacity, TLS, backups, billing, and support.

## Useful handoff references

- `docs/implementation-handoff.md` — detailed local/GCP runtime history
- `docs/composio-connector-acceptance.md` — connector threat model and tests
- `docs/hosting-agentpop-cloud.md` — hosted topology and DNS
- `docs/model-credentials.md` — per-agent model-key boundary
- `docs/agent-evals.md` — eval design and API
- `docs/operator-console.md` — owner-only control/data-plane UI
- `design-reference/createos/README.md` — screenshot index
- `design-reference/createos/CLAUDE-DESIGN-PROMPT.md` — UI design constraints
