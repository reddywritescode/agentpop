# GCP deployment

- `cloudbuild.yaml` builds immutable web and control-plane images.
- `build-images.sh` creates the Artifact Registry repository and submits the
  build.
- `management-startup.sh` installs Docker on the management VM.
- `mount-management-state.sh` formats (once) and mounts the dedicated
  non-auto-delete state disk at `/var/lib/agentpop`.
- `deploy-management.sh` creates the static IP, minimum firewall rules,
  management VM, 50-GB `pd-balanced` state disk, and gated hosted Compose
  stack.

## Control-plane persistence

The hosted alpha runs one control-plane process. Its durable metadata is an
atomically-written JSON snapshot at:

```text
/var/lib/agentpop/control-plane/state.json
```

Connector/Composio account metadata is stored separately at:

```text
/var/lib/agentpop/connector-broker/state.json
```

Both paths are bind-mounted from the dedicated state disk. Deleting or
recreating the management VM does not delete that disk. Secrets inside the
control-plane snapshot are encrypted with `CONTROL_PLANE_ENCRYPTION_KEY`.

This layout is intentionally single-node. It validates real disk durability
and VM recovery for the hosted alpha, but it is not the eventual horizontally
scaled metadata design. Multiple control-plane replicas require the planned
PostgreSQL state adapter and shared object storage for artifacts/log archives.

The Firecracker data plane has a separate persistence boundary: sandbox
rootfs/workspace state lives under `/var/lib/agentpop` on the data-plane host.

These scripts create billable resources. Read
[`../../docs/hosting-agentpop-cloud.md`](../../docs/hosting-agentpop-cloud.md)
before running them.
