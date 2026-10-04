# Prompt for Claude Design

Attach the complete `screenshots/` folder—or `createos-ui-reference.zip`—and paste the prompt below.

---

You are the principal product designer and frontend engineer for `[PRODUCT_NAME]`, an open-source and hosted cloud platform for secure Firecracker sandboxes and cloud agents.

I have attached 20 screenshots from another product as UX references. Study them for information architecture, density, form structure, navigation patterns, and resource-management flows. Do not copy its name, logo, trademark, exact marketing text, purple support widget, or proprietary visual identity. Create an original, production-quality design system and interface for `[PRODUCT_NAME]`.

## Product scope

The product lets developers and AI agents:

- Create isolated Firecracker sandboxes.
- Run commands, open a terminal, upload/download files, view logs, and expose ports through HTTPS preview URLs.
- Pause, resume, fork, resize, and destroy sandboxes.
- Create reusable templates from a Dockerfile.
- Connect sandboxes through isolated private networks.
- Register S3-compatible storage and attach it to sandboxes.
- Set outbound network allowlists and environment variables.
- Configure signed webhooks and view audit logs.
- Create scoped API keys and view SDK/CLI quickstarts.
- Connect GitHub, Slack, Gmail, and Google Drive.
- Deploy and monitor long-running cloud agents that use a sandbox, an AI model, secrets, and explicitly granted connectors.

Managed databases, caches, Kafka, and the broad “Services” catalog shown in screenshot 14 are out of scope. General GitHub/Docker/static-site application deployment shown in screenshots 16 and 18 is also out of scope except where it helps deploy an agent template.

## Required application structure

Create a responsive desktop-first SaaS dashboard with this sidebar:

1. Overview
2. Sandboxes
3. Agents
4. Connectors
5. Templates
6. Networks
7. Storage
8. Webhooks
9. Audit logs
10. Developer
11. Settings

The organization/project switcher belongs at the top. Usage credits and the user menu belong at the bottom. Provide a clear “Human” versus “API/Agent” documentation mode only in the Developer section; do not use it as a global toggle on every screen.

## Screens and flows to design

### 1. Sandbox list

- Search, status filter, region filter, and primary “New sandbox” action.
- Each row shows name, ID, state, template, vCPU, RAM, disk, private IP, age, idle policy, and usage.
- Row actions: terminal, pause/resume, files, metrics, fork, resize, destroy.
- An expanded row shows preview ports and copyable HTTPS URLs.
- Include running, provisioning, paused, failed, and empty states.

### 2. Create sandbox

Use a right-side sheet or focused modal with:

- Optional validated name.
- Region.
- Resource cards: 0.25 vCPU/512 MiB, 0.5 vCPU/1 GiB, 1 vCPU/2 GiB, 2 vCPU/4 GiB.
- Template/image selector.
- Disk size.
- Public preview toggle with public, organization-authenticated, or signed-link mode.
- Pause-when-idle and TTL.
- Egress allowlist supporting host, IP, CIDR, and port entries.
- Repeatable environment-variable rows with secret/value distinction.
- Sticky cost estimate and create/cancel actions.
- Validation, insufficient-credit, quota, submission, and success states.

### 3. Sandbox detail

- Header with status, resource metrics, IP, region, creation time, and lifecycle actions.
- Tabs: Terminal, Files, Processes, Ports, Metrics, Environment, Network, Storage, Events.
- Terminal should feel like a real development surface, with connection state and reconnect behavior.
- Files view includes path navigation, upload, download, rename, and delete confirmation.
- Metrics show CPU, memory, disk, and network history without dashboard clutter.

### 4. Templates

- Template list with name, version, architecture, size, build status, updated time, and usage count.
- Create template modal with a single-stage Dockerfile editor, validation, build logs, and versioning.

### 5. Networks

- Network list with ID, CIDR, region, sandbox membership, and updated time.
- Create network and attach/detach sandbox flows.
- Network detail visualizes members and their private names/IPs without pretending to be a full topology-monitoring product.

### 6. Storage

- Register an S3-compatible storage target: display name, endpoint, bucket, region, path-style toggle, access key, and secret key.
- Explain that the secret is encrypted and shown only during entry.
- List attachment state, mounted sandboxes, and last health check.

### 7. Webhooks and audit

- Webhook creation with endpoint URL, event multiselect, signing-secret reveal-once state, retry policy, test delivery, and delivery history.
- Events include sandbox created/running/paused/resumed/destroyed/failed, agent deployed/stopped/failed, and connector grant changes.
- Audit table includes actor, action, resource, project, IP, result, and timestamp with a detail drawer.

### 8. Developer

- API-key empty/list/create/revoke states. Key creation includes name, expiry, project, and scopes.
- TypeScript and Python SDK installation and quickstart snippets with copy actions.
- Go CLI installation and commands for login, sandbox create/list/exec/pause/resume/destroy.
- Webhook verification example and links to API reference.

### 9. Connectors

- Connected and available sections with search and category filters.
- Initial catalog: GitHub, Slack, Gmail, Google Drive.
- OAuth connection flow, account identity, connection status, reconnect/revoke actions.
- Grant editor selects project/agent, allowed actions, resource restrictions, and expiration.
- Clearly communicate that agents receive grants, not raw OAuth credentials.

### 10. Agents

- My Agents and Templates tabs.
- Empty, deploying, running, stopped, and failed states.
- Deploy-agent form: name, agent template, container image/version, AI provider/model, model-secret reference, command, resource sliders/cards, restart policy, idle policy, connectors, and trigger/channel configuration.
- Agent detail: status, sandbox link, logs, resource usage, connector grants, recent runs, restart/stop/delete.

## Visual direction

- Original neutral identity: warm off-white canvas, near-black typography, restrained gray borders, and one accessible brand accent chosen for `[PRODUCT_NAME]`.
- Use a clear 8-pixel spacing system, 12–16 pixel radii, subtle surface hierarchy, and compact but readable resource rows.
- Typography should feel technical and calm. Use a modern sans-serif for UI and a monospace font only for IDs, commands, URLs, logs, and terminal content.
- Prefer inline drawers/sheets for complex creation flows and small confirmation dialogs for destructive actions.
- Every status uses text plus icon/shape; never communicate state by color alone.
- Include dark mode derived from the same tokens.
- Make keyboard focus, loading skeletons, errors, empty states, disabled states, confirmation, and success feedback explicit.
- Meet WCAG AA contrast and design usable layouts at 1440 px, 1024 px, 768 px, and 390 px widths.

## If generating code

Use the current stable Next.js with TypeScript, Tailwind CSS, Radix/shadcn primitives, and Lucide icons. Build reusable components and semantic design tokens rather than page-specific CSS. Use realistic mock data and local interactions only; do not create a backend, authentication implementation, or live provider integration. Avoid huge components: separate application shell, data tables, resource cards, lifecycle controls, creation sheets, code blocks, terminal shell, status components, and confirmation dialogs.

Deliver:

1. Design tokens and component inventory.
2. Route map.
3. High-fidelity implementations of all required screens and important states.
4. Responsive behavior notes.
5. A short mapping from each attached reference screenshot to the new screen that used it.
6. A list of deliberate differences that make this an original product instead of a CreateOS reskin.

Do not add features outside this brief. When a reference conflicts with the written requirements, follow this prompt.

---
