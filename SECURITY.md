# Security policy

AgentPop executes untrusted code. Treat every isolation, authentication,
networking, storage, preview, connector, and snapshot defect as
security-sensitive.

Do not open a public issue for a suspected vulnerability. Until a dedicated
security inbox is published, contact the repository owner privately through
the Git hosting platform and include:

- affected version or commit;
- deployment mode and runtime driver;
- minimal reproduction;
- expected impact;
- logs with all secrets and tenant data removed.

The local Docker driver is a compatibility environment, not a tenant security
boundary. Hosting untrusted tenants requires the Linux/KVM Firecracker data
plane plus the hardening and isolation gates documented in
`docs/createos-gap-analysis.md`.

## Agent model credentials

- Treat `POST /v1/agents` `secrets` and `PUT /v1/agents/{name}/secrets` as
  write-only inputs. Responses expose names and generations only.
- Hosted deployments must supply a high-entropy
  `CONTROL_PLANE_ENCRYPTION_KEY`; losing it makes encrypted credentials
  unrecoverable. Store it in the cloud secret manager, not in the repository.
- The control plane persists only AEAD-encrypted secret maps. Audit records
  contain names, generations, and application status—never values.
- Secret values cross only the authenticated control-plane-to-host-agent
  channel. Production deployments must additionally encrypt that channel with
  private networking and mTLS or a service mesh before accepting untrusted
  tenants.
- Inside a Firecracker guest, model keys are root-readable environment
  profiles. A customer who can execute as root in their own agent can read
  their own keys; they cannot read another microVM's keys.
- The Docker driver is development-only. It does not provide a hostile
  multi-tenant boundary.
