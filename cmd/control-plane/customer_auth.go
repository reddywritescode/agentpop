package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/reddywritescode/agentpop/internal/apiutil"
	"github.com/reddywritescode/agentpop/internal/model"
)

// Customer sign-in (AUTH-001 phase 1). The OAuth code exchange happens
// entirely server-side: the provider client secret and access token never
// reach the browser. Sessions are signed, expiring cookies; user records are
// durable control-plane state. Organization/project tenancy is the next
// phase — every authenticated user currently lands in the shared local
// project, and API-key auth is unchanged.

const customerSessionCookie = "agentpop_session"

type customerAuth struct {
	githubClientID     string
	githubClientSecret string
	sessionSecret      []byte
	sessionTTL         time.Duration
	mode               string
	cookieDomain       string
	allowedGitHub      map[string]struct{}
	http               *http.Client

	mu      sync.Mutex
	pending map[string]time.Time
}

func newCustomerAuth(mode string) *customerAuth {
	secret := os.Getenv("CUSTOMER_SESSION_SECRET")
	if secret == "" && mode == "local" {
		secret = "agentpop-local-customer-session-secret"
	}
	allowedGitHub := map[string]struct{}{}
	for _, login := range strings.Split(os.Getenv("CUSTOMER_ALLOWED_GITHUB_LOGINS"), ",") {
		if login = strings.ToLower(strings.TrimSpace(login)); login != "" {
			allowedGitHub[login] = struct{}{}
		}
	}
	return &customerAuth{
		githubClientID:     strings.TrimSpace(os.Getenv("GITHUB_OAUTH_CLIENT_ID")),
		githubClientSecret: os.Getenv("GITHUB_OAUTH_CLIENT_SECRET"),
		sessionSecret:      []byte(secret),
		sessionTTL:         7 * 24 * time.Hour,
		mode:               mode,
		cookieDomain:       strings.TrimSpace(os.Getenv("CUSTOMER_COOKIE_DOMAIN")),
		allowedGitHub:      allowedGitHub,
		http:               &http.Client{Timeout: 20 * time.Second},
		pending:            map[string]time.Time{},
	}
}

func (a *customerAuth) githubConfigured() bool {
	return a.githubClientID != "" && a.githubClientSecret != "" && len(a.sessionSecret) >= 16
}

func (a *customerAuth) githubLoginAllowed(login string) bool {
	if len(a.allowedGitHub) == 0 {
		return a.mode == "local"
	}
	_, ok := a.allowedGitHub[strings.ToLower(strings.TrimSpace(login))]
	return ok
}

func (a *customerAuth) newState() string {
	var raw [16]byte
	_, _ = rand.Read(raw[:])
	state := hex.EncodeToString(raw[:])
	a.mu.Lock()
	defer a.mu.Unlock()
	now := time.Now()
	for value, expires := range a.pending {
		if now.After(expires) {
			delete(a.pending, value)
		}
	}
	a.pending[state] = now.Add(10 * time.Minute)
	return state
}

func (a *customerAuth) consumeState(state string) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	expires, ok := a.pending[state]
	delete(a.pending, state)
	return ok && time.Now().Before(expires)
}

func (a *customerAuth) issueSession(userID string) (string, error) {
	if len(a.sessionSecret) < 16 {
		return "", errors.New("customer session secret is not configured")
	}
	claims := map[string]any{
		"sub": userID,
		"exp": time.Now().Add(a.sessionTTL).Unix(),
	}
	raw, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	payload := base64.RawURLEncoding.EncodeToString(raw)
	return payload + "." + base64.RawURLEncoding.EncodeToString(a.sign(payload)), nil
}

func (a *customerAuth) validateSession(token string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", errors.New("invalid session")
	}
	provided, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || !hmac.Equal(provided, a.sign(parts[0])) {
		return "", errors.New("invalid session")
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", errors.New("invalid session")
	}
	var claims struct {
		Subject string `json:"sub"`
		Expires int64  `json:"exp"`
	}
	if err := json.Unmarshal(raw, &claims); err != nil || claims.Subject == "" {
		return "", errors.New("invalid session")
	}
	if time.Now().Unix() >= claims.Expires {
		return "", errors.New("session expired")
	}
	return claims.Subject, nil
}

func (a *customerAuth) sign(payload string) []byte {
	mac := hmac.New(sha256.New, a.sessionSecret)
	mac.Write([]byte("customer." + payload))
	return mac.Sum(nil)
}

func (s *server) publicAPIURL(r *http.Request) string {
	return valueOr(os.Getenv("PUBLIC_API_URL"), "http://"+r.Host)
}

func (s *server) publicWebURL(r *http.Request) string {
	return valueOr(os.Getenv("PUBLIC_WEB_URL"), "http://"+r.Host)
}

func (s *server) customerAuthStartGitHub(w http.ResponseWriter, r *http.Request) {
	if !s.customers.githubConfigured() {
		apiutil.WriteError(w, http.StatusServiceUnavailable, "auth_not_configured",
			"GitHub sign-in requires GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET on the control plane")
		return
	}
	query := url.Values{
		"client_id":    {s.customers.githubClientID},
		"redirect_uri": {s.publicAPIURL(r) + "/v1/auth/github/callback"},
		"scope":        {"read:user user:email"},
		"state":        {s.customers.newState()},
	}
	http.Redirect(w, r, "https://github.com/login/oauth/authorize?"+query.Encode(), http.StatusFound)
}

func (s *server) customerAuthCallbackGitHub(w http.ResponseWriter, r *http.Request) {
	fail := func(code string) {
		http.Redirect(w, r, s.publicWebURL(r)+"/signin?error="+url.QueryEscape(code), http.StatusFound)
	}
	if !s.customers.githubConfigured() {
		fail("auth_not_configured")
		return
	}
	if !s.customers.consumeState(r.URL.Query().Get("state")) {
		_ = s.audit("auth.login", "github", "error", map[string]any{"error": "invalid_state"})
		fail("invalid_state")
		return
	}
	code := r.URL.Query().Get("code")
	if code == "" {
		fail("missing_code")
		return
	}
	accessToken, err := s.customers.exchangeGitHubCode(r.Context(), code, s.publicAPIURL(r)+"/v1/auth/github/callback")
	if err != nil {
		_ = s.audit("auth.login", "github", "error", map[string]any{"error": "code_exchange_failed"})
		fail("code_exchange_failed")
		return
	}
	profile, err := s.customers.fetchGitHubUser(r.Context(), accessToken)
	if err != nil {
		_ = s.audit("auth.login", "github", "error", map[string]any{"error": "profile_fetch_failed"})
		fail("profile_fetch_failed")
		return
	}
	if !s.customers.githubLoginAllowed(profile.Login) {
		_ = s.audit("auth.login", "github", "denied", map[string]any{"login": profile.Login})
		fail("account_not_allowed")
		return
	}
	now := time.Now().UTC()
	userID := "usr-github-" + strconv.FormatInt(profile.ID, 10)
	user, exists := s.store.GetCustomerUser(userID)
	if !exists {
		user = model.CustomerUser{ID: userID, Provider: "github", CreatedAt: now}
	}
	user.ProviderLogin = profile.Login
	user.Email = profile.Email
	user.Name = valueOr(profile.Name, profile.Login)
	user.AvatarURL = profile.AvatarURL
	user.LastLoginAt = now
	if err := s.store.UpsertCustomerUser(user); err != nil {
		fail("state_write_failed")
		return
	}
	token, err := s.customers.issueSession(user.ID)
	if err != nil {
		fail("session_issue_failed")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     customerSessionCookie,
		Value:    token,
		Path:     "/",
		Domain:   s.customers.cookieDomain,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.customerCookieSecure(r),
		MaxAge:   int(s.customers.sessionTTL / time.Second),
	})
	_ = s.audit("auth.login", user.ID, "ok", map[string]any{"provider": "github", "login": profile.Login})
	http.Redirect(w, r, s.publicWebURL(r)+"/app/overview", http.StatusFound)
}

func (s *server) customerSessionUser(r *http.Request) (model.CustomerUser, bool) {
	token := ""
	if cookie, err := r.Cookie(customerSessionCookie); err == nil {
		token = cookie.Value
	}
	if token == "" {
		return model.CustomerUser{}, false
	}
	userID, err := s.customers.validateSession(token)
	if err != nil {
		return model.CustomerUser{}, false
	}
	return s.store.GetCustomerUser(userID)
}

func (s *server) customerAuthSession(w http.ResponseWriter, r *http.Request) {
	user, ok := s.customerSessionUser(r)
	if !ok {
		if s.insecureLocalAuthEnabled() {
			apiutil.WriteJSON(w, http.StatusOK, map[string]any{
				"user": model.CustomerUser{
					ID:            "usr-local-development",
					Provider:      "local",
					ProviderLogin: "developer",
					Name:          "Local developer",
					Email:         "developer@agentpop.local",
				},
				"org":     "local",
				"project": s.store.ProjectSettings().Name,
			})
			return
		}
		apiutil.WriteError(w, http.StatusUnauthorized, "no_session", "no active customer session")
		return
	}
	apiutil.WriteJSON(w, http.StatusOK, map[string]any{
		"user":    user,
		"org":     "acme-labs",
		"project": s.store.ProjectSettings().Name,
	})
}

func (s *server) customerAuthLogout(w http.ResponseWriter, r *http.Request) {
	if user, ok := s.customerSessionUser(r); ok {
		if !s.customerOriginAllowed(r) {
			apiutil.WriteError(w, http.StatusForbidden, "origin_not_allowed", "sign-out requires a trusted Origin")
			return
		}
		_ = s.audit("auth.logout", user.ID, "ok", nil)
	}
	http.SetCookie(w, &http.Cookie{
		Name: customerSessionCookie, Value: "", Path: "/", HttpOnly: true,
		Domain: s.customers.cookieDomain, Secure: s.customerCookieSecure(r),
		SameSite: http.SameSiteLaxMode, MaxAge: -1,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) insecureLocalAuthEnabled() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("ALLOW_INSECURE_LOCAL_AUTH")))
	return s.mode == "local" && (value == "1" || value == "true" || value == "yes")
}

func (s *server) customerCookieSecure(r *http.Request) bool {
	if strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
		return true
	}
	return strings.HasPrefix(strings.ToLower(s.publicWebURL(r)), "https://")
}

func (s *server) customerOriginAllowed(r *http.Request) bool {
	origin := strings.TrimRight(strings.TrimSpace(r.Header.Get("Origin")), "/")
	if origin == "" {
		return false
	}
	allowed := map[string]struct{}{}
	for _, value := range strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",") {
		if value = strings.TrimRight(strings.TrimSpace(value), "/"); value != "" {
			allowed[value] = struct{}{}
		}
	}
	for _, value := range []string{s.publicWebURL(r), s.publicAPIURL(r)} {
		if value = strings.TrimRight(strings.TrimSpace(value), "/"); value != "" {
			allowed[value] = struct{}{}
		}
	}
	scheme := valueOr(r.Header.Get("X-Forwarded-Proto"), "http")
	allowed[scheme+"://"+r.Host] = struct{}{}
	_, ok := allowed[origin]
	return ok
}

type githubProfile struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

func (a *customerAuth) exchangeGitHubCode(ctx context.Context, code, redirectURI string) (string, error) {
	form := url.Values{
		"client_id":     {a.githubClientID},
		"client_secret": {a.githubClientSecret},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://github.com/login/oauth/access_token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	res, err := a.http.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	var payload struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&payload); err != nil {
		return "", err
	}
	if payload.AccessToken == "" {
		return "", fmt.Errorf("github code exchange failed: %s", valueOr(payload.Error, "no access token"))
	}
	return payload.AccessToken, nil
}

func (a *customerAuth) fetchGitHubUser(ctx context.Context, accessToken string) (githubProfile, error) {
	var profile githubProfile
	if err := a.githubGET(ctx, accessToken, "https://api.github.com/user", &profile); err != nil {
		return githubProfile{}, err
	}
	if profile.ID == 0 || profile.Login == "" {
		return githubProfile{}, errors.New("github profile response was incomplete")
	}
	if profile.Email == "" {
		var emails []struct {
			Email    string `json:"email"`
			Primary  bool   `json:"primary"`
			Verified bool   `json:"verified"`
		}
		if err := a.githubGET(ctx, accessToken, "https://api.github.com/user/emails", &emails); err == nil {
			for _, item := range emails {
				if item.Primary && item.Verified {
					profile.Email = item.Email
					break
				}
			}
		}
	}
	return profile, nil
}

func (a *customerAuth) githubGET(ctx context.Context, accessToken, endpoint string, dst any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	res, err := a.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("github API returned %d for %s", res.StatusCode, endpoint)
	}
	return json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(dst)
}
