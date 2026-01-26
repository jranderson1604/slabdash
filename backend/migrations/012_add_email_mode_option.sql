-- Add option to choose between SlabDash default email or custom SMTP
ALTER TABLE companies ADD COLUMN IF NOT EXISTS use_custom_smtp BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN companies.use_custom_smtp IS 'If false, uses SlabDash default email service. If true, uses custom SMTP settings.';
