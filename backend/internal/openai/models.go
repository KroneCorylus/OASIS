package openai

// UsageResult is one record from the completions usage endpoint.
type UsageResult struct {
	InputTokens       int64  `json:"input_tokens"`
	InputCachedTokens int64  `json:"input_cached_tokens"`
	OutputTokens      int64  `json:"output_tokens"`
	NumModelRequests  int64  `json:"num_model_requests"`
	Model             string `json:"model"`

	// Grouping dimension values (optional, depends on group_by param)
	ProjectID  string `json:"project_id"`
	APIKeyID   string `json:"api_key_id"`
	APIKeyName string `json:"api_key_name"`
}

type usageResponse struct {
	Data     []UsageBucket `json:"data"`
	HasMore  bool          `json:"has_more"`
	NextPage string        `json:"next_page"`
}

// UsageBucket groups usage results by time bucket.
type UsageBucket struct {
	StartTime int64         `json:"start_time"`
	EndTime   int64         `json:"end_time"`
	Results   []UsageResult `json:"results"`
}

// APIKey represents a project-scoped OpenAI API key.
type APIKey struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	RedactedValue string `json:"redacted_value"`
	CreatedAt     int64  `json:"created_at"`
	LastUsedAt    int64  `json:"last_used_at"`
	ProjectID     string `json:"project_id"`
	ProjectName   string `json:"project_name"`
}

type projectAPIKeyRaw struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	RedactedValue string `json:"redacted_value"`
	CreatedAt     int64  `json:"created_at"`
	LastUsedAt    int64  `json:"last_used_at"`
}

type projectAPIKeyListResponse struct {
	Data    []projectAPIKeyRaw `json:"data"`
	HasMore bool               `json:"has_more"`
	LastID  string             `json:"last_id"`
}

// Project represents an OpenAI organisation project.
type Project struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt int64  `json:"created_at"`
	Status    string `json:"status"`
}

type projectResponse struct {
	Data     []Project `json:"data"`
	HasMore  bool      `json:"has_more"`
	LastID   string    `json:"last_id"`
}

// APIError wraps an error response from the OpenAI API.
type APIError struct {
	StatusCode int
	Message    string
}

func (e *APIError) Error() string {
	return e.Message
}
