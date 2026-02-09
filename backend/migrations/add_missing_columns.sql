-- Migration: Add missing columns for portal and scheduling features
-- Date: 2026-02-09

-- Add admin_notes and prep_notes to submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS prep_notes TEXT;

-- Add admin_notes and prep_notes to cards table
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS prep_notes TEXT;

-- Add auto_refresh_schedule to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS auto_refresh_schedule JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN submissions.admin_notes IS 'Internal notes from shop to customer about the submission';
COMMENT ON COLUMN submissions.prep_notes IS 'Prep review notes for the submission';
COMMENT ON COLUMN cards.admin_notes IS 'Internal notes from shop to customer about specific card';
COMMENT ON COLUMN cards.prep_notes IS 'Prep review notes for specific card';
COMMENT ON COLUMN companies.auto_refresh_schedule IS 'JSON array of scheduled auto-refresh configurations';

-- Verify columns exist
DO $$
BEGIN
    -- Check submissions columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='admin_notes') THEN
        RAISE EXCEPTION 'Failed to add admin_notes to submissions';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cards' AND column_name='admin_notes') THEN
        RAISE EXCEPTION 'Failed to add admin_notes to cards';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='auto_refresh_schedule') THEN
        RAISE EXCEPTION 'Failed to add auto_refresh_schedule to companies';
    END IF;

    RAISE NOTICE '✓ All missing columns added successfully';
END $$;
