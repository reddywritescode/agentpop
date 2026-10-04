package runtime

import (
	"strings"
	"testing"
)

func TestRenderSecretProfileQuotesValues(t *testing.T) {
	profile, err := renderSecretProfile(map[string]string{
		"OPENAI_API_KEY": "value with spaces and 'quotes'",
	})
	if err != nil {
		t.Fatal(err)
	}
	output := string(profile)
	if !strings.Contains(output, "export OPENAI_API_KEY=") {
		t.Fatalf("missing exported key: %s", output)
	}
	if strings.Contains(output, "export OPENAI_API_KEY=value with spaces") {
		t.Fatalf("secret was not shell quoted: %s", output)
	}
}
