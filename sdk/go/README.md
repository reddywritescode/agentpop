# AgentPop Go SDK

The Go SDK is dependency-free and uses the same public REST contract as the
dashboard, CLI, MCP server, TypeScript SDK, and Python SDK.

```go
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/reddywritescode/agentpop/sdk/go/agentpop"
)

func main() {
	client := agentpop.New("http://127.0.0.1:8080", os.Getenv("AGENTPOP_API_KEY"))
	ctx := context.Background()

	images, _ := client.ListImages(ctx, "agent", "coding")
	fmt.Println(images)

	generated, _ := client.GenerateImage(
		ctx,
		"Python data environment with pandas, NumPy, jq, and ripgrep",
		"sandbox",
		"",
	)
	fmt.Println(generated.Definition) // review before building

	sandbox, _ := client.DeployImage(ctx, "python-data", agentpop.CreateSandboxRequest{
		Name:      "analysis",
		Lifecycle: "persistent",
	})
	_, _ = client.SetSandboxSecrets(ctx, sandbox.ID, map[string]string{
		"OPENAI_API_KEY": os.Getenv("OPENAI_API_KEY"),
	}, false)
	defer func() {
		// Destroy through the REST API or CLI until lifecycle helpers are added.
	}()

	result, _ := client.Exec(ctx, sandbox.ID, "python3 --version", 30)
	fmt.Println(result.Stdout)
}
```

Secret values are write-only. Sandbox reads expose only `SecretNames`.
Mutations automatically receive an idempotency key.
