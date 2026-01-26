const nodemailer = require('nodemailer');
const db = require('../db');

/**
 * Render email template with variables
 */
const renderTemplate = (template, variables) => {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, value || '');
    }
    return rendered;
};

/**
 * Get company email configuration
 */
const getCompanyEmailConfig = async (companyId) => {
    const result = await db.query(
        `SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password,
                from_email, from_name, email_notifications_enabled, company_logo_url
         FROM companies WHERE id = $1`,
        [companyId]
    );

    if (result.rows.length === 0) {
        throw new Error('Company not found');
    }

    return result.rows[0];
};

/**
 * Create email transporter for a company
 */
const createTransporter = (config) => {
    if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
        throw new Error('Email configuration incomplete');
    }

    return nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port || 587,
        secure: config.smtp_secure || false,
        auth: {
            user: config.smtp_user,
            pass: config.smtp_password
        }
    });
};

/**
 * Get email template for a specific step
 */
const getEmailTemplate = async (companyId, stepName) => {
    const result = await db.query(
        `SELECT * FROM email_templates
         WHERE company_id = $1 AND step_name = $2 AND enabled = true`,
        [companyId, stepName]
    );

    return result.rows[0] || null;
};

/**
 * Send email notification for submission update
 */
const sendSubmissionUpdateEmail = async (submissionId, stepName, progressPercent) => {
    try {
        // Get submission details
        const submissionResult = await db.query(
            `SELECT s.*, c.name as company_name
             FROM submissions s
             JOIN companies c ON s.company_id = c.id
             WHERE s.id = $1`,
            [submissionId]
        );

        if (submissionResult.rows.length === 0) {
            console.log('Submission not found:', submissionId);
            return { success: false, error: 'Submission not found' };
        }

        const submission = submissionResult.rows[0];

        // Check if email notifications are enabled
        const config = await getCompanyEmailConfig(submission.company_id);
        if (!config.email_notifications_enabled) {
            console.log('Email notifications disabled for company:', submission.company_id);
            return { success: false, error: 'Notifications disabled' };
        }

        // Get email template
        const template = await getEmailTemplate(submission.company_id, stepName);
        if (!template) {
            console.log('No template found for step:', stepName);
            return { success: false, error: 'Template not found' };
        }

        // Get all linked customers
        const customersResult = await db.query(
            `SELECT c.id, c.name, c.email
             FROM submission_customers sc
             JOIN customers c ON sc.customer_id = c.id
             WHERE sc.submission_id = $1 AND c.email IS NOT NULL`,
            [submissionId]
        );

        const customers = customersResult.rows;
        if (customers.length === 0) {
            console.log('No customers with email addresses for submission:', submissionId);
            return { success: false, error: 'No customer emails' };
        }

        // Create transporter
        const transporter = createTransporter(config);

        // Send email to each customer
        const results = [];
        for (const customer of customers) {
            try {
                const variables = {
                    customer_name: customer.name,
                    submission_number: submission.psa_submission_number || submission.internal_id || 'N/A',
                    step_name: stepName,
                    progress_percent: progressPercent,
                    service_level: submission.service_level || 'N/A',
                    company_name: config.from_name || submission.company_name,
                    company_logo_url: config.company_logo_url || ''
                };

                const subject = renderTemplate(template.subject, variables);
                const bodyHtml = renderTemplate(template.body_html, variables);
                const bodyText = template.body_text
                    ? renderTemplate(template.body_text, variables)
                    : null;

                await transporter.sendMail({
                    from: `"${config.from_name || 'SlabDash'}" <${config.from_email}>`,
                    to: customer.email,
                    subject: subject,
                    html: bodyHtml,
                    text: bodyText
                });

                // Log successful send
                await db.query(
                    `INSERT INTO email_logs (company_id, submission_id, customer_id, recipient_email, subject, step_name, status)
                     VALUES ($1, $2, $3, $4, $5, $6, 'sent')`,
                    [submission.company_id, submissionId, customer.id, customer.email, subject, stepName]
                );

                results.push({ customer: customer.email, success: true });
                console.log(`Email sent to ${customer.email} for step ${stepName}`);
            } catch (error) {
                console.error(`Failed to send email to ${customer.email}:`, error);

                // Log failed send
                await db.query(
                    `INSERT INTO email_logs (company_id, submission_id, customer_id, recipient_email, subject, step_name, status, error_message)
                     VALUES ($1, $2, $3, $4, $5, $6, 'failed', $7)`,
                    [submission.company_id, submissionId, customer.id, customer.email, template.subject, stepName, error.message]
                );

                results.push({ customer: customer.email, success: false, error: error.message });
            }
        }

        return { success: true, results };
    } catch (error) {
        console.error('sendSubmissionUpdateEmail error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Test email configuration
 */
const testEmailConfig = async (companyId, testEmail) => {
    try {
        const config = await getCompanyEmailConfig(companyId);
        const transporter = createTransporter(config);

        await transporter.sendMail({
            from: `"${config.from_name || 'SlabDash'}" <${config.from_email}>`,
            to: testEmail,
            subject: 'SlabDash Email Test',
            html: '<h2>Email Configuration Test</h2><p>If you received this email, your email settings are configured correctly!</p>',
            text: 'Email Configuration Test - If you received this email, your email settings are configured correctly!'
        });

        return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendSubmissionUpdateEmail,
    testEmailConfig,
    getEmailTemplate,
    renderTemplate
};
