const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');

// Helper function to replace template variables
function replaceVariables(text, data) {
    let result = text;
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, data[key] || '');
    });
    return result;
}

// Send email to a single customer
router.post('/customer/:customerId', authenticate, async (req, res) => {
    try {
        const { customerId } = req.params;
        const { subject, body } = req.body;

        if (!subject || !body) {
            return res.status(400).json({ error: 'Subject and body are required' });
        }

        // Get customer
        const customerResult = await db.query(
            `SELECT * FROM customers WHERE id = $1 AND company_id = $2`,
            [customerId, req.user.company_id]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const customer = customerResult.rows[0];

        // Get company info
        const companyResult = await db.query(
            `SELECT name, from_email, from_name FROM companies WHERE id = $1`,
            [req.user.company_id]
        );
        const company = companyResult.rows[0];

        // Prepare data for variable replacement
        const data = {
            customer_name: customer.name,
            customer_email: customer.email,
            company_name: company.name,
        };

        // Replace variables
        const finalSubject = replaceVariables(subject, data);
        const finalBody = replaceVariables(body, data);

        // Send email
        await sendEmail({
            to: customer.email,
            subject: finalSubject,
            html: finalBody,
            companyId: req.user.company_id,
        });

        res.json({
            success: true,
            message: `Email sent to ${customer.name}`,
            count: 1,
        });
    } catch (error) {
        console.error('Send customer email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Send email to all customers in a submission
router.post('/submission/:submissionId', authenticate, async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { subject, body } = req.body;

        if (!subject || !body) {
            return res.status(400).json({ error: 'Subject and body are required' });
        }

        // Get submission
        const submissionResult = await db.query(
            `SELECT * FROM submissions WHERE id = $1 AND company_id = $2`,
            [submissionId, req.user.company_id]
        );

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const submission = submissionResult.rows[0];

        // Get company info
        const companyResult = await db.query(
            `SELECT name, from_email, from_name FROM companies WHERE id = $1`,
            [req.user.company_id]
        );
        const company = companyResult.rows[0];

        // Get all cards with unique customers in this submission
        const cardsResult = await db.query(
            `SELECT DISTINCT c.id, c.name, c.email
             FROM cards cd
             JOIN customers c ON c.id = cd.customer_id
             WHERE cd.submission_id = $1 AND cd.customer_id IS NOT NULL`,
            [submissionId]
        );

        if (cardsResult.rows.length === 0) {
            return res.status(400).json({ error: 'No customers found in this submission' });
        }

        const customers = cardsResult.rows;
        let sentCount = 0;

        // Prepare submission data for variable replacement
        const submissionData = {
            submission_number: submission.psa_submission_number || submission.internal_id,
            current_step: submission.current_step,
            progress_percent: submission.progress_percent,
            service_level: submission.service_level,
            company_name: company.name,
        };

        // Send to each customer
        for (const customer of customers) {
            const data = {
                ...submissionData,
                customer_name: customer.name,
                customer_email: customer.email,
            };

            const finalSubject = replaceVariables(subject, data);
            const finalBody = replaceVariables(body, data);

            try {
                await sendEmail({
                    to: customer.email,
                    subject: finalSubject,
                    html: finalBody,
                    companyId: req.user.company_id,
                });
                sentCount++;
            } catch (emailError) {
                console.error(`Failed to send to ${customer.email}:`, emailError);
            }
        }

        res.json({
            success: true,
            message: `Email sent to ${sentCount} customer${sentCount !== 1 ? 's' : ''}`,
            count: sentCount,
        });
    } catch (error) {
        console.error('Send submission email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Send email to all customers with active submissions
router.post('/bulk-active', authenticate, async (req, res) => {
    try {
        const { subject, body } = req.body;

        if (!subject || !body) {
            return res.status(400).json({ error: 'Subject and body are required' });
        }

        // Get company info
        const companyResult = await db.query(
            `SELECT name, from_email, from_name FROM companies WHERE id = $1`,
            [req.user.company_id]
        );
        const company = companyResult.rows[0];

        // Get all unique customers with active (not shipped) submissions
        const customersResult = await db.query(
            `SELECT DISTINCT c.id, c.name, c.email, s.psa_submission_number, s.internal_id,
                    s.current_step, s.progress_percent, s.service_level
             FROM customers c
             JOIN cards cd ON c.id = cd.customer_id
             JOIN submissions s ON cd.submission_id = s.id
             WHERE s.company_id = $1 AND (s.shipped = false OR s.shipped IS NULL)`,
            [req.user.company_id]
        );

        if (customersResult.rows.length === 0) {
            return res.status(400).json({ error: 'No active customers found' });
        }

        const customers = customersResult.rows;
        let sentCount = 0;

        // Send to each customer
        for (const customer of customers) {
            const data = {
                customer_name: customer.name,
                customer_email: customer.email,
                submission_number: customer.psa_submission_number || customer.internal_id,
                current_step: customer.current_step,
                progress_percent: customer.progress_percent,
                service_level: customer.service_level,
                company_name: company.name,
            };

            const finalSubject = replaceVariables(subject, data);
            const finalBody = replaceVariables(body, data);

            try {
                await sendEmail({
                    to: customer.email,
                    subject: finalSubject,
                    html: finalBody,
                    companyId: req.user.company_id,
                });
                sentCount++;
            } catch (emailError) {
                console.error(`Failed to send to ${customer.email}:`, emailError);
            }
        }

        res.json({
            success: true,
            message: `Bulk email sent to ${sentCount} customer${sentCount !== 1 ? 's' : ''}`,
            count: sentCount,
        });
    } catch (error) {
        console.error('Send bulk email error:', error);
        res.status(500).json({ error: 'Failed to send bulk email' });
    }
});

module.exports = router;
