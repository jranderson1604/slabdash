-- Add card_count column to submissions table

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS card_count INTEGER DEFAULT 0;

COMMENT ON COLUMN submissions.card_count IS 'Number of cards in the submission (from PSA CSV or manually entered)';
