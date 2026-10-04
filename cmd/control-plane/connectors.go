package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

const localConnectorOwner = "local"

type connectorBroker struct {
	baseURL string
	token   string
	client  *http.Client
}

type brokerStatus struct {
	Configured  bool `json:"configured"`
	Connected   bool `json:"connected"`
	Connections []struct {
		Toolkit     string `json:"toolkit"`
		Status      string `json:"status"`
		ConnectedAt string `json:"connectedAt"`
		UpdatedAt   string `json:"updatedAt"`
	} `json:"connections"`
}

type brokerCatalogItem struct {
	Slug        string   `json:"slug"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	LogoURL     string   `json:"logoUrl"`
	Categories  []string `json:"categories"`
	AuthSchemes []string `json:"authSchemes"`
	ToolsCount  int      `json:"toolsCount"`
}

type brokerCatalogResponse struct {
	Configured bool                `json:"configured"`
	Total      int                 `json:"total"`
	Items      []brokerCatalogItem `json:"items"`
}

type brokerToolsResponse struct {
	Configured bool                  `json:"configured"`
	Toolkit    string                `json:"toolkit"`
	Total      int                   `json:"total"`
	Items      []model.ConnectorTool `json:"items"`
}

func newConnectorBroker(baseURL, token string) *connectorBroker {
	return &connectorBroker{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		token:   strings.TrimSpace(token),
		client:  &http.Client{Timeout: 90 * time.Second},
	}
}

func (b *connectorBroker) configured() bool {
	return b != nil && b.baseURL != "" && b.token != ""
}

func (b *connectorBroker) request(ctx context.Context, method, path string, input, output any) error {
	if !b.configured() {
		return errors.New("connector broker is not configured")
	}
	var body io.Reader
	if input != nil {
		raw, err := json.Marshal(input)
		if err != nil {
			return err
		}
		body = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, b.baseURL+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+b.token)
	if input != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := b.client.Do(req)
	if err != nil {
		return fmt.Errorf("connector broker unavailable: %w", err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 4<<20))
	if err != nil {
		return err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		var problem struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(raw, &problem)
		if problem.Message == "" {
			problem.Message = strings.TrimSpace(string(raw))
		}
		return fmt.Errorf("connector broker returned %d: %s", res.StatusCode, problem.Message)
	}
	if output != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, output); err != nil {
			return fmt.Errorf("decode connector broker response: %w", err)
		}
	}
	return nil
}

func connectorCatalog() []model.Connector {
	items := []model.Connector{
		{
			ID: "github", Name: "GitHub", Category: "Developer tools",
			Description: "Repositories, issues, pull requests, and code through Composio OAuth.",
			Actions: []string{
				"GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER",
				"GITHUB_GET_A_REPOSITORY",
				"GITHUB_LIST_ISSUES",
			},
			AvailableActions: []string{
				"GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER",
				"GITHUB_GET_A_REPOSITORY",
				"GITHUB_LIST_ISSUES",
				"GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS",
				"GITHUB_CREATE_AN_ISSUE_COMMENT",
			},
		},
		{
			ID: "slack", Name: "Slack", Category: "Communication",
			Description: "Channels, conversations, search, and messages through Composio OAuth.",
			Actions: []string{
				"SLACK_LIST_CONVERSATIONS",
				"SLACK_FETCH_CONVERSATION_HISTORY",
			},
			AvailableActions: []string{
				"SLACK_LIST_CONVERSATIONS",
				"SLACK_FETCH_CONVERSATION_HISTORY",
				"SLACK_SEND_MESSAGE",
			},
		},
		{
			ID: "gmail", Name: "Gmail", Category: "Email",
			Description: "Search, read, draft, and send email through Composio OAuth.",
			Actions: []string{
				"GMAIL_FETCH_EMAILS",
				"GMAIL_GET_MESSAGE_BY_ID",
			},
			AvailableActions: []string{
				"GMAIL_FETCH_EMAILS",
				"GMAIL_GET_MESSAGE_BY_ID",
				"GMAIL_CREATE_EMAIL_DRAFT",
				"GMAIL_SEND_EMAIL",
			},
		},
		{
			ID: "google-drive", Name: "Google Drive", Category: "Storage",
			Description: "Find, read, create, and organize files through Composio OAuth.",
			Actions: []string{
				"GOOGLEDRIVE_FIND_FILE",
				"GOOGLEDRIVE_DOWNLOAD_FILE",
			},
			AvailableActions: []string{
				"GOOGLEDRIVE_FIND_FILE",
				"GOOGLEDRIVE_DOWNLOAD_FILE",
				"GOOGLEDRIVE_CREATE_FILE",
			},
		},
		{
			ID: "notion", Name: "Notion", Category: "Productivity",
			Description: "Search, read, create, and update Notion content through Composio OAuth.",
			Actions: []string{
				"NOTION_SEARCH_NOTION_PAGE",
				"NOTION_FETCH_DATA",
			},
			AvailableActions: []string{
				"NOTION_SEARCH_NOTION_PAGE",
				"NOTION_FETCH_DATA",
				"NOTION_CREATE_NOTION_PAGE",
			},
		},
		{
			ID: "linear", Name: "Linear", Category: "Project management",
			Description: "Read and manage Linear issues and projects through Composio OAuth.",
			Actions: []string{
				"LINEAR_LIST_LINEAR_ISSUES",
				"LINEAR_GET_LINEAR_ISSUE",
			},
			AvailableActions: []string{
				"LINEAR_LIST_LINEAR_ISSUES",
				"LINEAR_GET_LINEAR_ISSUE",
				"LINEAR_CREATE_LINEAR_ISSUE",
			},
		},
	}
	for index := range items {
		if len(items[index].AvailableActions) == 0 {
			items[index].AvailableActions = append([]string(nil), items[index].Actions...)
		}
	}
	return items
}

func (s *server) brokerStatus(ctx context.Context) (brokerStatus, error) {
	var status brokerStatus
	if err := s.connectors.request(
		ctx,
		http.MethodGet,
		"/v1/status?ownerId="+url.QueryEscape(localConnectorOwner),
		nil,
		&status,
	); err != nil {
		return status, err
	}
	return status, nil
}

func (s *server) listConnectors(w http.ResponseWriter, r *http.Request) {
	status, statusErr := s.brokerStatus(r.Context())
	connected := map[string]string{}
	if statusErr == nil {
		for _, item := range status.Connections {
			connected[connectorIDFromBrokerToolkit(item.Toolkit)] = item.Status
		}
	}
	items, catalogErr := s.dynamicConnectorCatalog(r.Context(), r.URL.Query().Get("q"))
	if catalogErr != nil || len(items) == 0 {
		items = connectorCatalog()
	}
	for i := range items {
		items[i].Configured = statusErr == nil && status.Configured
		items[i].Status = connected[items[i].ID]
		if connection, ok := s.store.GetConnectorConnection(items[i].ID); ok {
			items[i].Account = connection.Account
			items[i].Actions = append([]string(nil), connection.Actions...)
			items[i].Status = connection.Status
			items[i].Connected = connection.Status == "success"
		}
		if connected[items[i].ID] == "success" {
			items[i].Connected = true
		}
		if !items[i].Connected {
			items[i].Account = ""
		}
	}
	response := map[string]any{
		"items":      items,
		"configured": statusErr == nil && status.Configured,
		"provider":   "composio",
	}
	if statusErr != nil {
		response["warning"] = statusErr.Error()
	} else if catalogErr != nil {
		response["warning"] = catalogErr.Error()
	}
	apiutil.WriteJSON(w, http.StatusOK, response)
}

func (s *server) dynamicConnectorCatalog(ctx context.Context, query string) ([]model.Connector, error) {
	path := "/v1/catalog?limit=1000"
	if strings.TrimSpace(query) != "" {
		path += "&q=" + url.QueryEscape(strings.TrimSpace(query))
	}
	var response brokerCatalogResponse
	if err := s.connectors.request(ctx, http.MethodGet, path, nil, &response); err != nil {
		return nil, err
	}
	items := make([]model.Connector, 0, len(response.Items))
	for _, item := range response.Items {
		category := "Integration"
		if len(item.Categories) > 0 && strings.TrimSpace(item.Categories[0]) != "" {
			category = item.Categories[0]
		}
		items = append(items, model.Connector{
			ID:          connectorIDFromBrokerToolkit(item.Slug),
			Name:        item.Name,
			Category:    category,
			Description: item.Description,
			LogoURL:     item.LogoURL,
			ToolsCount:  item.ToolsCount,
			Configured:  response.Configured,
			Actions:     []string{},
		})
	}
	return items, nil
}

func (s *server) listConnectorCatalog(w http.ResponseWriter, r *http.Request) {
	path := "/v1/catalog"
	if r.URL.RawQuery != "" {
		path += "?" + r.URL.RawQuery
	}
	var result any
	if err := s.connectors.request(r.Context(), http.MethodGet, path, nil, &result); err != nil {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "connector_broker_unavailable", err.Error())
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, result)
}

func (s *server) connectorTools(ctx context.Context, id, query string) (brokerToolsResponse, error) {
	path := "/v1/catalog/" + url.PathEscape(brokerToolkit(id)) + "/tools?limit=1000"
	if strings.TrimSpace(query) != "" {
		path += "&q=" + url.QueryEscape(strings.TrimSpace(query))
	}
	var response brokerToolsResponse
	err := s.connectors.request(ctx, http.MethodGet, path, nil, &response)
	return response, err
}

func (s *server) listConnectorTools(w http.ResponseWriter, r *http.Request) {
	id := normalizeConnectorID(r.PathValue("id"))
	if _, ok := s.findConnectorForRequest(r.Context(), id); !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "connector not found")
		return
	}
	result, err := s.connectorTools(r.Context(), id, r.URL.Query().Get("q"))
	if err != nil {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "connector_broker_unavailable", err.Error())
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, result)
}

func publicConnectorCallbackURL(r *http.Request) string {
	base := strings.TrimRight(strings.TrimSpace(os.Getenv("PUBLIC_API_URL")), "/")
	if base == "" {
		scheme := r.Header.Get("X-Forwarded-Proto")
		if scheme == "" {
			scheme = "http"
		}
		base = scheme + "://" + r.Host
	}
	return base + "/v1/connectors/composio/callback"
}

func connectorDashboardURL(r *http.Request, key, value string) string {
	base := strings.TrimRight(strings.TrimSpace(os.Getenv("PUBLIC_WEB_URL")), "/")
	if base == "" {
		scheme := r.Header.Get("X-Forwarded-Proto")
		if scheme == "" {
			scheme = "http"
		}
		base = scheme + "://" + r.Host
	}
	target, err := url.Parse(base + "/app/connectors")
	if err != nil {
		return "/app/connectors"
	}
	query := target.Query()
	query.Set(key, value)
	target.RawQuery = query.Encode()
	return target.String()
}

func (s *server) authorizeConnector(w http.ResponseWriter, r *http.Request) {
	id := normalizeConnectorID(r.PathValue("id"))
	connector, ok := s.findConnectorForRequest(r.Context(), id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "connector not found")
		return
	}
	var result struct {
		PendingID        string `json:"pendingId"`
		Toolkit          string `json:"toolkit"`
		AuthorizationURL string `json:"authorizationUrl"`
		ExpiresInSeconds int    `json:"expiresInSeconds"`
	}
	err := s.connectors.request(r.Context(), http.MethodPost, "/v1/authorize", map[string]any{
		"ownerId":     localConnectorOwner,
		"toolkit":     brokerToolkit(id),
		"callbackUrl": publicConnectorCallbackURL(r),
	}, &result)
	if err != nil {
		_ = s.audit("connector.authorize", id, "error", map[string]any{"error": err.Error()})
		apiutil.WriteError(w, http.StatusServiceUnavailable, "connector_authorization_failed", err.Error())
		return
	}
	connector.Configured = true
	connector.Status = "pending"
	_ = s.audit("connector.authorize", id, "ok", map[string]any{"provider": "composio"})
	apiutil.WriteJSON(w, http.StatusCreated, map[string]any{
		"connector":        connector,
		"pendingId":        result.PendingID,
		"authorizationUrl": result.AuthorizationURL,
		"expiresInSeconds": result.ExpiresInSeconds,
	})
}

// connectConnector remains as a compatibility alias for older SDK and CLI
// clients. It starts real OAuth and returns a Connect Link; it never fabricates
// a connected account.
func (s *server) connectConnector(w http.ResponseWriter, r *http.Request) {
	s.authorizeConnector(w, r)
}

func (s *server) connectorCallback(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	stateID := strings.TrimSpace(query.Get("state"))
	status := strings.TrimSpace(query.Get("status"))
	accountID := strings.TrimSpace(query.Get("connected_account_id"))
	if stateID == "" {
		http.Redirect(w, r, connectorDashboardURL(r, "connector_error", "missing_state"), http.StatusFound)
		return
	}
	var connection struct {
		Toolkit     string `json:"toolkit"`
		Status      string `json:"status"`
		ConnectedAt string `json:"connectedAt"`
	}
	err := s.connectors.request(r.Context(), http.MethodPost, "/v1/complete", map[string]any{
		"state":              stateID,
		"status":             status,
		"connectedAccountId": accountID,
	}, &connection)
	if err != nil {
		_ = s.audit("connector.callback", "composio", "error", map[string]any{"error": err.Error()})
		http.Redirect(w, r, connectorDashboardURL(r, "connector_error", "callback_failed"), http.StatusFound)
		return
	}
	if connection.Status == "success" {
		connectorID := connectorIDFromBrokerToolkit(connection.Toolkit)
		connector, ok := s.findConnectorForRequest(r.Context(), connectorID)
		if !ok {
			http.Redirect(w, r, connectorDashboardURL(r, "connector_error", "unknown_toolkit"), http.StatusFound)
			return
		}
		now := time.Now().UTC()
		record := model.ConnectorConnection{
			ConnectorID: connector.ID,
			Account:     "Connected through Composio",
			Actions:     []string{"*"},
			Status:      "success",
			ConnectedAt: now,
			UpdatedAt:   now,
		}
		if err := s.store.SetConnectorConnection(record); err != nil {
			http.Redirect(w, r, connectorDashboardURL(r, "connector_error", "state_write_failed"), http.StatusFound)
			return
		}
		_ = s.audit("connector.connect", connector.ID, "ok", map[string]any{
			"provider": "composio",
			"actions":  record.Actions,
		})
		http.Redirect(w, r, connectorDashboardURL(r, "connector_connected", connector.ID), http.StatusFound)
		return
	}
	_ = s.audit("connector.connect", connection.Toolkit, "error", map[string]any{"provider": "composio"})
	http.Redirect(w, r, connectorDashboardURL(r, "connector_error", "authorization_failed"), http.StatusFound)
}

func (s *server) updateConnector(w http.ResponseWriter, r *http.Request) {
	id := normalizeConnectorID(r.PathValue("id"))
	connection, ok := s.store.GetConnectorConnection(id)
	if !ok || connection.Status != "success" {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "connector is not connected")
		return
	}
	var req struct {
		Account string   `json:"account"`
		Actions []string `json:"actions"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	catalog, _ := s.findConnectorForRequest(r.Context(), id)
	if req.Actions != nil {
		normalized := normalizedActions(req.Actions)
		if containsString(normalized, "*") && len(normalized) > 1 {
			apiutil.WriteError(w, http.StatusBadRequest, "invalid_grant", "the wildcard grant cannot be combined with individual tools")
			return
		}
		if !containsString(normalized, "*") {
			tools, err := s.connectorTools(r.Context(), id, "")
			if err != nil {
				apiutil.WriteError(w, http.StatusServiceUnavailable, "connector_broker_unavailable", err.Error())
				return
			}
			available := make([]string, 0, len(tools.Items))
			for _, item := range tools.Items {
				available = append(available, strings.ToUpper(item.Slug))
			}
			for _, action := range normalized {
				if !containsString(available, action) {
					apiutil.WriteError(w, http.StatusBadRequest, "invalid_grant", "action is not in the live connector tool catalog: "+action)
					return
				}
			}
		}
		connection.Actions = normalized
	}
	if strings.TrimSpace(req.Account) != "" {
		connection.Account = strings.TrimSpace(req.Account)
	}
	connection.UpdatedAt = time.Now().UTC()
	if err := s.store.SetConnectorConnection(connection); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	connector := catalog
	connector.Configured = true
	connector.Connected = true
	connector.Status = "success"
	connector.Account = connection.Account
	connector.Actions = connection.Actions
	_ = s.audit("connector.update", id, "ok", map[string]any{"actions": connection.Actions})
	apiutil.WriteJSON(w, http.StatusOK, connector)
}

func (s *server) invokeConnector(w http.ResponseWriter, r *http.Request) {
	id := normalizeConnectorID(r.PathValue("id"))
	tool := strings.ToUpper(strings.TrimSpace(r.PathValue("tool")))
	connection, ok := s.store.GetConnectorConnection(id)
	if !ok || connection.Status != "success" {
		apiutil.WriteError(w, http.StatusConflict, "connector_not_connected", "connector is not connected")
		return
	}
	if !containsString(connection.Actions, "*") && !containsString(connection.Actions, tool) {
		_ = s.audit("connector.invoke", id, "denied", map[string]any{"tool": tool})
		apiutil.WriteError(w, http.StatusForbidden, "connector_grant_denied", "tool is not in this connector grant")
		return
	}
	var req struct {
		Arguments         map[string]any `json:"arguments"`
		Thought           string         `json:"thought,omitempty"`
		CurrentStep       string         `json:"currentStep,omitempty"`
		CurrentStepMetric string         `json:"currentStepMetric,omitempty"`
		Agent             string         `json:"agent,omitempty"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if req.Agent != "" {
		agent, exists := s.store.GetAgentByName(req.Agent)
		if !exists {
			apiutil.WriteError(w, http.StatusNotFound, "agent_not_found", "agent not found")
			return
		}
		if !containsString(agent.Connectors, id) {
			_ = s.audit("connector.invoke", id, "denied", map[string]any{"tool": tool, "agent": req.Agent})
			apiutil.WriteError(w, http.StatusForbidden, "agent_connector_grant_denied", "agent has not been granted this connector")
			return
		}
	}
	var result any
	err := s.connectors.request(r.Context(), http.MethodPost, "/v1/invoke", map[string]any{
		"ownerId":           localConnectorOwner,
		"toolkit":           brokerToolkit(id),
		"toolSlug":          tool,
		"arguments":         req.Arguments,
		"thought":           req.Thought,
		"currentStep":       req.CurrentStep,
		"currentStepMetric": req.CurrentStepMetric,
	}, &result)
	if err != nil {
		_ = s.audit("connector.invoke", id, "error", map[string]any{"tool": tool, "error": err.Error()})
		apiutil.WriteError(w, http.StatusBadGateway, "connector_invoke_failed", err.Error())
		return
	}
	_ = s.audit("connector.invoke", id, "ok", map[string]any{"tool": tool, "agent": req.Agent})
	apiutil.WriteJSON(w, http.StatusOK, result)
}

func (s *server) disconnectConnector(w http.ResponseWriter, r *http.Request) {
	id := normalizeConnectorID(r.PathValue("id"))
	if _, ok := s.findConnectorForRequest(r.Context(), id); !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "connector not found")
		return
	}
	if err := s.connectors.request(r.Context(), http.MethodPost, "/v1/revoke", map[string]any{
		"ownerId": localConnectorOwner,
		"toolkit": brokerToolkit(id),
	}, nil); err != nil {
		_ = s.audit("connector.revoke", id, "error", map[string]any{"error": err.Error()})
		apiutil.WriteError(w, http.StatusBadGateway, "connector_revoke_failed", err.Error())
		return
	}
	if err := s.store.DeleteConnectorConnection(id); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	for _, agent := range s.store.ListAgents() {
		if containsString(agent.Connectors, id) {
			agent.Connectors = removeString(agent.Connectors, id)
			agent.UpdatedAt = time.Now().UTC()
			_ = s.store.UpsertAgent(agent)
		}
	}
	_ = s.audit("connector.revoke", id, "ok", map[string]any{"provider": "composio"})
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) findConnectorForRequest(ctx context.Context, id string) (model.Connector, bool) {
	items, err := s.dynamicConnectorCatalog(ctx, id)
	if err == nil {
		for _, connector := range items {
			if connector.ID == id || brokerToolkit(connector.ID) == brokerToolkit(id) {
				return connector, true
			}
		}
	}
	return findConnector(id)
}

func findConnector(id string) (model.Connector, bool) {
	for _, connector := range connectorCatalog() {
		if connector.ID == id {
			return connector, true
		}
	}
	return model.Connector{}, false
}

func normalizeConnectorID(value string) string {
	id := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(value), " ", "-"))
	if id == "google-drive" {
		// Composio's toolkit slug uses google_drive.
		return "google-drive"
	}
	return id
}

func brokerToolkit(id string) string {
	if id == "google-drive" {
		return "googledrive"
	}
	return id
}

func connectorIDFromBrokerToolkit(toolkit string) string {
	if toolkit == "googledrive" || toolkit == "google_drive" {
		return "google-drive"
	}
	return toolkit
}

func normalizedActions(actions []string) []string {
	out := make([]string, 0, len(actions))
	for _, action := range actions {
		action = strings.ToUpper(strings.TrimSpace(action))
		if action != "" && !containsString(out, action) {
			out = append(out, action)
		}
	}
	return out
}
