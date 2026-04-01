CREATE INDEX IF NOT EXISTS idx_usage_cache_date ON usage_cache(date);
CREATE INDEX IF NOT EXISTS idx_usage_cache_bucket ON usage_cache(bucket_type, bucket_id);
CREATE INDEX IF NOT EXISTS idx_usage_cache_date_bucket ON usage_cache(date, bucket_type, bucket_id);
