-- Add card images support
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS card_images TEXT[] DEFAULT '{}';

-- Add notified flag for buyback interest
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS buyback_interest_notified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS buyback_notified_at TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cards_buyback_notified ON cards(buyback_interest_notified);
CREATE INDEX IF NOT EXISTS idx_cards_psa_cert ON cards(psa_cert_number) WHERE psa_cert_number IS NOT NULL;

COMMENT ON COLUMN cards.card_images IS 'Array of image URLs (Cloudinary or direct uploads)';
COMMENT ON COLUMN cards.buyback_interest_notified IS 'Whether customer was notified of buyback interest';
