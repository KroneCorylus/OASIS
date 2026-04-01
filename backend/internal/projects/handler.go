package projects

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/openai-dashboard/backend/internal/openai"
)

// Handler returns an http.HandlerFunc for GET /api/projects.
func Handler(client *openai.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projects, err := client.GetProjects()
		if err != nil {
			slog.Error("get projects", "error", err)
			http.Error(w, "failed to fetch projects", http.StatusBadGateway)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(projects)
	}
}
