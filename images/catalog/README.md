# AgentPop image catalog

AgentPop has one deployable primitive: an image that becomes an isolated
sandbox. An image may be labeled `agent` or `sandbox`, but both use the same
build, lifecycle, secret, networking, terminal, files, logs, ports, SSH, API,
SDK, CLI, and MCP surfaces.

Each published image exposes:

- `Dockerfile`: reproducible build source;
- `agentpop.yaml`: image metadata and runtime defaults;
- `README.md`: customer-facing build and deploy instructions.

The control plane exposes the full catalog at `GET /v1/images`. Customers can
inspect, fork, build, and deploy images without providing credentials. Model
and channel keys are write-only runtime secrets and can be configured later.

The `base-agent` and `openclaw` directories are reference sources checked into
the open-source repository. The remaining catalog entries are generated from
the same package definitions in `cmd/control-plane/agent_catalog.go` and are
returned with these same three virtual files through the API and dashboard.
