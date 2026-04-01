package keys

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/openai-dashboard/backend/internal/openai"
)

// Handler returns an http.HandlerFunc for GET /api/keys.
func Handler(client *openai.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		keys, err := client.GetAPIKeys()
		if err != nil {
			slog.Error("get api keys", "error", err)
			http.Error(w, "failed to fetch API keys", http.StatusBadGateway)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(keys)
	}
}
