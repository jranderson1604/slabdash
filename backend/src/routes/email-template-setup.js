const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { renderTemplate } = require('../services/emailService');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

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

// Send bulk status update to all customers
router.post('/send-bulk-status-update', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const companyId = req.user.company_id;

        // Get company configuration
        const companyResult = await db.query(
            `SELECT from_email, from_name, email_notifications_enabled, use_custom_smtp,
                    smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, company_logo_url
             FROM companies WHERE id = $1`,
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const config = companyResult.rows[0];

        if (!config.email_notifications_enabled) {
            return res.status(400).json({ error: 'Email notifications are not enabled' });
        }

        // Get all customers with active submissions
        const customersResult = await db.query(
            `SELECT DISTINCT c.id, c.name, c.email
             FROM customers c
             INNER JOIN submission_customers sc ON c.id = sc.customer_id
             INNER JOIN submissions s ON sc.submission_id = s.id
             WHERE s.company_id = $1 AND c.email IS NOT NULL
             ORDER BY c.name`,
            [companyId]
        );

        const customers = customersResult.rows;

        if (customers.length === 0) {
            return res.json({
                success: true,
                message: 'No customers with email addresses found',
                emails_sent: 0
            });
        }

        // Get default email config if needed
        const getDefaultEmailConfig = () => {
            return {
                mailgun_api_key: process.env.DEFAULT_MAILGUN_API_KEY || process.env.DEFAULT_SMTP_PASSWORD || '',
                mailgun_domain: process.env.DEFAULT_MAILGUN_DOMAIN || 'slabdash.app',
                from_email: process.env.DEFAULT_FROM_EMAIL || 'slabdashllc@slabdash.app',
                from_name: process.env.DEFAULT_FROM_NAME || 'SlabDash'
            };
        };

        let emailsSent = 0;
        let emailsFailed = 0;
        const errors = [];

        // Send email to each customer
        for (const customer of customers) {
            try {
                // Get all submissions for this customer
                const submissionsResult = await db.query(
                    `SELECT s.id, s.psa_submission_number, s.internal_id, s.service_level,
                            s.psa_status, s.progress_percent, s.created_at
                     FROM submissions s
                     INNER JOIN submission_customers sc ON s.id = sc.submission_id
                     WHERE sc.customer_id = $1 AND s.company_id = $2
                     ORDER BY s.created_at DESC`,
                    [customer.id, companyId]
                );

                const submissions = submissionsResult.rows;

                if (submissions.length === 0) continue;

                // Build HTML list of submissions
                let submissionsHtml = '<ul style="list-style: none; padding: 0;">';
                let submissionsText = '';

                for (const sub of submissions) {
                    const subNumber = sub.psa_submission_number || sub.internal_id || 'N/A';
                    const status = sub.psa_status || 'Pending';
                    const progress = sub.progress_percent || 0;

                    submissionsHtml += `
                        <li style="margin-bottom: 15px; padding: 10px; background: #f9fafb; border-left: 3px solid rgb(255, 107, 86); border-radius: 4px;">
                            <strong>Submission:</strong> ${subNumber}<br>
                            <strong>Current Step:</strong> ${status}<br>
                            <strong>Progress:</strong> ${progress}%<br>
                            ${sub.service_level ? `<strong>Service Level:</strong> ${sub.service_level}` : ''}
                        </li>
                    `;

                    submissionsText += `\nSubmission: ${subNumber}\nCurrent Step: ${status}\nProgress: ${progress}%\n${sub.service_level ? `Service Level: ${sub.service_level}\n` : ''}\n`;
                }

                submissionsHtml += '</ul>';

                // Build email content
                const subject = `Update on Your PSA Submissions`;

                const bodyHtml = `
                    <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        ${config.company_logo_url ? `<img src="${config.company_logo_url}" alt="Company Logo" style="max-width: 200px; margin-bottom: 20px;">` : ''}
                        <h2 style="color: rgb(255, 107, 86);">Your Submission Status Update</h2>
                        <p>Hi ${customer.name},</p>
                        <p>Here's the current status of your PSA submissions:</p>
                        ${submissionsHtml}
                        <p style="margin-top: 20px;">We'll continue to keep you updated as your cards progress through the grading process!</p>
                        <p style="margin-top: 20px;">Best regards,<br><strong>${config.from_name || 'SlabDash'}</strong></p>
                    </body>
                    </html>
                `;

                const bodyText = `Hi ${customer.name},\n\nHere's the current status of your PSA submissions:\n${submissionsText}\nWe'll continue to keep you updated as your cards progress through the grading process!\n\nBest regards,\n${config.from_name || 'SlabDash'}`;

                // Send email using appropriate method
                if (!config.use_custom_smtp) {
                    // Use Mailgun HTTP API
                    const defaultConfig = getDefaultEmailConfig();
                    const fromAddress = `${config.from_name || defaultConfig.from_name} <${defaultConfig.from_email}>`;

                    const mg = mailgun.client({
                        username: 'api',
                        key: defaultConfig.mailgun_api_key
                    });

                    await mg.messages.create(defaultConfig.mailgun_domain, {
                        from: fromAddress,
                        to: [customer.email],
                        bcc: ['notifications@slabdash.app'],
                        subject: subject,
                        text: bodyText,
                        html: bodyHtml
                    });
                } else {
                    // Use custom SMTP (nodemailer)
                    const nodemailer = require('nodemailer');
                    const fromAddress = `${config.from_name || 'SlabDash'} <${config.from_email}>`;

                    const transporter = nodemailer.createTransport({
                        host: config.smtp_host,
                        port: config.smtp_port || 587,
                        secure: config.smtp_secure || false,
                        connectionTimeout: 10000,
                        greetingTimeout: 10000,
                        socketTimeout: 10000,
                        auth: {
                            user: config.smtp_user,
                            pass: config.smtp_password
                        }
                    });

                    await transporter.sendMail({
                        from: fromAddress,
                        to: customer.email,
                        bcc: 'notifications@slabdash.app',
                        subject: subject,
                        html: bodyHtml,
                        text: bodyText
                    });
                }

                // Log successful send
                await db.query(
                    `INSERT INTO email_logs (company_id, customer_id, recipient_email, subject, step_name, status)
                     VALUES ($1, $2, $3, $4, 'bulk_status_update', 'sent')`,
                    [companyId, customer.id, customer.email, subject]
                );

                emailsSent++;
                console.log(`✓ Bulk status email sent to ${customer.email}`);

            } catch (error) {
                console.error(`✗ Failed to send bulk email to ${customer.email}:`, error.message);
                emailsFailed++;
                errors.push({ customer: customer.email, error: error.message });

                // Log failed send
                await db.query(
                    `INSERT INTO email_logs (company_id, customer_id, recipient_email, subject, step_name, status, error_message)
                     VALUES ($1, $2, $3, 'Bulk Status Update', 'bulk_status_update', 'failed', $4)`,
                    [companyId, customer.id, customer.email, error.message]
                );
            }
        }

        res.json({
            success: true,
            message: `Bulk status update complete: ${emailsSent} sent, ${emailsFailed} failed`,
            emails_sent: emailsSent,
            emails_failed: emailsFailed,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Bulk status update error:', error);
        res.status(500).json({
            error: 'Failed to send bulk status update',
            details: error.message
        });
    }
});

module.exports = router;
