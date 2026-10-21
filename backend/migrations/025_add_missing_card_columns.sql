-- Migration: Add missing columns to cards table
-- These columns are defined in schema.sql but were never migrated to production
-- Fixes: "column card_number of relation cards does not exist" error during cert lookup

ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_number VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS set_name VARCHAR(255);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS serial_numbered BOOLEAN DEFAULT FALSE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS serial_number VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS qualifier VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS declared_value DECIMAL(10, 2);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS customer_paid DECIMAL(10, 2);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS sport VARCHAR(100);

-- Verify the critical column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cards' AND column_name='card_number') THEN
        RAISE EXCEPTION 'Failed to add card_number to cards';
    END IF;
    RAISE NOTICE 'All missing card columns added successfully';
END $$;
