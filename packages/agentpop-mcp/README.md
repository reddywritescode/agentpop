# AgentPop MCP server

The official stdio MCP server for AgentPop. It exposes image generation,
build, deployment, sandbox lifecycle, execution, files, SSH, preview ports,
connectors, and platform status as typed MCP tools.

```bash
GOPROXY=direct GONOSUMDB=github.com/reddywritescode/agentpop-mcp \
  go install github.com/reddywritescode/agentpop-mcp@v0.1.0
```

Claude Code configuration:

```json
{
  "mcpServers": {
    "agentpop": {
      "command": "agentpop-mcp",
      "env": {
        "AGENTPOP_API_URL": "https://api.agentpop.cloud",
        "AGENTPOP_API_TOKEN": "pop_..."
      }
    }
  }
}
```

The server is an API client. It never runs customer code in the MCP process;
execution happens inside the selected AgentPop sandbox.
