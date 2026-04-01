package pricing

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
)

// ModelPrice holds per-million-token costs.
type ModelPrice struct {
	InputUncached float64 `json:"input_uncached"`
	InputCached   float64 `json:"input_cached"`
	Output        float64 `json:"output"`
}

// Table holds the loaded pricing data with a sorted key list for prefix matching.
type Table struct {
	entries map[string]ModelPrice
	sorted  []string // sorted by length DESC for greedy prefix match
}

// Load reads and parses the pricing JSON file at path.
func Load(path string) (*Table, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("pricing: read file: %w", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("pricing: parse json: %w", err)
	}

	t := &Table{entries: make(map[string]ModelPrice)}

	for key, val := range raw {
		if key == "__meta" {
			continue
		}
		var price ModelPrice
		if err := json.Unmarshal(val, &price); err != nil {
			return nil, fmt.Errorf("pricing: parse entry %q: %w", key, err)
		}
		t.entries[key] = price
	}

	for key := range t.entries {
		if key == "_default" {
			continue
		}
		t.sorted = append(t.sorted, key)
	}

	// Sort longest prefix first so that "gpt-5.2-pro" beats "gpt-5.2" beats "gpt-5".
	sort.Slice(t.sorted, func(i, j int) bool {
		return len(t.sorted[i]) > len(t.sorted[j])
	})

	return t, nil
}

// Lookup returns the pricing for a model ID using longest-prefix matching.
// Falls back to "_default" if no prefix matches.
func (t *Table) Lookup(modelID string) ModelPrice {
	for _, key := range t.sorted {
		if strings.HasPrefix(modelID, key) {
			return t.entries[key]
		}
	}
	return t.entries["_default"]
}
