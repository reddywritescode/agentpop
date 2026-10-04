#!/usr/bin/env sh
set -eu

test -s .claude-plugin/plugin.json
test -s skills/agentpop/SKILL.md
grep -q '"name": "agentpop"' .claude-plugin/plugin.json

echo "Claude plugin package verified."
