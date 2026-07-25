package main

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/reddywritescode/agentpop/internal/model"
	"github.com/reddywritescode/agentpop/internal/state"
)

func TestCustomerAuthRequiresSessionOrAPIKey(t *testing.T) {
	t.Setenv("CONTROL_PLANE_API_KEY", "service-token")
	t.Setenv("CUSTOMER_SESSION_SECRET", "test-customer-session-secret")
	t.Setenv("PUBLIC_WEB_URL", "https://app.agentpop.test")

	store, err := state.Open(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := &server{store: store, mode: "hosted-alpha", customers: newCustomerAuth("hosted-alpha")}
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	handler := srv.customerAuth(next)

	t.Run("protected route rejects anonymous browser", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/sandboxes", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
		}
	})

	t.Run("auth discovery is public", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/auth/session", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
		}
	})

	t.Run("service API key remains supported", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/v1/sandboxes", nil)
		req.Header.Set("Authorization", "Bearer service-token")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
		}
	})

	user := model.CustomerUser{
		ID:            "usr-github-1",
		Provider:      "github",
		ProviderLogin: "allowed-user",
		CreatedAt:     time.Now().UTC(),
	}
	if err := store.UpsertCustomerUser(user); err != nil {
		t.Fatal(err)
	}
	token, err := srv.customers.issueSession(user.ID)
	if err != nil {
		t.Fatal(err)
	}

	t.Run("session authenticates reads", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/sandboxes", nil)
		req.AddCookie(&http.Cookie{Name: customerSessionCookie, Value: token})
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
		}
	})

	t.Run("invalid explicit bearer does not fall back to session", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/sandboxes", nil)
		req.AddCookie(&http.Cookie{Name: customerSessionCookie, Value: token})
		req.Header.Set("Authorization", "Bearer invalid-token")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
		}
	})

	t.Run("session mutation rejects missing origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/v1/sandboxes", nil)
		req.AddCookie(&http.Cookie{Name: customerSessionCookie, Value: token})
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusForbidden)
		}
	})

	t.Run("session mutation accepts trusted origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/v1/sandboxes", nil)
		req.AddCookie(&http.Cookie{Name: customerSessionCookie, Value: token})
		req.Header.Set("Origin", "https://app.agentpop.test")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
		}
	})
}

func TestHostedGitHubLoginRequiresAllowlist(t *testing.T) {
	t.Setenv("CUSTOMER_SESSION_SECRET", "test-customer-session-secret")
	t.Setenv("CUSTOMER_ALLOWED_GITHUB_LOGINS", "FirstUser, second-user")
	auth := newCustomerAuth("hosted-alpha")
	if !auth.githubLoginAllowed("firstuser") || !auth.githubLoginAllowed("SECOND-USER") {
		t.Fatal("configured GitHub login should be allowed case-insensitively")
	}
	if auth.githubLoginAllowed("unknown") {
		t.Fatal("unconfigured GitHub login should be denied")
	}

	t.Setenv("CUSTOMER_ALLOWED_GITHUB_LOGINS", "")
	auth = newCustomerAuth("hosted-alpha")
	if auth.githubLoginAllowed("anyone") {
		t.Fatal("hosted mode must fail closed when the GitHub allowlist is empty")
	}
}

func TestDecorateSSHSupportsHostCommandTemplate(t *testing.T) {
	access := &model.SSHAccess{Command: "sudo ssh root@172.30.0.2"}
	host := model.HostInfo{SSHCommand: "ssh -tt user@data-plane {command}"}
	decorateSSH(access, host)
	if access.HostCommand != "sudo ssh root@172.30.0.2" {
		t.Fatalf("host command = %q", access.HostCommand)
	}
	if access.Command != "ssh -tt user@data-plane 'sudo ssh root@172.30.0.2'" {
		t.Fatalf("decorated command = %q", access.Command)
	}
}
