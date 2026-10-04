package main

import "testing"

func TestShellJoinPreservesArgumentBoundaries(t *testing.T) {
	got := shellJoin([]string{"sh", "-lc", "printf '<%s>\\n' \"$1\"", "_", "hello world"})
	want := `sh -lc 'printf '"'"'<%s>\n'"'"' "$1"' _ 'hello world'`
	if got != want {
		t.Fatalf("got %q\nwant %q", got, want)
	}
}

func TestSecretsFromEnvironment(t *testing.T) {
	t.Setenv("ANTHROPIC_API_KEY", "test-key")
	values, err := secretsFromEnvironment([]string{"ANTHROPIC_API_KEY"})
	if err != nil {
		t.Fatal(err)
	}
	if values["ANTHROPIC_API_KEY"] != "test-key" {
		t.Fatalf("unexpected value %#v", values)
	}
	if _, err := secretsFromEnvironment([]string{"MISSING_AGENTPOP_TEST_KEY"}); err == nil {
		t.Fatal("expected missing environment variable to fail")
	}
}
