-- Add pickup system columns and audit table

-- Add pickup code and QR data to submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(10);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS picked_up BOOLEAN DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS picked_up_by VARCHAR(255);

-- Create pickup audit trail table
CREATE TABLE IF NOT EXISTS pickup_history (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    pickup_code_verified BOOLEAN DEFAULT false,
    picked_up_by VARCHAR(255),
    pickup_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pickup_history_submission ON pickup_history(submission_id);
CREATE INDEX IF NOT EXISTS idx_submissions_pickup_code ON submissions(pickup_code);

COMMENT ON COLUMN submissions.pickup_code IS 'Unique code for customer to verify pickup (e.g., XK7-892)';
COMMENT ON COLUMN submissions.picked_up IS 'Whether the submission has been picked up by customer';
COMMENT ON COLUMN submissions.picked_up_at IS 'Timestamp when submission was picked up';
COMMENT ON COLUMN submissions.picked_up_by IS 'Name of person who picked up the submission';
COMMENT ON TABLE pickup_history IS 'Audit trail for all pickup events';
