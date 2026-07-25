# AgentPop customer release audit — 2026-07-25

## Outcome

AgentPop now behaves locally as the focused product requested:

- one isolated-computer primitive;
- agent images and sandbox images share one marketplace and one deployment
  path;
- every image exposes portable source (`Dockerfile`, `agentpop.yaml`, and
  `README.md`) and can be built, inspected, forked, and deployed;
- deployment can be persistent or ephemeral;
- provider/model keys are optional at deploy time and can be added or rotated
  later through write-only sandbox secrets;
- customer operations are available through UI, REST/OpenAPI, MCP, CLI,
  TypeScript, Python, and Go;
- the hosted plan is a fixed **$20/month**, with no credits or usage currency;
- Services, Applications, and the proposed workflow builder are excluded.

The current local release has **zero acceptance failures**. It is ready for
local customer testing. It is not being represented as hosted-production ready:
Linux/KVM proof, public DNS/TLS, tenant isolation, customer-laptop SSH, and
Stripe Checkout remain explicit deployment work.

## Automated evidence

| Suite | Passed | Failed | Partial | Skipped live |
|---|---:|---:|---:|---:|
| API/runtime/product acceptance | 92 | 0 | 3 | 2 |
| Browser route/control acceptance | 43 | 0 | 0 | 0 |
| Go repository tests | all packages | 0 | 0 | 0 |
| TypeScript/Python/Go SDK build/type checks | all | 0 | 0 | 0 |

The live SDK audit queried the canonical image catalog, fixed subscription, and
GitHub connector-tool catalog from both the TypeScript and Python clients. The
Go client tests passed. MCP discovery exposed canonical image, deploy,
connector-tool, and write-only secret methods. The CLI queried the live image
and sandbox inventory.

Machine-readable evidence:

- [Product/API/runtime result](acceptance-evidence/latest.json)
- [Browser result](acceptance-evidence/ui/latest.json)
- [Authoritative release matrix](customer-release-matrix.md)
- [Image-platform screenshots](acceptance-evidence/customer-image-platform-2026-07-25/REPORT.md)

## Hard customer flow proved

The audit used the reusable `base-agent` source, built
`agentpop/tpl-base-agent:v1`, and deployed an isolated sandbox without a model
key. After it was running, the audit added `VERIFY_MODEL_KEY` through the
write-only secret API, confirmed that list operations returned only the name,
and executed a guest command proving the key was injected.

The browser evidence also retains `image-e2e`
(`sb-92b7350985e272aa1f50b45c`) for manual local inspection. Inside that real
runtime the audit:

- uploaded application and test files;
- ran the customer unit test and persisted `OK` plus exit code `0` in logs;
- served a public preview through port `19091`;
- opened the preview through the AgentPop gateway;
- forked both the runtime workspace and the base image definition;
- displayed secret metadata without returning its value.

The automated acceptance suite creates and destroys its own resources. The
retained browser-demo sandbox is local Docker runtime only and causes no cloud
hosting charge.

## Image platform

The curated catalog includes popular agent bases (OpenClaw, Claude Code,
Aider, Open Interpreter, CrewAI, and Browser Use) and general computer bases
(Base agent, Node.js, Python, Go, Rust, full-stack, and DevOps).

The programmable-image generator is deterministic and allowlisted. User prompt
text does not execute. It produces reviewable source and waits for explicit
approval before starting a build. The generated artifact follows the same
build, fork, deploy, lifecycle, and secrets contract as a curated image.

## Real connector proof

The connector page is backed by the configured Composio broker, not a UI mock.
The live audit returned **1,000 provider toolkits**. GitHub returned current
tool metadata and Gmail was shown as an upstream-validated connected account.
OAuth creates a real Composio Connect Link with single-use pending state, and
unconnected/ungranted invocation is denied rather than fabricated.

Destructive provider revoke was intentionally skipped. It remains available as
an opt-in acceptance check.

## Browser result

The 43-action rendered audit passed:

- marketing, sign in, and sign up;
- overview;
- unified marketplace route, kind filters, search, image generation, source
  inspection, deploy options, optional secrets, and blank computer;
- sandbox create, terminal, logs, files, metrics, events, and settings;
- live connector test path;
- API key, SDK, CLI, and MCP developer surfaces;
- project, members, subscription, and quotas settings;
- owner-only login, control plane, data plane, runtime inventory, audit, and
  private configuration;
- absence of Services, Applications, and credits.

## Remaining hosted-production work

These items are intentionally not hidden behind a green local badge:

- macOS cannot run KVM; the Docker compatibility plane passed, while the
  Firecracker driver still requires a Linux/KVM host proof;
- GitHub signed sessions exist, but full tenant-scoped authorization and the
  additional hosted identity options are unfinished;
- SSH is executable from the host path, but public customer SSH needs a
  gateway and per-customer public-key lifecycle;
- network and S3 attachment records persist, but runtime network enforcement
  and bucket mounting are outside this focused image/sandbox release;
- `agentpop.cloud` Caddy configuration exists, but DNS/TLS has not been
  activated;
- Stripe Checkout requires the owner-controlled production Checkout URL.

No GCP data-plane VM was started during this audit, so there is no continuing
cloud compute cost.
