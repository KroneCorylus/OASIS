package openai

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const baseURL = "https://api.openai.com/v1"

// Client is an OpenAI admin API client.
type Client struct {
	adminKey   string
	httpClient *http.Client
}

// NewClient creates a new Client with the given admin API key.
func NewClient(adminKey string) *Client {
	return &Client{
		adminKey: adminKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *Client) get(path string, params url.Values, out any) error {
	endpoint := baseURL + path
	if len(params) > 0 {
		endpoint += "?" + params.Encode()
	}

	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.adminKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("openai api error %d: %s", resp.StatusCode, string(body)),
		}
	}

	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("unmarshal response: %w", err)
	}
	return nil
}

// GetCompletionsUsage fetches all completions usage buckets for the given date range.
// groupBy can be "project_id", "api_key_id", or empty for org-level.
func (c *Client) GetCompletionsUsage(startTime, endTime int64, groupBy []string) ([]UsageBucket, error) {
	var all []UsageBucket
	var nextPage string

	for {
		params := url.Values{
			"start_time":   []string{fmt.Sprintf("%d", startTime)},
			"end_time":     []string{fmt.Sprintf("%d", endTime)},
			"bucket_width": []string{"1d"},
		}
		for _, g := range groupBy {
			params.Add("group_by", g)
		}
		if nextPage != "" {
			params.Set("page", nextPage)
		}

		var resp usageResponse
		if err := c.get("/organization/usage/completions", params, &resp); err != nil {
			return nil, fmt.Errorf("get completions usage: %w", err)
		}

		all = append(all, resp.Data...)

		if !resp.HasMore {
			break
		}
		nextPage = resp.NextPage
	}
	return all, nil
}

// GetProjects returns all organisation projects.
func (c *Client) GetProjects() ([]Project, error) {
	var all []Project
	var lastID string

	for {
		params := url.Values{"limit": []string{"100"}}
		if lastID != "" {
			params.Set("after", lastID)
		}

		var resp projectResponse
		if err := c.get("/organization/projects", params, &resp); err != nil {
			return nil, fmt.Errorf("get projects: %w", err)
		}

		all = append(all, resp.Data...)

		if !resp.HasMore {
			break
		}
		lastID = resp.LastID
	}
	return all, nil
}

// GetAPIKeys returns all API keys across all projects.
func (c *Client) GetAPIKeys() ([]APIKey, error) {
	projects, err := c.GetProjects()
	if err != nil {
		return nil, fmt.Errorf("get projects for key listing: %w", err)
	}

	var all []APIKey
	for _, proj := range projects {
		keys, err := c.getProjectAPIKeys(proj.ID, proj.Name)
		if err != nil {
			// Non-fatal: some projects may have restricted access.
			continue
		}
		all = append(all, keys...)
	}
	return all, nil
}

// getProjectAPIKeys fetches API keys for a single project.
func (c *Client) getProjectAPIKeys(projectID, projectName string) ([]APIKey, error) {
	var all []APIKey
	var lastID string

	for {
		params := url.Values{"limit": []string{"100"}}
		if lastID != "" {
			params.Set("after", lastID)
		}

		var resp projectAPIKeyListResponse
		path := fmt.Sprintf("/organization/projects/%s/api_keys", projectID)
		if err := c.get(path, params, &resp); err != nil {
			return nil, fmt.Errorf("get project %s api keys: %w", projectID, err)
		}

		for _, raw := range resp.Data {
			all = append(all, APIKey{
				ID:            raw.ID,
				Name:          raw.Name,
				RedactedValue: raw.RedactedValue,
				CreatedAt:     raw.CreatedAt,
				LastUsedAt:    raw.LastUsedAt,
				ProjectID:     projectID,
				ProjectName:   projectName,
			})
		}

		if !resp.HasMore {
			break
		}
		lastID = resp.LastID
	}
	return all, nil
}
