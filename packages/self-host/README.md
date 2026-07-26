# AgentPop self-host

This package runs the management plane: dashboard, public control-plane API,
connector broker, and Caddy TLS ingress. Firecracker data-plane hosts are
registered separately and require Linux with KVM.

```bash
cp .env.example .env
# Set secrets and your domain in .env.
docker compose --env-file .env up -d
```

Persistent management state is stored below `AGENTPOP_STATE_ROOT` (default
`/var/lib/agentpop`). Back up that directory. The current JSON store is suitable
for one management instance. Use the planned PostgreSQL store before
horizontally scaling the control plane.

The hosted AgentPop service runs this same open-source package with managed
TLS, backups, capacity, and a fixed $20/month subscription.
