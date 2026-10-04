.PHONY: build test test-packages package-dist sync-packages typecheck devbox-image host-agent control-plane web up smoke smoke-secrets smoke-evals qa-product qa-ui local-preflight cli mcp

build:
	go build ./...
	pnpm build

test:
	go test ./...

sync-packages:
	@./scripts/sync-package-sources.sh

test-packages: sync-packages
	cd packages/agentpop-cli && go test ./... && go build -o ../../.local/build-check/agentpop-cli ./cmd/agentpop
	cd packages/agentpop-mcp && go test ./... && go build -o ../../.local/build-check/agentpop-mcp .
	pnpm --filter @agentpop/sdk build
	pnpm --filter @agentpop/sdk typecheck
	python3 -m compileall -q packages/python-sdk/agentpop
	cd packages/go-sdk && go test ./...
	cd packages/openapi && ./verify.sh
	cd packages/claude-plugin && ./verify.sh
	docker compose -f packages/self-host/compose.yaml --env-file packages/self-host/.env.example config >/dev/null
	ruby -c packages/homebrew-agentpop/Formula/agentpop.rb

package-dist: test-packages
	@./scripts/package-release.sh

typecheck:
	pnpm typecheck

devbox-image:
	docker build -t agentpop/devbox:local images/devbox

host-agent:
	RUNTIME_DRIVER=auto go run ./cmd/host-agent

control-plane:
	go run ./cmd/control-plane

web:
	pnpm dev

up:
	@./scripts/local-up.sh

smoke:
	@./scripts/smoke-local.sh

smoke-secrets:
	@./scripts/smoke-agent-secrets.sh

smoke-evals:
	@./scripts/smoke-agent-evals.sh

qa-product:
	@./scripts/verify-product.sh

qa-ui:
	@pnpm qa:ui

local-preflight:
	@./scripts/local-preflight.sh

cli:
	go build -o .local/bin/agentpop ./cmd/agentpop

mcp:
	go build -o .local/bin/agentpop-mcp ./cmd/agentpop-mcp
