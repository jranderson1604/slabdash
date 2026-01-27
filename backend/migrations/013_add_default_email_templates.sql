-- Add default email templates for all PSA steps
-- These templates are enabled by default and ready to use

-- Template for "Order Prep"
INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
SELECT
    id,
    'Order Prep',
    'Your submission is being prepared - {{submission_number}}',
    '<html><body><h2>Your Submission is Being Prepared</h2><p>Hi {{customer_name}},</p><p>Your submission <strong>{{submission_number}}</strong> is currently being prepared for grading.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>Your cards are in good hands!</p><p>Best regards,<br>{{company_name}}</p></body></html>',
    'Hi {{customer_name}}, Your submission {{submission_number}} is being prepared. Status: {{step_name}}, Progress: {{progress_percent}}%',
    true
FROM companies
ON CONFLICT (company_id, step_name) DO NOTHING;

-- Template for "Research & ID"
INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
SELECT
    id,
    'Research & ID',
    'Your cards are being researched - {{submission_number}}',
    '<html><body><h2>Research & Identification In Progress</h2><p>Hi {{customer_name}},</p><p>PSA is currently researching and identifying your cards from submission <strong>{{submission_number}}</strong>.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>This step ensures accurate authentication and grading.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
    'Hi {{customer_name}}, Your submission {{submission_number}} is being researched. Status: {{step_name}}, Progress: {{progress_percent}}%',
    true
FROM companies
ON CONFLICT (company_id, step_name) DO NOTHING;

-- Template for "Grading"
INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
SELECT
    id,
    'Grading',
    '🎯 Your cards are being graded! - {{submission_number}}',
    '<html><body><h2>🎯 Grading In Progress!</h2><p>Hi {{customer_name}},</p><p>Exciting news! Your cards from submission <strong>{{submission_number}}</strong> are now being graded by PSA experts.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>This is where the magic happens! Your grades will be available soon.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
    'Hi {{customer_name}}, Your submission {{submission_number}} is being graded! Status: {{step_name}}, Progress: {{progress_percent}}%',
    true
FROM companies
ON CONFLICT (company_id, step_name) DO NOTHING;

-- Template for "Assembly"
INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
SELECT
    id,
    'Assembly',
    'Your cards are being assembled - {{submission_number}}',
    '<html><body><h2>Assembly In Progress</h2><p>Hi {{customer_name}},</p><p>Your graded cards from submission <strong>{{submission_number}}</strong> are now being assembled in their protective cases.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>Almost done! Your cards will be ready soon.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
    'Hi {{customer_name}}, Your submission {{submission_number}} is being assembled. Status: {{step_name}}, Progress: {{progress_percent}}%',
    true
FROM companies
ON CONFLICT (company_id, step_name) DO NOTHING;

-- Template for "QA Check 1"
INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
SELECT
    id,
    'QA Check 1',
    'Quality assurance check in progress - {{submission_number}}',
    '<html><body><h2>Quality Assurance Check</h2><p>Hi {{customer_name}},</p><p>Your submission <strong>{{submission_number}}</strong> is undergoing quality assurance checks to ensure everything is perfect.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>We''re making sure everything meets PSA''s high standards!</p><p>Best regards,<br>{{company_name}}</p></body></html>',
    'Hi {{customer_name}}, Your submission {{submission_number}} is in QA. Status: {{step_name}}, Progress: {{progress_percent}}%',
    true
FROM companies
ON CONFLICT (company_id, step_name) DO NOTHING;

-- Template for "QA Check 2"
INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
SELECT
    id,
    'QA Check 2',
    'Final quality check - {{submission_number}}',
    '<html><body><h2>Final Quality Check</h2><p>Hi {{customer_name}},</p><p>Your submission <strong>{{submission_number}}</strong> is in the final quality assurance check.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>Just one more check and your cards will be ready to ship!</p><p>Best regards,<br>{{company_name}}</p></body></html>',
    'Hi {{customer_name}}, Your submission {{submission_number}} is in final QA. Status: {{step_name}}, Progress: {{progress_percent}}%',
    true
FROM companies
ON CONFLICT (company_id, step_name) DO NOTHING;

-- Template for "Shipped"
INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
SELECT
    id,
    'Shipped',
    '📦 Your cards have shipped! - {{submission_number}}',
    '<html><body><h2>📦 Your Cards Have Shipped!</h2><p>Hi {{customer_name}},</p><p>Great news! Your graded cards from submission <strong>{{submission_number}}</strong> have been shipped and are on their way back to us!</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>We''ll let you know as soon as they arrive and are ready for pickup!</p><p>Best regards,<br>{{company_name}}</p></body></html>',
    'Hi {{customer_name}}, Your submission {{submission_number}} has shipped! Status: {{step_name}}, Progress: {{progress_percent}}%',
    true
FROM companies
ON CONFLICT (company_id, step_name) DO NOTHING;

-- Update the original "Arrived" template to be enabled by default
UPDATE email_templates
SET enabled = true
WHERE step_name = 'Arrived' AND enabled = false;

COMMENT ON TABLE email_templates IS 'Email templates for PSA step notifications - default templates created for all steps';
