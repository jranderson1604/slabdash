-- Improve refresh system: persist rate limit state, track step transitions better

-- System state table for persisting rate limit and daily usage across restarts
CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track when a submission entered its current step (for accurate days-at-step)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS step_entered_at TIMESTAMP WITH TIME ZONE;

-- Backfill step_entered_at from the most recent step_change event in history
UPDATE submissions s
SET step_entered_at = COALESCE(
  (SELECT ssh.created_at
   FROM submission_status_history ssh
   WHERE ssh.submission_id = s.id
     AND ssh.event_type = 'step_change'
   ORDER BY ssh.created_at DESC
   LIMIT 1),
  s.last_api_update,
  s.created_at
)
WHERE s.step_entered_at IS NULL
  AND s.shipped = false;
