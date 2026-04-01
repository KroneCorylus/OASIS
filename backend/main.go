package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/openai-dashboard/backend/internal/config"
	dbpkg "github.com/openai-dashboard/backend/internal/db"
	"github.com/openai-dashboard/backend/internal/openai"
	"github.com/openai-dashboard/backend/internal/pricing"
	"github.com/openai-dashboard/backend/internal/server"
	syncer "github.com/openai-dashboard/backend/internal/sync"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("config load failed", "error", err)
		os.Exit(1)
	}

	// Configure slog handler.
	var handler slog.Handler
	if cfg.AppEnv == "production" {
		handler = slog.NewJSONHandler(os.Stdout, nil)
	} else {
		handler = slog.NewTextHandler(os.Stdout, nil)
	}
	slog.SetDefault(slog.New(handler))

	// Open database.
	db, err := dbpkg.Open(cfg.DBPath)
	if err != nil {
		slog.Error("db open failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Load pricing table.
	pt, err := pricing.Load(cfg.PricingPath)
	if err != nil {
		slog.Error("pricing load failed", "error", err)
		os.Exit(1)
	}

	// Build OpenAI client.
	client := openai.NewClient(cfg.OpenAIAdminKey)

	// Root context cancelled on shutdown signal.
	ctx, cancel := context.WithCancel(context.Background())

	// Start background sync: run immediately on startup, then every hour.
	s := syncer.New(db, client, pt, cfg.SyncLookbackDays)
	go s.RunLoop(ctx, time.Hour)

	// Build server.
	handler2 := server.New(cfg, db, client, pt)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler2,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		slog.Info("server starting", "port", cfg.Port, "env", cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-quit
	slog.Info("shutting down server...")
	cancel() // stop the sync loop

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
		os.Exit(1)
	}
	slog.Info("server stopped")
}
