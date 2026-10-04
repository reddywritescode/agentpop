#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Firecracker hosts must run Linux." >&2
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer as root." >&2
  exit 1
fi

architecture="$(uname -m)"
case "${architecture}" in
  x86_64|aarch64) ;;
  *)
    echo "Unsupported architecture: ${architecture}" >&2
    exit 1
    ;;
esac

apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  e2fsprogs \
  iproute2 \
  iptables \
  jq \
  openssh-client \
  squashfs-tools \
  util-linux

release_url="https://github.com/firecracker-microvm/firecracker/releases"
release="${FIRECRACKER_VERSION:-$(basename "$(curl -fsSLI -o /dev/null -w '%{url_effective}' "${release_url}/latest")")}"
archive="firecracker-${release}-${architecture}.tgz"
temp_dir="$(mktemp -d /tmp/agentpop-firecracker.XXXXXX)"
trap 'rm -rf "${temp_dir}"' EXIT

curl -fL "${release_url}/download/${release}/${archive}" -o "${temp_dir}/${archive}"
tar -xzf "${temp_dir}/${archive}" -C "${temp_dir}"
release_dir="${temp_dir}/release-${release}-${architecture}"

install -m 0755 "${release_dir}/firecracker-${release}-${architecture}" /usr/local/bin/firecracker
install -m 0755 "${release_dir}/jailer-${release}-${architecture}" /usr/local/bin/jailer
install -d -m 0755 /usr/local/libexec /var/lib/agentpop/assets /var/lib/agentpop/ssh

modprobe kvm
if [[ "${architecture}" == "x86_64" ]]; then
  modprobe kvm_intel 2>/dev/null || modprobe kvm_amd 2>/dev/null || true
fi

if [[ ! -r /dev/kvm || ! -w /dev/kvm ]]; then
  echo "/dev/kvm is not usable. Enable nested virtualization on this host." >&2
  exit 1
fi

echo "Installed $(/usr/local/bin/firecracker --version)"
echo "Installed $(/usr/local/bin/jailer --version)"
