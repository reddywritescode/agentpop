#!/usr/bin/env bash
set -euo pipefail

workspace="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_dir="${1:-$workspace/.local/releases}"
manifest="$workspace/packages/package-manifest.json"

mkdir -p "$release_dir"
"$workspace/scripts/sync-package-sources.sh"

while IFS=$'\t' read -r package_name package_path; do
  archive_name="${package_name//@/}"
  archive_name="${archive_name//\//-}"
  archive="$release_dir/${archive_name}-source.tar.gz"
  tar \
    --exclude='./.git' \
    --exclude='./node_modules' \
    --exclude='./__pycache__' \
    --exclude='*/__pycache__' \
    -czf "$archive" \
    -C "$workspace/$package_path" \
    .
done < <(jq -r '.packages[] | [.name, .path] | @tsv' "$manifest")

checksums="$release_dir/SHA256SUMS"
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$release_dir" && sha256sum ./*-source.tar.gz > "$checksums")
else
  (cd "$release_dir" && shasum -a 256 ./*-source.tar.gz > "$checksums")
fi

archive_count="$(find "$release_dir" -name '*-source.tar.gz' | wc -l | tr -d ' ')"
printf 'Created %s package archives in %s\n' "$archive_count" "$release_dir"
