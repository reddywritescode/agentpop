# AgentPop CLI

The official command-line client for AgentPop sandboxes and reusable images.
It is a dependency-free Go binary and talks only to the public AgentPop REST
API.

```bash
# Preferred: immutable release asset with a formula-pinned SHA-256.
brew install reddywritescode/agentpop/agentpop

# Source install. The direct fallback avoids transient checksum-index lag for
# a newly published module.
GOPROXY=direct GONOSUMDB=github.com/reddywritescode/agentpop-cli \
  go install github.com/reddywritescode/agentpop-cli/cmd/agentpop@v0.1.1

export AGENTPOP_API_URL=https://api.agentpop.cloud
export AGENTPOP_API_TOKEN=pop_...

agentpop image list --kind agent
agentpop image generate --kind agent --prompt "OpenClaw with GitHub tools"
agentpop sandbox create --name dev --lifecycle persistent
agentpop exec SANDBOX_ID -- uname -a
agentpop ssh SANDBOX_ID
```

Set `AGENTPOP_API_URL` to a self-hosted control plane to use the same client
without the hosted subscription. `AGENTPOP_API_TOKEN` is optional in local
mode and required by hosted deployments.

The source in this directory is synchronized from the AgentPop monorepo.
