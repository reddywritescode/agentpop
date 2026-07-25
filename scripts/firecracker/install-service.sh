#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer as root." >&2
  exit 1
fi

source_dir="${1:-$(pwd)}"

install -d -m 0755 /usr/local/libexec /etc/agentpop /var/lib/agentpop/host-agent
if [[ -n "${AGENTPOP_BIN_DIR:-}" ]]; then
  install -m 0755 "${AGENTPOP_BIN_DIR}/agentpop-host-agent" /usr/local/bin/agentpop-host-agent
  install -m 0755 "${AGENTPOP_BIN_DIR}/agentpop-firecracker" /usr/local/libexec/agentpop-firecracker
elif [[ -f "${source_dir}/go.mod" ]]; then
  (
    cd "${source_dir}"
    go build -trimpath -ldflags='-s -w' -o /usr/local/bin/agentpop-host-agent ./cmd/host-agent
    go build -trimpath -ldflags='-s -w' -o /usr/local/libexec/agentpop-firecracker ./cmd/firecracker-runtime
  )
else
  echo "Pass a source directory or set AGENTPOP_BIN_DIR to prebuilt Linux binaries." >&2
  exit 1
fi

cat >/etc/agentpop/host-agent.env <<'EOF'
RUNTIME_DRIVER=firecracker
HOST_AGENT_ADDR=0.0.0.0:9090
HOST_STATE_DIR=/var/lib/agentpop/host-agent
FIRECRACKER_BINARY=/usr/local/bin/firecracker
JAILER_BINARY=/usr/local/bin/jailer
FIRECRACKER_KERNEL=/var/lib/agentpop/assets/vmlinux
FIRECRACKER_ROOTFS=/var/lib/agentpop/assets/devbox.ext4
FIRECRACKER_STATE_DIR=/var/lib/agentpop
SANDBOX_SSH_KEY=/var/lib/agentpop/ssh/id_ed25519
EOF
printf 'HOST_ID=%s\n' "${AGENTPOP_HOST_ID:-firecracker-host}" >>/etc/agentpop/host-agent.env
printf 'HOST_NAME=%s\n' "${AGENTPOP_HOST_NAME:-Firecracker-data-plane}" >>/etc/agentpop/host-agent.env
printf 'HOST_REGION=%s\n' "${AGENTPOP_HOST_REGION:-local}" >>/etc/agentpop/host-agent.env
if [[ -n "${AGENTPOP_HOST_SSH_COMMAND:-}" ]]; then
  escaped_ssh_command="${AGENTPOP_HOST_SSH_COMMAND//\"/\\\"}"
  printf 'HOST_SSH_COMMAND="%s"\n' "${escaped_ssh_command}" >>/etc/agentpop/host-agent.env
fi

cat >/etc/systemd/system/agentpop-host-agent.service <<'EOF'
[Unit]
Description=AgentPop Firecracker data-plane host agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/agentpop/host-agent.env
ExecStart=/usr/local/bin/agentpop-host-agent
Restart=on-failure
RestartSec=2
LimitNOFILE=1048576
TasksMax=infinity

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable agentpop-host-agent
systemctl restart agentpop-host-agent
systemctl --no-pager --full status agentpop-host-agent
