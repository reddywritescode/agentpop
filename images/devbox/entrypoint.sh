#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${AUTHORIZED_KEY:-}" ]]; then
  echo "AUTHORIZED_KEY is required" >&2
  exit 1
fi

install -d -m 0700 /root/.ssh
printf '%s\n' "${AUTHORIZED_KEY}" > /root/.ssh/authorized_keys
chmod 0600 /root/.ssh/authorized_keys
ssh-keygen -A

cat >/etc/motd <<EOF
AgentPop sandbox: ${SANDBOX_NAME:-unnamed}
Runtime: local Docker compatibility driver
Production runtime: Firecracker microVM on a Linux KVM host
EOF

exec /usr/sbin/sshd -D -e
