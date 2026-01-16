-- ============================================
-- MIGRATION 002: Documents & Buyback System
-- ============================================

-- Documents table (invoices, receipts, packing slips, etc.)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- File info
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Metadata
    document_type VARCHAR(50), -- 'invoice', 'receipt', 'packing_slip', 'other'
    description TEXT,
    upload_source VARCHAR(50) DEFAULT 'web', -- 'web', 'mobile', 'api'
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Public access for customer portal
    is_public BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buyback offers (shop owners buying cards from customers)
CREATE TABLE buyback_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Offer details
    offer_price DECIMAL(10, 2) NOT NULL,
    message TEXT,

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'paid', 'cancelled'

    -- Response from customer
    customer_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,

    -- Payment tracking
    payment_method VARCHAR(50), -- 'stripe', 'paypal', 'cash', 'check', 'other'
    payment_status VARCHAR(50), -- 'pending', 'processing', 'completed', 'failed'
    payment_id VARCHAR(255), -- External payment provider ID
    paid_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    offered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_submission ON documents(submission_id);
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_type ON documents(document_type);

CREATE INDEX idx_buyback_company ON buyback_offers(company_id);
CREATE INDEX idx_buyback_card ON buyback_offers(card_id);
CREATE INDEX idx_buyback_customer ON buyback_offers(customer_id);
CREATE INDEX idx_buyback_status ON buyback_offers(status);
CREATE INDEX idx_buyback_payment_status ON buyback_offers(payment_status);

-- Auto-update timestamps
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_buyback_offers_updated_at
    BEFORE UPDATE ON buyback_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add stats to customers for buyback offers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_buyback_offers INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_buyback_accepted INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_buyback_earnings DECIMAL(10, 2) DEFAULT 0;

-- Update customer buyback stats
CREATE OR REPLACE FUNCTION update_customer_buyback_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers SET
        total_buyback_offers = (
            SELECT COUNT(*)
            FROM buyback_offers
            WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
        ),
        total_buyback_accepted = (
            SELECT COUNT(*)
            FROM buyback_offers
            WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
            AND status IN ('accepted', 'paid')
        ),
        total_buyback_earnings = (
            SELECT COALESCE(SUM(offer_price), 0)
            FROM buyback_offers
            WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
            AND status = 'paid'
        )
    WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_buyback_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON buyback_offers
    FOR EACH ROW EXECUTE FUNCTION update_customer_buyback_stats();
