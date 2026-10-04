#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Build the Firecracker rootfs on a Linux machine." >&2
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this builder as root." >&2
  exit 1
fi

architecture="$(uname -m)"
assets_dir="${FIRECRACKER_ASSETS_DIR:-/var/lib/agentpop/assets}"
rootfs_size_mib="${ROOTFS_SIZE_MIB:-1024}"
s3_url="https://s3.amazonaws.com/spec.ccfc.min"
work_dir="$(mktemp -d /tmp/agentpop-rootfs.XXXXXX)"
trap 'rm -rf "${work_dir}"' EXIT

install -d -m 0755 "${assets_dir}"
cd "${work_dir}"

ci_prefix="$(
  curl -fsSL "${s3_url}?list-type=2&prefix=firecracker-ci/&delimiter=/" \
    | grep -oP '(?<=<Prefix>)firecracker-ci/[0-9]{8}-[^/]+/(?=</Prefix>)' \
    | sort \
    | tail -1
)"
kernel_key="$(
  curl -fsSL "${s3_url}?list-type=2&prefix=${ci_prefix}${architecture}/vmlinux-" \
    | grep -oP "(?<=<Key>)(${ci_prefix}${architecture}/vmlinux-[0-9]+\\.[0-9]+\\.[0-9]{1,3})(?=</Key>)" \
    | sort -V \
    | tail -1
)"
ubuntu_key="$(
  curl -fsSL "${s3_url}?list-type=2&prefix=${ci_prefix}${architecture}/ubuntu-" \
    | grep -oP "(?<=<Key>)(${ci_prefix}${architecture}/ubuntu-[0-9]+\\.[0-9]+\\.squashfs)(?=</Key>)" \
    | sort -V \
    | tail -1
)"

if [[ -z "${kernel_key}" || -z "${ubuntu_key}" ]]; then
  echo "Could not resolve current Firecracker CI guest artifacts." >&2
  exit 1
fi

curl -fL "${s3_url}/${kernel_key}" -o "${assets_dir}/vmlinux"
curl -fL "${s3_url}/${ubuntu_key}" -o ubuntu.squashfs
unsquashfs -d root ubuntu.squashfs >/dev/null

install -d -m 0700 root/root/.ssh
: > root/root/.ssh/authorized_keys
chmod 0600 root/root/.ssh/authorized_keys
install -d -m 0755 root/etc/ssh/sshd_config.d
printf '%s\n' \
  'PermitRootLogin prohibit-password' \
  'PasswordAuthentication no' \
  'KbdInteractiveAuthentication no' \
  'PubkeyAuthentication yes' \
  'AllowTcpForwarding yes' \
  'X11Forwarding no' \
  > root/etc/ssh/sshd_config.d/agentpop.conf

truncate -s "${rootfs_size_mib}M" "${assets_dir}/devbox.ext4"
mkfs.ext4 -q -F -d root -L agentpop-root "${assets_dir}/devbox.ext4"
chmod 0644 "${assets_dir}/vmlinux" "${assets_dir}/devbox.ext4"

echo "Kernel: ${assets_dir}/vmlinux"
echo "Rootfs: ${assets_dir}/devbox.ext4"
