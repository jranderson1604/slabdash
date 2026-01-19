-- Add multi-customer support for consignment tracking
-- Allows multiple customers to be linked to a single submission

-- Create junction table for submission-customer relationships
CREATE TABLE IF NOT EXISTS submission_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    card_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, customer_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_submission_customers_submission ON submission_customers(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_customers_customer ON submission_customers(customer_id);

-- Add customer_ownership field to cards table to track which customer owns each card
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS customer_owner_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Add index for customer ownership queries
CREATE INDEX IF NOT EXISTS idx_cards_customer_owner ON cards(customer_owner_id);
