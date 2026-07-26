# AgentPop OpenAPI contracts

- `openapi.yaml` is the stable customer API used by the dashboard, SDKs, CLI,
  and MCP server.
- `private-openapi.yaml` is the owner-only control-plane/operator API.
- `host-agent-openapi.yaml` is the private control-plane to data-plane contract.

Only the public contract should be used in customer applications. Private
contracts are published for self-hosters and infrastructure contributors.
