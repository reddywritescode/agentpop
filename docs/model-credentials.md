# Per-agent model credentials

AgentPop uses customer-supplied model keys. A credential belongs to one agent,
is represented by its environment-variable name, and is never readable again
through the control-plane API.

## Data flow

1. The dashboard, CLI, or SDK sends a write-only `secrets` map over HTTPS.
2. The control plane validates the environment names and AEAD-encrypts the
   complete map with `CONTROL_PLANE_ENCRYPTION_KEY`.
3. Persistent agent state contains the ciphertext plus safe metadata:
   `secretNames`, `secretsGeneration`, and `appliedSecretsGeneration`.
4. The control plane sends plaintext only to the authenticated private host
   agent while creating or updating that agent's sandbox.
5. The Firecracker helper consumes initial secrets through stdin—not command
   arguments—and writes a `0600`, root-owned environment profile inside that
   microVM. Plaintext is not added to the host runtime state file.
6. Agent commands source the profile inside the guest. Separate microVM
   root filesystems provide the tenant boundary.

The local Docker compatibility driver uses the same write-only API and writes a
root-only profile inside the development container. Docker remains explicitly
out of scope as a hostile multi-tenant isolation boundary.

## Customer API

Create with a key:

```http
POST /v1/agents
Content-Type: application/json

{
  "name": "issue-triage",
  "model": "claude-sonnet-4-5",
  "secrets": {
    "ANTHROPIC_API_KEY": "customer-value"
  }
}
```

Rotate or add without disturbing other keys:

```http
PUT /v1/agents/issue-triage/secrets
Content-Type: application/json

{
  "secrets": {
    "ANTHROPIC_API_KEY": "rotated-value"
  }
}
```

Set `replace: true` to replace the complete secret set. Delete one key with:

```http
DELETE /v1/agents/issue-triage/secrets/ANTHROPIC_API_KEY
```

`GET /v1/agents/issue-triage/secrets` returns only names, update time, and
desired/applied generations. A `202` response means the encrypted change was
accepted but the paused or unavailable runtime must restart before it applies.

## Supported provider conventions

AgentPop does not lock agents to a model vendor. The dashboard suggests:

| Provider | Environment name |
| --- | --- |
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |

SDK callers can supply any valid uppercase environment name except
runtime-reserved names.

## Production requirements

- Store `CONTROL_PLANE_ENCRYPTION_KEY` in a managed secret store and back it up.
- Use a private subnet plus mTLS for control-plane-to-host-agent traffic.
- Redact HTTP request bodies and host-agent traffic from logs and traces.
- Never include secret values in audit events, webhook bodies, metrics, panic
  output, or customer support exports.
- Rate-limit secret writes and require a narrow `agent:secrets:write` scope
  before public multi-tenancy. The current alpha uses project API-key
  authentication and records every change in the audit log.
