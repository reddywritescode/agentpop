// Package agentpop is the dependency-free Go SDK for the AgentPop control plane.
package agentpop

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

func New(baseURL, apiKey string) *Client {
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: 2 * time.Minute,
		},
	}
}

type MarketplaceRecipe struct {
	ID               string            `json:"id"`
	Kind             string            `json:"kind"`
	Name             string            `json:"name"`
	Tagline          string            `json:"tagline"`
	Description      string            `json:"description"`
	Category         string            `json:"category"`
	UseCases         []string          `json:"useCases"`
	Definition       string            `json:"definition"`
	RequiredSecret   string            `json:"requiredSecret,omitempty"`
	Credentials      []ImageCredential `json:"credentials,omitempty"`
	Files            []ImageFile       `json:"files,omitempty"`
	PersistenceModes []string          `json:"persistenceModes,omitempty"`
	DefaultCommand   string            `json:"defaultCommand,omitempty"`
	Installed        bool              `json:"installed"`
	InstallState     string            `json:"installState"`
	ImageRef         string            `json:"imageRef,omitempty"`
}

type ImageCredential struct {
	Name        string `json:"name"`
	Label       string `json:"label"`
	Provider    string `json:"provider,omitempty"`
	Required    bool   `json:"required"`
	Description string `json:"description,omitempty"`
}

type ImageFile struct {
	Path     string `json:"path"`
	Language string `json:"language,omitempty"`
	Content  string `json:"content"`
}

type GeneratedRecipe struct {
	ID                 string            `json:"id"`
	Kind               string            `json:"kind"`
	Name               string            `json:"name"`
	Tagline            string            `json:"tagline"`
	Description        string            `json:"description"`
	Category           string            `json:"category"`
	UseCases           []string          `json:"useCases"`
	Definition         string            `json:"definition"`
	GeneratedBy        string            `json:"generatedBy"`
	Credentials        []ImageCredential `json:"credentials,omitempty"`
	Files              []ImageFile       `json:"files,omitempty"`
	PersistenceModes   []string          `json:"persistenceModes,omitempty"`
	DefaultCommand     string            `json:"defaultCommand,omitempty"`
	RequiredConnectors []string          `json:"requiredConnectors,omitempty"`
	Ports              []int             `json:"ports,omitempty"`
}

type Sandbox struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Kind        string   `json:"kind,omitempty"`
	RecipeID    string   `json:"recipeId,omitempty"`
	Status      string   `json:"status"`
	Image       string   `json:"image"`
	Region      string   `json:"region"`
	VCPU        float64  `json:"vcpu"`
	MemoryMB    int64    `json:"memoryMb"`
	DiskGB      int64    `json:"diskGb"`
	SecretNames []string `json:"secretNames,omitempty"`
	Lifecycle   string   `json:"lifecycle,omitempty"`
}

type CreateSandboxRequest struct {
	Name           string            `json:"name,omitempty"`
	Kind           string            `json:"kind,omitempty"`
	RecipeID       string            `json:"recipeId,omitempty"`
	Image          string            `json:"image,omitempty"`
	Region         string            `json:"region,omitempty"`
	VCPU           float64           `json:"vcpu,omitempty"`
	MemoryMB       int64             `json:"memoryMb,omitempty"`
	DiskGB         int64             `json:"diskGb,omitempty"`
	PublicWeb      bool              `json:"publicWeb,omitempty"`
	PauseWhenIdle  bool              `json:"pauseWhenIdle,omitempty"`
	IdleTimeoutSec int64             `json:"idleTimeoutSec,omitempty"`
	TTLSeconds     int64             `json:"ttlSeconds,omitempty"`
	Lifecycle      string            `json:"lifecycle,omitempty"`
	AllowedEgress  []string          `json:"allowedEgress,omitempty"`
	Environment    map[string]string `json:"environment,omitempty"`
	Secrets        map[string]string `json:"secrets,omitempty"`
}

type ExecResult struct {
	ExitCode   int    `json:"exitCode"`
	Stdout     string `json:"stdout"`
	Stderr     string `json:"stderr"`
	DurationMS int64  `json:"durationMs"`
}

type SandboxSecrets struct {
	Items []struct {
		Name       string `json:"name"`
		Configured bool   `json:"configured"`
		UpdatedAt  string `json:"updatedAt,omitempty"`
	} `json:"items"`
	Status            string `json:"status"`
	Generation        int64  `json:"generation"`
	AppliedGeneration int64  `json:"appliedGeneration"`
	UpdatedAt         string `json:"updatedAt,omitempty"`
}

type Connector struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Description string   `json:"description"`
	LogoURL     string   `json:"logoUrl,omitempty"`
	ToolsCount  int      `json:"toolsCount,omitempty"`
	Configured  bool     `json:"configured"`
	Connected   bool     `json:"connected"`
	Actions     []string `json:"actions"`
}

type ConnectorTool struct {
	Slug        string         `json:"slug"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	InputSchema map[string]any `json:"inputSchema,omitempty"`
}

func (c *Client) ListMarketplace(ctx context.Context, kind, query string) ([]MarketplaceRecipe, error) {
	values := url.Values{}
	if kind != "" && kind != "all" {
		values.Set("kind", kind)
	}
	if query != "" {
		values.Set("q", query)
	}
	path := "/v1/marketplace"
	if encoded := values.Encode(); encoded != "" {
		path += "?" + encoded
	}
	var response struct {
		Items []MarketplaceRecipe `json:"items"`
	}
	if err := c.do(ctx, http.MethodGet, path, nil, &response); err != nil {
		return nil, err
	}
	return response.Items, nil
}

func (c *Client) GenerateRecipe(ctx context.Context, prompt, kind, name string) (GeneratedRecipe, error) {
	var recipe GeneratedRecipe
	err := c.do(ctx, http.MethodPost, "/v1/marketplace/generate", map[string]string{
		"prompt": prompt,
		"kind":   kind,
		"name":   name,
	}, &recipe)
	return recipe, err
}

func (c *Client) InstallRecipe(ctx context.Context, id string) (MarketplaceRecipe, error) {
	var recipe MarketplaceRecipe
	err := c.do(ctx, http.MethodPost, "/v1/marketplace/"+url.PathEscape(id)+"/install", map[string]any{}, &recipe)
	return recipe, err
}

func (c *Client) DeployRecipe(ctx context.Context, id string, input CreateSandboxRequest) (Sandbox, error) {
	var sandbox Sandbox
	err := c.do(ctx, http.MethodPost, "/v1/marketplace/"+url.PathEscape(id)+"/deploy", input, &sandbox)
	return sandbox, err
}

func (c *Client) ListImages(ctx context.Context, kind, query string) ([]MarketplaceRecipe, error) {
	values := url.Values{}
	if kind != "" && kind != "all" {
		values.Set("kind", kind)
	}
	if query != "" {
		values.Set("q", query)
	}
	path := "/v1/images"
	if encoded := values.Encode(); encoded != "" {
		path += "?" + encoded
	}
	var response struct {
		Items []MarketplaceRecipe `json:"items"`
	}
	if err := c.do(ctx, http.MethodGet, path, nil, &response); err != nil {
		return nil, err
	}
	return response.Items, nil
}

func (c *Client) GenerateImage(ctx context.Context, prompt, kind, name string) (GeneratedRecipe, error) {
	var image GeneratedRecipe
	err := c.do(ctx, http.MethodPost, "/v1/images/generate", map[string]string{
		"prompt": prompt,
		"kind":   kind,
		"name":   name,
	}, &image)
	return image, err
}

func (c *Client) GetImage(ctx context.Context, id string) (MarketplaceRecipe, error) {
	var image MarketplaceRecipe
	err := c.do(ctx, http.MethodGet, "/v1/images/"+url.PathEscape(id), nil, &image)
	return image, err
}

func (c *Client) BuildImage(ctx context.Context, id string) (MarketplaceRecipe, error) {
	var image MarketplaceRecipe
	err := c.do(ctx, http.MethodPost, "/v1/images/"+url.PathEscape(id)+"/build", map[string]any{}, &image)
	return image, err
}

func (c *Client) ForkImage(ctx context.Context, id, name, definition string, build bool) (map[string]any, error) {
	var result map[string]any
	input := map[string]any{"name": name, "build": build}
	if definition != "" {
		input["definition"] = definition
	}
	err := c.do(ctx, http.MethodPost, "/v1/images/"+url.PathEscape(id)+"/fork", input, &result)
	return result, err
}

func (c *Client) DeployImage(ctx context.Context, id string, input CreateSandboxRequest) (Sandbox, error) {
	var sandbox Sandbox
	err := c.do(ctx, http.MethodPost, "/v1/images/"+url.PathEscape(id)+"/deploy", input, &sandbox)
	return sandbox, err
}

func (c *Client) CreateSandbox(ctx context.Context, input CreateSandboxRequest) (Sandbox, error) {
	var sandbox Sandbox
	err := c.do(ctx, http.MethodPost, "/v1/sandboxes", input, &sandbox)
	return sandbox, err
}

func (c *Client) Exec(ctx context.Context, sandboxID, command string, timeoutSeconds int) (ExecResult, error) {
	return c.ExecLabeled(ctx, sandboxID, command, "", timeoutSeconds)
}

func (c *Client) ExecLabeled(ctx context.Context, sandboxID, command, label string, timeoutSeconds int) (ExecResult, error) {
	var result ExecResult
	err := c.do(ctx, http.MethodPost, "/v1/sandboxes/"+url.PathEscape(sandboxID)+"/exec", map[string]any{
		"command": command, "label": label, "timeoutSeconds": timeoutSeconds,
	}, &result)
	return result, err
}

func (c *Client) SandboxSecrets(ctx context.Context, sandboxID string) (SandboxSecrets, error) {
	var result SandboxSecrets
	err := c.do(ctx, http.MethodGet, "/v1/sandboxes/"+url.PathEscape(sandboxID)+"/secrets", nil, &result)
	return result, err
}

func (c *Client) SetSandboxSecrets(ctx context.Context, sandboxID string, secrets map[string]string, replace bool) (SandboxSecrets, error) {
	var result SandboxSecrets
	err := c.do(ctx, http.MethodPut, "/v1/sandboxes/"+url.PathEscape(sandboxID)+"/secrets", map[string]any{
		"secrets": secrets, "replace": replace,
	}, &result)
	return result, err
}

func (c *Client) DeleteSandboxSecret(ctx context.Context, sandboxID, name string) (SandboxSecrets, error) {
	var result SandboxSecrets
	err := c.do(ctx, http.MethodDelete, "/v1/sandboxes/"+url.PathEscape(sandboxID)+"/secrets/"+url.PathEscape(name), nil, &result)
	return result, err
}

func (c *Client) ListConnectors(ctx context.Context, query string) ([]Connector, error) {
	path := "/v1/connectors"
	if query != "" {
		path += "?q=" + url.QueryEscape(query)
	}
	var response struct {
		Items []Connector `json:"items"`
	}
	err := c.do(ctx, http.MethodGet, path, nil, &response)
	return response.Items, err
}

func (c *Client) ListConnectorTools(ctx context.Context, connectorID, query string) ([]ConnectorTool, error) {
	path := "/v1/connectors/" + url.PathEscape(connectorID) + "/tools"
	if query != "" {
		path += "?q=" + url.QueryEscape(query)
	}
	var response struct {
		Items []ConnectorTool `json:"items"`
	}
	err := c.do(ctx, http.MethodGet, path, nil, &response)
	return response.Items, err
}

func (c *Client) do(ctx context.Context, method, path string, input, output any) error {
	var body io.Reader
	if input != nil {
		data, err := json.Marshal(input)
		if err != nil {
			return err
		}
		body = bytes.NewReader(data)
	}
	request, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, body)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	if input != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if c.APIKey != "" {
		request.Header.Set("Authorization", "Bearer "+c.APIKey)
	}
	if method != http.MethodGet {
		request.Header.Set("Idempotency-Key", fmt.Sprintf("go-%d", time.Now().UnixNano()))
	}
	response, err := c.HTTPClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	data, err := io.ReadAll(io.LimitReader(response.Body, 8<<20))
	if err != nil {
		return err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var apiError struct {
			Error   string `json:"error"`
			Message string `json:"message"`
		}
		_ = json.Unmarshal(data, &apiError)
		if apiError.Message == "" {
			apiError.Message = response.Status
		}
		return fmt.Errorf("agentpop: %s (%s)", apiError.Message, apiError.Error)
	}
	if output == nil || response.StatusCode == http.StatusNoContent {
		return nil
	}
	return json.Unmarshal(data, output)
}
