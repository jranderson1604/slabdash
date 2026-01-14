-- ============================================
-- SLABDASH - DATABASE SCHEMA
-- PostgreSQL Database
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies (Multi-tenant)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    psa_api_key TEXT,
    primary_color VARCHAR(7) DEFAULT '#ef4444',
    secondary_color VARCHAR(7) DEFAULT '#1c1c21',
    auto_refresh_enabled BOOLEAN DEFAULT TRUE,
    auto_refresh_interval_hours INTEGER DEFAULT 6,
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    plan VARCHAR(50) DEFAULT 'free',
    plan_expires_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (Admin users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, email)
);

-- Customers (End customers who submit cards)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255),
    portal_access_enabled BOOLEAN DEFAULT TRUE,
    portal_access_token VARCHAR(255),
    portal_token_expires TIMESTAMP WITH TIME ZONE,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    total_submissions INTEGER DEFAULT 0,
    total_cards INTEGER DEFAULT 0,
    notes TEXT,
    tags VARCHAR(255)[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, email)
);

-- Submissions (PSA Orders)
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    internal_id VARCHAR(50),
    psa_submission_number VARCHAR(50),
    psa_order_number VARCHAR(50),
    service_level VARCHAR(100),
    declared_value DECIMAL(10, 2),
    date_sent DATE,
    date_received DATE,
    date_graded DATE,
    date_shipped DATE,
    estimated_return_date DATE,
    current_step VARCHAR(100),
    progress_percent INTEGER DEFAULT 0,
    grades_ready BOOLEAN DEFAULT FALSE,
    shipped BOOLEAN DEFAULT FALSE,
    problem_order BOOLEAN DEFAULT FALSE,
    accounting_hold BOOLEAN DEFAULT FALSE,
    ready_for_label_review BOOLEAN DEFAULT FALSE,
    psa_api_response JSONB,
    last_api_update TIMESTAMP WITH TIME ZONE,
    total_grading_cost DECIMAL(10, 2),
    shipping_cost DECIMAL(10, 2),
    customer_paid DECIMAL(10, 2),
    profit DECIMAL(10, 2),
    outbound_tracking VARCHAR(100),
    return_tracking VARCHAR(100),
    carrier VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards (Individual cards)
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    year VARCHAR(10),
    brand VARCHAR(100),
    set_name VARCHAR(255),
    card_number VARCHAR(50),
    player_name VARCHAR(255),
    team VARCHAR(100),
    variation VARCHAR(255),
    serial_numbered BOOLEAN DEFAULT FALSE,
    serial_number VARCHAR(50),
    psa_cert_number VARCHAR(50),
    grade VARCHAR(10),
    qualifier VARCHAR(50),
    declared_value DECIMAL(10, 2),
    grading_fee DECIMAL(10, 2),
    customer_paid DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending',
    psa_cert_data JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submission Steps (Progress tracking)
CREATE TABLE submission_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Logs
CREATE TABLE api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_params JSONB,
    response_status INTEGER,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_submissions_company ON submissions(company_id);
CREATE INDEX idx_submissions_customer ON submissions(customer_id);
CREATE INDEX idx_submissions_psa_number ON submissions(psa_submission_number);
CREATE INDEX idx_cards_submission ON cards(submission_id);
CREATE INDEX idx_cards_cert ON cards(psa_cert_number);
CREATE INDEX idx_api_logs_company ON api_logs(company_id);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers SET
        total_submissions = (SELECT COUNT(*) FROM submissions WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)),
        total_cards = (SELECT COUNT(*) FROM cards WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id))
    WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_on_submission AFTER INSERT OR UPDATE OR DELETE ON submissions FOR EACH ROW EXECUTE FUNCTION update_customer_stats();
CREATE TRIGGER update_customer_stats_on_card AFTER INSERT OR UPDATE OR DELETE ON cards FOR EACH ROW EXECUTE FUNCTION update_customer_stats();
