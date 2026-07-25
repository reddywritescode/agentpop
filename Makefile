.PHONY: build test typecheck devbox-image host-agent control-plane web up smoke smoke-secrets smoke-evals qa-product qa-ui local-preflight cli mcp

build:
	go build ./...
	pnpm build

test:
	go test ./...

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
