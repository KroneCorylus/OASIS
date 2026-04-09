package usage

import (
	"database/sql"
	"fmt"
	"sync"
	"time"

	"github.com/openai-dashboard/backend/internal/db"
	"github.com/openai-dashboard/backend/internal/openai"
	"github.com/openai-dashboard/backend/internal/pricing"
)

// todayCacheTTL is how long today's live data is kept in memory before a
// background re-fetch is required (unless force_refresh is set).
const todayCacheTTL = 5 * time.Minute

type todayCacheKey struct {
	scope   string
	scopeID string
}

type todayCacheEntry struct {
	rows      []db.UsageRow
	fetchedAt time.Time
}

// Scope constants for bucket_type.
const (
	ScopeOrg     = "org"
	ScopeProject = "project"
	ScopeAPIKey  = "api_key"
)

// ModelStat aggregates token counts and cost for one model.
type ModelStat struct {
	Model             string  `json:"model"`
	InputCached       int64   `json:"input_cached"`
	InputUncached     int64   `json:"input_uncached"`
	OutputTokens      int64   `json:"output_tokens"`
	Requests          int64   `json:"requests"`
	CostUSD           float64 `json:"cost_usd"`
	CostOutput        float64 `json:"cost_output"`
	CostInputCached   float64 `json:"cost_input_cached"`
	CostInputUncached float64 `json:"cost_input_uncached"`
}

// DayStat groups model stats for one calendar day.
type DayStat struct {
	Date   string      `json:"date"`
	Models []ModelStat `json:"models"`
}

// ModelTotal is a per-model summary over the whole date range.
type ModelTotal struct {
	Model             string  `json:"model"`
	TotalCostUSD      float64 `json:"total_cost_usd"`
	InputTokens       int64   `json:"input_tokens"`
	OutputTokens      int64   `json:"output_tokens"`
	InputCached       int64   `json:"input_cached"`
	InputUncached     int64   `json:"input_uncached"`
	CostOutput        float64 `json:"cost_output"`
	CostInputCached   float64 `json:"cost_input_cached"`
	CostInputUncached float64 `json:"cost_input_uncached"`
	CacheRatio        float64 `json:"cache_ratio"`
}

// Totals holds aggregate numbers across all models and days.
type Totals struct {
	InputCached   int64   `json:"input_cached"`
	InputUncached int64   `json:"input_uncached"`
	OutputTokens  int64   `json:"output_tokens"`
	Requests      int64   `json:"requests"`
	CostUSD       float64 `json:"cost_usd"`
	CacheRatio    float64 `json:"cache_ratio"`
}

// UsageData is the full response payload.
type UsageData struct {
	Meta     Meta         `json:"meta"`
	Totals   Totals       `json:"totals"`
	ByDate   []DayStat    `json:"by_date"`
	ByModel  []ModelTotal `json:"by_model"`
}

// Meta describes the query parameters and data provenance.
type Meta struct {
	Start      string  `json:"start"`
	End        string  `json:"end"`
	Scope      string  `json:"scope"`
	ScopeID    string  `json:"scope_id,omitempty"`
	// DataSource is one of:
	//   "database" – all rows from the persistent SQLite store (historical dates)
	//   "cache"    – today's rows served from the in-memory TTL cache
	//   "live"     – today's rows freshly fetched from the OpenAI API
	//   "mixed"    – historical rows from DB + today from cache or live
	DataSource string  `json:"data_source"`
	// CachedAt is set (RFC 3339) when today's portion was served from the
	// in-memory cache rather than a fresh API call.
	CachedAt   *string `json:"cached_at,omitempty"`
}

// QueryFilter describes what data to fetch.
type QueryFilter struct {
	Scope        string // "org", "project", "api_key"
	ScopeID      string // project_id or api_key_id; empty for org
	Start        string // "2006-01-02"
	End          string // "2006-01-02"
	ForceRefresh bool   // bypass the in-memory today cache
}

// Aggregator merges persistent DB data with live/cached OpenAI data.
type Aggregator struct {
	db      *sql.DB
	client  *openai.Client
	pricing *pricing.Table

	// in-memory TTL cache for today's data per (scope, scopeID)
	todayCacheMu sync.RWMutex
	todayCache   map[todayCacheKey]*todayCacheEntry
}

// NewAggregator creates a new Aggregator.
func NewAggregator(database *sql.DB, client *openai.Client, pt *pricing.Table) *Aggregator {
	return &Aggregator{
		db:         database,
		client:     client,
		pricing:    pt,
		todayCache: make(map[todayCacheKey]*todayCacheEntry),
	}
}

// Query fetches usage data for the given filter.
//
// Data provenance:
//   - Historical dates (before today) are always read from the persistent SQLite
//     store → DataSource "database".
//   - Today's data is served from a per-scope in-memory TTL cache (5 min) to
//     avoid hammering the OpenAI API → DataSource "cache".
//   - When the cache is cold or ForceRefresh is true, a live API call is made
//     and the result is stored in the cache → DataSource "live".
//   - If the requested range covers both past days and today → DataSource "mixed".
func (a *Aggregator) Query(f QueryFilter) (*UsageData, error) {
	todayStr := time.Now().UTC().Format("2006-01-02")
	bucketType := f.Scope
	bucketID := f.ScopeID

	var rows []db.UsageRow
	dataSource := "database"
	var cachedAt *string

	if f.End >= todayStr {
		yesterday := todayStr
		if t, err := time.Parse("2006-01-02", todayStr); err == nil {
			yesterday = t.AddDate(0, 0, -1).Format("2006-01-02")
		}

		hasPast := f.Start <= yesterday
		if hasPast {
			dbRows, err := db.QueryUsage(a.db, bucketType, bucketID, f.Start, yesterday)
			if err != nil {
				return nil, fmt.Errorf("query database usage: %w", err)
			}
			rows = append(rows, dbRows...)
		}

		// Today: use in-memory cache unless caller demands a fresh pull.
		todayRows, fromCache, fetchedAt, err := a.fetchTodayCached(f.Scope, f.ScopeID, todayStr, f.ForceRefresh)
		if err != nil {
			return nil, fmt.Errorf("fetch today usage: %w", err)
		}
		rows = append(rows, todayRows...)

		todaySource := "live"
		if fromCache {
			todaySource = "cache"
			ts := fetchedAt.UTC().Format(time.RFC3339)
			cachedAt = &ts
		}

		if hasPast {
			dataSource = "database+" + todaySource // "database+cache" or "database+live"
		} else {
			dataSource = todaySource
		}
	} else {
		dbRows, err := db.QueryUsage(a.db, bucketType, bucketID, f.Start, f.End)
		if err != nil {
			return nil, fmt.Errorf("query database usage: %w", err)
		}
		rows = dbRows
		dataSource = "database"
	}

	result := a.aggregate(rows, f)
	result.Meta.DataSource = dataSource
	result.Meta.CachedAt = cachedAt
	return result, nil
}

// fetchTodayCached returns today's rows from the in-memory TTL cache when
// available and fresh, otherwise fetches live from the OpenAI API and
// updates the cache. Returns (rows, fromCache, fetchedAt, error).
func (a *Aggregator) fetchTodayCached(scope, scopeID, date string, forceRefresh bool) ([]db.UsageRow, bool, time.Time, error) {
	key := todayCacheKey{scope: scope, scopeID: scopeID}

	if !forceRefresh {
		a.todayCacheMu.RLock()
		entry, ok := a.todayCache[key]
		a.todayCacheMu.RUnlock()
		if ok && time.Since(entry.fetchedAt) < todayCacheTTL {
			return entry.rows, true, entry.fetchedAt, nil
		}
	}

	// Cold cache or forced refresh — hit the OpenAI API.
	liveRows, err := a.fetchLive(scope, scopeID, date, date)
	if err != nil {
		return nil, false, time.Time{}, err
	}

	fetchedAt := time.Now()
	a.todayCacheMu.Lock()
	a.todayCache[key] = &todayCacheEntry{rows: liveRows, fetchedAt: fetchedAt}
	a.todayCacheMu.Unlock()

	return liveRows, false, fetchedAt, nil
}

// fetchLive pulls data directly from the OpenAI API for a date range.
func (a *Aggregator) fetchLive(scope, scopeID, start, end string) ([]db.UsageRow, error) {
	startTime, err := dateToUnix(start)
	if err != nil {
		return nil, err
	}
	// End time is exclusive in OpenAI API — add one day.
	endTime, err := dateToUnix(end)
	if err != nil {
		return nil, err
	}
	endTime += 86400

	var groupBy []string
	switch scope {
	case ScopeProject:
		groupBy = []string{"project_id", "model"}
	case ScopeAPIKey:
		groupBy = []string{"api_key_id", "model"}
	default:
		groupBy = []string{"model"}
	}

	buckets, err := a.client.GetCompletionsUsage(startTime, endTime, groupBy)
	if err != nil {
		return nil, fmt.Errorf("openai usage: %w", err)
	}

	var rows []db.UsageRow
	for _, bucket := range buckets {
		date := time.Unix(bucket.StartTime, 0).UTC().Format("2006-01-02")
		for _, result := range bucket.Results {
			// Filter by scopeID if needed.
			switch scope {
			case ScopeProject:
				if result.ProjectID != scopeID {
					continue
				}
			case ScopeAPIKey:
				if result.APIKeyID != scopeID {
					continue
				}
			}

			rows = append(rows, db.UsageRow{
				Date:          date,
				BucketType:    scope,
				BucketID:      scopeID,
				Model:         result.Model,
				InputCached:   result.InputCachedTokens,
				InputUncached: result.InputTokens - result.InputCachedTokens,
				OutputTokens:  result.OutputTokens,
				Requests:      result.NumModelRequests,
			})
		}
	}
	return rows, nil
}

// FetchAndCacheRange fetches usage from OpenAI and persists it to DB.
func (a *Aggregator) FetchAndCacheRange(scope, scopeID, start, end string) error {
	rows, err := a.fetchLive(scope, scopeID, start, end)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if err := db.UpsertUsage(a.db, row); err != nil {
			return fmt.Errorf("upsert row %s/%s/%s: %w", row.Date, row.BucketType, row.Model, err)
		}
	}
	return nil
}

// aggregate converts raw rows into a structured UsageData response.
func (a *Aggregator) aggregate(rows []db.UsageRow, f QueryFilter) *UsageData {
	// Index by date → model
	type dayModelKey struct{ date, model string }
	byDayModel := make(map[dayModelKey]*ModelStat)
	byModel := make(map[string]*ModelTotal)

	var totals Totals

	for _, row := range rows {
		key := dayModelKey{row.Date, row.Model}
		if _, ok := byDayModel[key]; !ok {
			byDayModel[key] = &ModelStat{Model: row.Model}
		}
		s := byDayModel[key]
		s.InputCached += row.InputCached
		s.InputUncached += row.InputUncached
		s.OutputTokens += row.OutputTokens
		s.Requests += row.Requests

		price := a.pricing.Lookup(row.Model)
		costOutput := float64(row.OutputTokens) / 1_000_000 * price.Output
		costInputCached := float64(row.InputCached) / 1_000_000 * price.InputCached
		costInputUncached := float64(row.InputUncached) / 1_000_000 * price.InputUncached
		cost := costOutput + costInputCached + costInputUncached
		s.CostUSD += cost
		s.CostOutput += costOutput
		s.CostInputCached += costInputCached
		s.CostInputUncached += costInputUncached

		if _, ok := byModel[row.Model]; !ok {
			byModel[row.Model] = &ModelTotal{Model: row.Model}
		}
		mt := byModel[row.Model]
		mt.TotalCostUSD += cost
		mt.InputTokens += row.InputCached + row.InputUncached
		mt.OutputTokens += row.OutputTokens
		mt.InputCached += row.InputCached
		mt.InputUncached += row.InputUncached
		mt.CostOutput += costOutput
		mt.CostInputCached += costInputCached
		mt.CostInputUncached += costInputUncached

		totals.InputCached += row.InputCached
		totals.InputUncached += row.InputUncached
		totals.OutputTokens += row.OutputTokens
		totals.Requests += row.Requests
		totals.CostUSD += cost
	}

	// Compute cache ratios.
	if totals.InputCached+totals.InputUncached > 0 {
		totals.CacheRatio = float64(totals.InputCached) / float64(totals.InputCached+totals.InputUncached)
	}
	for _, mt := range byModel {
		// cache ratio not tracked per model total in this simple version
		_ = mt
	}

	// Build sorted by_date.
	dateSet := make(map[string]bool)
	for key := range byDayModel {
		dateSet[key.date] = true
	}
	dates := sortedKeys(dateSet)

	var byDate []DayStat
	for _, date := range dates {
		var models []ModelStat
		for key, stat := range byDayModel {
			if key.date == date {
				models = append(models, *stat)
			}
		}
		sortModelStats(models)
		byDate = append(byDate, DayStat{Date: date, Models: models})
	}

	// Build sorted by_model.
	var modelTotals []ModelTotal
	for _, mt := range byModel {
		modelTotals = append(modelTotals, *mt)
	}
	sortModelTotals(modelTotals)

	return &UsageData{
		Meta: Meta{
			Start:   f.Start,
			End:     f.End,
			Scope:   f.Scope,
			ScopeID: f.ScopeID,
		},
		Totals:  totals,
		ByDate:  byDate,
		ByModel: modelTotals,
	}
}

func calcCost(inputCached, inputUncached, output int64, price pricing.ModelPrice) float64 {
	return float64(inputCached)/1_000_000*price.InputCached +
		float64(inputUncached)/1_000_000*price.InputUncached +
		float64(output)/1_000_000*price.Output
}

func dateToUnix(date string) (int64, error) {
	t, err := time.Parse("2006-01-02", date)
	if err != nil {
		return 0, fmt.Errorf("parse date %q: %w", date, err)
	}
	return t.UTC().Unix(), nil
}

func sortedKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	// Simple sort (strings.Sort not imported; use manual bubble or sort.Strings)
	for i := 0; i < len(keys); i++ {
		for j := i + 1; j < len(keys); j++ {
			if keys[i] > keys[j] {
				keys[i], keys[j] = keys[j], keys[i]
			}
		}
	}
	return keys
}

func sortModelStats(s []ModelStat) {
	for i := 0; i < len(s); i++ {
		for j := i + 1; j < len(s); j++ {
			if s[i].Model > s[j].Model {
				s[i], s[j] = s[j], s[i]
			}
		}
	}
}

func sortModelTotals(s []ModelTotal) {
	for i := 0; i < len(s); i++ {
		for j := i + 1; j < len(s); j++ {
			if s[i].TotalCostUSD < s[j].TotalCostUSD {
				s[i], s[j] = s[j], s[i]
			}
		}
	}
}
