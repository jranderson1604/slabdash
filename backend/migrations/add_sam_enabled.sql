-- Migration: Add SAM AI Assistant addon field to companies
-- This enables/disables customer portal SAM access per company

-- Add sam_enabled column
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sam_enabled BOOLEAN DEFAULT FALSE;

-- Add comment explaining the field
COMMENT ON COLUMN companies.sam_enabled IS 'Enables SAM AI Assistant in customer portal for this company (addon feature)';

-- Optional: Enable SAM for all existing companies (remove if you want it opt-in only)
-- UPDATE companies SET sam_enabled = TRUE;

-- Verify migration
SELECT COUNT(*) as total_companies,
       SUM(CASE WHEN sam_enabled THEN 1 ELSE 0 END) as sam_enabled_count
FROM companies;
