#!/usr/bin/env sh
set -eu

for spec in openapi.yaml private-openapi.yaml host-agent-openapi.yaml; do
  test -s "$spec"
  grep -q '^openapi:' "$spec"
  grep -q '^paths:' "$spec"
done

echo "OpenAPI package verified."
