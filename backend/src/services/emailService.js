const FormData = require('form-data');
const Mailgun = require('mailgun.js');
const db = require('../db');

const mailgun = new Mailgun(FormData);

// PSA Step definitions - must match psaService.js
const PSA_STEPS = [
    { key: 'Arrived', name: 'Arrived', description: 'Order has arrived at PSA' },
    { key: 'OrderPrep', name: 'Order Prep', description: 'Order is being prepared' },
    { key: 'ResearchAndID', name: 'Research & ID', description: 'Cards are being researched and identified' },
    { key: 'Grading', name: 'Grading', description: 'Cards are being graded' },
    { key: 'Assembly', name: 'Assembly', description: 'Cards are being assembled in holders' },
    { key: 'QACheck1', name: 'QA Check 1', description: 'First quality assurance check' },
    { key: 'QACheck2', name: 'QA Check 2', description: 'Second quality assurance check' },
    { key: 'Shipped', name: 'Shipped', description: 'Order has shipped' }
];

/**
 * Get or create email templates for a company
 */
const getOrCreateTemplates = async (companyId) => {
    // Check if templates exist
    const existing = await db.query(
        'SELECT * FROM email_templates WHERE company_id = $1 ORDER BY step_key',
        [companyId]
    );

    if (existing.rows.length === PSA_STEPS.length) {
        return existing.rows;
    }

    // Create missing templates
    const templates = [];
    for (const step of PSA_STEPS) {
        const exists = existing.rows.find(t => t.step_key === step.key);
        if (exists) {
            templates.push(exists);
        } else {
            const result = await db.query(
                `INSERT INTO email_templates (company_id, step_key, step_name, subject, body, enabled)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (company_id, step_key) DO UPDATE SET step_name = $3
                 RETURNING *`,
                [companyId, step.key, step.name, getDefaultSubject(step), getDefaultBody(step), false]
            );
            templates.push(result.rows[0]);
        }
    }

    return templates.sort((a, b) =>
        PSA_STEPS.findIndex(s => s.key === a.step_key) - PSA_STEPS.findIndex(s => s.key === b.step_key)
    );
};

/**
 * Get default subject line for a step
 */
const getDefaultSubject = (step) => {
    const subjects = {
        'Arrived': 'Your submission has arrived at PSA!',
        'OrderPrep': 'Your submission is being prepared',
        'ResearchAndID': 'Your cards are being researched',
        'Grading': 'Your cards are being graded!',
        'Assembly': 'Your cards are being assembled',
        'QACheck1': 'Quality check in progress',
        'QACheck2': 'Final quality check in progress',
        'Shipped': 'Your graded cards have shipped!'
    };
    return subjects[step.key] || `Update: ${step.name}`;
};

/**
 * Get default body for a step
 */
const getDefaultBody = (step) => {
    return `Hi {{customer_name}},

Your PSA submission #{{submission_number}} has reached the "${step.name}" stage.

${step.description}

You can track your submission status at any time using the customer portal.

Thank you for your business!

{{company_name}}`;
};

/**
 * Get Mailgun client for a company
 */
const getMailgunClient = async (companyId) => {
    const result = await db.query(
        'SELECT mailgun_api_key, mailgun_domain, mailgun_from_email, mailgun_from_name FROM companies WHERE id = $1',
        [companyId]
    );

    if (!result.rows[0]) {
        throw new Error('Company not found');
    }

    const { mailgun_api_key, mailgun_domain, mailgun_from_email, mailgun_from_name } = result.rows[0];

    if (!mailgun_api_key || !mailgun_domain) {
        throw new Error('Mailgun not configured');
    }

    return {
        client: mailgun.client({ username: 'api', key: mailgun_api_key }),
        domain: mailgun_domain,
        fromEmail: mailgun_from_email || `noreply@${mailgun_domain}`,
        fromName: mailgun_from_name || 'SlabDash'
    };
};

/**
 * Replace template variables with actual values
 */
const replaceVariables = (text, variables) => {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return result;
};

/**
 * Send an email using Mailgun
 */
const sendEmail = async (companyId, templateId, toEmail, variables) => {
    try {
        const { client, domain, fromEmail, fromName } = await getMailgunClient(companyId);

        // Get template
        const templateResult = await db.query(
            'SELECT * FROM email_templates WHERE id = $1 AND company_id = $2',
            [templateId, companyId]
        );

        if (!templateResult.rows[0]) {
            throw new Error('Template not found');
        }

        const template = templateResult.rows[0];

        if (!template.enabled) {
            console.log(`Email template ${template.step_key} is disabled, skipping`);
            return { success: false, reason: 'disabled' };
        }

        const subject = replaceVariables(template.subject, variables);
        const body = replaceVariables(template.body, variables);

        const messageData = {
            from: `${fromName} <${fromEmail}>`,
            to: [toEmail],
            subject: subject,
            text: body
        };

        const result = await client.messages.create(domain, messageData);

        // Log the email
        await db.query(
            `INSERT INTO email_logs (company_id, template_id, customer_id, submission_id, to_email, subject, step_key, status, mailgun_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [companyId, templateId, variables.customer_id || null, variables.submission_id || null,
             toEmail, subject, template.step_key, 'sent', result.id]
        );

        return { success: true, messageId: result.id };
    } catch (error) {
        console.error('Failed to send email:', error);

        // Log the failure
        await db.query(
            `INSERT INTO email_logs (company_id, template_id, to_email, subject, step_key, status, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [companyId, templateId, toEmail, 'Failed to send', null, 'failed', error.message]
        );

        return { success: false, error: error.message };
    }
};

/**
 * Send step notification email
 */
const sendStepNotification = async (companyId, customerId, submissionId, stepKey) => {
    try {
        // Get template for this step
        const templateResult = await db.query(
            'SELECT * FROM email_templates WHERE company_id = $1 AND step_key = $2',
            [companyId, stepKey]
        );

        if (!templateResult.rows[0] || !templateResult.rows[0].enabled) {
            return { success: false, reason: 'template_disabled_or_missing' };
        }

        // Get customer and submission details
        const customerResult = await db.query(
            'SELECT name, email FROM customers WHERE id = $1',
            [customerId]
        );

        const submissionResult = await db.query(
            'SELECT psa_submission_number FROM submissions WHERE id = $1',
            [submissionId]
        );

        const companyResult = await db.query(
            'SELECT name FROM companies WHERE id = $1',
            [companyId]
        );

        if (!customerResult.rows[0] || !submissionResult.rows[0]) {
            return { success: false, reason: 'customer_or_submission_not_found' };
        }

        const customer = customerResult.rows[0];
        const submission = submissionResult.rows[0];
        const company = companyResult.rows[0];

        const variables = {
            customer_name: customer.name,
            customer_email: customer.email,
            submission_number: submission.psa_submission_number,
            company_name: company.name,
            customer_id: customerId,
            submission_id: submissionId
        };

        return await sendEmail(companyId, templateResult.rows[0].id, customer.email, variables);
    } catch (error) {
        console.error('Failed to send step notification:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Test Mailgun configuration
 */
const testMailgunConnection = async (apiKey, domain) => {
    try {
        const client = mailgun.client({ username: 'api', key: apiKey });
        await client.domains.get(domain);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = {
    PSA_STEPS,
    getOrCreateTemplates,
    sendEmail,
    sendStepNotification,
    testMailgunConnection,
    getDefaultSubject,
    getDefaultBody
};
