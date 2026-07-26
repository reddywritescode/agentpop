# AgentPop customer packages

AgentPop is developed as a monorepo but released as independent customer-facing
packages. This keeps one tested API contract while letting developers install
only the surface they need.

| Package | Distribution | Install/consume |
| --- | --- | --- |
| `agentpop-cli` | Go binary and Homebrew formula | `brew install reddywritescode/tap/agentpop` or release archive |
| `agentpop-mcp` | Go stdio MCP server | release binary or container |
| `@agentpop/sdk` | TypeScript SDK | `npm install @agentpop/sdk` |
| `agentpop` | Python SDK | `pip install agentpop` |
| `agentpop-go` | Go SDK | `go get github.com/reddywritescode/agentpop-go` |
| `agentpop-openapi` | Public, private, and host-agent OpenAPI contracts | source or release archive |
| `agentpop-self-host` | Docker Compose/Caddy self-host bundle | release archive |
| `agentpop-claude-plugin` | Claude Code skill/plugin package | plugin marketplace |
| `homebrew-agentpop` | Homebrew tap | `brew tap reddywritescode/tap` |

The canonical implementation remains in this repository. Run
`./scripts/sync-package-sources.sh` after changing a CLI, MCP, SDK, OpenAPI, or
self-host source. The sync is intentionally one-way: never edit a generated
copy without also changing its canonical source.

`package-manifest.json` records the intended standalone repository names,
canonical source paths, and package verification command.

Run `make package-dist` to verify every package and create one source archive
per standalone package plus `SHA256SUMS` under `.local/releases/`.
