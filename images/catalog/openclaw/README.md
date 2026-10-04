# OpenClaw

An OpenClaw agent computer with Node.js and the OpenClaw CLI installed.

The image builds and deploys without a model key. Configure the key later from
the sandbox Secrets tab, REST API, SDK, CLI, or MCP server.

```sh
agentpop image build openclaw
agentpop image deploy openclaw --name my-openclaw
export ANTHROPIC_API_KEY=...
agentpop sandbox secret set my-openclaw --from-env ANTHROPIC_API_KEY
```
