-- Add invoicing and delivery fields to submissions and customers

-- Add invoice fields to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS base_cost DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS upcharge_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS invoice_sent BOOLEAN DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMP;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

-- Add delivery preference tracking
ALTER TABLE submission_customers ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'pickup'; -- 'pickup' or 'shipping'
ALTER TABLE submission_customers ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE submission_customers ADD COLUMN IF NOT EXISTS customer_cost DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE submission_customers ADD COLUMN IF NOT EXISTS customer_upcharge DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE submission_customers ADD COLUMN IF NOT EXISTS invoice_sent BOOLEAN DEFAULT false;

-- Add cost tracking to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS grading_fee DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS upcharge DECIMAL(10,2) DEFAULT 0.00;

COMMENT ON COLUMN submissions.base_cost IS 'Base cost for the entire submission (grading fees)';
COMMENT ON COLUMN submissions.upcharge_amount IS 'Total upcharges (rush service, insurance, etc)';
COMMENT ON COLUMN submissions.total_cost IS 'Total cost (base + upcharges)';
COMMENT ON COLUMN submissions.invoice_number IS 'Unique invoice number (e.g., INV-2024-001)';
COMMENT ON COLUMN submission_customers.delivery_method IS 'How customer wants cards delivered: pickup or shipping';
COMMENT ON COLUMN submission_customers.customer_cost IS 'This customers portion of the costs';
COMMENT ON COLUMN cards.grading_fee IS 'PSA grading fee for this specific card';
COMMENT ON COLUMN cards.upcharge IS 'Any upcharges for this card (express service, etc)';
