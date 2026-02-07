-- Add PSA refresh logs table to track what changed during each refresh

CREATE TABLE IF NOT EXISTS psa_refresh_logs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  total_submissions INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  change_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_psa_refresh_logs_company ON psa_refresh_logs(company_id);
CREATE INDEX idx_psa_refresh_logs_created ON psa_refresh_logs(created_at DESC);
