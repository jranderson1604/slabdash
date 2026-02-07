-- Add auto-refresh scheduling settings to companies table

ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_schedule VARCHAR(50) DEFAULT 'weekly';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_day_of_week INTEGER DEFAULT 1; -- 0 = Sunday, 1 = Monday, etc.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_hour INTEGER DEFAULT 9; -- Hour in 24-hour format (0-23)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_email TEXT; -- Email address to send reports to
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_auto_refresh TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN companies.auto_refresh_enabled IS 'Enable automatic PSA submission refreshes';
COMMENT ON COLUMN companies.auto_refresh_schedule IS 'Refresh frequency: daily, weekly, or biweekly';
COMMENT ON COLUMN companies.auto_refresh_day_of_week IS 'Day of week for weekly refreshes (0=Sunday, 1=Monday, etc.)';
COMMENT ON COLUMN companies.auto_refresh_hour IS 'Hour of day to run refresh (0-23, server time)';
COMMENT ON COLUMN companies.auto_refresh_email IS 'Email address to send refresh reports to (defaults to company owner email)';
COMMENT ON COLUMN companies.last_auto_refresh IS 'Timestamp of last automatic refresh execution';
