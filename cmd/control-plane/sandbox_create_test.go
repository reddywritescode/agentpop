package main

import (
	"reflect"
	"testing"
)

func TestMergeStringMapsAcceptsSecretsWithoutLegacyEnvironment(t *testing.T) {
	got := mergeStringMaps(nil, map[string]string{
		"E2E_TOKEN": "customer-secret",
	})
	want := map[string]string{
		"E2E_TOKEN": "customer-secret",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("mergeStringMaps() = %#v, want %#v", got, want)
	}
}

func TestMergeStringMapsLetsCurrentSecretsOverrideLegacyValues(t *testing.T) {
	got := mergeStringMaps(
		map[string]string{
			"MODEL_API_KEY": "legacy",
			"UNCHANGED":     "preserved",
		},
		map[string]string{
			"MODEL_API_KEY": "current",
		},
	)
	want := map[string]string{
		"MODEL_API_KEY": "current",
		"UNCHANGED":     "preserved",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("mergeStringMaps() = %#v, want %#v", got, want)
	}
}
