package adminauth

import (
	"errors"
	"testing"
	"time"
)

func TestAuthenticateAndValidate(t *testing.T) {
	manager, err := New(
		"owner@example.com",
		"correct horse battery staple",
		"",
		"01234567890123456789012345678901",
		time.Hour,
	)
	if err != nil {
		t.Fatal(err)
	}
	if !manager.Authenticate("OWNER@example.com", "correct horse battery staple") {
		t.Fatal("expected valid credentials")
	}
	if manager.Authenticate("owner@example.com", "wrong") {
		t.Fatal("accepted invalid credentials")
	}
	token, issued, err := manager.Issue()
	if err != nil {
		t.Fatal(err)
	}
	claims, err := manager.Validate(token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.Subject != issued.Subject || claims.Role != "owner" {
		t.Fatalf("unexpected claims: %#v", claims)
	}
}

func TestRejectsTamperedAndExpiredTokens(t *testing.T) {
	manager, err := New(
		"owner@example.com",
		"password",
		"",
		"01234567890123456789012345678901",
		time.Minute,
	)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Unix(1_700_000_000, 0)
	manager.now = func() time.Time { return now }
	token, _, err := manager.Issue()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := manager.Validate(token + "x"); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("expected invalid token, got %v", err)
	}
	manager.now = func() time.Time { return now.Add(2 * time.Minute) }
	if _, err := manager.Validate(token); !errors.Is(err, ErrExpiredToken) {
		t.Fatalf("expected expired token, got %v", err)
	}
}
