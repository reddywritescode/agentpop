#!/usr/bin/env bash
set -euo pipefail

errors=0

for binary in go node pnpm docker ssh ssh-keygen; do
  if ! command -v "${binary}" >/dev/null 2>&1; then
    echo "missing: ${binary}"
    errors=$((errors + 1))
  else
    echo "ok: ${binary} -> $(command -v "${binary}")"
  fi
done

if ! docker info >/dev/null 2>&1; then
  echo "not ready: Docker Engine (start Docker Desktop on macOS)"
  errors=$((errors + 1))
else
  echo "ok: Docker Engine"
fi

if [[ "$(uname -s)" == "Linux" && -c /dev/kvm ]]; then
  echo "ok: Linux KVM is available for the Firecracker driver"
else
  echo "info: Firecracker is unavailable on this host; the local Docker driver will be used"
fi

if (( errors > 0 )); then
  exit 1
fi
