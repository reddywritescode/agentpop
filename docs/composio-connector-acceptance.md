# Composio connector acceptance contract

AgentPop's connector cards now use a real Composio-backed broker. The previous
metadata-only `POST /v1/connectors/{id}/connections` behavior has been removed;
that route is a compatibility alias that starts real OAuth and returns a
Connect Link.

Agent Mason was used as the reference for the missing lifecycle. Its useful
pattern is:

1. Create a Composio session for the authenticated tenant/user and one toolkit.
2. Ask the session for a Connect Link with an AgentPop callback URL.
3. Persist a short-lived pending record containing owner, toolkit, session ID,
   MCP URL, request ID, redirect URL, and creation time.
4. Redirect the browser to provider OAuth.
5. In the callback, atomically consume the matching pending record; reject
   missing, expired, reused, or wrong-tenant state.
6. Persist the successful connected-account ID and MCP URL.
7. Store `COMPOSIO_API_KEY` only in the connector broker's secret store. Never
   put it in a sandbox or return it to the browser.
8. Invoke tools server-side through Composio MCP with the tenant's successful
   toolkit connection and the agent's action grant.
9. Emit audit records for connection start/success/failure, invocation, denied
   action, and revocation.
10. For live E2E, use a temporary scoped AgentPop key, perform a read-only
    provider call, redact provider content from saved evidence, and revoke the
    temporary key.

## Required public API

| Operation | Contract |
|---|---|
| `GET /v1/connectors` | Launch connector catalog plus live connection/grant state |
| `GET /v1/connectors/catalog` | Search the cached live Composio toolkit catalog |
| `GET /v1/connectors/{toolkit}/tools` | List the toolkit's current real Composio tools |
| `POST /v1/connectors/{toolkit}/authorize` | Returns one-time `authorizeUrl` and pending ID |
| `GET /v1/connectors/composio/callback` | Validates single-use callback state and completes connection |
| `PATCH /v1/connectors/{toolkit}/connections` | Updates allowed Composio tool grants |
| `DELETE /v1/connectors/{toolkit}/connections` | Revokes upstream and local connection and removes agent grants |
| `POST /v1/connectors/{toolkit}/tools/{tool}` | Validates `connector:invoke`, tenant, connection, and action grant, then invokes |

The callback is browser-facing, but all Composio work belongs in a dedicated
connector-broker service behind the control plane. Sandboxes receive short-lived
AgentPop capabilities or proxied results, not OAuth refresh tokens or the
platform Composio key.

## Verification states

- With no `COMPOSIO_API_KEY`: the catalog may serve only a previously persisted
  real Composio cache and labels it `stale-cache`; with no real cache its source
  is `none`. OAuth and live calls return an explicit configuration error.
- With a key but no connected provider account: OAuth contract tests pass; live
  provider execution remains `SKIP-LIVE`.
- With a connected read-only account: a real tool call must return provider
  evidence and a matching audit event.
- Write actions (send mail/message, create issue, etc.) require an explicit
  separate approval test and must never run in the default acceptance suite.

## Current result

The broker, OAuth Connect Link, single-use callback, 1,000-toolkit catalog,
live per-toolkit tool discovery, validated grants,
MCP invocation path, audit events, SDK/CLI methods, and upstream revocation are
implemented. On July 24-25, 2026, acceptance loaded 1,000 live Composio
toolkits, invoked a connected Gmail read tool locally, and invoked a connected
GitHub read tool on the hosted control plane. Only result shape/count was
recorded; provider content was not printed. The default suite never sends mail,
posts a message, changes a repository, or performs another provider write.
