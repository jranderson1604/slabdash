-- Add missing PSA-related columns to submissions table

-- Add psa_status column to track PSA order status
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS psa_status VARCHAR(100);

-- Add last_refreshed_at to track when we last synced with PSA
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMP;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_psa_status ON submissions(psa_status);
CREATE INDEX IF NOT EXISTS idx_submissions_last_refreshed ON submissions(last_refreshed_at);
