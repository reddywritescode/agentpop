# AgentPop production evaluation plan

Contract for a systematic, screen-by-screen evaluation of the hosted product at
`http://35.252.115.228`, plus the product fixes raised in review. No screen is
"done" until every control on it has been clicked, screenshotted, and judged
against **"would a real customer be happy with this?"** — not just "the API
returned 200."

Owner data plane: `agentpop-firecracker-test` (Firecracker/KVM). Control plane:
`agentpop-control` (e2-micro). Customer auth is enabled: hosted access uses a
signed GitHub OAuth session and an explicit GitHub-login allowlist. Owner access
uses a separate private session.

---

## Part A — Product decisions from review (resolve before building)

| # | Item | Current state | Proposed change | Status |
|---|---|---|---|---|
| A1 | **Install vs Deploy are two clicks** | Marketplace: "Install" (build image) then "Deploy" | **One "Deploy" button.** On click, run the build if needed with live progress ("Building image → Booting sandbox → Ready"), then land on the agent/sandbox. Marketplace packages are pre-authored, ready-to-go recipes. | DECISION |
| A2 | **Agents must not expose ports; sandboxes must** | Sandbox detail has Ports (expose); agent detail has none, but the agent's sandbox is still exposable via the sandbox page | **Agent runtime = view-only ports** (read-only list on agent detail). **Sandbox = full expose.** Agent-backed sandboxes are hidden from the customer Sandboxes list and cannot be exposed. | DECISION |
| A3 | **SSH `known_hosts` warning on every exec** | All generated SSH paths include `LogLevel=ERROR`. | Keep covered by source and live SSH checks. | DONE |
| A4 | **SSH-to-sandbox for debugging should be trivial** | Sandbox detail has an SSH Access tab and owner two-hop SSH is verified. Customer public-key provisioning remains. | Add a managed per-customer SSH gateway/key flow. | PARTIAL |
| A5 | **Secrets/keys provisioning** | Per-agent write-only secret add/rotate/delete is implemented and the recovered production agent loaded its model key. | Add general write-only sandbox secrets only if product scope requires them. | DONE-AGENT |
| A6 | **Templates page feels disconnected** | Separate nav item showing raw template records | Reframe: **"Images"** — the marketplace installs create images here; page also lets you build a custom one from a Dockerfile. Cross-link marketplace ↔ Images. | DECISION |
| A7 | **Platform Health shows fleet internals to customers** | Customer nav has full control/data-plane health | Move fleet internals to the **operator/admin** console (already exists at `/admin`). Customer keeps only a simple "systems operational + your quota/capacity" view (or folds into Overview). | DECISION |
| A8 | **Settings scope undefined** | Project defaults, team, credits, quotas, delete | Define which are real vs stub; keep project settings + team + API keys real; mark billing/credits as stub if not backed. | DECISION |

---

## Part B — Per-screen evaluation rubric

For **every** screen: enumerate every button/link/tab, click it, screenshot,
record Expected vs Actual, and a customer-happiness verdict (👍 / ⚠️ / ❌).

1. **Marketing / Home** — nav anchors, GitHub/Docs/Star links, Get started, Create sandbox, Self-host CTA.
2. **Sign in / Sign up** — GitHub OAuth (works), Google (disabled w/ reason), email, error states. (Auth gate re-enable is a separate toggle.)
3. **Overview** — 4 stat cards navigate, usage links, 3 quick actions, recent activity → audit.
4. **Sandboxes / list** — search, status filter, region, New sandbox, row actions (terminal, pause/resume, files, fork, destroy), expand ports.
5. **Create sandbox sheet** — name validation, region, size cards, image (real images), disk, preview modes, idle/TTL, egress, env vars, cost estimate, create.
6. **Sandbox detail** — tabs Terminal/Logs/Files/Ports/Metrics/SSH Access/Events/Settings; each control; pause/resume/fork/destroy; real log polling/download/copy; SSH.
7. **Agents / list + Marketplace** — Deploy (merged), row actions, agent detail (terminal, config, keys, connectors, logs, lifecycle).
8. **Connectors** — GitHub (connected), connect Slack/Gmail, edit grants, invoke, revoke, catalog search.
9. **Images (was Templates)** — list, build custom, build logs, deprecate/restore, delete; relationship to marketplace.
10. **Networks** — create, attach sandbox, detach, delete; runtime behavior honestly labeled.
11. **Storage** — register S3, attach, detach, delete; mount honestly labeled.
12. **Webhooks** — create (reveal secret once), test delivery, signature, retry/history.
13. **Audit logs** — list, prev/next paging, resource scoping.
14. **Developer** — create/revoke API key, SDK snippets copy (TS/Python), MCP config copy, OpenAPI/docs links.
15. **Settings** — project defaults, team invite/role/remove, credits, quota request, delete project.
16. **Platform health** — decide customer vs admin (A7).

---

## Part C — Flagship flow: "fix a failing PR"

The headline demo. Claude Code agent + GitHub connector autonomously fixes a
failing PR and pushes.

Steps: (1) GitHub connector connected ✅ (done by user). (2) Deploy `claude-code`
agent with GitHub connector granted + Anthropic key (write-only). (3) Point it at
a repo with a failing PR (create a test repo/PR, or user provides one). (4) Agent
clones, reproduces the failure, fixes, commits, pushes, comments on the PR.
(5) Screenshot the PR before/after.

**Needs from user:** Anthropic API key (offered); a target repo/PR (or approval
to create a throwaway one under the connected GitHub account).

---

## Part D — What I need from you

- **Anthropic API key** for the agent (write-only; used only inside the agent sandbox). Put in the repo's gitignored `.env` as `ANTHROPIC_API_KEY=...` and I'll inject it, never printing it.
- **PR-fix target**: approve me creating a throwaway repo + failing PR under `reddywritescode`, or point me at an existing one.
- **Decisions on A6/A7/A8** (asked separately).

---

## Execution order

1. Product fixes A1–A4 (merge deploy, port model, SSH warning, SSH panel) → redeploy.
2. Screens 1–16 rubric pass with screenshots → per-screen verdicts.
3. Flagship PR-fix flow.
4. Report: one table, every control, verdict, and the real gaps.
