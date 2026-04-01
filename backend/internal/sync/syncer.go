package sync

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	dbpkg "github.com/openai-dashboard/backend/internal/db"
	"github.com/openai-dashboard/backend/internal/openai"
	"github.com/openai-dashboard/backend/internal/pricing"
	usagepkg "github.com/openai-dashboard/backend/internal/usage"
)

const bucketDelay = 3 * time.Second // pause between sequential bucket syncs

// Syncer fills historical gaps in the DB on startup.
type Syncer struct {
	db         *sql.DB
	aggregator *usagepkg.Aggregator
	client     *openai.Client
	lookback   int
}

// New creates a new Syncer.
func New(database *sql.DB, client *openai.Client, pt *pricing.Table, lookbackDays int) *Syncer {
	return &Syncer{
		db:         database,
		aggregator: usagepkg.NewAggregator(database, client, pt),
		client:     client,
		lookback:   lookbackDays,
	}
}

type syncTask struct {
	scope   string
	scopeID string
	label   string
}

// RunLoop runs immediately, then repeats every interval until ctx is cancelled.
func (s *Syncer) RunLoop(ctx context.Context, interval time.Duration) {
	s.Run(ctx)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("sync: loop stopped")
			return
		case <-ticker.C:
			s.Run(ctx)
		}
	}
}

// Run performs a full gap-fill sync sequentially, with a pause between buckets.
func (s *Syncer) Run(ctx context.Context) {
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

	for i, task := range tasks {
		if ctx.Err() != nil {
			slog.Info("sync: cancelled mid-run")
			return
		}
		s.syncBucket(task, earliest, yesterday)
		if i < len(tasks)-1 {
			select {
			case <-ctx.Done():
				slog.Info("sync: cancelled mid-run")
				return
			case <-time.After(bucketDelay):
			}
		}
	}

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
