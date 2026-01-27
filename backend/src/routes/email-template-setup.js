const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// Create default email templates for a company
router.post('/create-default-templates', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const templates = [
            {
                step_name: 'Order Prep',
                subject: 'Your submission is being prepared - {{submission_number}}',
                body_html: '<html><body><h2>Your Submission is Being Prepared</h2><p>Hi {{customer_name}},</p><p>Your submission <strong>{{submission_number}}</strong> is currently being prepared for grading.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>Your cards are in good hands!</p><p>Best regards,<br>{{company_name}}</p></body></html>',
                body_text: 'Hi {{customer_name}}, Your submission {{submission_number}} is being prepared. Status: {{step_name}}, Progress: {{progress_percent}}%'
            },
            {
                step_name: 'Research & ID',
                subject: 'Your cards are being researched - {{submission_number}}',
                body_html: '<html><body><h2>Research & Identification In Progress</h2><p>Hi {{customer_name}},</p><p>PSA is currently researching and identifying your cards from submission <strong>{{submission_number}}</strong>.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>This step ensures accurate authentication and grading.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
                body_text: 'Hi {{customer_name}}, Your submission {{submission_number}} is being researched. Status: {{step_name}}, Progress: {{progress_percent}}%'
            },
            {
                step_name: 'Grading',
                subject: '🎯 Your cards are being graded! - {{submission_number}}',
                body_html: '<html><body><h2>🎯 Grading In Progress!</h2><p>Hi {{customer_name}},</p><p>Exciting news! Your cards from submission <strong>{{submission_number}}</strong> are now being graded by PSA experts.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>This is where the magic happens! Your grades will be available soon.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
                body_text: 'Hi {{customer_name}}, Your submission {{submission_number}} is being graded! Status: {{step_name}}, Progress: {{progress_percent}}%'
            },
            {
                step_name: 'Assembly',
                subject: 'Your cards are being assembled - {{submission_number}}',
                body_html: '<html><body><h2>Assembly In Progress</h2><p>Hi {{customer_name}},</p><p>Your graded cards from submission <strong>{{submission_number}}</strong> are now being assembled in their protective cases.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>Almost done! Your cards will be ready soon.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
                body_text: 'Hi {{customer_name}}, Your submission {{submission_number}} is being assembled. Status: {{step_name}}, Progress: {{progress_percent}}%'
            },
            {
                step_name: 'QA Check 1',
                subject: 'Quality assurance check in progress - {{submission_number}}',
                body_html: '<html><body><h2>Quality Assurance Check</h2><p>Hi {{customer_name}},</p><p>Your submission <strong>{{submission_number}}</strong> is undergoing quality assurance checks to ensure everything is perfect.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>We\'re making sure everything meets PSA\'s high standards!</p><p>Best regards,<br>{{company_name}}</p></body></html>',
                body_text: 'Hi {{customer_name}}, Your submission {{submission_number}} is in QA. Status: {{step_name}}, Progress: {{progress_percent}}%'
            },
            {
                step_name: 'QA Check 2',
                subject: 'Final quality check - {{submission_number}}',
                body_html: '<html><body><h2>Final Quality Check</h2><p>Hi {{customer_name}},</p><p>Your submission <strong>{{submission_number}}</strong> is in the final quality assurance check.</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>Just one more check and your cards will be ready to ship!</p><p>Best regards,<br>{{company_name}}</p></body></html>',
                body_text: 'Hi {{customer_name}}, Your submission {{submission_number}} is in final QA. Status: {{step_name}}, Progress: {{progress_percent}}%'
            },
            {
                step_name: 'Shipped',
                subject: '📦 Your cards have shipped! - {{submission_number}}',
                body_html: '<html><body><h2>📦 Your Cards Have Shipped!</h2><p>Hi {{customer_name}},</p><p>Great news! Your graded cards from submission <strong>{{submission_number}}</strong> have been shipped and are on their way back to us!</p><p><strong>Current Status:</strong> {{step_name}}<br><strong>Progress:</strong> {{progress_percent}}%</p><p>We\'ll let you know as soon as they arrive and are ready for pickup!</p><p>Best regards,<br>{{company_name}}</p></body></html>',
                body_text: 'Hi {{customer_name}}, Your submission {{submission_number}} has shipped! Status: {{step_name}}, Progress: {{progress_percent}}%'
            }
        ];

        let created = 0;
        let skipped = 0;

        for (const template of templates) {
            try {
                await db.query(
                    `INSERT INTO email_templates (company_id, step_name, subject, body_html, body_text, enabled)
                     VALUES ($1, $2, $3, $4, $5, true)
                     ON CONFLICT (company_id, step_name) DO NOTHING`,
                    [companyId, template.step_name, template.subject, template.body_html, template.body_text]
                );
                created++;
            } catch (err) {
                console.error(`Failed to create template for ${template.step_name}:`, err.message);
                skipped++;
            }
        }

        // Also enable the Arrived template if it exists
        await db.query(
            `UPDATE email_templates SET enabled = true WHERE company_id = $1 AND step_name = 'Arrived'`,
            [companyId]
        );

        res.json({
            success: true,
            message: `Created ${created} templates, skipped ${skipped}`,
            templates_created: created
        });
    } catch (error) {
        console.error('Create default templates error:', error);
        res.status(500).json({
            error: 'Failed to create default templates',
            details: error.message
        });
    }
});

module.exports = router;
