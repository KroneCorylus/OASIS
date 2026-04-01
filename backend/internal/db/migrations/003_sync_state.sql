CREATE TABLE IF NOT EXISTS sync_state (
    bucket_type     TEXT NOT NULL,
    bucket_id       TEXT NOT NULL,
    synced_through  TEXT NOT NULL,
    PRIMARY KEY (bucket_type, bucket_id)
);
