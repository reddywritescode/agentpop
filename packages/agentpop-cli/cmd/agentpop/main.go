package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const version = "0.1.1"

type apiClient struct {
	baseURL string
	token   string
	http    *http.Client
}

func main() {
	if err := run(context.Background(), os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "agentpop:", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		printUsage()
		return nil
	}
	if args[0] == "version" || args[0] == "--version" || args[0] == "-v" {
		fmt.Println("agentpop", version)
		return nil
	}
	client := &apiClient{
		baseURL: strings.TrimRight(env("AGENTPOP_API_URL", "http://127.0.0.1:8080"), "/"),
		token:   os.Getenv("AGENTPOP_API_TOKEN"),
		http:    &http.Client{Timeout: 3 * time.Minute},
	}
	switch args[0] {
	case "status":
		return client.printJSON(ctx, http.MethodGet, "/v1/control-plane/status", nil)
	case "host":
		return runHost(ctx, client, args[1:])
	case "sandbox", "sb":
		return runSandbox(ctx, client, args[1:])
	case "exec":
		return runExec(ctx, client, args[1:])
	case "ssh":
		return runSSH(ctx, client, args[1:])
	case "file":
		return runFile(ctx, client, args[1:])
	case "agent":
		return runAgent(ctx, client, args[1:])
	case "eval":
		return runEval(ctx, client, args[1:])
	case "port":
		return runPort(ctx, client, args[1:])
	case "template":
		return runTemplate(ctx, client, args[1:])
	case "catalog", "marketplace":
		return runCatalog(ctx, client, args[1:])
	case "image", "images":
		return runImages(ctx, client, args[1:])
	case "network":
		return runNetwork(ctx, client, args[1:])
	case "storage":
		return runStorage(ctx, client, args[1:])
	case "webhook":
		return runWebhook(ctx, client, args[1:])
	case "connector":
		return runConnector(ctx, client, args[1:])
	case "member":
		return runMember(ctx, client, args[1:])
	case "api-key":
		return runAPIKey(ctx, client, args[1:])
	case "project":
		return runProject(ctx, client, args[1:])
	case "quota":
		return runQuota(ctx, client, args[1:])
	case "help", "--help", "-h":
		printUsage()
		return nil
	default:
		return fmt.Errorf("unknown command %q; run `agentpop help`", args[0])
	}
}

func runHost(ctx context.Context, client *apiClient, args []string) error {
	if len(args) != 1 || args[0] != "list" {
		return errors.New("usage: agentpop host list")
	}
	return client.printJSON(ctx, http.MethodGet, "/v1/data-plane/hosts", nil)
}

func runSandbox(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop sandbox <list|get|create|update|fork|pause|resume|destroy|metrics|events|logs|secret> ...")
	}
	switch args[0] {
	case "list":
		return client.printJSON(ctx, http.MethodGet, "/v1/sandboxes", nil)
	case "get":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/sandboxes/"+url.PathEscape(id), nil)
	case "create":
		return createSandbox(ctx, client, args[1:])
	case "update":
		return updateSandbox(ctx, client, args[1:])
	case "fork":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/sandboxes/"+url.PathEscape(id)+":fork", map[string]any{})
	case "pause", "resume":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/sandboxes/"+url.PathEscape(id)+"/"+args[0], map[string]any{})
	case "metrics", "events", "logs":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/sandboxes/"+url.PathEscape(id)+"/"+args[0], nil)
	case "secret", "secrets":
		return runSandboxSecret(ctx, client, args[1:])
	case "destroy", "rm":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		if _, err := client.request(ctx, http.MethodDelete, "/v1/sandboxes/"+url.PathEscape(id), nil, ""); err != nil {
			return err
		}
		fmt.Println(id, "destroyed")
		return nil
	default:
		return fmt.Errorf("unknown sandbox command %q", args[0])
	}
}

func updateSandbox(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop sandbox update SANDBOX_ID [flags]")
	}
	id := args[0]
	fs := flag.NewFlagSet("sandbox update", flag.ContinueOnError)
	name := fs.String("name", "", "new sandbox name")
	vcpu := fs.Float64("vcpu", 0, "virtual CPU count")
	memoryMB := fs.Int64("memory-mb", 0, "memory in MiB")
	pauseWhenIdle := fs.String("pause-when-idle", "", "true or false")
	idleTimeout := fs.Int64("idle-timeout", -1, "idle timeout in seconds")
	ttl := fs.Int64("ttl", -1, "destroy after this many seconds; 0 disables")
	lifecycle := fs.String("lifecycle", "", "persistent or ephemeral")
	if err := fs.Parse(args[1:]); err != nil {
		return err
	}
	body := map[string]any{}
	if *name != "" {
		body["name"] = *name
	}
	if *vcpu > 0 {
		body["vcpu"] = *vcpu
	}
	if *memoryMB > 0 {
		body["memoryMb"] = *memoryMB
	}
	if *pauseWhenIdle != "" {
		value, err := strconv.ParseBool(*pauseWhenIdle)
		if err != nil {
			return fmt.Errorf("--pause-when-idle must be true or false")
		}
		body["pauseWhenIdle"] = value
	}
	if *idleTimeout >= 0 {
		body["idleTimeoutSec"] = *idleTimeout
	}
	if *ttl >= 0 {
		body["ttlSeconds"] = *ttl
	}
	if *lifecycle != "" {
		body["lifecycle"] = *lifecycle
	}
	if len(body) == 0 {
		return errors.New("at least one update flag is required")
	}
	return client.printJSON(ctx, http.MethodPatch, "/v1/sandboxes/"+url.PathEscape(id), body)
}

func createSandbox(ctx context.Context, client *apiClient, args []string) error {
	fs := flag.NewFlagSet("sandbox create", flag.ContinueOnError)
	name := fs.String("name", "", "sandbox name")
	image := fs.String("image", "agentpop/devbox:local", "root filesystem image")
	region := fs.String("region", "local", "placement region")
	vcpu := fs.Float64("vcpu", 1, "virtual CPU count")
	memoryMB := fs.Int64("memory-mb", 1024, "memory in MiB")
	diskGB := fs.Int64("disk-gb", 10, "disk in GiB")
	publicWeb := fs.Bool("public-web", false, "enable public preview routing")
	pauseWhenIdle := fs.Bool("pause-when-idle", false, "pause after idle timeout")
	idleTimeout := fs.Int64("idle-timeout", 900, "idle timeout in seconds")
	ttl := fs.Int64("ttl", 0, "destroy after this many seconds")
	lifecycle := fs.String("lifecycle", "persistent", "persistent or ephemeral")
	egress := stringListFlag{}
	envs := stringListFlag{}
	secretEnvs := stringListFlag{}
	fs.Var(&egress, "allow-egress", "allowed host/IP/CIDR; repeatable")
	fs.Var(&envs, "env", "environment KEY=VALUE; repeatable")
	fs.Var(&secretEnvs, "secret-env", "read a write-only secret from this process environment; repeatable")
	if err := fs.Parse(args); err != nil {
		return err
	}
	environment := map[string]string{}
	for _, item := range envs {
		key, value, ok := strings.Cut(item, "=")
		if !ok || strings.TrimSpace(key) == "" {
			return fmt.Errorf("invalid --env %q; expected KEY=VALUE", item)
		}
		environment[key] = value
	}
	secrets := map[string]string{}
	for _, key := range secretEnvs {
		if value := os.Getenv(key); value != "" {
			secrets[key] = value
		} else {
			return fmt.Errorf("environment variable %s is empty", key)
		}
	}
	body := map[string]any{
		"name": *name, "image": *image, "region": *region,
		"vcpu": *vcpu, "memoryMb": *memoryMB, "diskGb": *diskGB,
		"publicWeb": *publicWeb, "pauseWhenIdle": *pauseWhenIdle,
		"idleTimeoutSec": *idleTimeout, "ttlSeconds": *ttl,
		"lifecycle":     *lifecycle,
		"allowedEgress": []string(egress), "environment": environment, "secrets": secrets,
	}
	return client.printJSON(ctx, http.MethodPost, "/v1/sandboxes", body)
}

func runExec(ctx context.Context, client *apiClient, args []string) error {
	if len(args) < 2 {
		return errors.New("usage: agentpop exec SANDBOX_ID -- COMMAND [ARG...]")
	}
	id := args[0]
	commandArgs := args[1:]
	label := ""
	if len(commandArgs) >= 2 && commandArgs[0] == "--label" {
		label = commandArgs[1]
		commandArgs = commandArgs[2:]
	}
	if commandArgs[0] == "--" {
		commandArgs = commandArgs[1:]
	}
	if len(commandArgs) == 0 {
		return errors.New("command is required")
	}
	var result struct {
		ExitCode   int    `json:"exitCode"`
		Stdout     string `json:"stdout"`
		Stderr     string `json:"stderr"`
		DurationMS int64  `json:"durationMs"`
	}
	raw, err := client.request(
		ctx,
		http.MethodPost,
		"/v1/sandboxes/"+url.PathEscape(id)+"/exec",
		map[string]any{"command": shellJoin(commandArgs), "label": label, "timeoutSeconds": 120},
		"application/json",
	)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return err
	}
	_, _ = io.WriteString(os.Stdout, result.Stdout)
	_, _ = io.WriteString(os.Stderr, result.Stderr)
	if result.ExitCode != 0 {
		return fmt.Errorf("command exited with code %d", result.ExitCode)
	}
	return nil
}

func shellJoin(args []string) string {
	quoted := make([]string, 0, len(args))
	for _, arg := range args {
		if arg != "" && strings.IndexFunc(arg, func(r rune) bool {
			return !(r == '_' || r == '-' || r == '.' || r == '/' || r == ':' ||
				r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9')
		}) == -1 {
			quoted = append(quoted, arg)
			continue
		}
		quoted = append(quoted, "'"+strings.ReplaceAll(arg, "'", "'\"'\"'")+"'")
	}
	return strings.Join(quoted, " ")
}

func runSSH(ctx context.Context, client *apiClient, args []string) error {
	id, err := requiredID(args)
	if err != nil {
		return err
	}
	var result struct {
		Command string `json:"command"`
	}
	raw, err := client.request(ctx, http.MethodGet, "/v1/sandboxes/"+url.PathEscape(id)+"/ssh", nil, "")
	if err != nil {
		return err
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return err
	}
	if result.Command == "" {
		return errors.New("sandbox has no SSH command")
	}
	fmt.Println(result.Command)
	return nil
}

func runFile(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop file <list|upload|download|mkdir|delete> ...")
	}
	switch args[0] {
	case "list":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/sandboxes/"+url.PathEscape(id)+"/files", nil)
	case "upload":
		if len(args) != 4 {
			return errors.New("usage: agentpop file upload SANDBOX_ID LOCAL_PATH /workspace/GUEST_PATH")
		}
		data, err := os.ReadFile(args[2])
		if err != nil {
			return err
		}
		if len(data) > 32<<20 {
			return errors.New("direct uploads must not exceed 32 MiB")
		}
		path := "/v1/sandboxes/" + url.PathEscape(args[1]) + "/files?path=" + url.QueryEscape(args[3])
		if _, err := client.request(ctx, http.MethodPut, path, data, "application/octet-stream"); err != nil {
			return err
		}
		fmt.Printf("%s -> %s:%s\n", args[2], args[1], args[3])
		return nil
	case "download":
		if len(args) != 4 {
			return errors.New("usage: agentpop file download SANDBOX_ID /workspace/GUEST_PATH LOCAL_PATH")
		}
		path := "/v1/sandboxes/" + url.PathEscape(args[1]) + "/files?path=" + url.QueryEscape(args[2])
		data, err := client.request(ctx, http.MethodGet, path, nil, "")
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(args[3]), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(args[3], data, 0o600); err != nil {
			return err
		}
		fmt.Printf("%s:%s -> %s\n", args[1], args[2], args[3])
		return nil
	case "mkdir":
		if len(args) != 3 {
			return errors.New("usage: agentpop file mkdir SANDBOX_ID /workspace/DIRECTORY")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/sandboxes/"+url.PathEscape(args[1])+"/directories", map[string]string{"path": args[2]})
	case "delete", "rm":
		if len(args) != 3 {
			return errors.New("usage: agentpop file delete SANDBOX_ID /workspace/PATH")
		}
		path := "/v1/sandboxes/" + url.PathEscape(args[1]) + "/files?path=" + url.QueryEscape(args[2])
		if _, err := client.request(ctx, http.MethodDelete, path, nil, ""); err != nil {
			return err
		}
		fmt.Printf("%s:%s deleted\n", args[1], args[2])
		return nil
	default:
		return fmt.Errorf("unknown file command %q", args[0])
	}
}

func runAgent(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop agent <list|create|stop|restart|logs|delete|secret>")
	}
	switch args[0] {
	case "list":
		return client.printJSON(ctx, http.MethodGet, "/v1/agents", nil)
	case "create":
		fs := flag.NewFlagSet("agent create", flag.ContinueOnError)
		name := fs.String("name", "", "agent name")
		template := fs.String("template", "openclaw-compatible", "agent template")
		model := fs.String("model", "provider/model", "model identifier")
		vcpu := fs.Float64("vcpu", 1, "virtual CPU count")
		memoryMB := fs.Int64("memory-mb", 2048, "memory in MiB")
		diskGB := fs.Int64("disk-gb", 5, "disk in GiB")
		connectors := stringListFlag{}
		secretEnvironment := stringListFlag{}
		fs.Var(&connectors, "connector", "connector grant; repeatable")
		fs.Var(&secretEnvironment, "secret-env", "read a write-only secret from this local environment variable; repeatable")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		if strings.TrimSpace(*name) == "" {
			return errors.New("--name is required")
		}
		secrets, err := secretsFromEnvironment(secretEnvironment)
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/agents", map[string]any{
			"name": *name, "template": *template, "model": *model,
			"vcpu": *vcpu, "memoryMb": *memoryMB, "diskGb": *diskGB,
			"connectors": []string(connectors), "secrets": secrets,
		})
	case "stop", "restart":
		if len(args) != 2 {
			return fmt.Errorf("usage: agentpop agent %s NAME", args[0])
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/agents/"+url.PathEscape(args[1])+":"+args[0], map[string]any{})
	case "logs":
		if len(args) != 2 {
			return errors.New("usage: agentpop agent logs NAME")
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/agents/"+url.PathEscape(args[1])+"/logs", nil)
	case "delete", "rm":
		if len(args) != 2 {
			return errors.New("usage: agentpop agent delete NAME")
		}
		if _, err := client.request(ctx, http.MethodDelete, "/v1/agents/"+url.PathEscape(args[1]), nil, ""); err != nil {
			return err
		}
		fmt.Println(args[1], "deleted")
		return nil
	case "secret", "secrets":
		return runAgentSecret(ctx, client, args[1:])
	default:
		return fmt.Errorf("unknown agent command %q", args[0])
	}
}

func runAgentSecret(ctx context.Context, client *apiClient, args []string) error {
	if len(args) < 2 {
		return errors.New("usage: agentpop agent secret <list|set|delete> NAME [flags]")
	}
	action, name := args[0], args[1]
	basePath := "/v1/agents/" + url.PathEscape(name) + "/secrets"
	switch action {
	case "list":
		if len(args) != 2 {
			return errors.New("usage: agentpop agent secret list NAME")
		}
		return client.printJSON(ctx, http.MethodGet, basePath, nil)
	case "set":
		fs := flag.NewFlagSet("agent secret set", flag.ContinueOnError)
		fromEnvironment := stringListFlag{}
		replace := fs.Bool("replace", false, "replace all existing agent secrets")
		fs.Var(&fromEnvironment, "from-env", "local environment variable to upload; repeatable")
		if err := fs.Parse(args[2:]); err != nil {
			return err
		}
		secrets, err := secretsFromEnvironment(fromEnvironment)
		if err != nil {
			return err
		}
		if len(secrets) == 0 && !*replace {
			return errors.New("at least one --from-env is required")
		}
		return client.printJSON(ctx, http.MethodPut, basePath, map[string]any{
			"secrets": secrets,
			"replace": *replace,
		})
	case "delete", "rm":
		if len(args) != 3 {
			return errors.New("usage: agentpop agent secret delete NAME KEY")
		}
		return client.printJSON(ctx, http.MethodDelete, basePath+"/"+url.PathEscape(args[2]), nil)
	default:
		return fmt.Errorf("unknown agent secret command %q", action)
	}
}

func runSandboxSecret(ctx context.Context, client *apiClient, args []string) error {
	if len(args) < 2 {
		return errors.New("usage: agentpop sandbox secret <list|set|delete> SANDBOX_ID [flags]")
	}
	action, id := args[0], args[1]
	basePath := "/v1/sandboxes/" + url.PathEscape(id) + "/secrets"
	switch action {
	case "list":
		if len(args) != 2 {
			return errors.New("usage: agentpop sandbox secret list SANDBOX_ID")
		}
		return client.printJSON(ctx, http.MethodGet, basePath, nil)
	case "set":
		fs := flag.NewFlagSet("sandbox secret set", flag.ContinueOnError)
		fromEnvironment := stringListFlag{}
		replace := fs.Bool("replace", false, "replace all existing sandbox secrets")
		fs.Var(&fromEnvironment, "from-env", "local environment variable to upload; repeatable")
		if err := fs.Parse(args[2:]); err != nil {
			return err
		}
		secrets, err := secretsFromEnvironment(fromEnvironment)
		if err != nil {
			return err
		}
		if len(secrets) == 0 && !*replace {
			return errors.New("at least one --from-env is required")
		}
		return client.printJSON(ctx, http.MethodPut, basePath, map[string]any{
			"secrets": secrets,
			"replace": *replace,
		})
	case "delete", "rm":
		if len(args) != 3 {
			return errors.New("usage: agentpop sandbox secret delete SANDBOX_ID KEY")
		}
		return client.printJSON(ctx, http.MethodDelete, basePath+"/"+url.PathEscape(args[2]), nil)
	default:
		return fmt.Errorf("unknown sandbox secret command %q", action)
	}
}

func secretsFromEnvironment(names []string) (map[string]string, error) {
	secrets := make(map[string]string, len(names))
	for _, name := range names {
		name = strings.TrimSpace(name)
		if name == "" {
			return nil, errors.New("secret environment variable name cannot be empty")
		}
		value, ok := os.LookupEnv(name)
		if !ok || value == "" {
			return nil, fmt.Errorf("local environment variable %s is missing or empty", name)
		}
		secrets[name] = value
	}
	return secrets, nil
}

func runImages(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop image <list|get|generate|build|fork|deploy> [IMAGE_ID]")
	}
	switch args[0] {
	case "list":
		fs := flag.NewFlagSet("image list", flag.ContinueOnError)
		kind := fs.String("kind", "all", "all, agent, or sandbox")
		query := fs.String("query", "", "search image names, categories, and use cases")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		values := url.Values{}
		if *kind != "" && *kind != "all" {
			values.Set("kind", *kind)
		}
		if *query != "" {
			values.Set("q", *query)
		}
		path := "/v1/images"
		if encoded := values.Encode(); encoded != "" {
			path += "?" + encoded
		}
		return client.printJSON(ctx, http.MethodGet, path, nil)
	case "get":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/images/"+url.PathEscape(id), nil)
	case "generate":
		fs := flag.NewFlagSet("image generate", flag.ContinueOnError)
		prompt := fs.String("prompt", "", "computer or agent image description")
		kind := fs.String("kind", "sandbox", "agent or sandbox")
		name := fs.String("name", "", "optional image name")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		if strings.TrimSpace(*prompt) == "" {
			return errors.New("--prompt is required")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/images/generate", map[string]any{
			"prompt": *prompt, "kind": *kind, "name": *name,
		})
	case "build":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/images/"+url.PathEscape(id)+"/build", map[string]any{})
	case "fork":
		if len(args) < 2 {
			return errors.New("usage: agentpop image fork IMAGE_ID --name NAME [--definition FILE] [--build]")
		}
		id := args[1]
		fs := flag.NewFlagSet("image fork", flag.ContinueOnError)
		name := fs.String("name", "", "new customer-owned image name")
		definitionFile := fs.String("definition", "", "optional Dockerfile path")
		build := fs.Bool("build", false, "queue an immutable image build immediately")
		if err := fs.Parse(args[2:]); err != nil {
			return err
		}
		if *name == "" {
			return errors.New("--name is required")
		}
		definition := ""
		if *definitionFile != "" {
			raw, err := os.ReadFile(*definitionFile)
			if err != nil {
				return err
			}
			definition = string(raw)
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/images/"+url.PathEscape(id)+"/fork", map[string]any{
			"name": *name, "definition": definition, "build": *build,
		})
	case "deploy":
		if len(args) < 2 {
			return errors.New("usage: agentpop image deploy IMAGE_ID [flags]")
		}
		id := args[1]
		fs := flag.NewFlagSet("image deploy", flag.ContinueOnError)
		name := fs.String("name", "", "sandbox name")
		region := fs.String("region", "local", "placement region")
		vcpu := fs.Float64("vcpu", 1, "virtual CPU count")
		memoryMB := fs.Int64("memory-mb", 1024, "memory in MiB")
		diskGB := fs.Int64("disk-gb", 10, "disk in GiB")
		lifecycle := fs.String("lifecycle", "persistent", "persistent or ephemeral")
		ttl := fs.Int64("ttl", 0, "destroy an ephemeral sandbox after this many seconds")
		secretEnvs := stringListFlag{}
		envs := stringListFlag{}
		fs.Var(&secretEnvs, "secret-env", "read a write-only secret from this process environment; repeatable")
		fs.Var(&envs, "env", "environment KEY=VALUE; repeatable")
		if err := fs.Parse(args[2:]); err != nil {
			return err
		}
		environment := map[string]string{}
		for _, item := range envs {
			key, value, ok := strings.Cut(item, "=")
			if !ok || key == "" {
				return fmt.Errorf("invalid --env %q; expected KEY=VALUE", item)
			}
			environment[key] = value
		}
		secrets, err := secretsFromEnvironment(secretEnvs)
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/images/"+url.PathEscape(id)+"/deploy", map[string]any{
			"name": *name, "region": *region, "vcpu": *vcpu, "memoryMb": *memoryMB,
			"diskGb": *diskGB, "lifecycle": *lifecycle, "ttlSeconds": *ttl,
			"environment": environment, "secrets": secrets,
		})
	default:
		return fmt.Errorf("unknown image command %q", args[0])
	}
}

func runEval(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop eval <suite|run|runs|get> ...")
	}
	switch args[0] {
	case "suite":
		if len(args) < 2 {
			return errors.New("usage: agentpop eval suite <list|create|get|delete> ...")
		}
		switch args[1] {
		case "list":
			if len(args) != 3 {
				return errors.New("usage: agentpop eval suite list AGENT")
			}
			return client.printJSON(ctx, http.MethodGet, "/v1/agents/"+url.PathEscape(args[2])+"/eval-suites", nil)
		case "get":
			if len(args) != 3 {
				return errors.New("usage: agentpop eval suite get SUITE_ID")
			}
			return client.printJSON(ctx, http.MethodGet, "/v1/eval-suites/"+url.PathEscape(args[2]), nil)
		case "delete", "rm":
			if len(args) != 3 {
				return errors.New("usage: agentpop eval suite delete SUITE_ID")
			}
			if _, err := client.request(ctx, http.MethodDelete, "/v1/eval-suites/"+url.PathEscape(args[2]), nil, ""); err != nil {
				return err
			}
			fmt.Println(args[2], "eval suite deleted")
			return nil
		case "create", "import":
			if len(args) < 3 {
				return errors.New("usage: agentpop eval suite create AGENT --file scenario.json [--command COMMAND]")
			}
			agentName := args[2]
			fs := flag.NewFlagSet("eval suite create", flag.ContinueOnError)
			file := fs.String("file", "", "Open AgentOps-compatible scenario JSON file")
			command := fs.String("command", "", "agent command; receives case JSON on stdin")
			timeout := fs.Int64("timeout", 60, "case timeout in seconds")
			minScore := fs.Float64("min-score", 1, "release gate score from 0 to 1")
			judgeProvider := fs.String("judge-provider", "auto", "auto, openai, or anthropic")
			judgeModel := fs.String("judge-model", "", "optional rubric judge model")
			if err := fs.Parse(args[3:]); err != nil {
				return err
			}
			if *file == "" {
				return errors.New("--file is required; YAML users can import with the Python SDK")
			}
			raw, err := os.ReadFile(*file)
			if err != nil {
				return err
			}
			var body map[string]any
			if err := json.Unmarshal(raw, &body); err != nil {
				return fmt.Errorf("%s must be JSON; use AgentPopClient.import_agentops_suite for YAML: %w", *file, err)
			}
			delete(body, "agent")
			if _, exists := body["scenario"]; !exists {
				if value, ok := body["suite"]; ok {
					body["scenario"] = value
				} else if value, ok := body["name"]; ok {
					body["scenario"] = value
				}
			}
			delete(body, "suite")
			delete(body, "name")
			if _, exists := body["tests"]; !exists {
				if value, ok := body["cases"]; ok {
					body["tests"] = value
				}
			}
			delete(body, "cases")
			runner, _ := body["runner"].(map[string]any)
			if runner == nil {
				runner = map[string]any{}
			}
			if *command != "" {
				runner["command"] = *command
			}
			runner["type"] = "command"
			runner["timeoutSeconds"] = *timeout
			runner["judgeProvider"] = *judgeProvider
			if *judgeModel != "" {
				runner["judgeModel"] = *judgeModel
			}
			body["runner"] = runner
			body["gate"] = map[string]any{"minScore": *minScore}
			if _, exists := body["source"]; !exists {
				body["source"] = "open-agentops"
			}
			return client.printJSON(ctx, http.MethodPost, "/v1/agents/"+url.PathEscape(agentName)+"/eval-suites", body)
		default:
			return fmt.Errorf("unknown eval suite command %q", args[1])
		}
	case "run":
		if len(args) < 2 {
			return errors.New("usage: agentpop eval run SUITE_ID [--environment sandbox]")
		}
		suiteID := args[1]
		fs := flag.NewFlagSet("eval run", flag.ContinueOnError)
		environment := fs.String("environment", "sandbox", "ci, sandbox, or staging")
		if err := fs.Parse(args[2:]); err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/eval-suites/"+url.PathEscape(suiteID)+"/runs", map[string]any{"environment": *environment})
	case "runs":
		fs := flag.NewFlagSet("eval runs", flag.ContinueOnError)
		agentName := fs.String("agent", "", "filter by agent name")
		suiteID := fs.String("suite", "", "filter by suite ID")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		if *suiteID != "" {
			return client.printJSON(ctx, http.MethodGet, "/v1/eval-suites/"+url.PathEscape(*suiteID)+"/runs", nil)
		}
		if *agentName != "" {
			return client.printJSON(ctx, http.MethodGet, "/v1/agents/"+url.PathEscape(*agentName)+"/eval-runs", nil)
		}
		return errors.New("--agent or --suite is required")
	case "get":
		if len(args) != 2 {
			return errors.New("usage: agentpop eval get RUN_ID")
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/eval-runs/"+url.PathEscape(args[1]), nil)
	default:
		return fmt.Errorf("unknown eval command %q", args[0])
	}
}

func runPort(ctx context.Context, client *apiClient, args []string) error {
	if len(args) < 3 {
		return errors.New("usage: agentpop port <expose|remove> SANDBOX_ID PORT [--mode public|organization|signed-link]")
	}
	port, err := strconv.Atoi(args[2])
	if err != nil || port < 1 || port > 65535 {
		return errors.New("PORT must be between 1 and 65535")
	}
	path := "/v1/sandboxes/" + url.PathEscape(args[1]) + "/ports"
	switch args[0] {
	case "expose":
		fs := flag.NewFlagSet("port expose", flag.ContinueOnError)
		mode := fs.String("mode", "public", "public, organization, or signed-link")
		if err := fs.Parse(args[3:]); err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, path, map[string]any{"port": port, "mode": *mode})
	case "remove":
		if len(args) != 3 {
			return errors.New("usage: agentpop port remove SANDBOX_ID PORT")
		}
		if _, err := client.request(ctx, http.MethodDelete, path+"/"+strconv.Itoa(port), nil, ""); err != nil {
			return err
		}
		fmt.Printf("port %d removed from %s\n", port, args[1])
		return nil
	default:
		return fmt.Errorf("unknown port command %q", args[0])
	}
}

func runTemplate(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop template <list|create|get|build|builds|logs|deprecate|restore|delete>")
	}
	switch args[0] {
	case "list":
		return client.printJSON(ctx, http.MethodGet, "/v1/templates", nil)
	case "create":
		fs := flag.NewFlagSet("template create", flag.ContinueOnError)
		name := fs.String("name", "", "template name")
		file := fs.String("file", "", "Dockerfile definition path (FROM + RUN only)")
		description := fs.String("description", "", "template description")
		build := fs.Bool("build", false, "start a build immediately after creating")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		if *name == "" || *file == "" {
			return errors.New("--name and --file are required")
		}
		definition, err := os.ReadFile(*file)
		if err != nil {
			return err
		}
		if err := client.printJSON(ctx, http.MethodPost, "/v1/templates", map[string]any{
			"name": *name, "definition": string(definition), "description": *description,
		}); err != nil {
			return err
		}
		if *build {
			return client.printJSON(ctx, http.MethodPost, "/v1/templates/"+url.PathEscape(*name)+"/builds", map[string]any{})
		}
		return nil
	case "get":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/templates/"+url.PathEscape(id), nil)
	case "build":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/templates/"+url.PathEscape(id)+"/builds", map[string]any{})
	case "builds":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/templates/"+url.PathEscape(id)+"/builds", nil)
	case "logs":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/template-builds/"+url.PathEscape(id)+"/logs", nil)
	case "deprecate":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/templates/"+url.PathEscape(id)+"/deprecate", map[string]any{})
	case "restore":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/templates/"+url.PathEscape(id)+"/restore", map[string]any{})
	case "delete", "rm":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		if _, err := client.request(ctx, http.MethodDelete, "/v1/templates/"+url.PathEscape(id), nil, ""); err != nil {
			return err
		}
		fmt.Println("deleted", id)
		return nil
	default:
		return fmt.Errorf("unknown template subcommand %q", args[0])
	}
}

func runCatalog(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop marketplace <list|get|generate|install|deploy> [RECIPE_ID]")
	}
	switch args[0] {
	case "list":
		fs := flag.NewFlagSet("marketplace list", flag.ContinueOnError)
		kind := fs.String("kind", "all", "all, agent, or sandbox")
		query := fs.String("query", "", "search recipe names, categories, and use cases")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		values := url.Values{}
		if *kind != "" && *kind != "all" {
			values.Set("kind", *kind)
		}
		if *query != "" {
			values.Set("q", *query)
		}
		path := "/v1/marketplace"
		if encoded := values.Encode(); encoded != "" {
			path += "?" + encoded
		}
		return client.printJSON(ctx, http.MethodGet, path, nil)
	case "agents":
		return client.printJSON(ctx, http.MethodGet, "/v1/marketplace?kind=agent", nil)
	case "sandboxes", "images":
		return client.printJSON(ctx, http.MethodGet, "/v1/marketplace?kind=sandbox", nil)
	case "get":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodGet, "/v1/marketplace/"+url.PathEscape(id), nil)
	case "generate":
		fs := flag.NewFlagSet("marketplace generate", flag.ContinueOnError)
		prompt := fs.String("prompt", "", "environment or agent description")
		kind := fs.String("kind", "sandbox", "agent or sandbox")
		name := fs.String("name", "", "optional recipe name")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		if strings.TrimSpace(*prompt) == "" {
			return errors.New("--prompt is required")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/marketplace/generate", map[string]any{
			"prompt": *prompt, "kind": *kind, "name": *name,
		})
	case "install":
		id, err := requiredID(args[1:])
		if err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/marketplace/"+url.PathEscape(id)+"/install", map[string]any{})
	case "deploy":
		if len(args) < 2 {
			return errors.New("usage: agentpop marketplace deploy RECIPE_ID [flags]")
		}
		id := args[1]
		fs := flag.NewFlagSet("marketplace deploy", flag.ContinueOnError)
		name := fs.String("name", "", "sandbox name")
		region := fs.String("region", "local", "placement region")
		vcpu := fs.Float64("vcpu", 1, "virtual CPU count")
		memoryMB := fs.Int64("memory-mb", 1024, "memory in MiB")
		diskGB := fs.Int64("disk-gb", 10, "disk in GiB")
		lifecycle := fs.String("lifecycle", "persistent", "persistent or ephemeral")
		ttl := fs.Int64("ttl", 0, "destroy an ephemeral sandbox after this many seconds")
		secretEnvs := stringListFlag{}
		envs := stringListFlag{}
		fs.Var(&secretEnvs, "secret-env", "read a write-only secret from this process environment; repeatable")
		fs.Var(&envs, "env", "environment KEY=VALUE; repeatable")
		if err := fs.Parse(args[2:]); err != nil {
			return err
		}
		environment := map[string]string{}
		for _, item := range envs {
			key, value, ok := strings.Cut(item, "=")
			if !ok || key == "" {
				return fmt.Errorf("invalid --env %q; expected KEY=VALUE", item)
			}
			environment[key] = value
		}
		secrets := map[string]string{}
		for _, key := range secretEnvs {
			value := os.Getenv(key)
			if value == "" {
				return fmt.Errorf("environment variable %s is empty", key)
			}
			secrets[key] = value
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/marketplace/"+url.PathEscape(id)+"/deploy", map[string]any{
			"name": *name, "region": *region, "vcpu": *vcpu, "memoryMb": *memoryMB,
			"diskGb": *diskGB, "lifecycle": *lifecycle, "ttlSeconds": *ttl,
			"environment": environment, "secrets": secrets,
		})
	default:
		return fmt.Errorf("unknown catalog subcommand %q", args[0])
	}
}

func runNetwork(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop network <list|create|delete|attach|detach>")
	}
	switch args[0] {
	case "list":
		return client.printJSON(ctx, http.MethodGet, "/v1/networks", nil)
	case "create":
		fs := flag.NewFlagSet("network create", flag.ContinueOnError)
		name := fs.String("name", "", "network name")
		cidr := fs.String("cidr", "", "private CIDR")
		region := fs.String("region", "local", "network region")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		if *name == "" {
			return errors.New("--name is required")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/networks", map[string]any{"name": *name, "cidr": *cidr, "region": *region})
	case "delete":
		return deleteResource(ctx, client, args[1:], "/v1/networks/", "network")
	case "attach":
		if len(args) != 3 {
			return errors.New("usage: agentpop network attach NETWORK_ID SANDBOX_ID")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/networks/"+url.PathEscape(args[1])+"/members", map[string]string{"sandboxId": args[2]})
	case "detach":
		if len(args) != 3 {
			return errors.New("usage: agentpop network detach NETWORK_ID SANDBOX_ID")
		}
		return client.printJSON(ctx, http.MethodDelete, "/v1/networks/"+url.PathEscape(args[1])+"/members/"+url.PathEscape(args[2]), nil)
	default:
		return fmt.Errorf("unknown network command %q", args[0])
	}
}

func runStorage(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop storage <list|register|delete|attach|detach>")
	}
	switch args[0] {
	case "list":
		return client.printJSON(ctx, http.MethodGet, "/v1/storages", nil)
	case "register":
		fs := flag.NewFlagSet("storage register", flag.ContinueOnError)
		name := fs.String("name", "", "storage name")
		endpoint := fs.String("endpoint", "", "S3-compatible service URL")
		bucket := fs.String("bucket", "", "bucket name")
		region := fs.String("region", "", "bucket region")
		accessKey := fs.String("access-key", "", "access key")
		secretKey := fs.String("secret-key", "", "secret key")
		pathStyle := fs.Bool("path-style", false, "use path-style S3 URLs")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		if *name == "" || *endpoint == "" || *bucket == "" {
			return errors.New("--name, --endpoint, and --bucket are required")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/storages", map[string]any{
			"name": *name, "endpoint": *endpoint, "bucket": *bucket, "region": *region,
			"accessKey": *accessKey, "secretKey": *secretKey, "pathStyle": *pathStyle,
		})
	case "delete":
		return deleteResource(ctx, client, args[1:], "/v1/storages/", "storage")
	case "attach":
		if len(args) != 3 {
			return errors.New("usage: agentpop storage attach STORAGE_ID SANDBOX_ID")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/storages/"+url.PathEscape(args[1])+"/attachments", map[string]string{"sandboxId": args[2]})
	case "detach":
		if len(args) != 3 {
			return errors.New("usage: agentpop storage detach STORAGE_ID SANDBOX_ID")
		}
		return client.printJSON(ctx, http.MethodDelete, "/v1/storages/"+url.PathEscape(args[1])+"/attachments/"+url.PathEscape(args[2]), nil)
	default:
		return fmt.Errorf("unknown storage command %q", args[0])
	}
}

func runWebhook(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop webhook <list|create|test|delete>")
	}
	switch args[0] {
	case "list":
		return client.printJSON(ctx, http.MethodGet, "/v1/webhooks", nil)
	case "create":
		fs := flag.NewFlagSet("webhook create", flag.ContinueOnError)
		endpoint := fs.String("url", "", "delivery endpoint")
		events := stringListFlag{}
		fs.Var(&events, "event", "event name; repeatable")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		if *endpoint == "" || len(events) == 0 {
			return errors.New("--url and at least one --event are required")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/webhooks", map[string]any{"url": *endpoint, "events": []string(events)})
	case "test":
		if len(args) != 2 {
			return errors.New("usage: agentpop webhook test WEBHOOK_ID")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/webhooks/"+url.PathEscape(args[1])+"/test", map[string]any{})
	case "delete":
		return deleteResource(ctx, client, args[1:], "/v1/webhooks/", "webhook")
	default:
		return fmt.Errorf("unknown webhook command %q", args[0])
	}
}

func runConnector(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop connector <list|tools|authorize|connect|update|invoke|revoke>")
	}
	if args[0] == "list" {
		fs := flag.NewFlagSet("connector list", flag.ContinueOnError)
		query := fs.String("query", "", "search the live Composio connector catalog")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		path := "/v1/connectors"
		if *query != "" {
			path += "?q=" + url.QueryEscape(*query)
		}
		return client.printJSON(ctx, http.MethodGet, path, nil)
	}
	if len(args) < 2 {
		return fmt.Errorf("usage: agentpop connector %s CONNECTOR_ID [flags]", args[0])
	}
	id := url.PathEscape(args[1])
	path := "/v1/connectors/" + id + "/connections"
	switch args[0] {
	case "tools":
		values := url.Values{}
		if len(args) > 2 {
			fs := flag.NewFlagSet("connector tools", flag.ContinueOnError)
			query := fs.String("query", "", "search the connector's live Composio tools")
			if err := fs.Parse(args[2:]); err != nil {
				return err
			}
			if *query != "" {
				values.Set("q", *query)
			}
		}
		toolsPath := "/v1/connectors/" + id + "/tools"
		if encoded := values.Encode(); encoded != "" {
			toolsPath += "?" + encoded
		}
		return client.printJSON(ctx, http.MethodGet, toolsPath, nil)
	case "authorize", "connect":
		return client.printJSON(ctx, http.MethodPost, "/v1/connectors/"+id+"/authorize", map[string]any{})
	case "update":
		fs := flag.NewFlagSet("connector "+args[0], flag.ContinueOnError)
		account := fs.String("account", "", "connected account label")
		actions := stringListFlag{}
		fs.Var(&actions, "action", "granted action; repeatable")
		if err := fs.Parse(args[2:]); err != nil {
			return err
		}
		return client.printJSON(ctx, http.MethodPatch, path, map[string]any{"account": *account, "actions": []string(actions)})
	case "invoke":
		if len(args) < 3 {
			return errors.New("usage: agentpop connector invoke CONNECTOR_ID TOOL [--arguments JSON] [--agent NAME]")
		}
		tool := url.PathEscape(args[2])
		fs := flag.NewFlagSet("connector invoke", flag.ContinueOnError)
		arguments := fs.String("arguments", "{}", "tool arguments as a JSON object")
		thought := fs.String("thought", "", "auditable reason for the tool call")
		agent := fs.String("agent", "", "agent name whose connector grant must authorize the call")
		if err := fs.Parse(args[3:]); err != nil {
			return err
		}
		var parsed map[string]any
		if err := json.Unmarshal([]byte(*arguments), &parsed); err != nil {
			return fmt.Errorf("parse --arguments: %w", err)
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/connectors/"+id+"/tools/"+tool, map[string]any{
			"arguments": parsed,
			"thought":   *thought,
			"agent":     *agent,
		})
	case "revoke":
		if _, err := client.request(ctx, http.MethodDelete, path, nil, ""); err != nil {
			return err
		}
		fmt.Println(args[1], "connector revoked")
		return nil
	default:
		return fmt.Errorf("unknown connector command %q", args[0])
	}
}

func runMember(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop member <list|invite|update|remove>")
	}
	switch args[0] {
	case "list":
		return client.printJSON(ctx, http.MethodGet, "/v1/members", nil)
	case "invite":
		if len(args) != 3 {
			return errors.New("usage: agentpop member invite EMAIL ROLE")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/members", map[string]string{"email": args[1], "role": args[2]})
	case "update":
		if len(args) != 3 {
			return errors.New("usage: agentpop member update EMAIL ROLE")
		}
		return client.printJSON(ctx, http.MethodPatch, "/v1/members/"+url.PathEscape(args[1]), map[string]string{"role": args[2]})
	case "remove":
		return deleteResource(ctx, client, args[1:], "/v1/members/", "member")
	default:
		return fmt.Errorf("unknown member command %q", args[0])
	}
}

func runAPIKey(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: agentpop api-key <list|create|revoke>")
	}
	switch args[0] {
	case "list":
		return client.printJSON(ctx, http.MethodGet, "/v1/api-keys", nil)
	case "create":
		fs := flag.NewFlagSet("api-key create", flag.ContinueOnError)
		name := fs.String("name", "", "key name")
		description := fs.String("description", "", "key description")
		expiresAt := fs.String("expires-at", "", "RFC3339 expiration")
		scopes := stringListFlag{}
		fs.Var(&scopes, "scope", "granted scope; repeatable")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
		if *name == "" || len(scopes) == 0 {
			return errors.New("--name and at least one --scope are required")
		}
		return client.printJSON(ctx, http.MethodPost, "/v1/api-keys", map[string]any{
			"name": *name, "description": *description, "expiresAt": *expiresAt, "scopes": []string(scopes),
		})
	case "revoke":
		return deleteResource(ctx, client, args[1:], "/v1/api-keys/", "API key")
	default:
		return fmt.Errorf("unknown api-key command %q", args[0])
	}
}

func runProject(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 || args[0] == "get" {
		return client.printJSON(ctx, http.MethodGet, "/v1/project", nil)
	}
	if args[0] != "update" {
		return errors.New("usage: agentpop project <get|update>")
	}
	fs := flag.NewFlagSet("project update", flag.ContinueOnError)
	name := fs.String("name", "", "project name")
	region := fs.String("region", "", "default region")
	idle := fs.Int64("default-idle", -1, "default idle timeout seconds")
	ttl := fs.Int64("default-ttl", -1, "default TTL seconds")
	if err := fs.Parse(args[1:]); err != nil {
		return err
	}
	body := map[string]any{}
	if *name != "" {
		body["name"] = *name
	}
	if *region != "" {
		body["region"] = *region
	}
	if *idle >= 0 {
		body["defaultIdleSeconds"] = *idle
	}
	if *ttl >= 0 {
		body["defaultTtlSeconds"] = *ttl
	}
	if len(body) == 0 {
		return errors.New("at least one update flag is required")
	}
	return client.printJSON(ctx, http.MethodPatch, "/v1/project", body)
}

func runQuota(ctx context.Context, client *apiClient, args []string) error {
	if len(args) == 0 || args[0] == "list" {
		return client.printJSON(ctx, http.MethodGet, "/v1/quotas", nil)
	}
	if args[0] != "request" {
		return errors.New("usage: agentpop quota <list|request [MESSAGE]>")
	}
	message := "Increase project sandbox, vCPU, and memory quotas."
	if len(args) > 1 {
		message = strings.Join(args[1:], " ")
	}
	return client.printJSON(ctx, http.MethodPost, "/v1/quota-requests", map[string]string{"message": message})
}

func deleteResource(ctx context.Context, client *apiClient, args []string, prefix, label string) error {
	if len(args) != 1 || strings.TrimSpace(args[0]) == "" {
		return fmt.Errorf("exactly one %s ID is required", label)
	}
	if _, err := client.request(ctx, http.MethodDelete, prefix+url.PathEscape(args[0]), nil, ""); err != nil {
		return err
	}
	fmt.Println(label, args[0], "deleted")
	return nil
}

func (c *apiClient) printJSON(ctx context.Context, method, path string, body any) error {
	raw, err := c.request(ctx, method, path, body, "application/json")
	if err != nil {
		return err
	}
	if len(raw) == 0 {
		return nil
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return err
	}
	pretty, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(pretty))
	return nil
}

func (c *apiClient) request(
	ctx context.Context,
	method, path string,
	body any,
	contentType string,
) ([]byte, error) {
	var reader io.Reader
	switch value := body.(type) {
	case nil:
	case []byte:
		reader = bytes.NewReader(value)
	default:
		raw, err := json.Marshal(value)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json, application/octet-stream")
	if body != nil && contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	if method != http.MethodGet {
		req.Header.Set("Idempotency-Key", idempotencyKey())
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 64<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiErr struct {
			Error   string `json:"error"`
			Message string `json:"message"`
		}
		if json.Unmarshal(raw, &apiErr) == nil && apiErr.Message != "" {
			return nil, fmt.Errorf("%s: %s", apiErr.Error, apiErr.Message)
		}
		return nil, fmt.Errorf("API returned %s: %s", resp.Status, strings.TrimSpace(string(raw)))
	}
	return raw, nil
}

type stringListFlag []string

func (s *stringListFlag) String() string { return strings.Join(*s, ",") }
func (s *stringListFlag) Set(value string) error {
	*s = append(*s, value)
	return nil
}

func requiredID(args []string) (string, error) {
	if len(args) != 1 || strings.TrimSpace(args[0]) == "" {
		return "", errors.New("exactly one sandbox ID is required")
	}
	return args[0], nil
}

func idempotencyKey() string {
	return "cli-" + strconv.FormatInt(time.Now().UnixNano(), 36) + "-" + strconv.Itoa(os.Getpid())
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func printUsage() {
	fmt.Print(`AgentPop CLI

Usage:
  agentpop status
  agentpop host list
  agentpop sandbox list
  agentpop sandbox get SANDBOX_ID
  agentpop sandbox create [flags]
  agentpop sandbox update SANDBOX_ID [flags]
  agentpop sandbox fork SANDBOX_ID
  agentpop sandbox pause|resume|destroy SANDBOX_ID
  agentpop sandbox metrics|events|logs SANDBOX_ID
  agentpop sandbox secret list SANDBOX_ID
  agentpop sandbox secret set SANDBOX_ID --from-env OPENAI_API_KEY [--replace]
  agentpop sandbox secret delete SANDBOX_ID KEY
  agentpop port expose SANDBOX_ID PORT [--mode MODE]
  agentpop port remove SANDBOX_ID PORT
  agentpop exec SANDBOX_ID -- COMMAND [ARG...]
  agentpop ssh SANDBOX_ID
  agentpop file list SANDBOX_ID
  agentpop file upload SANDBOX_ID LOCAL_PATH /workspace/GUEST_PATH
  agentpop file download SANDBOX_ID /workspace/GUEST_PATH LOCAL_PATH
  agentpop file mkdir SANDBOX_ID /workspace/DIRECTORY
  agentpop file delete SANDBOX_ID /workspace/PATH
  agentpop agent list
  agentpop agent create --name NAME [--secret-env ANTHROPIC_API_KEY] [flags]
  agentpop agent stop|restart|logs NAME
  agentpop agent delete NAME
  agentpop agent secret list NAME
  agentpop agent secret set NAME --from-env OPENAI_API_KEY [--replace]
  agentpop agent secret delete NAME KEY
  agentpop eval suite list AGENT
  agentpop eval suite create AGENT --file scenario.json --command COMMAND
  agentpop eval suite get|delete SUITE_ID
  agentpop eval run SUITE_ID [--environment sandbox]
  agentpop eval runs --agent NAME|--suite SUITE_ID
  agentpop eval get RUN_ID
  agentpop template list
  agentpop template create --name NAME --file Dockerfile [--build]
  agentpop template get|build|builds|deprecate|restore|delete NAME_OR_ID
  agentpop template logs BUILD_ID
  agentpop image list [--kind agent|sandbox] [--query TEXT]
  agentpop image get|build IMAGE_ID
  agentpop image fork IMAGE_ID --name NAME [--file Dockerfile] [--build]
  agentpop image generate --prompt TEXT [--kind agent|sandbox]
  agentpop image deploy IMAGE_ID [--lifecycle persistent|ephemeral] [--ttl SECONDS]
  agentpop marketplace list [--kind agent|sandbox] [--query TEXT]
  agentpop marketplace get|install RECIPE_ID
  agentpop marketplace generate --prompt TEXT [--kind agent|sandbox]
  agentpop marketplace deploy RECIPE_ID [--secret-env OPENAI_API_KEY]
  agentpop network list|create|delete|attach|detach
  agentpop storage list|register|delete|attach|detach
  agentpop webhook list|create|test|delete
  agentpop connector list|tools|authorize|update|invoke|revoke
  agentpop member list|invite|update|remove
  agentpop api-key list|create|revoke
  agentpop project get|update
  agentpop quota list|request

Environment:
  AGENTPOP_API_URL       control-plane URL (default http://127.0.0.1:8080)
  AGENTPOP_API_TOKEN     optional bearer token
`)
}
