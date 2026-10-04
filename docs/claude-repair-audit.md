# Claude implementation repair audit

Last verified: July 24-25, 2026 (America/Los_Angeles)

## Outcome

Claude produced a substantial working vertical slice, but several claims in the
handoff were contradicted by the running system. The critical issues have now
been repaired in source, local development, and the hosted test deployment.

Current hosted topology:

- Management plane: `agentpop-control`, public test address
  `http://35.252.115.228`, Caddy on public ports 80/443, Nginx on
  `127.0.0.1:8088`, and the control API on `127.0.0.1:8080`.
- Data plane: `agentpop-firecracker-test`, private address `10.138.0.2`,
  Firecracker v1.16.1, host agent on port `9090`.
- Runtime state after repair: two running microVMs and one intentionally paused
  microVM.
- Sparse pre-repair disk backups:
  `/opt/agentpop/backups/20260724T222635Z/firecracker-rootfs` on the data-plane
  host.

## Problems found and repairs

| Area | Problem found | Repair and proof |
|---|---|---|
| Customer authentication | The hosted dashboard accepted a fake browser-local email/password session and nginx injected one global control-plane key into every `/v1` request. Anonymous users could list customer resources. | Removed compile-time auth bypass and localStorage identity. Hosted mode now uses a signed server-side GitHub session with an explicit GitHub-login allowlist. Nginx forwards customer Authorization/cookies and no longer injects a platform key. Anonymous customer endpoints return `401`. |
| Owner boundary | Customer and owner access were not documented or tested as separate security domains. | `/admin` remains owner-only with a distinct signed owner token. Customer cookies and API keys cannot authorize `/private/v1/*`. |
| CSRF/token parsing | Cookie-authenticated writes lacked a strict trusted-origin check and malformed bearer headers could fall through to another identity. | Added trusted-origin validation for cookie mutations and strict explicit bearer-token handling. |
| Connector grants | Write actions were described as opt-in, but were granted by default because `actions` and `availableActions` were identical. | Default grants are read-only. Write actions remain available only through an explicit validated grant update. |
| Public health | `/healthz` exposed internal state-store and host details. | Public health now returns only `healthy` and `version`; detailed fleet state is owner-only. |
| Firecracker truth | Metadata said three VMs were running/paused, but there were no Firecracker processes or TAP devices. The previous “3 live processes” claim was stale. | Added process identity checks and disk-preserving recovery. Explicit owner reconcile recovered both desired-running VMs. The dead paused VM was resumed through the customer API and paused again, proving the fallback path. Host now has three real Firecracker processes/TAPs, with one VM paused. |
| Recovery safety | Existing `create` returned stale metadata and could not recover a dead VM. Destructive recreation would have replaced the customer rootfs. | `create` now detects a dead Firecracker process and restarts the existing jailed `rootfs.ext4`; it removes only transient jailer devices, PID/socket, and network artifacts. Failure cleanup preserves the disk. |
| Reconcile | “Reconcile” merely copied observed failure into desired-state records. | Owner reconcile now recovers desired-running failed microVMs, reapplies encrypted agent secrets, records recovered IDs/failures, and updates the admin UI report. |
| Pause/resume and agent restart | A host reboot left paused/running records unrecoverable through normal customer controls. | Resume and agent restart inspect failed runtimes and invoke the same safe recovery path. |
| SSH | The API returned a host-local command and the UI implied broader reachability. | Added a dedicated SSH Access tab with honest host-local versus bastion guidance. Owner two-hop SSH was verified from the local terminal into the recovered guest. Customer-managed SSH keys/bastion automation remain future work. |
| Agent credentials | Model keys needed proof after recovery. | The recovered agent retained its workspace and the write-only Anthropic key was present inside the guest; the value was never returned or printed. |
| Hosted build | Cloud Build omitted the connector-broker image and the direct systemd/nginx layout was not reproducible. | Added connector-broker build/push steps and checked-in systemd/nginx deployment configuration. |
| Browser mocks | The dashboard still had a demo adapter and could render plausible state without calling the product API. | Removed the demo adapter and seed data. The dashboard now has one same-origin HTTP adapter; an unavailable backend renders a real error. |
| Sandbox logs | The UI had no customer-visible stream of actual guest output. | Added bounded persisted runtime logs, `GET /v1/sandboxes/{id}/logs`, CLI/MCP/TypeScript/Python SDK support, and a polling Logs tab. Real Firecracker stdout and stderr were verified on the hosted data plane. |
| Public gateway | Domain routing was documented but not installed; Nginx was still public on port 80. | Installed Caddy v2.11.4, moved Nginx to loopback `127.0.0.1:8088`, enabled Caddy at boot, opened 443, preserved raw-IP HTTP access, and verified health/app/auth routing. Domain certificates are waiting only for the IONOS DNS records. |
| Composio proof | The implementation path existed, but the handoff still marked live provider execution as skipped. | Verified a 1,000-toolkit live catalog and invoked the connected GitHub account with an allowlisted read-only Composio MCP tool. Provider content was not printed or saved as evidence. |

## Verification performed

- `go test ./...`
- Linux cross-build of control plane, host agent, and Firecracker helper
- `pnpm typecheck`
- Production anonymous API checks (`401`)
- Real GitHub OAuth redirect
- Owner-only admin redirect
- Firecracker recovery from each existing disk
- Guest SSH, hostname, boot time, and retained `/workspace`
- Agent secret presence check without revealing the value
- Customer resume followed by pause on the formerly dead paused VM
- Owner reconcile response: `result=ok`, one agent VM recovered, no missing or
  orphaned runtimes, no recovery failures
- Hosted Firecracker create/exec/preview/logs: driver `firecracker`, exit `0`,
  real stdout/stderr present, and the preview returned guest content
- Caddy raw-IP health/app/auth boundary and loopback-only upstream listeners
- Live hosted Composio catalog plus read-only GitHub provider invocation

## Honest remaining gaps

- Customer identity is GitHub-only and allowlisted; organizations, projects,
  invitations, and tenant-scoped authorization are not production complete.
- Customer laptop SSH needs per-customer public-key injection or a managed SSH
  gateway. The current verified command is for the owner/operator path.
- `agentpop.cloud`, `app`, `admin`, `api`, `preview`, and `www` still need
  their IONOS DNS records changed to `35.252.115.228`; Caddy is already running
  and will obtain certificates automatically after propagation.
- Control-plane state is still JSON rather than PostgreSQL with a durable queue.
- Host-agent authentication is a VPC bearer token rather than mTLS.
- Network membership and storage attachments persist as control-plane objects,
  but overlay routing and guest storage mounts are incomplete.
- Billing, regional scheduling, durable webhook retries, abuse controls,
  backups/restore automation, and multi-host density/isolation tests remain
  hosted-beta gates.
