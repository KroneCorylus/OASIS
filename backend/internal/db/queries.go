package db

import (
	"database/sql"
	"fmt"
	"time"
)

type UsageRow struct {
	Date          string
	BucketType    string
	BucketID      string
	Model         string
	InputCached   int64
	InputUncached int64
	OutputTokens  int64
	Requests      int64
}

// UpsertUsage inserts or replaces a usage row.
func UpsertUsage(db *sql.DB, row UsageRow) error {
	const q = `
	INSERT INTO usage_cache (date, bucket_type, bucket_id, model, input_cached, input_uncached, output_tokens, requests, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
	ON CONFLICT(date, bucket_type, bucket_id, model) DO UPDATE SET
		input_cached   = excluded.input_cached,
		input_uncached = excluded.input_uncached,
		output_tokens  = excluded.output_tokens,
		requests       = excluded.requests,
		updated_at     = excluded.updated_at`

	_, err := db.Exec(q,
		row.Date, row.BucketType, row.BucketID, row.Model,
		row.InputCached, row.InputUncached, row.OutputTokens, row.Requests,
	)
	if err != nil {
		return fmt.Errorf("upsert usage: %w", err)
	}
	return nil
}

// QueryUsage returns rows for a date range and bucket filter.
func QueryUsage(db *sql.DB, bucketType, bucketID, start, end string) ([]UsageRow, error) {
	const q = `
	SELECT date, bucket_type, bucket_id, model, input_cached, input_uncached, output_tokens, requests
	FROM usage_cache
	WHERE bucket_type = ? AND bucket_id = ? AND date >= ? AND date <= ?
	ORDER BY date ASC, model ASC`

	rows, err := db.Query(q, bucketType, bucketID, start, end)
	if err != nil {
		return nil, fmt.Errorf("query usage: %w", err)
	}
	defer rows.Close()

	var result []UsageRow
	for rows.Next() {
		var r UsageRow
		if err := rows.Scan(&r.Date, &r.BucketType, &r.BucketID, &r.Model,
			&r.InputCached, &r.InputUncached, &r.OutputTokens, &r.Requests); err != nil {
			return nil, fmt.Errorf("scan usage row: %w", err)
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// GetSyncedThrough returns the last date the bucket was fully synced through,
// or empty string if it has never been synced.
func GetSyncedThrough(db *sql.DB, bucketType, bucketID string) (string, error) {
	const q = `SELECT COALESCE(synced_through, '') FROM sync_state WHERE bucket_type = ? AND bucket_id = ?`
	var date string
	err := db.QueryRow(q, bucketType, bucketID).Scan(&date)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("get synced through: %w", err)
	}
	return date, nil
}

// SetSyncedThrough records that the bucket has been synced through the given date.
func SetSyncedThrough(db *sql.DB, bucketType, bucketID, date string) error {
	const q = `
	INSERT INTO sync_state (bucket_type, bucket_id, synced_through)
	VALUES (?, ?, ?)
	ON CONFLICT(bucket_type, bucket_id) DO UPDATE SET synced_through = excluded.synced_through`
	_, err := db.Exec(q, bucketType, bucketID, date)
	if err != nil {
		return fmt.Errorf("set synced through: %w", err)
	}
	return nil
}

// DateAdd adds n days to a "2006-01-02" string.
func DateAdd(date string, days int) (string, error) {
	t, err := time.Parse("2006-01-02", date)
	if err != nil {
		return "", err
	}
	return t.AddDate(0, 0, days).Format("2006-01-02"), nil
}
