package server

import (
	"database/sql"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/openai-dashboard/backend/internal/auth"
	"github.com/openai-dashboard/backend/internal/config"
	"github.com/openai-dashboard/backend/internal/keys"
	"github.com/openai-dashboard/backend/internal/openai"
	"github.com/openai-dashboard/backend/internal/pricing"
	"github.com/openai-dashboard/backend/internal/projects"
	"github.com/openai-dashboard/backend/internal/usage"
)

// New builds and returns the HTTP handler for the application.
func New(cfg config.Config, database *sql.DB, client *openai.Client, pt *pricing.Table) http.Handler {
	r := chi.NewRouter()

	// Middleware.
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(slogMiddleware())
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4200", "http://localhost:80", "http://localhost"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	agg := usage.NewAggregator(database, client, pt)

	// Public routes.
	r.Post("/api/auth/login", auth.LoginHandler(cfg))
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Protected routes.
	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware(cfg))
		r.Get("/api/keys", keys.Handler(client))
		r.Get("/api/projects", projects.Handler(client))
		r.Get("/api/usage", usage.Handler(agg))
		r.Get("/api/usage/compare", usage.CompareHandler(agg))
	})

	return r
}

// slogMiddleware returns a chi-compatible request logger using slog.
func slogMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r)
			slog.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.Status(),
				"bytes", ww.BytesWritten(),
				"remote", r.RemoteAddr,
			)
		})
	}
}
