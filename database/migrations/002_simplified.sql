-- Run this in Railway PostgreSQL Query tab

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    mime_type VARCHAR(100),
    document_type VARCHAR(50),
    description TEXT,
    upload_source VARCHAR(50) DEFAULT 'web',
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buyback offers table
CREATE TABLE IF NOT EXISTS buyback_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    offer_price DECIMAL(10, 2) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    customer_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    payment_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    offered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_submission ON documents(submission_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_buyback_company ON buyback_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_buyback_card ON buyback_offers(card_id);
CREATE INDEX IF NOT EXISTS idx_buyback_customer ON buyback_offers(customer_id);
CREATE INDEX IF NOT EXISTS idx_buyback_status ON buyback_offers(status);

-- Add customer buyback stats columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_buyback_offers INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_buyback_accepted INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_buyback_earnings DECIMAL(10, 2) DEFAULT 0;

-- Triggers (only if update_updated_at function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
        DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
        CREATE TRIGGER update_documents_updated_at
            BEFORE UPDATE ON documents
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();

        DROP TRIGGER IF EXISTS update_buyback_offers_updated_at ON buyback_offers;
        CREATE TRIGGER update_buyback_offers_updated_at
            BEFORE UPDATE ON buyback_offers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- Success message
SELECT 'Migration 002 completed successfully!' as status;
