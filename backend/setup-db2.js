const {Pool} = require('pg');
const pool = new Pool({connectionString: 'postgresql://postgres:zwireHBuJZRQChcBEKUUhJKNaQotsmHu@centerbeam.proxy.rlwy.net:19657/railway'});

const sql = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'staff';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS internal_id VARCHAR(50);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS psa_submission_number VARCHAR(50);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS psa_order_number VARCHAR(50);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS service_level VARCHAR(100);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS current_step VARCHAR(100);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS grades_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS shipped BOOLEAN DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS problem_order BOOLEAN DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS accounting_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS psa_api_response JSONB;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS last_api_update TIMESTAMP WITH TIME ZONE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS date_sent DATE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS outbound_tracking VARCHAR(100);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS return_tracking VARCHAR(100);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE cards ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS submission_id UUID;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS psa_cert_number VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS grade VARCHAR(10);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS year VARCHAR(10);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS player_name VARCHAR(255);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS psa_cert_data JSONB;

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    portal_access_enabled BOOLEAN DEFAULT TRUE,
    portal_access_token VARCHAR(255),
    portal_token_expires TIMESTAMP WITH TIME ZONE,
    total_submissions INTEGER DEFAULT 0,
    total_cards INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submission_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

pool.query(sql).then(() => {
    console.log('Done!');
    process.exit(0);
}).catch(e => {
    console.error(e.message);
    process.exit(1);
});
