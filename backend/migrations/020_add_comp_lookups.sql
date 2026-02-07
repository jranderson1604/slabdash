-- Add comp_lookups column to store detailed price comp data
-- This complements the existing price_estimate and last_comp_check columns

ALTER TABLE cards ADD COLUMN IF NOT EXISTS comp_lookups JSONB DEFAULT '[]'::jsonb;

-- Index for querying comp lookup history
CREATE INDEX IF NOT EXISTS idx_cards_comp_lookups ON cards USING GIN (comp_lookups);

-- Add comment for documentation
COMMENT ON COLUMN cards.comp_lookups IS 'Array of price comp lookup results with timestamp, sources (eBay, TCGPlayer, etc.), and pricing statistics';
COMMENT ON COLUMN cards.price_estimate IS 'Current estimated market value based on most recent comp lookup';
COMMENT ON COLUMN cards.last_comp_check IS 'Timestamp of most recent price comp lookup';
