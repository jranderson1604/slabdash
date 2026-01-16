-- Buyback Offers Table
CREATE TABLE IF NOT EXISTS buyback_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  -- Offer details
  offer_amount DECIMAL(10, 2) NOT NULL,
  offer_message TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'paid')),

  -- Response window (default 24 hours, options: 24, 48, 72, or 96 hours)
  expires_at TIMESTAMP NOT NULL,
  response_deadline_hours INTEGER DEFAULT 24 CHECK (response_deadline_hours IN (24, 48, 72, 96)),

  -- Customer response
  customer_response TEXT,
  responded_at TIMESTAMP,

  -- Payment details
  payment_method VARCHAR(50) CHECK (payment_method IN ('stripe', 'venmo', 'paypal', 'bank_transfer')),
  stripe_payment_intent_id VARCHAR(255),
  paid_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Admin who created the offer
  created_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_buyback_offers_customer ON buyback_offers(customer_id);
CREATE INDEX idx_buyback_offers_card ON buyback_offers(card_id);
CREATE INDEX idx_buyback_offers_status ON buyback_offers(status);
CREATE INDEX idx_buyback_offers_company ON buyback_offers(company_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_buyback_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER buyback_offers_updated_at
  BEFORE UPDATE ON buyback_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_buyback_offers_updated_at();
