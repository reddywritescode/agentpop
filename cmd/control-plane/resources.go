package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

func (s *server) customerAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if customerPublicPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		token := bearerToken(r.Header.Get("Authorization"))
		expected := os.Getenv("CONTROL_PLANE_API_KEY")
		if token != "" {
			if expected != "" && hmac.Equal([]byte(token), []byte(expected)) {
				next.ServeHTTP(w, r)
				return
			}
			digest := sha256.Sum256([]byte(token))
			key, ok := s.store.FindAPIKeyByHash(hex.EncodeToString(digest[:]), time.Now().UTC())
			if !ok {
				apiutil.WriteError(w, http.StatusUnauthorized, "unauthorized", "invalid or expired API key")
				return
			}
			required := requiredScope(r)
			if required != "" && !scopeAllowed(key.Scopes, required) {
				apiutil.WriteError(w, http.StatusForbidden, "insufficient_scope", "API key requires scope "+required)
				return
			}
			next.ServeHTTP(w, r)
			return
		}
		if _, ok := s.customerSessionUser(r); ok {
			if customerMutation(r.Method) && !s.customerOriginAllowed(r) {
				apiutil.WriteError(w, http.StatusForbidden, "origin_not_allowed", "cookie-authenticated mutations require a trusted Origin")
				return
			}
			next.ServeHTTP(w, r)
			return
		}
		if s.insecureLocalAuthEnabled() {
			next.ServeHTTP(w, r)
			return
		}
		if expected == "" && s.mode == "local" && token == "" {
			next.ServeHTTP(w, r)
			return
		}
		apiutil.WriteError(w, http.StatusUnauthorized, "unauthorized", "missing API key or customer session")
	})
}

func (s *server) validCustomerAuthorization(r *http.Request) bool {
	if _, ok := s.customerSessionUser(r); ok {
		return true
	}
	if s.insecureLocalAuthEnabled() {
		return true
	}
	expected := os.Getenv("CONTROL_PLANE_API_KEY")
	if expected == "" && s.mode == "local" {
		return true
	}
	token := bearerToken(r.Header.Get("Authorization"))
	if expected != "" && hmac.Equal([]byte(token), []byte(expected)) {
		return true
	}
	digest := sha256.Sum256([]byte(token))
	_, ok := s.store.FindAPIKeyByHash(hex.EncodeToString(digest[:]), time.Now().UTC())
	return ok
}

func bearerToken(header string) string {
	fields := strings.Fields(header)
	if len(fields) != 2 || !strings.EqualFold(fields[0], "Bearer") {
		return ""
	}
	return fields[1]
}

func customerPublicPath(path string) bool {
	switch path {
	case "/", "/healthz", "/llms.txt",
		"/v1/auth/github/start", "/v1/auth/github/callback", "/v1/auth/session",
		"/v1/auth/logout",
		"/v1/connectors/composio/callback":
		return true
	}
	return strings.HasPrefix(path, "/private/v1/") || strings.HasPrefix(path, "/preview/")
}

func customerMutation(method string) bool {
	return method != http.MethodGet && method != http.MethodHead && method != http.MethodOptions
}

func requiredScope(r *http.Request) string {
	path := r.URL.Path
	switch {
	case strings.Contains(path, "/exec"):
		return "sandbox:exec"
	case strings.HasPrefix(path, "/v1/audit"):
		return "audit:read"
	case strings.HasPrefix(path, "/v1/agents"),
		strings.HasPrefix(path, "/v1/eval-suites"),
		strings.HasPrefix(path, "/v1/eval-runs"):
		if r.Method == http.MethodGet {
			return "agent:read"
		}
		return "agent:write"
	case strings.HasPrefix(path, "/v1/connectors"):
		if r.Method == http.MethodGet {
			return "connector:read"
		}
		return "connector:invoke"
	case strings.HasPrefix(path, "/v1/members"), strings.HasPrefix(path, "/v1/api-keys"),
		strings.HasPrefix(path, "/v1/billing"), strings.HasPrefix(path, "/v1/project"),
		strings.HasPrefix(path, "/v1/quota-requests"):
		return "project:admin"
	case r.Method == http.MethodGet:
		return "sandbox:read"
	default:
		return "sandbox:write"
	}
}

func scopeAllowed(scopes []string, required string) bool {
	for _, scope := range scopes {
		if scope == "*" || scope == required {
			return true
		}
		if strings.HasSuffix(required, ":read") && scope == strings.TrimSuffix(required, ":read")+":write" {
			return true
		}
	}
	return false
}

func (s *server) listNetworks(w http.ResponseWriter, _ *http.Request) {
	items := s.store.ListNetworks()
	for i := range items {
		items[i].Members = len(items[i].AttachedSandboxIDs)
		items[i].Updated = relativeTime(items[i].UpdatedAt)
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *server) createNetwork(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name   string `json:"name"`
		CIDR   string `json:"cidr"`
		Region string `json:"region"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if !sandboxName.MatchString(req.Name) {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "network name must use lowercase letters, digits, and hyphens")
		return
	}
	if req.CIDR == "" {
		req.CIDR = fmt.Sprintf("10.64.%d.0/24", len(s.store.ListNetworks())%200+1)
	}
	if _, _, err := net.ParseCIDR(req.CIDR); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_cidr", "cidr must be a valid IPv4 or IPv6 network")
		return
	}
	if req.Region == "" {
		req.Region = "local"
	}
	now := time.Now().UTC()
	network := model.Network{
		ID:        apiutil.RandomID("net"),
		Name:      req.Name,
		CIDR:      req.CIDR,
		Region:    req.Region,
		CreatedAt: now,
		UpdatedAt: now,
		Updated:   "now",
	}
	if err := s.store.UpsertNetwork(network); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("network.create", network.ID, "ok", map[string]any{"cidr": network.CIDR})
	apiutil.WriteJSON(w, http.StatusCreated, network)
}

func (s *server) deleteNetwork(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	network, ok := s.store.GetNetwork(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "network not found")
		return
	}
	if len(network.AttachedSandboxIDs) > 0 {
		apiutil.WriteError(w, http.StatusConflict, "network_not_empty", "detach all sandboxes before deleting the network")
		return
	}
	if err := s.store.DeleteNetwork(id); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("network.delete", id, "ok", nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) attachNetworkSandbox(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	network, ok := s.store.GetNetwork(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "network not found")
		return
	}
	var req struct {
		SandboxID string `json:"sandboxId"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if _, ok := s.store.GetSandbox(req.SandboxID); !ok {
		apiutil.WriteError(w, http.StatusNotFound, "sandbox_not_found", "sandbox not found")
		return
	}
	network.AttachedSandboxIDs = appendUnique(network.AttachedSandboxIDs, req.SandboxID)
	network.Members = len(network.AttachedSandboxIDs)
	network.UpdatedAt = time.Now().UTC()
	network.Updated = "now"
	if err := s.store.UpsertNetwork(network); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("network.attach", id, "ok", map[string]any{"sandboxId": req.SandboxID})
	apiutil.WriteJSON(w, http.StatusOK, network)
}

func (s *server) detachNetworkSandbox(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	network, ok := s.store.GetNetwork(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "network not found")
		return
	}
	sandboxID := r.PathValue("sandboxId")
	network.AttachedSandboxIDs = removeString(network.AttachedSandboxIDs, sandboxID)
	network.Members = len(network.AttachedSandboxIDs)
	network.UpdatedAt = time.Now().UTC()
	network.Updated = "now"
	if err := s.store.UpsertNetwork(network); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("network.detach", id, "ok", map[string]any{"sandboxId": sandboxID})
	apiutil.WriteJSON(w, http.StatusOK, network)
}

type storageResponse struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Endpoint   string   `json:"endpoint"`
	Bucket     string   `json:"bucket"`
	Region     string   `json:"region"`
	PathStyle  bool     `json:"pathStyle"`
	Attached   int      `json:"attached"`
	Health     string   `json:"health"`
	Checked    string   `json:"checked"`
	SandboxIDs []string `json:"attachedSandboxIds,omitempty"`
}

func sanitizeStorage(storage model.Storage) storageResponse {
	return storageResponse{
		ID: storage.ID, Name: storage.Name, Endpoint: storage.Endpoint, Bucket: storage.Bucket,
		Region: storage.Region, PathStyle: storage.PathStyle, Attached: len(storage.AttachedSandboxIDs),
		Health: storage.Health, Checked: relativeTime(storage.UpdatedAt),
		SandboxIDs: append([]string(nil), storage.AttachedSandboxIDs...),
	}
}

func (s *server) listStorages(w http.ResponseWriter, _ *http.Request) {
	storages := s.store.ListStorages()
	items := make([]storageResponse, 0, len(storages))
	for _, storage := range storages {
		items = append(items, sanitizeStorage(storage))
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *server) createStorage(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name      string `json:"name"`
		Bucket    string `json:"bucket"`
		Endpoint  string `json:"endpoint"`
		Region    string `json:"region"`
		PathStyle bool   `json:"pathStyle"`
		AccessKey string `json:"accessKey"`
		SecretKey string `json:"secretKey"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if !sandboxName.MatchString(req.Name) || strings.TrimSpace(req.Bucket) == "" {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "valid name and bucket are required")
		return
	}
	parsed, err := url.ParseRequestURI(req.Endpoint)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_endpoint", "endpoint must be an absolute http or https URL")
		return
	}
	credentials, _ := json.Marshal(map[string]string{"accessKey": req.AccessKey, "secretKey": req.SecretKey})
	encrypted, err := s.secrets.Seal(credentials)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "encryption_failed", err.Error())
		return
	}
	now := time.Now().UTC()
	storage := model.Storage{
		ID: apiutil.RandomID("stg"), Name: req.Name, Bucket: req.Bucket, Endpoint: strings.TrimRight(req.Endpoint, "/"),
		Region: req.Region, PathStyle: req.PathStyle, EncryptedCredentials: encrypted,
		Health: "registered", Checked: "now", CreatedAt: now, UpdatedAt: now,
	}
	if err := s.store.UpsertStorage(storage); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("storage.create", storage.ID, "ok", map[string]any{"endpoint": storage.Endpoint, "bucket": storage.Bucket})
	apiutil.WriteJSON(w, http.StatusCreated, sanitizeStorage(storage))
}

func (s *server) deleteStorage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	storage, ok := s.store.GetStorage(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "storage not found")
		return
	}
	if len(storage.AttachedSandboxIDs) > 0 {
		apiutil.WriteError(w, http.StatusConflict, "storage_attached", "detach all sandboxes before removing storage")
		return
	}
	if err := s.store.DeleteStorage(id); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("storage.delete", id, "ok", nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) attachStorage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	storage, ok := s.store.GetStorage(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "storage not found")
		return
	}
	var req struct {
		SandboxID string `json:"sandboxId"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if _, ok := s.store.GetSandbox(req.SandboxID); !ok {
		apiutil.WriteError(w, http.StatusNotFound, "sandbox_not_found", "sandbox not found")
		return
	}
	storage.AttachedSandboxIDs = appendUnique(storage.AttachedSandboxIDs, req.SandboxID)
	storage.Attached = len(storage.AttachedSandboxIDs)
	storage.UpdatedAt = time.Now().UTC()
	if err := s.store.UpsertStorage(storage); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("storage.attach", id, "ok", map[string]any{"sandboxId": req.SandboxID})
	apiutil.WriteJSON(w, http.StatusOK, sanitizeStorage(storage))
}

func (s *server) detachStorage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	storage, ok := s.store.GetStorage(id)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "storage not found")
		return
	}
	sandboxID := r.PathValue("sandboxId")
	storage.AttachedSandboxIDs = removeString(storage.AttachedSandboxIDs, sandboxID)
	storage.Attached = len(storage.AttachedSandboxIDs)
	storage.UpdatedAt = time.Now().UTC()
	if err := s.store.UpsertStorage(storage); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("storage.detach", id, "ok", map[string]any{"sandboxId": sandboxID})
	apiutil.WriteJSON(w, http.StatusOK, sanitizeStorage(storage))
}

type webhookResponse struct {
	ID     string   `json:"id"`
	URL    string   `json:"url"`
	Events []string `json:"events"`
	Status string   `json:"status"`
	Last   string   `json:"last"`
}

func sanitizeWebhook(webhook model.Webhook) webhookResponse {
	return webhookResponse{
		ID: webhook.ID, URL: webhook.URL, Events: append([]string(nil), webhook.Events...),
		Status: webhook.Status, Last: webhook.Last,
	}
}

func (s *server) listWebhooks(w http.ResponseWriter, _ *http.Request) {
	webhooks := s.store.ListWebhooks()
	items := make([]webhookResponse, 0, len(webhooks))
	for _, webhook := range webhooks {
		items = append(items, sanitizeWebhook(webhook))
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *server) createWebhook(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL    string   `json:"url"`
		Events []string `json:"events"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if err := s.validateWebhookURL(req.URL); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_url", err.Error())
		return
	}
	if len(req.Events) == 0 {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "at least one event is required")
		return
	}
	secret := "whsec_" + strings.TrimPrefix(apiutil.RandomID("secret"), "secret-")
	encrypted, err := s.secrets.Seal([]byte(secret))
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "encryption_failed", err.Error())
		return
	}
	now := time.Now().UTC()
	webhook := model.Webhook{
		ID: apiutil.RandomID("wh"), URL: req.URL, Events: append([]string(nil), req.Events...),
		Status: "active", Last: "not delivered", EncryptedSecret: encrypted, CreatedAt: now, UpdatedAt: now,
	}
	if err := s.store.UpsertWebhook(webhook); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("webhook.create", webhook.ID, "ok", map[string]any{"url": webhook.URL})
	apiutil.WriteJSON(w, http.StatusCreated, map[string]any{"webhook": sanitizeWebhook(webhook), "secret": secret})
}

func (s *server) deleteWebhook(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if _, ok := s.store.GetWebhook(id); !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "webhook not found")
		return
	}
	if err := s.store.DeleteWebhook(id); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("webhook.delete", id, "ok", nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) testWebhook(w http.ResponseWriter, r *http.Request) {
	webhook, ok := s.store.GetWebhook(r.PathValue("id"))
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "webhook not found")
		return
	}
	event := model.AuditEvent{
		ID: apiutil.RandomID("evt"), Action: "webhook.test", Actor: "local:developer",
		Resource: "webhook", ResourceID: webhook.ID, Result: "ok", CreatedAt: time.Now().UTC(),
	}
	status, err := s.deliverWebhook(r.Context(), webhook, event)
	if err != nil {
		webhook.Status = "failing"
		webhook.Last = err.Error()
		webhook.UpdatedAt = time.Now().UTC()
		_ = s.store.UpsertWebhook(webhook)
		apiutil.WriteError(w, http.StatusBadGateway, "delivery_failed", err.Error())
		return
	}
	webhook.Status = "active"
	webhook.Last = "delivered now"
	webhook.UpdatedAt = time.Now().UTC()
	_ = s.store.UpsertWebhook(webhook)
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"delivered": true, "status": status})
}

func (s *server) validateWebhookURL(raw string) error {
	parsed, err := url.ParseRequestURI(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Hostname() == "" {
		return fmt.Errorf("webhook URL must be an absolute http or https URL")
	}
	if s.mode == "local" {
		return nil
	}
	if parsed.Scheme != "https" {
		return fmt.Errorf("hosted webhooks require https")
	}
	addresses, err := net.LookupIP(parsed.Hostname())
	if err != nil {
		return fmt.Errorf("resolve webhook host: %w", err)
	}
	for _, address := range addresses {
		if address.IsLoopback() || address.IsPrivate() || address.IsLinkLocalUnicast() || address.IsUnspecified() {
			return fmt.Errorf("webhook target resolves to a private or local address")
		}
	}
	return nil
}

func (s *server) deliverWebhook(ctx context.Context, webhook model.Webhook, event model.AuditEvent) (int, error) {
	secret, err := s.secrets.Open(webhook.EncryptedSecret)
	if err != nil {
		return 0, fmt.Errorf("decrypt webhook secret: %w", err)
	}
	body, _ := json.Marshal(map[string]any{"id": event.ID, "type": event.Action, "createdAt": event.CreatedAt, "data": event})
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(timestamp + "."))
	_, _ = mac.Write(body)
	signature := "t=" + timestamp + ",v1=" + hex.EncodeToString(mac.Sum(nil))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhook.URL, bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-AgentPop-Signature", signature)
	req.Header.Set("X-AgentPop-Event", event.Action)
	client := &http.Client{Timeout: 8 * time.Second}
	response, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 32<<10))
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return response.StatusCode, fmt.Errorf("endpoint returned %s", response.Status)
	}
	return response.StatusCode, nil
}

func (s *server) listMembers(w http.ResponseWriter, _ *http.Request) {
	members := s.store.ListMembers()
	if len(members) == 0 {
		now := time.Now().UTC()
		owner := model.Member{
			Name: "Local developer", Email: "developer@localhost", Role: "Owner",
			MFA: false, Joined: "Local", CreatedAt: now,
		}
		_ = s.store.UpsertMember(owner)
		members = []model.Member{owner}
	}
	apiutil.WriteJSON(w, http.StatusOK, members)
}

func (s *server) inviteMember(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if !strings.Contains(req.Email, "@") || !validMemberRole(req.Role) {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "valid email and role (Admin, Developer, Operator, or Viewer) are required")
		return
	}
	if _, exists := s.store.GetMember(req.Email); exists {
		apiutil.WriteError(w, http.StatusConflict, "already_exists", "member already exists")
		return
	}
	now := time.Now().UTC()
	member := model.Member{
		Name: strings.Split(req.Email, "@")[0], Email: req.Email, Role: req.Role,
		Pending: true, Joined: "invited now", CreatedAt: now,
	}
	if err := s.store.UpsertMember(member); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("member.invite", req.Email, "ok", map[string]any{"role": req.Role})
	apiutil.WriteJSON(w, http.StatusCreated, member)
}

func (s *server) updateMember(w http.ResponseWriter, r *http.Request) {
	email := strings.ToLower(r.PathValue("email"))
	member, ok := s.store.GetMember(email)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "member not found")
		return
	}
	if member.Role == "Owner" {
		apiutil.WriteError(w, http.StatusConflict, "owner_immutable", "the organization owner role cannot be changed")
		return
	}
	var req struct {
		Role string `json:"role"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil || !validMemberRole(req.Role) {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "role must be Admin, Developer, Operator, or Viewer")
		return
	}
	member.Role = req.Role
	if err := s.store.UpsertMember(member); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("member.update", email, "ok", map[string]any{"role": req.Role})
	apiutil.WriteJSON(w, http.StatusOK, member)
}

func (s *server) removeMember(w http.ResponseWriter, r *http.Request) {
	email := strings.ToLower(r.PathValue("email"))
	member, ok := s.store.GetMember(email)
	if !ok {
		apiutil.WriteError(w, http.StatusNotFound, "not_found", "member not found")
		return
	}
	if member.Role == "Owner" {
		apiutil.WriteError(w, http.StatusConflict, "owner_immutable", "the organization owner cannot be removed")
		return
	}
	if err := s.store.DeleteMember(email); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("member.remove", email, "ok", nil)
	w.WriteHeader(http.StatusNoContent)
}

func sanitizedAPIKey(key model.APIKey) map[string]any {
	return map[string]any{
		"id": key.ID, "name": key.Name, "scopes": key.Scopes, "prefix": key.Prefix,
		"created": relativeTime(key.CreatedAt), "expires": key.ExpiresAt.Format("2006-01-02"),
	}
}

func (s *server) listAPIKeys(w http.ResponseWriter, _ *http.Request) {
	keys := s.store.ListAPIKeys()
	items := make([]map[string]any, 0, len(keys))
	for _, key := range keys {
		items = append(items, sanitizedAPIKey(key))
	}
	apiutil.WriteJSON(w, http.StatusOK, items)
}

func (s *server) createAPIKey(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name   string   `json:"name"`
		Scopes []string `json:"scopes"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" || len(req.Scopes) == 0 {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "name and at least one scope are required")
		return
	}
	for _, existing := range s.store.ListAPIKeys() {
		if existing.Name == req.Name {
			apiutil.WriteError(w, http.StatusConflict, "already_exists", "API key name already exists")
			return
		}
	}
	for _, scope := range req.Scopes {
		if !validAPIKeyScope(scope) {
			apiutil.WriteError(w, http.StatusBadRequest, "invalid_scope", "unsupported API key scope "+scope)
			return
		}
	}
	secret := "pop_" + strings.TrimPrefix(apiutil.RandomID("key"), "key-")
	digest := sha256.Sum256([]byte(secret))
	now := time.Now().UTC()
	key := model.APIKey{
		ID: apiutil.RandomID("key"), Name: req.Name, Scopes: append([]string(nil), req.Scopes...),
		SecretHash: hex.EncodeToString(digest[:]), Prefix: secret[:min(len(secret), 11)],
		Created: "now", Expires: "in 90 days", CreatedAt: now, ExpiresAt: now.Add(90 * 24 * time.Hour),
	}
	if err := s.store.UpsertAPIKey(key); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("api-key.create", key.ID, "ok", map[string]any{"name": key.Name, "scopes": key.Scopes})
	apiutil.WriteJSON(w, http.StatusCreated, map[string]any{"key": sanitizedAPIKey(key), "secret": secret})
}

func validMemberRole(role string) bool {
	switch role {
	case "Admin", "Developer", "Operator", "Viewer":
		return true
	default:
		return false
	}
}

func validAPIKeyScope(scope string) bool {
	switch scope {
	case "*", "sandbox:read", "sandbox:write", "sandbox:exec", "agent:read", "agent:write",
		"connector:read", "connector:invoke", "audit:read", "project:admin":
		return true
	default:
		return false
	}
}

func (s *server) deleteAPIKey(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := s.store.DeleteAPIKey(id); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("api-key.revoke", id, "ok", nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) addCredits(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil || req.Amount <= 0 || req.Amount > 100000 {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "amount must be greater than 0 and at most 100000")
		return
	}
	credits, err := s.store.AddCredits(req.Amount)
	if err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("billing.credit", "local", "ok", map[string]any{"amount": req.Amount})
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{"credits": credits})
}

func (s *server) createQuotaRequest(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if strings.TrimSpace(req.Message) == "" {
		req.Message = "Increase project sandbox, vCPU, and memory quotas."
	}
	request := model.QuotaRequest{
		ID: apiutil.RandomID("quota"), Message: req.Message, Status: "open", CreatedAt: time.Now().UTC(),
	}
	if err := s.store.AddQuotaRequest(request); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("quota.request", request.ID, "ok", map[string]any{"message": request.Message})
	apiutil.WriteJSON(w, http.StatusCreated, request)
}

func (s *server) getProject(w http.ResponseWriter, _ *http.Request) {
	apiutil.WriteJSON(w, http.StatusOK, s.store.ProjectSettings())
}

func (s *server) updateProject(w http.ResponseWriter, r *http.Request) {
	project := s.store.ProjectSettings()
	var req struct {
		Name               *string `json:"name"`
		Region             *string `json:"region"`
		DefaultIdleSeconds *int64  `json:"defaultIdleSeconds"`
		DefaultTTLSeconds  *int64  `json:"defaultTtlSeconds"`
	}
	if err := apiutil.ReadJSON(r, &req); err != nil {
		apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if req.Name != nil {
		if !sandboxName.MatchString(*req.Name) {
			apiutil.WriteError(w, http.StatusBadRequest, "invalid_request", "project name must use lowercase letters, digits, and hyphens")
			return
		}
		project.Name = *req.Name
	}
	if req.Region != nil {
		project.Region = *req.Region
	}
	if req.DefaultIdleSeconds != nil {
		project.DefaultIdleSeconds = *req.DefaultIdleSeconds
	}
	if req.DefaultTTLSeconds != nil {
		project.DefaultTTLSeconds = *req.DefaultTTLSeconds
	}
	project.UpdatedAt = time.Now().UTC()
	if err := s.store.SetProjectSettings(project); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("project.update", "local", "ok", nil)
	apiutil.WriteJSON(w, http.StatusOK, project)
}

func (s *server) deleteProject(w http.ResponseWriter, r *http.Request) {
	for _, sandbox := range s.store.ListSandboxes() {
		if err := s.runtime.Destroy(r.Context(), sandbox.ID); err != nil {
			apiutil.WriteError(w, http.StatusBadGateway, "runtime_destroy_failed", "failed to destroy "+sandbox.ID+": "+err.Error())
			return
		}
	}
	if err := s.store.ResetProject(model.ProjectSettings{
		Name: "production", Region: "local", DefaultIdleSeconds: 900, UpdatedAt: time.Now().UTC(),
	}); err != nil {
		apiutil.WriteError(w, http.StatusInternalServerError, "state_write_failed", err.Error())
		return
	}
	_ = s.audit("project.delete", "local", "ok", nil)
	w.WriteHeader(http.StatusNoContent)
}

func appendUnique(values []string, value string) []string {
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}

func removeString(values []string, value string) []string {
	out := values[:0]
	for _, existing := range values {
		if existing != value {
			out = append(out, existing)
		}
	}
	return out
}

func relativeTime(value time.Time) string {
	if value.IsZero() {
		return "never"
	}
	elapsed := time.Since(value)
	if elapsed < time.Minute {
		return "now"
	}
	if elapsed < time.Hour {
		return fmt.Sprintf("%dm ago", int(elapsed.Minutes()))
	}
	if elapsed < 24*time.Hour {
		return fmt.Sprintf("%dh ago", int(elapsed.Hours()))
	}
	return value.Format("2006-01-02")
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
}
