-- Email templates for PSA step notifications

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- PSA step this template is for
  step_key VARCHAR(50) NOT NULL,
  step_name VARCHAR(100) NOT NULL,

  -- Template content
  subject VARCHAR(255) NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',

  -- Whether this template is active/enabled
  enabled BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One template per step per company
  UNIQUE(company_id, step_key)
);

-- Email send log for tracking sent notifications
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Email details
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  step_key VARCHAR(50),

  -- Mailgun response
  mailgun_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent',
  error_message TEXT,

  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add Mailgun settings to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS mailgun_api_key TEXT,
ADD COLUMN IF NOT EXISTS mailgun_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS mailgun_from_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS mailgun_from_name VARCHAR(255);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_company ON email_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_step ON email_templates(company_id, step_key);
CREATE INDEX IF NOT EXISTS idx_email_logs_company ON email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_submission ON email_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_customer ON email_logs(customer_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_email_templates_updated_at();

COMMENT ON TABLE email_templates IS 'Email templates for PSA step notifications';
COMMENT ON TABLE email_logs IS 'Log of sent email notifications';
COMMENT ON COLUMN email_templates.step_key IS 'PSA step key: Arrived, OrderPrep, ResearchAndID, Grading, Assembly, QACheck1, QACheck2, Shipped';
