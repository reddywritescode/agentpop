# AgentPop MCP server

The stdio MCP server is a first-class client for AgentPop. It exposes the
image marketplace, sandbox runtime, host, connector, and audit APIs as tools.

```bash
make mcp
```

Example client configuration:

```json
{
  "mcpServers": {
    "agentpop": {
      "command": "/absolute/path/to/cloud-agents/.local/bin/agentpop-mcp",
      "env": {
        "AGENTPOP_API_URL": "http://127.0.0.1:8080",
        "AGENTPOP_API_TOKEN": "optional-project-token"
      }
    }
  }
}
```

The server speaks newline-delimited JSON-RPC over stdio and negotiates MCP
protocol revision `2025-11-25`. It includes risk annotations for read-only,
mutating, and destructive tools. Those annotations are hints for clients; the
AgentPop API remains responsible for real authorization and isolation.

The current tools cover:

- control-plane status, platform health, and data-plane hosts;
- reusable image search/inspection, model-backed multi-file image generation,
  immutable builds, forks, and persistent or ephemeral deployment;
- sandbox list/get/create/update/fork/exec/SSH/pause/resume/destroy and preview ports;
- workspace file listing, directory creation, delete, and UTF-8 text upload/download;
- live sandbox metrics and persisted resource operations;
- compatibility cloud-agent records and lifecycle logs;
- live connector catalog and tools, connect/update/revoke, and action grants;
- network and storage CRUD plus sandbox attachments;
- signed webhook CRUD and test delivery;
- members, API-key metadata, project settings, quota requests, and audit events.

Storage and private-network tools currently manage control-plane topology.
Their guest mount and network-isolation enforcement is deliberately reported
as a remaining production gap rather than implied by the tool result.

The canonical image tools are:

- `agentpop_list_images`
- `agentpop_get_image`
- `agentpop_generate_image`
- `agentpop_build_image`
- `agentpop_fork_image`
- `agentpop_deploy_image`

`agentpop_generate_image` asks the operator-configured model to produce a
reviewable Dockerfile, `agentpop.yaml`, README, and supporting files using the
published image schema and curated reference bundles. The control plane
validates every returned file, repairs invalid output through the model, and
fails closed when no generator is configured. Nothing builds until the caller
explicitly approves a build. Secrets accepted by create/deploy tools are
optional and write-only. They can also be added or rotated later with the
sandbox-secret MCP tools and are never returned by read tools. The older
recipe tools remain compatibility aliases.

Binary file transfer remains available through REST, both SDKs, and the CLI.
The MCP text tools intentionally cap writes at 1 MiB.
