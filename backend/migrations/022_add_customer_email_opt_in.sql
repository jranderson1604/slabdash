-- Add email opt-in preference to customers table
-- Allows customers to toggle email notifications from their portal

ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN customers.email_opt_in IS 'Whether the customer wants to receive email notifications for submission updates';
