const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { testEmailConfig, renderTemplate } = require('../services/emailService');

// List all email templates for company
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM email_templates
             WHERE company_id = $1
             ORDER BY step_name`,
            [req.user.company_id]
        );

        res.json({ templates: result.rows });
    } catch (error) {
        console.error('List templates error:', error);
        res.status(500).json({ error: 'Failed to list templates' });
    }
});

// Get single template
router.get('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM email_templates
             WHERE id = $1 AND company_id = $2`,
            [req.params.id, req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({ error: 'Failed to get template' });
    }
});

// Create or update template
router.post('/', authenticate, async (req, res) => {
    try {
        const { step_name, subject, body_html, body_text, enabled } = req.body;

        if (!step_name || !subject || !body_html) {
            return res.status(400).json({ error: 'Step name, subject, and body are required' });
        }

        const result = await db.query(
            `INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (company_id, step_name)
             DO UPDATE SET
                 subject = EXCLUDED.subject,
                 body_html = EXCLUDED.body_html,
                 body_text = EXCLUDED.body_text,
                 enabled = EXCLUDED.enabled,
                 updated_at = NOW()
             RETURNING *`,
            [req.user.company_id, step_name, subject, body_html, body_text, enabled !== false]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Save template error:', error);
        res.status(500).json({ error: 'Failed to save template' });
    }
});

// Update template
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { subject, body_html, body_text, enabled } = req.body;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (subject !== undefined) {
            updates.push(`subject = $${paramIndex++}`);
            values.push(subject);
        }
        if (body_html !== undefined) {
            updates.push(`body_html = $${paramIndex++}`);
            values.push(body_html);
        }
        if (body_text !== undefined) {
            updates.push(`body_text = $${paramIndex++}`);
            values.push(body_text);
        }
        if (enabled !== undefined) {
            updates.push(`enabled = $${paramIndex++}`);
            values.push(enabled);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(req.params.id, req.user.company_id);

        const result = await db.query(
            `UPDATE email_templates SET ${updates.join(', ')}
             WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// Delete template
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `DELETE FROM email_templates
             WHERE id = $1 AND company_id = $2
             RETURNING *`,
            [req.params.id, req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// Preview template with sample data
router.post('/:id/preview', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM email_templates
             WHERE id = $1 AND company_id = $2`,
            [req.params.id, req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = result.rows[0];
        const sampleVariables = {
            customer_name: 'John Doe',
            submission_number: '12345678',
            step_name: template.step_name,
            progress_percent: '75',
            service_level: 'Regular',
            company_name: 'Your Company Name',
            company_logo_url: ''
        };

        const subject = renderTemplate(template.subject, sampleVariables);
        const bodyHtml = renderTemplate(template.body_html, sampleVariables);
        const bodyText = template.body_text
            ? renderTemplate(template.body_text, sampleVariables)
            : null;

        res.json({ subject, body_html: bodyHtml, body_text: bodyText });
    } catch (error) {
        console.error('Preview template error:', error);
        res.status(500).json({ error: 'Failed to preview template' });
    }
});

// Test email configuration
router.post('/test-config', authenticate, async (req, res) => {
    try {
        const { test_email } = req.body;

        if (!test_email) {
            return res.status(400).json({ error: 'Test email address required' });
        }

        const result = await testEmailConfig(req.user.company_id, test_email);

        if (result.success) {
            res.json({ message: result.message });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Test email config error:', error);
        res.status(500).json({ error: 'Failed to test email configuration' });
    }
});

// Get email logs
router.get('/logs', authenticate, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const result = await db.query(
            `SELECT el.*, c.name as customer_name, s.psa_submission_number
             FROM email_logs el
             LEFT JOIN customers c ON el.customer_id = c.id
             LEFT JOIN submissions s ON el.submission_id = s.id
             WHERE el.company_id = $1
             ORDER BY el.sent_at DESC
             LIMIT $2 OFFSET $3`,
            [req.user.company_id, limit, offset]
        );

        const countResult = await db.query(
            `SELECT COUNT(*) FROM email_logs WHERE company_id = $1`,
            [req.user.company_id]
        );

        res.json({
            logs: result.rows,
            total: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get email logs error:', error);
        res.status(500).json({ error: 'Failed to get email logs' });
    }
});

module.exports = router;
