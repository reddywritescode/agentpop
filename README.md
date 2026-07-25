# AgentPop

[AgentPop](https://agentpop.cloud) is an open-source control plane and data
plane for isolated coding sandboxes and long-running cloud agents. The core
platform is Apache-2.0; the TypeScript and Python SDKs are MIT licensed. The
hosted service runs the same source code with managed operations, TLS, backups,
capacity, and support.

AgentPop has one runtime primitive: a sandbox. Reusable agent images and
sandbox images come from one Dockerfile-backed catalog, and both deploy into
the same isolated runtime. Docker provides the local development runtime; jailed
Firecracker microVMs run on Linux KVM data-plane hosts. Both implement the same
API, SDK, MCP, CLI, dashboard, terminal, files, preview URL, and SSH workflow.
Managed databases, caches, queues, applications, and credit metering are not
part of the product.

The hosted plan is a fixed **$20/month** subscription with customer-supplied
model keys. The open-source self-hosted distribution has no AgentPop
subscription check.

The live implementation contract and CreateOS capability comparison are in
[docs/createos-gap-analysis.md](docs/createos-gap-analysis.md). CreateOS
screenshots informed the feature inventory and information architecture, but
AgentPop has its own brand, API contract, implementation, and source code.

## Run locally

Requirements: Go 1.23+, Node 20+, pnpm 10+, Docker, `curl`, and `jq`.

The shortest fully containerized path is:

```bash
docker compose up --build
```

Open `http://127.0.0.1:8088`.

For the hot-reload development environment:

```bash
pnpm install
make devbox-image
make up
```

Open `http://127.0.0.1:5173`, sign in with any email and an eight-character
password, and use the dashboard against the live control plane. `make up`
prints the API URLs and keeps logs under `.local/logs/`.

In a second terminal:

```bash
make smoke
```

The smoke test creates a real sandbox, executes a command, retrieves the exact
SSH command, pauses and resumes it, then destroys it.

To validate customer-supplied model keys end to end:

```bash
make smoke-secrets
```

This creates an agent with a fake write-only key, verifies the key inside its
guest, rotates and deletes it, confirms all reads are redacted, and removes the
test agent.

To validate the hosted eval harness:

```bash
make smoke-evals
```

Eval suites use the Open AgentOps scenario shape, execute inside the selected
agent sandbox, and persist deterministic checks, rubric scores, custom metrics,
and release-gate results.

## Go CLI

```bash
make cli

export AGENTPOP_API_URL=http://127.0.0.1:8080
.local/bin/agentpop image list --kind agent
.local/bin/agentpop image generate \
  --kind sandbox \
  --prompt "Python data environment with pandas, NumPy, jq, and ripgrep"
.local/bin/agentpop image build python-data
.local/bin/agentpop image deploy python-data --name analysis

.local/bin/agentpop sandbox list
.local/bin/agentpop sandbox create --name cli-demo
.local/bin/agentpop exec SANDBOX_ID -- uname -a
.local/bin/agentpop ssh SANDBOX_ID
.local/bin/agentpop file upload SANDBOX_ID ./input.txt /workspace/input.txt

export ANTHROPIC_API_KEY=...
.local/bin/agentpop agent create \
  --name issue-triage \
  --model claude-sonnet-4-5 \
  --secret-env ANTHROPIC_API_KEY
.local/bin/agentpop agent secret list issue-triage

export ANTHROPIC_API_KEY=...rotated-value...
.local/bin/agentpop agent secret set issue-triage --from-env ANTHROPIC_API_KEY
```

`AGENTPOP_API_TOKEN` supplies an optional bearer token. The canonical CLI
surface covers image search/generation/inspection/build/fork/deploy;
control-plane and host status; sandbox lifecycle, resize, fork, ports, exec,
SSH, files, metrics, and events; connectors, API keys, and audit events.
Legacy topology and agent-record commands remain available for compatibility.

Model credentials are scoped per agent. Values are encrypted by the control
plane, forwarded only to the private data plane, materialized as a root-readable
guest environment profile, and never returned by list/get APIs. Configure them
from the deploy-agent dashboard, TypeScript/Python SDKs, or CLI.

## MCP server

```bash
make mcp
AGENTPOP_API_URL=http://127.0.0.1:8080 .local/bin/agentpop-mcp
```

See [`docs/mcp.md`](docs/mcp.md) for client configuration and the full
image, sandbox, connector, project, host, and audit tool surface.

## TypeScript SDK

```ts
import { AgentPopClient } from "@agentpop/sdk";

const client = new AgentPopClient({
  baseUrl: "http://127.0.0.1:8080",
});

const sandbox = await client.createSandbox({
  name: "sdk-demo",
  vcpu: 1,
  memoryMb: 1024,
  diskGb: 10,
});

console.log((await sandbox.sh("uname -a")).stdout);
console.log((await sandbox.ssh()).command);
await sandbox.destroy();
```

See [`packages/sdk/README.md`](packages/sdk/README.md), the
[`Python SDK`](sdk/python/README.md), the [`Go SDK`](sdk/go/README.md), and the contract at
[`api/openapi.yaml`](api/openapi.yaml).

## Architecture and handoff

- [`CLAUDE.md`](CLAUDE.md) — Claude Code starting point: current runtime,
  completed implementation, connector lifecycle, verification evidence,
  outstanding failures, and ordered continuation checklist.
- [`docs/hosting-agentpop-cloud.md`](docs/hosting-agentpop-cloud.md) — hosted
  topology, `agentpop.cloud` routing, GCP deployment, security gates, and exact
  IONOS DNS records.
- [`docs/implementation-handoff.md`](docs/implementation-handoff.md) — what is
  running, control/data-plane boundaries, local and GCP Firecracker commands,
  validation evidence, and known gaps.
- [`docs/product-and-architecture-plan.md`](docs/product-and-architecture-plan.md)
  — production architecture and the single product acceptance gate.
- [`docs/unified-runtime.md`](docs/unified-runtime.md) — the simplified product
  contract: one runtime, one image catalog, control/data-plane boundaries, and
  public developer surfaces.
- [`docs/image-platform.md`](docs/image-platform.md) — inspectable agent and
  sandbox images, optional secrets, fork/build/deploy, and client parity.
- [`docs/model-credentials.md`](docs/model-credentials.md) — customer-supplied
  model keys, encryption boundary, public API, SDK flow, and runtime injection.
- [`docs/agent-evals.md`](docs/agent-evals.md) — SDK-driven eval suites,
  Open AgentOps import/generation, sandbox execution, rubric scoring, and
  persisted release gates.
- [`ui_kits/dashboard/README.md`](ui_kits/dashboard/README.md) — supplied screen
  kit and flow documentation.
- [`design-reference/createos/README.md`](design-reference/createos/README.md) —
  saved screenshot index and Claude handoff.

## Design system archive

The remainder of this document describes the supplied AgentPop design
system that was used to build the dashboard.

AgentPop is an open-source, self-hostable execution platform (and paid hosted
cloud) for secure Firecracker sandboxes. Agent deployments are agent-type
sandbox recipes rather than a second runtime. Developers and AI agents run
commands, terminals, and files; expose HTTPS preview URLs; configure egress;
inject encrypted secrets; grant connectors; fork environments; and automate
the complete lifecycle through REST, MCP, CLI, and TypeScript/Python/Go SDKs.

**One product surface for now:** a responsive desktop-first marketing site,
customer dashboard, and owner-only operator console. The customer dashboard
sidebar contains Overview, Marketplace, Sandboxes, Connectors, Developer, and
Settings. Control-plane and data-plane topology remain available only in the
owner console and private APIs.

## Sources

- Local codebase `cloud-agents/` (mounted read-only):
  - `packages/ui/src/styles/tokens.css` + `globals.css` — canonical tokens (copied verbatim into `tokens/`).
  - `packages/ui/src/tailwind-preset.ts` — type scale, token→utility mapping.
  - `packages/ui/src/components/` — the component inventory: `button.tsx`, `badge.tsx`, `status-badge.tsx`, `input.tsx` (Input + Textarea), `card.tsx`. Recreated 1:1 in `components/`.
  - `docs/product-and-architecture-plan.md` — product scope, states, tenancy, API surface.
  - `design-reference/createos/` — 20 screenshots of a *different* product (CreateOS) used **only** for information architecture and density. Its visual identity, name, and marketing copy are explicitly off-limits per `CLAUDE-DESIGN-PROMPT.md`. Copies also in `uploads/`.
- No Figma, no font binaries, no logo files were provided.

## Content fundamentals

Voice: calm, technical, terse. Explain like a competent operator, never salesy.

- **Sentence case everywhere** — headings, buttons, labels ("New sandbox", "Destroy sandbox", "Creating…"). The CreateOS reference used Title Case; the repo (ground truth) does not.
- **We/you.** The platform speaks as "we", addresses the user as "you": "We sign every delivery so you can verify it came from us." / "Saved in encrypted form. We never show it to you again - keep a copy if you need it."
- **Helper text is one short sentence, no fluff:** "Lowercase letters, digits, hyphens. Max 22 chars." / "Empty = allow everything. Hosts, IPs, CIDRs, domain wildcards." / "Use a single-stage Dockerfile. Avoid COPY/ADD; install packages through RUN."
- **Empty states = fact + next action:** "No API keys created" → "Create an API key to access the platform programmatically" → button "Create your first API key".
- **No emoji. No exclamation marks.** Numbers and units are precise (0.25 vCPU, 512 MiB, 10 GB) — never rounded for marketing.
- **Mono for machine words:** IDs (`sb-01ky47z9f7`), commands, URLs, env keys, CIDRs — always `--font-mono`, often 13px.
- Destructive verbs are plain: "Destroy sandbox", not "Remove". In-progress verbs use ellipsis: "Creating…".

## Visual foundations

- **Canvas & surfaces:** warm off-white canvas `#faf9f7`; white cards layered upward (`--surface-1/2/3`); no background images, patterns, gradients, or illustrations anywhere. Overlays use a warm scrim (45% ink).
- **Text:** warm near-black `#1a1a18`; secondary `#57544e`; tertiary for hints. AA contrast is a hard rule.
- **Accent:** one brand accent, cobalt indigo `#4f46e5` (hover `#4338ca`, active `#3730a3`), used sparingly — primary buttons, focus ring, links, selected states. Subtle accent surfaces (`--accent-subtle-*`) for selected cards/pills. **No gradients.**
- **Status:** five tones (success/warning/danger/info/neutral), each a fg/bg/border/solid quad. **Never color alone** — every status pairs icon + text (see `StatusBadge`).
- **Type:** Inter (UI) + JetBrains Mono (machine words only). Compact technical scale: 14px/22 default, 11–30px range; weights 400/500/600; tabular numerals for metrics.
- **Spacing:** 8px rhythm, 4px half-steps. Dense but readable resource rows.
- **Radii:** 12–16px core (`--radius-lg/xl`); 6–10px for small controls; pills for badges. Not the reference product's full-round capsules.
- **Borders:** hairline 1px, three steps (subtle/default/strong). Cards = 1px default border + `--shadow-xs`; hover raises border to strong (no shadow jump).
- **Shadows:** warm-tinted, restrained; xs on cards/buttons, md for popovers, overlay for dialogs. No inner shadows.
- **Hover:** background steps up one surface (`surface-2`), or border darkens. **Press:** one more step (`surface-3`) or darker accent — never scale/shrink.
- **Focus:** 2px `--ring` outline, 2px offset, on everything interactive. Selection uses accent-subtle.
- **Animation:** color/background transitions ~150ms ease; spinners for in-progress lifecycle states; no bounces, slides, or parallax.
- **Transparency/blur:** none, except the dialog scrim.
- **Dark mode:** first-class, same token names re-derived under `.dark` (cool near-black surfaces, brighter indigo `#6366f1`).
- **Imagery:** none. The product is text, numbers, and state.
- **Layout:** fixed left sidebar (org/project switcher top; credits + user menu bottom), content max-width generous, creation flows in right-side sheets or focused modals, destructive confirms in small dialogs.

## Iconography

- **Lucide** is the icon system (the repo imports `lucide-react`: `Loader2`, `CircleCheck`, `CirclePause`, `CircleX`, `CircleDot`, `CircleDashed`, `Ban`, `Trash2`, `Plus`, `ArrowRight`…). Stroke icons, 2px, round caps; 16px in buttons/badges/rows, 3–3.5px sizes inside badges.
- No icon binaries exist in the repo (npm package), so this system loads the **lucide UMD build from CDN** and provides an `Icon` React wrapper (`components/icons/`). Flagged as a substitution of packaging, not of style.
- No emoji, no unicode-as-icons. Status icons always accompany text.
- **There is no logo.** Sources contain no brand mark; wherever a mark would go, render "AgentPop" in plain type (600 weight). Do not invent one.

## Components

Recreated 1:1 from `packages/ui` (inventory is exactly the repo's):

- `components/actions/` — **Button** (primary/secondary/outline/ghost/danger/danger-outline/link; sm/md/lg + icon sizes; loading, leading/trailing icons).
- `components/display/` — **Badge** (7 tones × 2 sizes), **StatusBadge** (full lifecycle: queued/provisioning/running/pausing/paused/resuming/deleting/deleted/failed/deploying/stopped/active/inactive/healthy/degraded/error).
- `components/forms/` — **Input** (leading/trailing adornments, invalid, mono), **Textarea**.
- `components/surfaces/` — **Card** (default/elevated/flat/inset, interactive) + CardHeader/CardTitle/CardDescription/CardContent/CardFooter.

**Intentional additions** (not in repo, needed to run outside npm):
- `components/icons/Icon.jsx` — React wrapper over the lucide CDN build (repo used `lucide-react` directly).

## Index

- `styles.css` — global entry; imports everything under `tokens/`.
- `tokens/` — `fonts.css`, `colors.css` (light+dark), `typography.css`, `spacing.css`, `base.css`.
- `components/` — actions, display, forms, surfaces, icons (each: `.jsx` + `.d.ts` + `.prompt.md` + specimen card).
- `guidelines/` — foundation specimen cards (colors, type, spacing, brand).
- `ui_kits/dashboard/` — interactive recreation of the dashboard (sandboxes, agents, connectors, developer, resource tabs).
- `SKILL.md` — how agents should use this system.

## Caveats

- Fonts: repo names "Inter Variable"/"JetBrains Mono Variable" but ships no files — `tokens/fonts.css` declares the same families from Fontsource variable builds (CDN). Upload the repo's own binaries to replace them.
- Icons load lucide from CDN at runtime.
- Screens the sources don't define (Overview, Sandbox detail/terminal, Settings) are intentionally stubbed in the UI kit rather than invented.
