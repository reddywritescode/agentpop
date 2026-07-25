# Customer image-platform evidence

Captured from the running local AgentPop stack on 2026-07-25.

| Evidence | What it proves |
|---|---|
| [01 — image marketplace](01-image-marketplace.png) | Agent and sandbox images share one catalog. |
| [02 — portable source](02-image-source.png) | An image exposes Dockerfile, manifest, README, and fork action. |
| [03 — live connectors](03-live-connectors.png) | Composio-backed catalog exposes 1,000 connectors and upstream connection state. |
| [04 — runtime logs](04-real-test-logs.png) | Customer commands and test output persist in sandbox logs. |
| [05 — completed test](05-real-test-logs-complete.png) | Unit-test `OK` and exit code `0` are visible. |
| [06 — write-only secrets](06-name-only-secrets.png) | Secret names render while values never return. |
| [07 — public preview](07-public-preview.png) | The AgentPop preview gateway reaches guest HTTP. |
| [08 — developer surface](08-sdk-mcp-developer.png) | REST/OpenAPI, SDK, CLI, and MCP discovery are customer-visible. |
| [09 — deploy options](09-image-deploy-options.png) | Image deploy supports sizing and persistent/ephemeral lifecycle. |
| [10 — optional credentials](10-optional-deploy-secrets.png) | Keys are optional during deploy and can be supplied later. |

Primary retained runtime: `sb-92b7350985e272aa1f50b45c` (`image-e2e`).
It is a local Docker compatibility runtime; no hosted VM was started.
