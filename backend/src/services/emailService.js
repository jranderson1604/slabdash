const nodemailer = require('nodemailer');
const db = require('../db');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
let sendPushToCompany; // Lazy load to avoid circular dependency

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

/**
 * Render email template with variables (HTML-escaped for safety)
 */
const renderTemplate = (template, variables) => {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, escapeHtml(value) || '');
    }
    return rendered;
};

/**
 * Get company email configuration
 */
const getCompanyEmailConfig = async (companyId) => {
    const result = await db.query(
        `SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password,
                from_email, from_name, email_notifications_enabled, company_logo_url,
                use_custom_smtp
         FROM companies WHERE id = $1`,
        [companyId]
    );

    if (result.rows.length === 0) {
        throw new Error('Company not found');
    }

    return result.rows[0];
};

/**
 * Get default SlabDash email configuration (Mailgun HTTP API)
 */
const getDefaultEmailConfig = () => {
    return {
        mailgun_api_key: process.env.DEFAULT_MAILGUN_API_KEY || process.env.DEFAULT_SMTP_PASSWORD || '',
        mailgun_domain: process.env.DEFAULT_MAILGUN_DOMAIN || 'slabdash.app',
        from_email: process.env.DEFAULT_FROM_EMAIL || 'slabdashllc@slabdash.app',
        from_name: process.env.DEFAULT_FROM_NAME || 'SlabDash'
    };
};

/**
 * Create email transporter for custom SMTP (only called when use_custom_smtp is true)
 */
const createTransporter = (config) => {
    if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
        throw new Error('Custom SMTP configuration incomplete');
    }

    console.log('📧 Using custom SMTP:', {
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        user: config.smtp_user
    });

    return nodemailer.createTransport({
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

        // Get all linked customers (only those who have opted in to emails)
        const customersResult = await db.query(
            `SELECT c.id, c.name, c.email
             FROM submission_customers sc
             JOIN customers c ON sc.customer_id = c.id
             WHERE sc.submission_id = $1 AND c.email IS NOT NULL AND c.email_opt_in IS NOT FALSE`,
            [submissionId]
        );

        const customers = customersResult.rows;
        if (customers.length === 0) {
            console.log('No customers with email addresses for submission:', submissionId);
            return { success: false, error: 'No customer emails' };
        }

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

                // Determine from address and send method based on email mode
                let fromAddress;

                if (!config.use_custom_smtp) {
                    // Use Mailgun HTTP API
                    const defaultConfig = getDefaultEmailConfig();
                    fromAddress = `${config.from_name || defaultConfig.from_name} <${defaultConfig.from_email}>`;

                    const mg = mailgun.client({
                        username: 'api',
                        key: defaultConfig.mailgun_api_key
                    });

                    await mg.messages.create(defaultConfig.mailgun_domain, {
                        from: fromAddress,
                        to: [customer.email],
                        bcc: ['notifications@slabdash.app'], // Monitor all customer emails
                        subject: subject,
                        text: bodyText,
                        html: bodyHtml
                    });
                } else {
                    // Use custom SMTP
                    fromAddress = `${config.from_name || 'SlabDash'} <${config.from_email}>`;
                    const transporter = createTransporter(config);

                    await transporter.sendMail({
                        from: fromAddress,
                        to: customer.email,
                        bcc: 'notifications@slabdash.app', // Monitor all customer emails
                        subject: subject,
                        html: bodyHtml,
                        text: bodyText
                    });
                }

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

        // Send push notification to company staff about the update
        try {
            if (!sendPushToCompany) {
                // Lazy load to avoid circular dependency
                sendPushToCompany = require('../routes/push').sendPushToCompany;
            }

            const pushPayload = {
                title: `Submission Updated: ${stepName}`,
                body: `Submission ${submission.psa_submission_number || submission.internal_id} moved to ${stepName} (${progressPercent}%)`,
                icon: '/images/logo-icon-alt.png.svg',
                badge: '/images/logo-icon-alt.png.svg',
                data: {
                    url: `/submissions/${submissionId}`,
                    submissionId,
                    stepName
                },
                tag: `submission-${submissionId}`
            };

            await sendPushToCompany(submission.company_id, pushPayload);
            console.log(`✓ Push notification sent for submission ${submissionId}`);
        } catch (pushError) {
            console.error('Failed to send push notification:', pushError.message);
            // Don't fail the email send if push fails
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
        console.log('🧪 Testing email config for company:', companyId, 'to:', testEmail);
        const config = await getCompanyEmailConfig(companyId);

        // Determine from address and email mode
        let fromAddress;
        let emailMode;

        if (!config.use_custom_smtp) {
            // Use Mailgun HTTP API for default SlabDash email
            const defaultConfig = getDefaultEmailConfig();
            fromAddress = `${config.from_name || defaultConfig.from_name} <${defaultConfig.from_email}>`;
            emailMode = 'SlabDash Default Email (Mailgun HTTP API)';

            console.log('📤 Sending via Mailgun HTTP API from:', fromAddress);
            console.log('Using Mailgun domain:', defaultConfig.mailgun_domain);

            const mg = mailgun.client({
                username: 'api',
                key: defaultConfig.mailgun_api_key
            });

            await mg.messages.create(defaultConfig.mailgun_domain, {
                from: fromAddress,
                to: [testEmail],
                subject: 'SlabDash Email Test',
                text: `Email Configuration Test - If you received this email, your email settings are configured correctly! Email Mode: ${emailMode}, From: ${fromAddress}`,
                html: `<h2>Email Configuration Test</h2><p>If you received this email, your email settings are configured correctly!</p><p><strong>Email Mode:</strong> ${emailMode}</p><p><strong>From:</strong> ${fromAddress}</p>`
            });

        } else {
            // Use custom SMTP via nodemailer
            fromAddress = `${config.from_name || 'SlabDash'} <${config.from_email}>`;
            emailMode = 'Custom SMTP';

            console.log('📤 Sending via custom SMTP from:', fromAddress);

            const transporter = createTransporter(config);
            await transporter.sendMail({
                from: fromAddress,
                to: testEmail,
                subject: 'SlabDash Email Test',
                html: `<h2>Email Configuration Test</h2><p>If you received this email, your email settings are configured correctly!</p><p><strong>Email Mode:</strong> ${emailMode}</p><p><strong>From:</strong> ${fromAddress}</p>`,
                text: `Email Configuration Test - If you received this email, your email settings are configured correctly! Email Mode: ${emailMode}, From: ${fromAddress}`
            });
        }

        console.log('✅ Test email sent successfully to:', testEmail);
        return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
        console.error('❌ Test email failed:', error.message);
        console.error('Error code:', error.code);
        console.error('Error details:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send introduction/welcome email to customer
 */
const sendIntroductionEmail = async (companyId, customerEmail, emailData, isTest = false) => {
    try {
        console.log(`📧 Sending ${isTest ? 'TEST ' : ''}introduction email for company:`, companyId, 'to:', customerEmail);
        const config = await getCompanyEmailConfig(companyId);

        // Build email HTML from template
        const { emailTemplates } = require('./notificationService');
        const { subject, html } = emailTemplates.welcomeIntroduction(emailData);

        // Add test prefix if this is a test
        const finalSubject = isTest ? `[TEST PREVIEW] ${subject}` : subject;

        // Determine from address and send method
        let fromAddress;

        if (!config.use_custom_smtp) {
            // Use Mailgun HTTP API
            const defaultConfig = getDefaultEmailConfig();
            fromAddress = `${config.from_name || defaultConfig.from_name} <${defaultConfig.from_email}>`;

            console.log('📤 Sending introduction email via Mailgun from:', fromAddress);

            const mg = mailgun.client({
                username: 'api',
                key: defaultConfig.mailgun_api_key
            });

            await mg.messages.create(defaultConfig.mailgun_domain, {
                from: fromAddress,
                to: [customerEmail],
                subject: finalSubject,
                html: html
            });
        } else {
            // Use custom SMTP
            fromAddress = `${config.from_name || 'SlabDash'} <${config.from_email}>`;
            const transporter = createTransporter(config);

            await transporter.sendMail({
                from: fromAddress,
                to: customerEmail,
                subject: finalSubject,
                html: html
            });
        }

        console.log(`✅ ${isTest ? 'Test ' : ''}Introduction email sent successfully to:`, customerEmail);
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to send introduction email:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Generic send email function (used by scheduledRefreshService and others)
 * Supports both Mailgun (default) and custom SMTP, with optional attachments
 */
const sendEmail = async ({ to, subject, html, text, companyId, attachments }) => {
    try {
        let config = null;
        if (companyId) {
            config = await getCompanyEmailConfig(companyId);
        }

        const useCustomSmtp = config?.use_custom_smtp;

        if (!useCustomSmtp) {
            // Use Mailgun HTTP API
            const defaultConfig = getDefaultEmailConfig();
            const fromAddress = `${config?.from_name || defaultConfig.from_name} <${defaultConfig.from_email}>`;

            const mg = mailgun.client({
                username: 'api',
                key: defaultConfig.mailgun_api_key
            });

            const msgData = {
                from: fromAddress,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                text: text || undefined
            };

            // Add attachments if provided
            if (attachments && attachments.length > 0) {
                msgData.attachment = attachments.map(att => ({
                    filename: att.filename,
                    data: att.content || att.data,
                    contentType: att.contentType || 'text/csv'
                }));
            }

            await mg.messages.create(defaultConfig.mailgun_domain, msgData);
        } else {
            // Use custom SMTP
            const fromAddress = `${config.from_name || 'SlabDash'} <${config.from_email}>`;
            const transporter = createTransporter(config);

            const mailOptions = {
                from: fromAddress,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject,
                html,
                text: text || undefined
            };

            // Add attachments for SMTP
            if (attachments && attachments.length > 0) {
                mailOptions.attachments = attachments.map(att => ({
                    filename: att.filename,
                    content: att.content || att.data,
                    contentType: att.contentType || 'text/csv'
                }));
            }

            await transporter.sendMail(mailOptions);
        }

        console.log(`📧 Email sent to ${to}: ${subject}`);
        return { success: true };
    } catch (error) {
        console.error('sendEmail error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send submission confirmation email when a shop creates a new submission
 */
const sendSubmissionConfirmationEmail = async (submissionId) => {
    try {
        const submissionResult = await db.query(
            `SELECT s.*, c.name as company_name
             FROM submissions s
             JOIN companies c ON s.company_id = c.id
             WHERE s.id = $1`,
            [submissionId]
        );
        if (submissionResult.rows.length === 0) return { success: false, error: 'Submission not found' };
        const submission = submissionResult.rows[0];

        const config = await getCompanyEmailConfig(submission.company_id);
        if (!config.email_notifications_enabled) return { success: false, error: 'Notifications disabled' };

        // Get linked customers
        const customersResult = await db.query(
            `SELECT c.id, c.name, c.email
             FROM submission_customers sc
             JOIN customers c ON sc.customer_id = c.id
             WHERE sc.submission_id = $1 AND c.email IS NOT NULL AND c.email_opt_in IS NOT FALSE`,
            [submissionId]
        );
        // Also check direct customer_id link
        if (customersResult.rows.length === 0 && submission.customer_id) {
            const directCustomer = await db.query(
                `SELECT id, name, email FROM customers WHERE id = $1 AND email IS NOT NULL AND email_opt_in IS NOT FALSE`,
                [submission.customer_id]
            );
            if (directCustomer.rows.length > 0) customersResult.rows.push(directCustomer.rows[0]);
        }
        if (customersResult.rows.length === 0) return { success: false, error: 'No customer emails' };

        const submissionNumber = submission.psa_submission_number || submission.internal_id || 'N/A';
        const companyName = config.from_name || submission.company_name;
        const cardCountResult = await db.query('SELECT COUNT(*) as count FROM cards WHERE submission_id = $1', [submissionId]);
        const cardCount = parseInt(cardCountResult.rows[0].count) || 0;

        const subject = `Submission received - ${submissionNumber}`;
        const bodyHtml = `
            <html><body style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F0EB;">
                <div style="background: linear-gradient(135deg, #FF8170 0%, #F07057 100%); padding: 35px 25px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Submission Received</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${companyName}</p>
                </div>
                <div style="padding: 30px 25px;">
                    <p style="font-size: 16px; color: #1C1C21;">Hi {{customer_name}},</p>
                    <p style="font-size: 14px; color: #555; line-height: 1.6;">We've received your cards and created submission <strong>${submissionNumber}</strong>. We'll keep you updated as it progresses through grading.</p>
                    <div style="background: #FFFFFF; border-left: 4px solid #FF8170; padding: 18px; border-radius: 8px; margin: 25px 0;">
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6c757d; text-transform: uppercase; font-weight: 600;">Your Reference Number</p>
                        <p style="margin: 0; font-size: 28px; font-weight: 800; color: #FF8170; letter-spacing: 1px; font-family: ui-monospace, monospace;">${submissionNumber}</p>
                    </div>
                    <table style="width: 100%; margin: 20px 0;">
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #6c757d;">Service Level</td>
                            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #1C1C21; text-align: right;">${submission.service_level || 'Standard'}</td>
                        </tr>
                        ${cardCount > 0 ? `<tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #6c757d;">Cards</td>
                            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #1C1C21; text-align: right;">${cardCount}</td>
                        </tr>` : ''}
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #6c757d;">Status</td>
                            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #1C1C21; text-align: right;">${submission.current_step || 'Submitted'}</td>
                        </tr>
                    </table>
                    <p style="font-size: 13px; color: #777; margin-top: 25px;">You'll receive email updates as your submission moves through each step.</p>
                    <p style="font-size: 14px; color: #555; margin-top: 20px;">Best regards,<br>${companyName}</p>
                </div>
            </body></html>`;
        const bodyText = `Hi, your submission ${submissionNumber} has been received. Service: ${submission.service_level || 'Standard'}. ${cardCount > 0 ? `Cards: ${cardCount}. ` : ''}Status: ${submission.current_step || 'Submitted'}. You'll receive updates as it progresses. - ${companyName}`;

        const results = [];
        for (const customer of customersResult.rows) {
            try {
                const html = bodyHtml.replace(/{{customer_name}}/g, customer.name || 'there');
                await _sendViaProvider(config, customer.email, subject, html, bodyText);

                await db.query(
                    `INSERT INTO email_logs (company_id, submission_id, customer_id, recipient_email, subject, step_name, status)
                     VALUES ($1, $2, $3, $4, $5, 'Submission Received', 'sent')`,
                    [submission.company_id, submissionId, customer.id, customer.email, subject]
                );
                results.push({ customer: customer.email, success: true });
            } catch (error) {
                console.error(`Failed to send confirmation email to ${customer.email}:`, error.message);
                await db.query(
                    `INSERT INTO email_logs (company_id, submission_id, customer_id, recipient_email, subject, step_name, status, error_message)
                     VALUES ($1, $2, $3, $4, $5, 'Submission Received', 'failed', $6)`,
                    [submission.company_id, submissionId, customer.id, customer.email, subject, error.message]
                );
                results.push({ customer: customer.email, success: false });
            }
        }
        return { success: true, results };
    } catch (error) {
        console.error('sendSubmissionConfirmationEmail error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send shipped notification email with tracking number
 */
const sendShippedEmail = async (submissionId) => {
    try {
        const submissionResult = await db.query(
            `SELECT s.*, c.name as company_name
             FROM submissions s
             JOIN companies c ON s.company_id = c.id
             WHERE s.id = $1`,
            [submissionId]
        );
        if (submissionResult.rows.length === 0) return { success: false, error: 'Submission not found' };
        const submission = submissionResult.rows[0];

        const config = await getCompanyEmailConfig(submission.company_id);
        if (!config.email_notifications_enabled) return { success: false, error: 'Notifications disabled' };

        const customersResult = await db.query(
            `SELECT c.id, c.name, c.email
             FROM submission_customers sc
             JOIN customers c ON sc.customer_id = c.id
             WHERE sc.submission_id = $1 AND c.email IS NOT NULL AND c.email_opt_in IS NOT FALSE`,
            [submissionId]
        );
        if (customersResult.rows.length === 0) return { success: false, error: 'No customer emails' };

        const submissionNumber = submission.psa_submission_number || submission.internal_id || 'N/A';
        const companyName = config.from_name || submission.company_name;
        const tracking = submission.return_tracking;

        const subject = `Your cards have shipped! - ${submissionNumber}`;
        const trackingBlock = tracking
            ? `<div style="background: rgba(16, 185, 129, 0.06); border: 2px solid rgba(16, 185, 129, 0.15); border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #059669; text-transform: uppercase; font-weight: 700;">Tracking Number</p>
                    <p style="margin: 0; font-size: 22px; font-weight: 800; color: #059669; font-family: ui-monospace, monospace; letter-spacing: 1px;">${tracking}</p>
               </div>`
            : '';

        const bodyHtml = `
            <html><body style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F0EB;">
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 35px 25px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Your Cards Have Shipped!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${companyName}</p>
                </div>
                <div style="padding: 30px 25px;">
                    <p style="font-size: 16px; color: #1C1C21;">Hi {{customer_name}},</p>
                    <p style="font-size: 14px; color: #555; line-height: 1.6;">Your graded cards from submission <strong>${submissionNumber}</strong> have been shipped and are on the way back to us. We'll notify you when they're ready for pickup.</p>
                    ${trackingBlock}
                    <p style="font-size: 14px; color: #555; margin-top: 20px;">Best regards,<br>${companyName}</p>
                </div>
            </body></html>`;
        const bodyText = `Hi, your cards from submission ${submissionNumber} have shipped!${tracking ? ` Tracking: ${tracking}` : ''} We'll let you know when they're ready for pickup. - ${companyName}`;

        const results = [];
        for (const customer of customersResult.rows) {
            try {
                const html = bodyHtml.replace(/{{customer_name}}/g, customer.name || 'there');
                await _sendViaProvider(config, customer.email, subject, html, bodyText);

                await db.query(
                    `INSERT INTO email_logs (company_id, submission_id, customer_id, recipient_email, subject, step_name, status)
                     VALUES ($1, $2, $3, $4, $5, 'Shipped', 'sent')`,
                    [submission.company_id, submissionId, customer.id, customer.email, subject]
                );
                results.push({ customer: customer.email, success: true });
            } catch (error) {
                console.error(`Failed to send shipped email to ${customer.email}:`, error.message);
                results.push({ customer: customer.email, success: false });
            }
        }
        return { success: true, results };
    } catch (error) {
        console.error('sendShippedEmail error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send problem order notification email
 */
const sendProblemOrderEmail = async (submissionId) => {
    try {
        const submissionResult = await db.query(
            `SELECT s.*, c.name as company_name
             FROM submissions s
             JOIN companies c ON s.company_id = c.id
             WHERE s.id = $1`,
            [submissionId]
        );
        if (submissionResult.rows.length === 0) return { success: false, error: 'Submission not found' };
        const submission = submissionResult.rows[0];

        const config = await getCompanyEmailConfig(submission.company_id);
        if (!config.email_notifications_enabled) return { success: false, error: 'Notifications disabled' };

        const customersResult = await db.query(
            `SELECT c.id, c.name, c.email
             FROM submission_customers sc
             JOIN customers c ON sc.customer_id = c.id
             WHERE sc.submission_id = $1 AND c.email IS NOT NULL AND c.email_opt_in IS NOT FALSE`,
            [submissionId]
        );
        if (customersResult.rows.length === 0) return { success: false, error: 'No customer emails' };

        const submissionNumber = submission.psa_submission_number || submission.internal_id || 'N/A';
        const companyName = config.from_name || submission.company_name;

        const subject = `Action needed on submission ${submissionNumber}`;
        const bodyHtml = `
            <html><body style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F0EB;">
                <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 35px 25px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Attention Needed</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${companyName}</p>
                </div>
                <div style="padding: 30px 25px;">
                    <p style="font-size: 16px; color: #1C1C21;">Hi {{customer_name}},</p>
                    <p style="font-size: 14px; color: #555; line-height: 1.6;">PSA has flagged an issue with your submission <strong>${submissionNumber}</strong>. Our team is already looking into it and will work to resolve it as quickly as possible.</p>
                    <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 18px; border-radius: 8px; margin: 25px 0;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #DC2626;">What this means</p>
                        <p style="margin: 0; font-size: 13px; color: #7F1D1D; line-height: 1.6;">PSA has paused processing on this submission. This can happen for various reasons — an accounting hold, a question about a card, or a documentation issue. Most issues are resolved within a few business days.</p>
                    </div>
                    <p style="font-size: 14px; color: #555; line-height: 1.6;">No action is needed from you right now. If we need any information, we'll reach out directly. You can also contact us with any questions.</p>
                    <p style="font-size: 14px; color: #555; margin-top: 20px;">Best regards,<br>${companyName}</p>
                </div>
            </body></html>`;
        const bodyText = `Hi, PSA has flagged an issue with your submission ${submissionNumber}. Our team is looking into it and will resolve it as quickly as possible. No action needed from you right now. - ${companyName}`;

        const results = [];
        for (const customer of customersResult.rows) {
            try {
                const html = bodyHtml.replace(/{{customer_name}}/g, customer.name || 'there');
                await _sendViaProvider(config, customer.email, subject, html, bodyText);

                await db.query(
                    `INSERT INTO email_logs (company_id, submission_id, customer_id, recipient_email, subject, step_name, status)
                     VALUES ($1, $2, $3, $4, $5, 'Problem Order', 'sent')`,
                    [submission.company_id, submissionId, customer.id, customer.email, subject]
                );
                results.push({ customer: customer.email, success: true });
            } catch (error) {
                console.error(`Failed to send problem email to ${customer.email}:`, error.message);
                results.push({ customer: customer.email, success: false });
            }
        }
        return { success: true, results };
    } catch (error) {
        console.error('sendProblemOrderEmail error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Internal: send email via Mailgun or custom SMTP based on company config
 */
const _sendViaProvider = async (config, toEmail, subject, html, text) => {
    if (!config.use_custom_smtp) {
        const defaultConfig = getDefaultEmailConfig();
        const fromAddress = `${config.from_name || defaultConfig.from_name} <${defaultConfig.from_email}>`;
        const mg = mailgun.client({ username: 'api', key: defaultConfig.mailgun_api_key });
        await mg.messages.create(defaultConfig.mailgun_domain, {
            from: fromAddress,
            to: [toEmail],
            bcc: ['notifications@slabdash.app'],
            subject,
            html,
            text: text || undefined
        });
    } else {
        const fromAddress = `${config.from_name || 'SlabDash'} <${config.from_email}>`;
        const transporter = createTransporter(config);
        await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            bcc: 'notifications@slabdash.app',
            subject,
            html,
            text: text || undefined
        });
    }
};

/**
 * Send password reset email to a customer
 */
const sendPasswordResetEmail = async (customerId, resetToken) => {
    const customerResult = await db.query(
        `SELECT c.id, c.name, c.email, c.company_id, co.name as company_name
         FROM customers c
         JOIN companies co ON c.company_id = co.id
         WHERE c.id = $1`,
        [customerId]
    );
    if (customerResult.rows.length === 0) throw new Error('Customer not found');
    const customer = customerResult.rows[0];
    if (!customer.email) throw new Error('Customer has no email');

    const config = await getCompanyEmailConfig(customer.company_id);
    const companyName = config.from_name || customer.company_name;
    const portalUrl = process.env.PORTAL_URL || process.env.FRONTEND_URL || 'https://app.slabdash.com';
    const resetLink = `${portalUrl}/portal?reset=${resetToken}`;

    const subject = `Reset your password - ${companyName}`;
    const html = `
        <html><body style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F0EB;">
            <div style="background: linear-gradient(135deg, #FF8170 0%, #F07057 100%); padding: 35px 25px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Password Reset</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${escapeHtml(companyName)}</p>
            </div>
            <div style="padding: 30px 25px;">
                <p style="font-size: 16px; color: #1C1C21;">Hi ${escapeHtml(customer.name || 'there')},</p>
                <p style="font-size: 14px; color: #555; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new password.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #FF8170, #F07057); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">Reset Password</a>
                </div>
                <p style="font-size: 13px; color: #777;">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
                <p style="font-size: 14px; color: #555; margin-top: 20px;">Best regards,<br>${escapeHtml(companyName)}</p>
            </div>
        </body></html>`;
    const text = `Hi ${customer.name || 'there'}, reset your password here: ${resetLink} (expires in 1 hour). If you didn't request this, ignore this email. - ${companyName}`;

    await _sendViaProvider(config, customer.email, subject, html, text);
};

/**
 * Send waitlist confirmation email (uses SlabDash default Mailgun — no company context)
 */
const sendWaitlistConfirmationEmail = async (email, shopName) => {
    const defaultConfig = getDefaultEmailConfig();
    const mg = mailgun.client({ username: 'api', key: defaultConfig.mailgun_api_key });

    const name = shopName || 'there';
    const subject = "You're on the SlabDash waitlist!";
    const html = `
        <html><body style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F0EB;">
            <div style="background: linear-gradient(135deg, #FF8170, #E8543D); padding: 40px 32px; text-align: center; border-radius: 0 0 20px 20px;">
                <h1 style="color: #fff; font-size: 28px; font-weight: 900; margin: 0;">Welcome to the list!</h1>
                <p style="color: rgba(255,248,240,0.8); font-size: 14px; margin-top: 8px;">You're one step closer to the best grading tracker on the market.</p>
            </div>
            <div style="padding: 32px;">
                <p style="color: #2C2416; font-size: 16px; line-height: 1.6;">Hey ${escapeHtml(name)},</p>
                <p style="color: rgba(44,36,22,0.65); font-size: 14px; line-height: 1.7;">
                    Thanks for joining the SlabDash waitlist. We're building the ultimate PSA submission tracker for card shops — and you'll be the first to know when new features drop.
                </p>
                <div style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15); border-radius: 12px; padding: 16px 20px; margin: 24px 0;">
                    <p style="color: #065f46; font-size: 14px; font-weight: 700; margin: 0;">What's included right now (100% free):</p>
                    <ul style="color: rgba(44,36,22,0.65); font-size: 13px; line-height: 2; padding-left: 20px; margin: 8px 0 0;">
                        <li>Live PSA tracking with auto-refresh</li>
                        <li>Customer portal with QR pickup codes</li>
                        <li>Smart email notifications</li>
                        <li>Invoicing & analytics</li>
                        <li>SAM AI assistant</li>
                    </ul>
                </div>
                <p style="color: rgba(44,36,22,0.65); font-size: 14px; line-height: 1.7;">
                    Ready to jump in? You can start using SlabDash right now — it's free during early access with no limits.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://slabdash.app/register" style="display: inline-block; background: linear-gradient(135deg, #FF8170, #E8543D); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-weight: 800; font-size: 15px;">Get Started Free</a>
                </div>
                <p style="color: rgba(44,36,22,0.4); font-size: 12px; text-align: center; margin-top: 32px;">
                    &copy; 2026 SlabDash &middot; Professional PSA submission tracking for card shops
                </p>
            </div>
        </body></html>
    `;

    await mg.messages.create(defaultConfig.mailgun_domain, {
        from: `${defaultConfig.from_name} <${defaultConfig.from_email}>`,
        to: [email],
        subject,
        html,
        text: `Hey ${name}, thanks for joining the SlabDash waitlist! We're building the ultimate PSA submission tracker for card shops. Start free at https://slabdash.app/register`
    });
};

module.exports = {
    sendSubmissionUpdateEmail,
    sendSubmissionConfirmationEmail,
    sendShippedEmail,
    sendProblemOrderEmail,
    sendPasswordResetEmail,
    sendWaitlistConfirmationEmail,
    sendEmail,
    testEmailConfig,
    sendIntroductionEmail,
    getEmailTemplate,
    renderTemplate
};
