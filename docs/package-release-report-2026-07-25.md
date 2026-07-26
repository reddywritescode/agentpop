# AgentPop package release report — 2026-07-25

## Outcome

The AgentPop monorepo now produces nine independent open-source consumer
packages. Each package has its own public repository, versioned release,
license, README, package metadata, and isolated verification command.

| Consumer surface | Package repository | Initial release | Verified consumption |
| --- | --- | --- | --- |
| CLI | [agentpop-cli](https://github.com/reddywritescode/agentpop-cli) | `v0.1.1` | `go install .../cmd/agentpop@v0.1.1`, release archive |
| MCP server | [agentpop-mcp](https://github.com/reddywritescode/agentpop-mcp) | `v0.1.0` | `go install ...@v0.1.0`, MCP initialize |
| TypeScript SDK | [agentpop-typescript](https://github.com/reddywritescode/agentpop-typescript) | `v0.1.0` | GitHub npm source install and ESM import |
| Python SDK | [agentpop-python](https://github.com/reddywritescode/agentpop-python) | `v0.1.0` | Git/pip install and import |
| Go SDK | [agentpop-go](https://github.com/reddywritescode/agentpop-go) | `v0.1.0` | `go get`, compile, and client construction |
| API contracts | [agentpop-openapi](https://github.com/reddywritescode/agentpop-openapi) | `v0.1.0` | public/private/host-agent spec verification |
| Self-host kit | [agentpop-self-host](https://github.com/reddywritescode/agentpop-self-host) | `v0.1.0` | Docker Compose validation |
| Claude Code plugin | [agentpop-claude-plugin](https://github.com/reddywritescode/agentpop-claude-plugin) | `v0.1.0` | manifest and skill verification |
| Homebrew tap | [homebrew-agentpop](https://github.com/reddywritescode/homebrew-agentpop) | `v0.1.1` | Ruby syntax plus CLI archive checksum/runtime |

The package manifest is
[`packages/package-manifest.json`](../packages/package-manifest.json). Run
`make test-packages` for isolated package verification or `make package-dist`
to verify and create source distributions.

## Reproducible distributions

`make package-dist` creates one archive per package under `.local/releases/`
and writes `SHA256SUMS`. Generated archives exclude dependency directories,
Python bytecode, and Git metadata.

The CLI also has published macOS and Linux binaries for arm64 and amd64:
[AgentPop CLI v0.1.1](https://github.com/reddywritescode/agentpop-cli/releases/tag/v0.1.1).
The Homebrew formula pins those immutable assets and exact checksums.

## Registry status

Public GitHub consumption works now. `@agentpop/sdk` and `agentpop` include
npm and PyPI metadata respectively, but publishing those names to their public
registries still requires owner-controlled npm/PyPI credentials. Until that
registry step, their READMEs provide tested GitHub source-install commands.

At the time of release, `sum.golang.org` returned HTTP 500 while indexing the
new Go modules. Direct GitHub module fetches passed and are documented as the
temporary source-install fallback. The checksum-pinned Homebrew formula and
CLI release archives do not depend on that index.

The self-host repository publishes the management-plane configuration. Its
referenced GHCR runtime images must be published as multi-architecture images
before a clean server can start that bundle without building the monorepo.
