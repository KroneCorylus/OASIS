package pricing_test

import (
	"testing"

	"github.com/openai-dashboard/backend/internal/pricing"
)

func TestLookup(t *testing.T) {
	table, err := pricing.Load("../../../model-pricing.json")
	if err != nil {
		t.Fatalf("load pricing: %v", err)
	}

	tests := []struct {
		model    string
		wantKey  string // which prefix should match
	}{
		{"gpt-5.2-chat-latest", "gpt-5.2"},
		{"gpt-5.2-pro-2026", "gpt-5.2-pro"},
		{"gpt-4.1-nano-preview", "gpt-4.1-nano"},
		{"gpt-4o-mini-2025-06", "gpt-4o-mini"},
		{"o1-preview", "o1"},
		{"unknown-model-xyz", "_default"},
	}

	defaultPrice := table.Lookup("_default_sentinel_that_never_matches")

	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			got := table.Lookup(tt.model)
			var expected pricing.ModelPrice
			if tt.wantKey == "_default" {
				expected = defaultPrice
			} else {
				// Re-load expected by loading the specific known-key model directly.
				expected = table.Lookup(tt.wantKey)
			}
			if got != expected {
				t.Errorf("Lookup(%q) = %+v, want %+v (key %q)", tt.model, got, expected, tt.wantKey)
			}
		})
	}
}
