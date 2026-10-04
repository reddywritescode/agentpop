# Operator console and private APIs

AgentPop has two web trust domains:

- The customer dashboard at `/app` (hosted at `app.agentpop.cloud`) uses the
  public product API under `/v1`.
- The owner-only operator console at `/admin` (hosted at
  `admin.agentpop.cloud`) uses signed sessions and the
  private control-plane API under `/private/v1`.

There is no link to the operator console in the customer navigation. The
control plane validates owner credentials, returns an HMAC-SHA256 signed,
12-hour session, and protects every private route except login. The token is
kept in browser `sessionStorage`, so it is scoped to the current tab session.

The data-plane host agent is a third trust domain. When `HOST_AGENT_TOKEN` is
set, all host/runtime routes except `/healthz` require that bearer token. Only
the control plane holds it; the customer and operator browsers never connect to
the host agent directly.

## Local access

Run:

```bash
./scripts/local-up.sh
```

Open `http://127.0.0.1:5173/admin/login` and use:

```text
owner@agentpop.local
agentpop-local-owner
```

Those credentials exist only when `CONTROL_PLANE_MODE=local` and explicit
values are absent.

## Hosted-mode requirements

The control plane fails closed outside local mode unless these are configured:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_SHA256` (preferred) or `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` with at least 32 characters
- `HOST_AGENT_TOKEN` on both the control plane and every host agent

Generate a password digest without placing the password in a shell history:

```bash
read -s ADMIN_PASSWORD_INPUT
printf %s "$ADMIN_PASSWORD_INPUT" | shasum -a 256
unset ADMIN_PASSWORD_INPUT
```

Use a secrets manager in hosted deployments. Never expose these values as
`VITE_*` variables: Vite variables are bundled into browser JavaScript.
During the invite-only alpha, Caddy also places both web applications behind a
separate basic-auth gate. The API gateway never injects the owner token.

## Private API

The complete owner contract is in
[`api/private-openapi.yaml`](../api/private-openapi.yaml).

Important operations:

- `POST /private/v1/auth/login`
- `GET /private/v1/overview`
- `GET /private/v1/control-plane`
- `GET /private/v1/data-plane/hosts`
- `GET /private/v1/data-plane/sandboxes`
- `POST /private/v1/data-plane/hosts/{id}/drain`
- `POST /private/v1/reconcile`
- `GET /private/v1/audit`
- `GET /private/v1/config`

Drain state is persisted in the control-plane store. A drained host continues
to run existing sandboxes but rejects new scheduling. Reconcile compares
desired control-plane objects with the host runtime registry, repairs observed
state where safe, and reports missing or orphaned runtime objects without
destroying anything automatically.
