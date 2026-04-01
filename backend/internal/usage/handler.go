package usage

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

// Handler returns an http.HandlerFunc for GET /api/usage.
func Handler(agg *Aggregator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		scope := q.Get("scope")
		if scope == "" {
			scope = ScopeOrg
		}
		scopeID := q.Get("scope_id")

		start := q.Get("start")
		end := q.Get("end")
		if start == "" || end == "" {
			// Default to last 30 days.
			now := time.Now().UTC()
			end = now.Format("2006-01-02")
			start = now.AddDate(0, 0, -29).Format("2006-01-02")
		}

		filter := QueryFilter{
			Scope:        scope,
			ScopeID:      scopeID,
			Start:        start,
			End:          end,
			ForceRefresh: q.Get("force_refresh") == "true",
		}

		data, err := agg.Query(filter)
		if err != nil {
			slog.Error("usage query", "error", err, "filter", filter)
			http.Error(w, "failed to fetch usage data", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(data)
	}
}

// CompareHandler returns an http.HandlerFunc for GET /api/usage/compare.
func CompareHandler(agg *Aggregator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		keyA := q.Get("key_a")
		keyB := q.Get("key_b")
		start := q.Get("start")
		end := q.Get("end")

		if keyA == "" || keyB == "" {
			http.Error(w, "key_a and key_b are required", http.StatusBadRequest)
			return
		}
		if start == "" || end == "" {
			now := time.Now().UTC()
			end = now.Format("2006-01-02")
			start = now.AddDate(0, 0, -29).Format("2006-01-02")
		}

		forceRefresh := q.Get("force_refresh") == "true"

		dataA, err := agg.Query(QueryFilter{Scope: ScopeAPIKey, ScopeID: keyA, Start: start, End: end, ForceRefresh: forceRefresh})
		if err != nil {
			slog.Error("compare query key_a", "error", err)
			http.Error(w, "failed to fetch usage for key_a", http.StatusInternalServerError)
			return
		}

		dataB, err := agg.Query(QueryFilter{Scope: ScopeAPIKey, ScopeID: keyB, Start: start, End: end, ForceRefresh: forceRefresh})
		if err != nil {
			slog.Error("compare query key_b", "error", err)
			http.Error(w, "failed to fetch usage for key_b", http.StatusInternalServerError)
			return
		}

		result := buildComparison(keyA, keyB, dataA, dataB)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}

// CompareResult is the response for the compare endpoint.
type CompareResult struct {
	KeyA       string         `json:"key_a"`
	KeyB       string         `json:"key_b"`
	Start      string         `json:"start"`
	End        string         `json:"end"`
	KeyAData   CompareKeyData `json:"key_a_data"`
	KeyBData   CompareKeyData `json:"key_b_data"`
	DataSource string         `json:"data_source"` // "database", "cache", "live", or "mixed"
	CachedAt   *string        `json:"cached_at,omitempty"`
}

// CompareKeyData holds per-key model breakdowns and totals.
type CompareKeyData struct {
	Models []CompareModelRow `json:"models"`
	Totals CompareModelRow   `json:"totals"`
}

// CompareModelRow holds full token and cost breakdown for one model.
type CompareModelRow struct {
	Model             string  `json:"model"`
	OutputTokens      int64   `json:"output_tokens"`
	InputCached       int64   `json:"input_cached"`
	InputUncached     int64   `json:"input_uncached"`
	InputTotal        int64   `json:"input_total"`
	CostOutput        float64 `json:"cost_output"`
	CostInputCached   float64 `json:"cost_input_cached"`
	CostInputUncached float64 `json:"cost_input_uncached"`
	CostTotal         float64 `json:"cost_total"`
}

func buildComparison(keyA, keyB string, dataA, dataB *UsageData) CompareResult {
	start := ""
	end := ""
	dataSource := "database"
	var cachedAt *string

	if dataA != nil {
		start = dataA.Meta.Start
		end = dataA.Meta.End
		dataSource = dataA.Meta.DataSource
		cachedAt = dataA.Meta.CachedAt
	}
	if dataB != nil {
		dataSource = mergeDataSource(dataSource, dataB.Meta.DataSource)
		// Use the older of the two cached_at timestamps (most stale wins).
		cachedAt = olderCachedAt(cachedAt, dataB.Meta.CachedAt)
	}

	return CompareResult{
		KeyA:       keyA,
		KeyB:       keyB,
		Start:      start,
		End:        end,
		KeyAData:   buildKeyData(dataA),
		KeyBData:   buildKeyData(dataB),
		DataSource: dataSource,
		CachedAt:   cachedAt,
	}
}

// mergeDataSource picks the most informative / freshest source label when two
// per-key sources must be collapsed into one for the CompareResult.
// In practice both keys share the same date range and force_refresh flag so
// they will almost always be identical; the fallback handles edge cases.
func mergeDataSource(a, b string) string {
	if a == b {
		return a
	}
	// Rank by freshness: live beats cache beats database.
	rank := map[string]int{
		"live":             5,
		"database+live":    4,
		"cache":            3,
		"database+cache":   2,
		"database":         1,
	}
	if rank[a] >= rank[b] {
		return a
	}
	return b
}

// olderCachedAt returns whichever timestamp is earlier (more stale).
// If one is nil the other is returned unchanged.
func olderCachedAt(a, b *string) *string {
	if a == nil {
		return b
	}
	if b == nil {
		return a
	}
	if *a < *b { // RFC3339 strings sort lexicographically
		return a
	}
	return b
}

func buildKeyData(data *UsageData) CompareKeyData {
	var models []CompareModelRow
	var totals CompareModelRow
	totals.Model = "Total"

	if data == nil {
		return CompareKeyData{Models: models, Totals: totals}
	}

	for _, mt := range data.ByModel {
		row := CompareModelRow{
			Model:             mt.Model,
			OutputTokens:      mt.OutputTokens,
			InputCached:       mt.InputCached,
			InputUncached:     mt.InputUncached,
			InputTotal:        mt.InputCached + mt.InputUncached,
			CostOutput:        mt.CostOutput,
			CostInputCached:   mt.CostInputCached,
			CostInputUncached: mt.CostInputUncached,
			CostTotal:         mt.TotalCostUSD,
		}
		models = append(models, row)

		totals.OutputTokens += row.OutputTokens
		totals.InputCached += row.InputCached
		totals.InputUncached += row.InputUncached
		totals.InputTotal += row.InputTotal
		totals.CostOutput += row.CostOutput
		totals.CostInputCached += row.CostInputCached
		totals.CostInputUncached += row.CostInputUncached
		totals.CostTotal += row.CostTotal
	}

	// Sort by model name.
	for i := 0; i < len(models); i++ {
		for j := i + 1; j < len(models); j++ {
			if models[i].Model > models[j].Model {
				models[i], models[j] = models[j], models[i]
			}
		}
	}

	return CompareKeyData{
		Models: models,
		Totals: totals,
	}
}
