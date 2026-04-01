export interface APIKey {
  id: string;
  name: string;
  redacted_value: string;
  created_at: number;
  last_used_at: number;
  project_id: string;
  project_name: string;
}

export interface Project {
  id: string;
  name: string;
  created_at: number;
  status: string;
}

export interface ModelStat {
  model: string;
  input_cached: number;
  input_uncached: number;
  output_tokens: number;
  requests: number;
  cost_usd: number;
}

export interface DayStat {
  date: string;
  models: ModelStat[];
}

export interface ModelTotal {
  model: string;
  total_cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  input_cached: number;
  input_uncached: number;
  cost_output: number;
  cost_input_cached: number;
  cost_input_uncached: number;
  cache_ratio: number;
}

export interface UsageTotals {
  input_cached: number;
  input_uncached: number;
  output_tokens: number;
  requests: number;
  cost_usd: number;
  cache_ratio: number;
}

export interface UsageMeta {
  start: string;
  end: string;
  scope: string;
  scope_id?: string;
  /** 'database' = persisted SQLite rows; 'cache' = today in-memory cache;
   *  'live' = fresh OpenAI API call;
   *  'database+cache' = past rows from DB + today from cache;
   *  'database+live'  = past rows from DB + today fresh from API */
  data_source: 'database' | 'cache' | 'live' | 'database+cache' | 'database+live';
  /** ISO 8601 timestamp of when today's in-memory cache entry was populated */
  cached_at?: string;
}

export interface UsageData {
  meta: UsageMeta;
  totals: UsageTotals;
  by_date: DayStat[];
  by_model: ModelTotal[];
}

export interface CompareModelRow {
  model: string;
  output_tokens: number;
  input_cached: number;
  input_uncached: number;
  input_total: number;
  cost_output: number;
  cost_input_cached: number;
  cost_input_uncached: number;
  cost_total: number;
}

export interface CompareKeyData {
  models: CompareModelRow[];
  totals: CompareModelRow;
}

export interface CompareResult {
  key_a: string;
  key_b: string;
  start: string;
  end: string;
  key_a_data: CompareKeyData;
  key_b_data: CompareKeyData;
  data_source: 'database' | 'cache' | 'live' | 'database+cache' | 'database+live';
  cached_at?: string;
}

export interface DateRange {
  start: string;
  end: string;
}
