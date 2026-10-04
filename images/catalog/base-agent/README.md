# Base agent computer

A programmable Linux computer with Python, Node.js, git, curl, jq, ripgrep,
SQLite, build tools, SSH, and an editable `/workspace`.

Use it as a blank cloud computer or fork it as the foundation of an agent
image. It requires no credentials to build or deploy.

```sh
docker build -t agentpop/base-agent:local .
agentpop image build base-agent
agentpop image deploy base-agent --name my-computer
```
