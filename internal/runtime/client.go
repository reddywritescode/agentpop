package runtime

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

	"github.com/reddywritescode/agentpop/internal/model"
)

type Client struct {
	baseURL string
	http    *http.Client
	token   string
}

func NewClient(baseURL string) *Client {
	return NewAuthenticatedClient(baseURL, "")
}

func NewAuthenticatedClient(baseURL, token string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		http: &http.Client{
			Timeout: 3 * time.Minute,
		},
	}
}

func (c *Client) HostInfo(ctx context.Context) (model.HostInfo, error) {
	var info model.HostInfo
	err := c.do(ctx, http.MethodGet, "/v1/host", nil, &info)
	return info, err
}

func (c *Client) List(ctx context.Context) ([]model.RuntimeSandbox, error) {
	var response struct {
		Items []model.RuntimeSandbox `json:"items"`
	}
	err := c.do(ctx, http.MethodGet, "/v1/runtime/sandboxes", nil, &response)
	return response.Items, err
}

func (c *Client) Create(ctx context.Context, req model.RuntimeCreateRequest) (model.RuntimeSandbox, error) {
	var result model.RuntimeSandbox
	err := c.do(ctx, http.MethodPost, "/v1/runtime/sandboxes", req, &result)
	return result, err
}

func (c *Client) Update(ctx context.Context, id string, req model.RuntimeUpdateRequest) (model.RuntimeSandbox, error) {
	var result model.RuntimeSandbox
	err := c.do(ctx, http.MethodPatch, "/v1/runtime/sandboxes/"+url.PathEscape(id), req, &result)
	return result, err
}

func (c *Client) SetSecrets(ctx context.Context, id string, secrets map[string]string) error {
	return c.do(
		ctx,
		http.MethodPut,
		"/v1/runtime/sandboxes/"+url.PathEscape(id)+"/secrets",
		model.RuntimeSecretsRequest{Secrets: secrets},
		nil,
	)
}

func (c *Client) Inspect(ctx context.Context, id string) (model.RuntimeSandbox, error) {
	var result model.RuntimeSandbox
	err := c.do(ctx, http.MethodGet, "/v1/runtime/sandboxes/"+url.PathEscape(id), nil, &result)
	return result, err
}

func (c *Client) Exec(ctx context.Context, id string, req model.ExecRequest) (model.ExecResult, error) {
	var result model.ExecResult
	err := c.do(ctx, http.MethodPost, "/v1/runtime/sandboxes/"+url.PathEscape(id)+"/exec", req, &result)
	return result, err
}

func (c *Client) WriteFile(ctx context.Context, id, guestPath string, data []byte) error {
	path := "/v1/runtime/sandboxes/" + url.PathEscape(id) + "/files?path=" + url.QueryEscape(guestPath)
	_, err := c.doRaw(ctx, http.MethodPut, path, data)
	return err
}

func (c *Client) ReadFile(ctx context.Context, id, guestPath string) ([]byte, error) {
	path := "/v1/runtime/sandboxes/" + url.PathEscape(id) + "/files?path=" + url.QueryEscape(guestPath)
	return c.doRaw(ctx, http.MethodGet, path, nil)
}

func (c *Client) Pause(ctx context.Context, id string) (model.RuntimeSandbox, error) {
	return c.action(ctx, id, "pause")
}

func (c *Client) Resume(ctx context.Context, id string) (model.RuntimeSandbox, error) {
	return c.action(ctx, id, "resume")
}

func (c *Client) action(ctx context.Context, id, action string) (model.RuntimeSandbox, error) {
	var result model.RuntimeSandbox
	err := c.do(ctx, http.MethodPost, "/v1/runtime/sandboxes/"+url.PathEscape(id)+"/"+action, struct{}{}, &result)
	return result, err
}

func (c *Client) Commit(ctx context.Context, id string, req model.RuntimeCommitRequest) (model.RuntimeImage, error) {
	var result model.RuntimeImage
	err := c.do(ctx, http.MethodPost, "/v1/runtime/sandboxes/"+url.PathEscape(id)+"/commit", req, &result)
	return result, err
}

func (c *Client) RemoveImage(ctx context.Context, ref string) error {
	return c.do(ctx, http.MethodDelete, "/v1/runtime/images?ref="+url.QueryEscape(ref), nil, nil)
}

func (c *Client) Destroy(ctx context.Context, id string) error {
	return c.do(ctx, http.MethodDelete, "/v1/runtime/sandboxes/"+url.PathEscape(id), nil, nil)
}

func (c *Client) do(ctx context.Context, method, path string, body, dst any) error {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("data-plane request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
		return fmt.Errorf("data-plane request failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	if dst == nil || resp.StatusCode == http.StatusNoContent {
		return nil
	}
	if err := json.NewDecoder(resp.Body).Decode(dst); err != nil {
		return fmt.Errorf("decode data-plane response: %w", err)
	}
	return nil
}

func (c *Client) doRaw(ctx context.Context, method, path string, body []byte) ([]byte, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/octet-stream")
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("data-plane request: %w", err)
	}
	defer resp.Body.Close()
	raw, readErr := io.ReadAll(io.LimitReader(resp.Body, 33<<20))
	if readErr != nil {
		return nil, fmt.Errorf("read data-plane response: %w", readErr)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("data-plane request failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	return raw, nil
}
