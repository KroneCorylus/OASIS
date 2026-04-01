package sync

import (
	"database/sql"
	"fmt"
	"log/slog"
	"sync"
	"time"

	dbpkg "github.com/openai-dashboard/backend/internal/db"
	"github.com/openai-dashboard/backend/internal/openai"
	"github.com/openai-dashboard/backend/internal/pricing"
	usagepkg "github.com/openai-dashboard/backend/internal/usage"
)

const (
	concurrency      = 3
	throttleInterval = 500 * time.Millisecond // max 2 API calls/sec across all goroutines
)

// Syncer fills historical gaps in the DB on startup.
type Syncer struct {
	db         *sql.DB
	aggregator *usagepkg.Aggregator
	client     *openai.Client
	lookback   int
	throttle   <-chan time.Time // shared rate-limiter ticket
}

// New creates a new Syncer.
func New(database *sql.DB, client *openai.Client, pt *pricing.Table, lookbackDays int) *Syncer {
	agg := usagepkg.NewAggregator(database, client, pt)
	ticker := time.NewTicker(throttleInterval)
	return &Syncer{
		db:         database,
		aggregator: agg,
		client:     client,
		lookback:   lookbackDays,
		throttle:   ticker.C,
	}
}

type syncTask struct {
	scope   string
	scopeID string
	label   string
}

// Run performs a full gap-fill sync.
func (s *Syncer) Run() {
	slog.Info("sync: starting background gap-fill")

	yesterday := time.Now().UTC().AddDate(0, 0, -1).Format("2006-01-02")
	earliest := time.Now().UTC().AddDate(0, 0, -s.lookback).Format("2006-01-02")

	tasks := []syncTask{
		{scope: usagepkg.ScopeOrg, scopeID: "", label: "org"},
	}

	// Sync per-project.
	projects, err := s.client.GetProjects()
	if err != nil {
		slog.Warn("sync: could not fetch projects, skipping project-level sync", "error", err)
	} else {
		for _, p := range projects {
			tasks = append(tasks, syncTask{
				scope:   usagepkg.ScopeProject,
				scopeID: p.ID,
				label:   fmt.Sprintf("project/%s", p.ID),
			})
		}
	}

	// Sync per-API-key.
	keys, err := s.client.GetAPIKeys()
	if err != nil {
		slog.Warn("sync: could not fetch api keys, skipping key-level sync", "error", err)
	} else {
		for _, k := range keys {
			tasks = append(tasks, syncTask{
				scope:   usagepkg.ScopeAPIKey,
				scopeID: k.ID,
				label:   fmt.Sprintf("api_key/%s", k.ID),
			})
		}
	}

	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	for _, task := range tasks {
		wg.Add(1)
		sem <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-sem }()
			s.syncBucket(task, earliest, yesterday)
		}()
	}

	wg.Wait()
	slog.Info("sync: gap-fill complete")
}

func (s *Syncer) syncBucket(task syncTask, earliest, yesterday string) {
	syncedThrough, err := dbpkg.GetSyncedThrough(s.db, task.scope, task.scopeID)
	if err != nil {
		slog.Error("sync: get synced through", "bucket", task.label, "error", err)
		return
	}

	start := earliest
	if syncedThrough != "" {
		next, err := dbpkg.DateAdd(syncedThrough, 1)
		if err != nil {
			slog.Error("sync: date add", "bucket", task.label, "error", err)
			return
		}
		if next > yesterday {
			slog.Info("sync: bucket up to date", "bucket", task.label)
			return
		}
		start = next
	}

	slog.Info("sync: syncing bucket", "bucket", task.label, "start", start, "end", yesterday)

	// Acquire throttle token before hitting the OpenAI API.
	<-s.throttle

	if err := s.aggregator.FetchAndCacheRange(task.scope, task.scopeID, start, yesterday); err != nil {
		slog.Error("sync: fetch and cache", "bucket", task.label, "error", err)
		return
	}

	if err := dbpkg.SetSyncedThrough(s.db, task.scope, task.scopeID, yesterday); err != nil {
		slog.Error("sync: set synced through", "bucket", task.label, "error", err)
		return
	}

	slog.Info("sync: bucket done", "bucket", task.label)
}
