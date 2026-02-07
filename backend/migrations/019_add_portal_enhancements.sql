-- Add before photos and admin notes to cards

-- Add before_photos column to cards (JSON array of photo URLs)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS before_photos JSONB DEFAULT '[]'::jsonb;

-- Add admin_notes column to cards (visible to customers in portal)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add prep_notes column to cards (admin review/condition notes)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS prep_notes TEXT;

-- Add price_estimate column for comp lookups
ALTER TABLE cards ADD COLUMN IF NOT EXISTS price_estimate DECIMAL(10,2);

-- Add last_comp_check timestamp
ALTER TABLE cards ADD COLUMN IF NOT EXISTS last_comp_check TIMESTAMP WITH TIME ZONE;

-- Add submission-level admin notes (general notes for the whole submission)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add submission-level prep notes
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS prep_notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cards_before_photos ON cards USING GIN (before_photos);
