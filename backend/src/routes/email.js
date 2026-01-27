const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');

/**
 * Get all email templates for the company
 * Creates default templates if they don't exist
 */
router.get('/templates', authenticate, async (req, res) => {
    try {
        const templates = await emailService.getOrCreateTemplates(req.companyId);
        res.json(templates);
    } catch (error) {
        console.error('Failed to get email templates:', error);
        res.status(500).json({ error: 'Failed to get email templates' });
    }
});

/**
 * Get a single email template
 */
router.get('/templates/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM email_templates WHERE id = $1 AND company_id = $2',
            [req.params.id, req.companyId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to get email template:', error);
        res.status(500).json({ error: 'Failed to get email template' });
    }
});

/**
 * Update an email template
 */
router.patch('/templates/:id', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { subject, body, enabled } = req.body;

        const result = await db.query(
            `UPDATE email_templates
             SET subject = COALESCE($1, subject),
                 body = COALESCE($2, body),
                 enabled = COALESCE($3, enabled),
                 updated_at = NOW()
             WHERE id = $4 AND company_id = $5
             RETURNING *`,
            [subject, body, enabled, req.params.id, req.companyId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to update email template:', error);
        res.status(500).json({ error: 'Failed to update email template' });
    }
});

/**
 * Get Mailgun settings
 */
router.get('/settings', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT mailgun_domain, mailgun_from_email, mailgun_from_name,
                    mailgun_api_key IS NOT NULL as has_mailgun_key
             FROM companies WHERE id = $1`,
            [req.companyId]
        );

        res.json(result.rows[0] || {});
    } catch (error) {
        console.error('Failed to get email settings:', error);
        res.status(500).json({ error: 'Failed to get email settings' });
    }
});

/**
 * Update Mailgun settings
 */
router.patch('/settings', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { mailgun_api_key, mailgun_domain, mailgun_from_email, mailgun_from_name } = req.body;

        // If API key and domain provided, test the connection
        if (mailgun_api_key && mailgun_domain) {
            const testResult = await emailService.testMailgunConnection(mailgun_api_key, mailgun_domain);
            if (!testResult.success) {
                return res.status(400).json({ error: `Invalid Mailgun configuration: ${testResult.error}` });
            }
        }

        const result = await db.query(
            `UPDATE companies
             SET mailgun_api_key = COALESCE($1, mailgun_api_key),
                 mailgun_domain = COALESCE($2, mailgun_domain),
                 mailgun_from_email = COALESCE($3, mailgun_from_email),
                 mailgun_from_name = COALESCE($4, mailgun_from_name)
             WHERE id = $5
             RETURNING mailgun_domain, mailgun_from_email, mailgun_from_name,
                       mailgun_api_key IS NOT NULL as has_mailgun_key`,
            [mailgun_api_key, mailgun_domain, mailgun_from_email, mailgun_from_name, req.companyId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to update email settings:', error);
        res.status(500).json({ error: 'Failed to update email settings' });
    }
});

/**
 * Test Mailgun connection
 */
router.post('/test-connection', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const result = await db.query(
            'SELECT mailgun_api_key, mailgun_domain FROM companies WHERE id = $1',
            [req.companyId]
        );

        if (!result.rows[0]?.mailgun_api_key || !result.rows[0]?.mailgun_domain) {
            return res.status(400).json({ error: 'Mailgun not configured' });
        }

        const testResult = await emailService.testMailgunConnection(
            result.rows[0].mailgun_api_key,
            result.rows[0].mailgun_domain
        );

        if (testResult.success) {
            res.json({ success: true, message: 'Mailgun connection successful!' });
        } else {
            res.status(400).json({ error: testResult.error });
        }
    } catch (error) {
        console.error('Failed to test Mailgun connection:', error);
        res.status(500).json({ error: 'Failed to test connection' });
    }
});

/**
 * Send a test email
 */
router.post('/send-test', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { template_id, to_email } = req.body;

        if (!template_id || !to_email) {
            return res.status(400).json({ error: 'Template ID and email address required' });
        }

        const variables = {
            customer_name: 'Test Customer',
            customer_email: to_email,
            submission_number: 'TEST-12345',
            company_name: 'Your Shop Name'
        };

        const result = await emailService.sendEmail(req.companyId, template_id, to_email, variables);

        if (result.success) {
            res.json({ success: true, message: 'Test email sent!' });
        } else {
            res.status(400).json({ error: result.error || result.reason || 'Failed to send email' });
        }
    } catch (error) {
        console.error('Failed to send test email:', error);
        res.status(500).json({ error: error.message || 'Failed to send test email' });
    }
});

/**
 * Get email logs
 */
router.get('/logs', authenticate, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const result = await db.query(
            `SELECT el.*, c.name as customer_name, c.email as customer_email,
                    s.psa_submission_number, et.step_name
             FROM email_logs el
             LEFT JOIN customers c ON el.customer_id = c.id
             LEFT JOIN submissions s ON el.submission_id = s.id
             LEFT JOIN email_templates et ON el.template_id = et.id
             WHERE el.company_id = $1
             ORDER BY el.created_at DESC
             LIMIT $2 OFFSET $3`,
            [req.companyId, limit, offset]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Failed to get email logs:', error);
        res.status(500).json({ error: 'Failed to get email logs' });
    }
});

/**
 * Get PSA steps with template info
 */
router.get('/psa-steps', authenticate, async (req, res) => {
    try {
        res.json(emailService.PSA_STEPS);
    } catch (error) {
        console.error('Failed to get PSA steps:', error);
        res.status(500).json({ error: 'Failed to get PSA steps' });
    }
});

module.exports = router;
