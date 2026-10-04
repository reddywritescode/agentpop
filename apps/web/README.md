# @agentpop/web

The AgentPop control-plane dashboard — a TypeScript React (Vite) application
built on the `@agentpop/ui` design system and its tokens.

## Running

```bash
pnpm install
pnpm --filter @agentpop/ui build   # the app consumes the built design system
pnpm --filter @agentpop/web dev     # http://localhost:5173
```

The app always uses a real AgentPop control plane. With no `VITE_API_URL`, the
Vite development server proxies same-origin API, preview, and health requests
to the containerized stack at `http://127.0.0.1:8088`. If that stack is down,
the UI shows the API failure; it never fabricates resources or success.

## Wiring a real API

Point the typed client at a running control plane:

```bash
# apps/web/.env.local
VITE_API_URL=https://api.your-host.dev
VITE_API_TOKEN=ap_...   # optional bearer token
```

`createApiClient()` always returns the `HttpApiClient` (REST per docs §5, with
`Idempotency-Key` on mutations).

## Architecture

```
src/
  api/            typed real control-plane API layer
    types.ts        domain types (mirror the OpenAPI contract, docs §5)
    client.ts       ApiClient interface
    http.ts         HttpApiClient — real REST client, reads VITE_API_URL
    index.ts        creates the real HTTP client
    provider.tsx    React context: useApi / useResource / useMutation
  auth/session.tsx  server-backed customer session
  components/       Icon, primitives (Sheet/Modal/Field/…), AppShell
  pages/
    marketing/      landing page
    auth/           sign in / sign up
    dashboard/      overview, sandboxes(+detail), agents, connectors,
                    templates, networks, storage, webhooks, audit,
                    health (control + data plane), developer, settings
  styles/           app.css (dashboard layout) + marketing.css — plain CSS on
                    design tokens; interactive controls come from @agentpop/ui
```

## Routes

| Path | View |
|---|---|
| `/` | Marketing landing |
| `/signin`, `/signup` | Auth (local demo session) |
| `/app/overview` | Stats, usage, activity, quickstarts |
| `/app/sandboxes`, `/app/sandboxes/:id` | List + create; detail with terminal, files, ports, metrics, events, settings |
| `/app/agents` | Deploy + manage agents, logs |
| `/app/connectors` | Connector broker catalog |
| `/app/templates`, `/networks`, `/storage`, `/webhooks`, `/audit` | Resource management |
| `/app/health` | Control-plane service + data-plane host health/capacity |
| `/app/developer` | API keys, SDK/CLI quickstarts, MCP |
| `/app/settings` | Project, members, billing & usage, quotas |

## Validation

```bash
pnpm --filter @agentpop/web typecheck
pnpm --filter @agentpop/web build
```
