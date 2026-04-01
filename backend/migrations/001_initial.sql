CREATE TABLE IF NOT EXISTS usage_cache (
    date           TEXT NOT NULL,
    bucket_type    TEXT NOT NULL,
    bucket_id      TEXT NOT NULL,
    model          TEXT NOT NULL,
    input_cached   INTEGER NOT NULL DEFAULT 0,
    input_uncached INTEGER NOT NULL DEFAULT 0,
    output_tokens  INTEGER NOT NULL DEFAULT 0,
    requests       INTEGER NOT NULL DEFAULT 0,
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (date, bucket_type, bucket_id, model)
);
