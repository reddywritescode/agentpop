#!/usr/bin/env bash
set -euo pipefail

device_name="${AGENTPOP_STATE_DEVICE_NAME:-agentpop-state}"
device="/dev/disk/by-id/google-${device_name}"
state_root="${AGENTPOP_STATE_ROOT:-/var/lib/agentpop}"

for _ in {1..30}; do
  if [[ -b "${device}" ]]; then
    break
  fi
  sleep 1
done

if [[ ! -b "${device}" ]]; then
  echo "AgentPop state disk ${device} is not attached." >&2
  exit 1
fi

if ! blkid -s TYPE -o value "${device}" >/dev/null 2>&1; then
  mkfs.ext4 -F -L agentpop-state "${device}"
fi

filesystem_uuid="$(blkid -s UUID -o value "${device}")"
install -d -m 0755 "${state_root}"
if ! grep -Fq "UUID=${filesystem_uuid} ${state_root} " /etc/fstab; then
  printf 'UUID=%s %s ext4 defaults,nofail,discard 0 2\n' \
    "${filesystem_uuid}" "${state_root}" >>/etc/fstab
fi
if ! mountpoint -q "${state_root}"; then
  mount "${state_root}"
fi

# The distroless control-plane image runs as uid/gid 65532. The Node broker
# runs as uid/gid 1000. Keep their state directories private and writable.
install -d -m 0750 -o 65532 -g 65532 "${state_root}/control-plane"
install -d -m 0750 -o 1000 -g 1000 "${state_root}/connector-broker"
