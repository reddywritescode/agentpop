#!/usr/bin/env sh
set -eu

version="${AGENTPOP_VERSION:-latest}"
repository="${AGENTPOP_RELEASE_REPOSITORY:-reddywritescode/agentpop-cli}"
binary_dir="${AGENTPOP_INSTALL_DIR:-/usr/local/bin}"

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"
case "$arch" in
  x86_64|amd64) arch="amd64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) echo "unsupported architecture: $arch" >&2; exit 1 ;;
esac

if [ "$version" = "latest" ]; then
  version="$(curl -fsSL "https://api.github.com/repos/${repository}/releases/latest" | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi

archive="agentpop_${version#v}_${os}_${arch}.tar.gz"
temporary="${TMPDIR:-/tmp}/agentpop-install-$$"
mkdir -p "$temporary"
trap 'rm -rf "$temporary"' EXIT INT TERM
curl -fsSL "https://github.com/${repository}/releases/download/${version}/${archive}" -o "$temporary/$archive"
tar -xzf "$temporary/$archive" -C "$temporary"
install -m 0755 "$temporary/agentpop" "$binary_dir/agentpop"
echo "installed agentpop to $binary_dir/agentpop"
