-- Migration: Add missing milestone date and status columns to submissions
-- These columns are defined in schema.sql but were never migrated to production
-- Fixes: "column date_received does not exist" error during PSA refresh

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS date_sent DATE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS date_received DATE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS date_graded DATE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS date_shipped DATE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS estimated_return_date DATE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS accounting_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ready_for_label_review BOOLEAN DEFAULT FALSE;

-- Verify columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='date_received') THEN
        RAISE EXCEPTION 'Failed to add date_received to submissions';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='date_graded') THEN
        RAISE EXCEPTION 'Failed to add date_graded to submissions';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='date_shipped') THEN
        RAISE EXCEPTION 'Failed to add date_shipped to submissions';
    END IF;
    RAISE NOTICE 'All milestone columns added successfully';
END $$;
