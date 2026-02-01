-- Migration: Add invoice and customer delivery columns
-- Run this on your production database

-- Add invoice cost tracking to submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS psa_service_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS additional_fees DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(20);

-- Add delivery method and shipping address to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'pickup',
ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- Add invoice tracking to submission_customers junction table
ALTER TABLE submission_customers
ADD COLUMN IF NOT EXISTS invoice_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS picked_up BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP;

-- Add mailgun configuration to companies table (optional - falls back to env vars)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS mailgun_api_key TEXT,
ADD COLUMN IF NOT EXISTS mailgun_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS mailgun_from_email VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_invoice ON submissions(invoice_sent, invoice_number);
