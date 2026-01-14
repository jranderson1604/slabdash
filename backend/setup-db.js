const {Pool} = require('pg');
const pool = new Pool({connectionString: 'postgresql://postgres:zwireHBuJZRQChcBEKUUhJKNaQotsmHu@centerbeam.proxy.rlwy.net:19657/railway'});

const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS companies (
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
`;

pool.query(sql).then(() => {
    console.log('Done!');
    process.exit(0);
}).catch(e => {
    console.error(e.message);
    process.exit(1);
});
