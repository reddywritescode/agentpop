# Dashboard UI kit

Claude Code: read the repository-root `CLAUDE.md` and
`docs/implementation-handoff.md` before editing this kit or the production
React app. The production dashboard is `apps/web`; this directory is the
screen/flow reference. Real sandboxes, agents, connectors, SDKs, CLI, evals,
and owner-console behavior are already implemented, so do not replace them
with this kit's mock store.

Full loop: `home.html` (marketing landing) → `auth.html` (sign in / sign up, OAuth or email) → `index.html` (dashboard app); the sidebar sign-out returns to auth. All three are @dsCard-registered.

Interactive recreation of the AgentPop dashboard (desktop, 1440px). IA follows `CLAUDE-DESIGN-PROMPT.md`; density and flows follow the CreateOS reference screenshots; every visual value comes from `tokens/` and the published components (`window.AgentPopDesignSystem_47afa4`).

Screens: Overview (stats, usage meters, activity, quickstarts), Sandboxes (list, expandable preview URLs, create sheet), Sandbox detail (terminal, files, ports, metrics, events, settings), Agents (empty state, list, deploy sheet, logs), Connectors (catalog + grants note), Templates, Networks, Storage, Webhooks, Audit logs (lists + create/register modals), Developer (API keys + SDK/CLI quickstarts, human/agent toggle), Settings (project, members, billing & usage, quotas).

End-to-end flows are wired through a tiny shared store (`store.js`): create/fork → detail with live provisioning→running transition; row → detail terminal; deploy agent → creates its managed sandbox (linked); sidebar Add credits → Settings/Billing modal; overview cards/quickstarts route everywhere. Overview, detail, and Settings content follows `docs/product-and-architecture-plan.md` (usage meters §5/§12, roles §4, lifecycle/terminal §3/§5, quotas §12).

Files: `index.html` (entry + router), `Shell.jsx` (sidebar, page chrome, sheet/modal/field primitives), `data.js` + `store.js` (mock data, shared store, actions), one `*Screen.jsx` per area.
