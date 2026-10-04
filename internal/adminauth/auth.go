package adminauth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrInvalidCredentials = errors.New("invalid owner credentials")
	ErrInvalidToken       = errors.New("invalid owner session")
	ErrExpiredToken       = errors.New("owner session expired")
)

type Claims struct {
	Subject   string `json:"sub"`
	Role      string `json:"role"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
	ID        string `json:"jti"`
}

type Manager struct {
	email        string
	passwordHash [sha256.Size]byte
	secret       []byte
	ttl          time.Duration
	now          func() time.Time
}

func New(email, password, passwordSHA256, secret string, ttl time.Duration) (*Manager, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, errors.New("admin email is required")
	}
	if len(secret) < 32 {
		return nil, errors.New("admin session secret must be at least 32 characters")
	}
	if ttl <= 0 {
		ttl = 12 * time.Hour
	}

	var expected [sha256.Size]byte
	switch {
	case passwordSHA256 != "":
		raw, err := hex.DecodeString(strings.TrimSpace(passwordSHA256))
		if err != nil || len(raw) != sha256.Size {
			return nil, errors.New("admin password SHA-256 must be 64 hexadecimal characters")
		}
		copy(expected[:], raw)
	case password != "":
		expected = sha256.Sum256([]byte(password))
	default:
		return nil, errors.New("admin password or password SHA-256 is required")
	}

	return &Manager{
		email:        email,
		passwordHash: expected,
		secret:       []byte(secret),
		ttl:          ttl,
		now:          time.Now,
	}, nil
}

func (m *Manager) Email() string {
	return m.email
}

func (m *Manager) Authenticate(email, password string) bool {
	candidateEmail := strings.ToLower(strings.TrimSpace(email))
	emailMatch := subtle.ConstantTimeCompare([]byte(candidateEmail), []byte(m.email))
	candidateHash := sha256.Sum256([]byte(password))
	passwordMatch := subtle.ConstantTimeCompare(candidateHash[:], m.passwordHash[:])
	return emailMatch == 1 && passwordMatch == 1
}

func (m *Manager) Issue() (string, Claims, error) {
	now := m.now().UTC()
	claims := Claims{
		Subject:   m.email,
		Role:      "owner",
		IssuedAt:  now.Unix(),
		ExpiresAt: now.Add(m.ttl).Unix(),
		ID:        randomID(),
	}
	raw, err := json.Marshal(claims)
	if err != nil {
		return "", Claims{}, err
	}
	payload := base64.RawURLEncoding.EncodeToString(raw)
	signature := base64.RawURLEncoding.EncodeToString(m.sign(payload))
	return payload + "." + signature, claims, nil
}

func (m *Manager) Validate(token string) (Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return Claims{}, ErrInvalidToken
	}
	provided, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	expected := m.sign(parts[0])
	if !hmac.Equal(provided, expected) {
		return Claims{}, ErrInvalidToken
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	var claims Claims
	if err := json.Unmarshal(raw, &claims); err != nil {
		return Claims{}, ErrInvalidToken
	}
	if claims.Subject != m.email || claims.Role != "owner" || claims.ID == "" {
		return Claims{}, ErrInvalidToken
	}
	if m.now().UTC().Unix() >= claims.ExpiresAt {
		return Claims{}, ErrExpiredToken
	}
	return claims, nil
}

func (m *Manager) sign(payload string) []byte {
	mac := hmac.New(sha256.New, m.secret)
	_, _ = mac.Write([]byte(payload))
	return mac.Sum(nil)
}

func randomID() string {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return fmt.Sprintf("session-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(raw)
}
