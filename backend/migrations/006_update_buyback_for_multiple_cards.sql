-- Update buyback_offers to support multiple cards and counter-offers

-- Create junction table for multiple cards per offer
CREATE TABLE IF NOT EXISTS buyback_offer_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyback_offer_id UUID NOT NULL REFERENCES buyback_offers(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  -- Individual card pricing
  individual_offer_amount DECIMAL(10, 2) NOT NULL,
  grading_fee DECIMAL(10, 2) DEFAULT 0,
  net_payout DECIMAL(10, 2) GENERATED ALWAYS AS (individual_offer_amount - COALESCE(grading_fee, 0)) STORED,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate cards in same offer
  UNIQUE(buyback_offer_id, card_id)
);

-- Add counter-offer support to buyback_offers
ALTER TABLE buyback_offers
ADD COLUMN IF NOT EXISTS customer_counter_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS customer_counter_message TEXT,
ADD COLUMN IF NOT EXISTS counter_offered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS admin_counter_response VARCHAR(50) CHECK (admin_counter_response IN ('accepted', 'declined', 'in_person')),
ADD COLUMN IF NOT EXISTS admin_counter_response_message TEXT,
ADD COLUMN IF NOT EXISTS admin_counter_responded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS in_person_requested BOOLEAN DEFAULT FALSE;

-- Add bulk discount support
ALTER TABLE buyback_offers
ADD COLUMN IF NOT EXISTS is_bulk_offer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bulk_discount_percent DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_grading_fees DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_payout DECIMAL(10, 2);

-- Make card_id nullable since we're using junction table now
ALTER TABLE buyback_offers
ALTER COLUMN card_id DROP NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_buyback_offer_cards_offer ON buyback_offer_cards(buyback_offer_id);
CREATE INDEX IF NOT EXISTS idx_buyback_offer_cards_card ON buyback_offer_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_buyback_offers_counter ON buyback_offers(customer_counter_amount) WHERE customer_counter_amount IS NOT NULL;

COMMENT ON TABLE buyback_offer_cards IS 'Junction table for multi-card buyback offers';
COMMENT ON COLUMN buyback_offers.is_bulk_offer IS 'Whether this offer applies a bulk discount across all cards';
COMMENT ON COLUMN buyback_offers.bulk_discount_percent IS 'Percentage discount when buying all cards together';
COMMENT ON COLUMN buyback_offers.customer_counter_amount IS 'Customer counter-offer amount (one-time only)';
COMMENT ON COLUMN buyback_offers.admin_counter_response IS 'Admin response to counter-offer: accepted, declined, or in_person';
