package main

import "testing"

func TestForkSandboxNameReservesSuffixForMaximumLengthSource(t *testing.T) {
	t.Parallel()

	got := forkSandboxName("customer-fullstack-e2e", 1)
	if got != "customer-fullstac-fork" {
		t.Fatalf("forkSandboxName() = %q, want %q", got, "customer-fullstac-fork")
	}
	if len(got) > 22 {
		t.Fatalf("forkSandboxName() length = %d, want <= 22", len(got))
	}
}

func TestForkSandboxNameProducesDistinctCollisionNames(t *testing.T) {
	t.Parallel()

	first := forkSandboxName("customer-fullstack-e2e", 1)
	second := forkSandboxName("customer-fullstack-e2e", 2)
	third := forkSandboxName("customer-fullstack-e2e", 3)
	if first == second || second == third || first == third {
		t.Fatalf("fork names must be distinct: %q, %q, %q", first, second, third)
	}
}
