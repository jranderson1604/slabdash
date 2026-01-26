-- Email Templates Table
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, step_name)
);

-- Email Settings for Companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_password VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS from_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS from_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Email Logs
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    step_name VARCHAR(100),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent', -- sent, failed, bounced
    error_message TEXT
);

CREATE INDEX idx_email_logs_company ON email_logs(company_id);
CREATE INDEX idx_email_logs_submission ON email_logs(submission_id);
CREATE INDEX idx_email_logs_customer ON email_logs(customer_id);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

-- Default email templates for common steps
INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
SELECT
    id,
    'Arrived',
    'Your cards have arrived at PSA - {{submission_number}}',
    '<html><body><h2>Great News! Your Cards Have Arrived at PSA</h2><p>Hello {{customer_name}},</p><p>We''re excited to let you know that your submission <strong>{{submission_number}}</strong> has arrived at PSA and is now being processed.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>We''ll keep you updated as your cards move through the grading process.</p><p>Thanks for your patience!</p></body></html>',
    'Hello {{customer_name}}, Your submission {{submission_number}} has arrived at PSA. Current Status: {{step_name}}, Progress: {{progress_percent}}%',
    false
FROM companies
ON CONFLICT DO NOTHING;

COMMENT ON TABLE email_templates IS 'Email templates for PSA step notifications';
COMMENT ON TABLE email_logs IS 'Log of all emails sent to customers';
