# GCP deployment

- `cloudbuild.yaml` builds immutable web and control-plane images.
- `build-images.sh` creates the Artifact Registry repository and submits the
  build.
- `management-startup.sh` installs Docker on the management VM.
- `deploy-management.sh` creates the static IP, minimum firewall rules,
  management VM, and gated hosted Compose stack.

These scripts create billable resources. Read
[`../../docs/hosting-agentpop-cloud.md`](../../docs/hosting-agentpop-cloud.md)
before running them.
