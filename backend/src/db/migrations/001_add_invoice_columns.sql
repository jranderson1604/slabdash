-- Migration: Add invoice and customer delivery columns
-- Run this on your production database

-- Add invoice cost tracking to submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS psa_service_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS additional_fees DECIMAL(10,2);

-- Add delivery method and shipping address to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'pickup',
ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_invoice ON submissions(invoice_sent, invoice_number);
