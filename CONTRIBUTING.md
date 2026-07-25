# Contributing to AgentPop

AgentPop accepts fixes, documentation, runtime adapters, SDK improvements, and
security hardening. The customer dashboard, public API, SDKs, CLI, MCP server,
host agent, and Firecracker helper live in one repository so a behavior change
can be validated across the complete contract.

## Development setup

Requirements: Go 1.23+, Node.js 20+, pnpm 10+, Docker, `curl`, and `jq`.

```bash
pnpm install
make devbox-image
make up
```

In another terminal:

```bash
make test
make typecheck
make smoke
```

Linux/KVM changes must also pass the Firecracker conformance scenario described
in `docs/implementation-handoff.md`.

## Pull requests

- Keep the public and private OpenAPI contracts synchronized with handlers.
- Add or update SDK, CLI, and MCP coverage for public API changes.
- Do not add customer-facing controls that are backed only by demo data.
- Keep hosted-only configuration outside the open-source runtime contract.
- Never commit credentials, state files, generated SSH keys, or provider
  refresh tokens.

By contributing, you agree that your contribution is licensed under
Apache-2.0.
