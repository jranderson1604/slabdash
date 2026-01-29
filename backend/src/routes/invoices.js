const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

/**
 * Generate invoice number (format: INV-2024-001)
 */
function generateInvoiceNumber(companyId, year) {
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${year}-${companyId}-${timestamp}`;
}

/**
 * Send invoice email to customer
 */
async function sendInvoiceEmail(customer, submission, lineItems, total, pickupCode, companyName, mailgunConfig) {
    const mg = mailgun.client({
        username: 'api',
        key: mailgunConfig.api_key
    });

    const deliveryMethod = customer.delivery_method || 'pickup';
    const deliveryInfo = deliveryMethod === 'pickup'
        ? `<div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
             <p style="margin: 0 0 10px 0; font-weight: bold; color: #2e7d32;">📍 Pickup Information</p>
             <p style="margin: 0; font-size: 14px; color: #1b5e20;">Your pickup code: <strong style="font-size: 24px; font-family: monospace; letter-spacing: 2px;">${pickupCode}</strong></p>
             <p style="margin: 10px 0 0 0; font-size: 12px; color: #558b2f;">Please show this code when picking up your cards.</p>
           </div>`
        : `<div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
             <p style="margin: 0 0 10px 0; font-weight: bold; color: #1565c0;">📦 Shipping Information</p>
             <p style="margin: 0; font-size: 14px; color: #0d47a1;">Your cards will be shipped to:</p>
             <p style="margin: 5px 0 0 0; font-size: 14px; color: #1976d2; white-space: pre-line;">${customer.shipping_address || 'Address on file'}</p>
           </div>`;

    const lineItemsHtml = lineItems.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.description}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${item.unit_price.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: bold;">$${item.total.toFixed(2)}</td>
        </tr>
    `).join('');

    const subject = `Invoice for Submission ${submission.psa_submission_number || submission.internal_id} - $${total.toFixed(2)}`;

    const bodyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 32px;">Invoice</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${companyName}</p>
                </div>

                <!-- Invoice Details -->
                <div style="padding: 30px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                        <div>
                            <p style="margin: 0; color: #666; font-size: 14px;">Bill To:</p>
                            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #333;">${customer.name}</p>
                            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${customer.email}</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; color: #666; font-size: 14px;">Invoice #</p>
                            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #333;">${submission.invoice_number}</p>
                            <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Submission: ${submission.psa_submission_number || submission.internal_id}</p>
                        </div>
                    </div>

                    <!-- Delivery Method -->
                    ${deliveryInfo}

                    <!-- Line Items -->
                    <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; color: #495057;">Description</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6; color: #495057;">Qty</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6; color: #495057;">Unit Price</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6; color: #495057;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lineItemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" style="padding: 15px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #333;">Total Due:</td>
                                <td style="padding: 15px 12px; text-align: right; font-size: 24px; font-weight: bold; color: #667eea;">$${total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Payment Instructions -->
                    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404;">💳 Payment Instructions</p>
                        <p style="margin: 0; font-size: 14px; color: #856404;">Please have payment ready when ${deliveryMethod === 'pickup' ? 'picking up' : 'you receive'} your cards. We accept cash, credit cards, and digital payments.</p>
                    </div>

                    <div style="border-top: 2px solid #e0e0e0; padding-top: 20px; margin-top: 30px; text-align: center;">
                        <p style="margin: 0; color: #666; font-size: 12px;">Thank you for your business!</p>
                        <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">If you have any questions about this invoice, please contact us.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const bodyText = `
Invoice from ${companyName}

Bill To: ${customer.name}
Email: ${customer.email}

Invoice #: ${submission.invoice_number}
Submission: ${submission.psa_submission_number || submission.internal_id}

${deliveryMethod === 'pickup' ? `PICKUP CODE: ${pickupCode}\nPlease show this code when picking up your cards.` : `SHIPPING TO:\n${customer.shipping_address || 'Address on file'}`}

LINE ITEMS:
${lineItems.map(item => `${item.description} x${item.quantity} @ $${item.unit_price.toFixed(2)} = $${item.total.toFixed(2)}`).join('\n')}

TOTAL DUE: $${total.toFixed(2)}

Thank you for your business!
    `;

    const fromAddress = mailgunConfig.from_email || `${companyName} <noreply@${mailgunConfig.domain}>`;

    try {
        await mg.messages.create(mailgunConfig.domain, {
            from: fromAddress,
            to: [customer.email],
            subject: subject,
            text: bodyText,
            html: bodyHtml
        });
        return { success: true };
    } catch (error) {
        console.error(`Failed to send invoice to ${customer.email}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate and send invoices for a submission
 */
router.post('/generate/:submissionId', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { submissionId } = req.params;
        const companyId = req.user.company_id;

        // Get submission with cards and customers
        const submissionResult = await db.query(
            `SELECT s.*, comp.name as company_name
             FROM submissions s
             JOIN companies comp ON s.company_id = comp.id
             WHERE s.id = $1 AND s.company_id = $2`,
            [submissionId, companyId]
        );

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const submission = submissionResult.rows[0];

        // Get all customers linked to this submission
        const customersResult = await db.query(
            `SELECT sc.*, c.name, c.email, c.phone
             FROM submission_customers sc
             JOIN customers c ON sc.customer_id = c.id
             WHERE sc.submission_id = $1`,
            [submissionId]
        );

        if (customersResult.rows.length === 0) {
            return res.status(400).json({ error: 'No customers linked to this submission' });
        }

        // Get all cards with their costs
        const cardsResult = await db.query(
            `SELECT * FROM cards WHERE submission_id = $1 ORDER BY id`,
            [submissionId]
        );

        // Generate invoice number if not exists
        let invoiceNumber = submission.invoice_number;
        if (!invoiceNumber) {
            const year = new Date().getFullYear();
            invoiceNumber = generateInvoiceNumber(companyId, year);

            await db.query(
                'UPDATE submissions SET invoice_number = $1 WHERE id = $2',
                [invoiceNumber, submissionId]
            );
        }

        // Get mailgun config
        const configResult = await db.query(
            `SELECT mailgun_api_key, mailgun_domain, mailgun_from_email
             FROM companies WHERE id = $1`,
            [companyId]
        );

        const mailgunConfig = {
            api_key: configResult.rows[0].mailgun_api_key,
            domain: configResult.rows[0].mailgun_domain,
            from_email: configResult.rows[0].mailgun_from_email
        };

        if (!mailgunConfig.api_key || !mailgunConfig.domain) {
            return res.status(400).json({ error: 'Mailgun not configured' });
        }

        // Generate pickup code if not exists and submission is ready
        let pickupCode = submission.pickup_code;
        if (!pickupCode && submission.grades_ready) {
            const generatePickupCode = () => {
                const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
                const numbers = '0123456789';
                let code = '';
                for (let i = 0; i < 3; i++) {
                    code += letters.charAt(Math.floor(Math.random() * letters.length));
                }
                code += '-';
                for (let i = 0; i < 3; i++) {
                    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
                }
                return code;
            };

            pickupCode = generatePickupCode();
            await db.query(
                'UPDATE submissions SET pickup_code = $1 WHERE id = $2',
                [pickupCode, submissionId]
            );
        }

        // Send invoice to each customer
        let emailsSent = 0;
        let emailsFailed = 0;
        const errors = [];

        for (const customer of customersResult.rows) {
            // Get cards for this customer
            const customerCards = cardsResult.rows.filter(c => c.customer_owner_id === customer.customer_id);

            // Calculate line items
            const lineItems = [];
            let customerTotal = 0;

            customerCards.forEach(card => {
                const cardTotal = (parseFloat(card.grading_fee) || 0) + (parseFloat(card.upcharge) || 0);
                customerTotal += cardTotal;

                lineItems.push({
                    description: card.player_name || card.description || 'Card',
                    quantity: 1,
                    unit_price: cardTotal,
                    total: cardTotal
                });
            });

            // If no cards assigned, split total evenly
            if (lineItems.length === 0) {
                const totalCost = parseFloat(submission.total_cost) || 0;
                const perCustomer = totalCost / customersResult.rows.length;
                lineItems.push({
                    description: 'Grading Service',
                    quantity: 1,
                    unit_price: perCustomer,
                    total: perCustomer
                });
                customerTotal = perCustomer;
            }

            // Send invoice email
            const result = await sendInvoiceEmail(
                customer,
                { ...submission, invoice_number: invoiceNumber },
                lineItems,
                customerTotal,
                pickupCode,
                submission.company_name,
                mailgunConfig
            );

            if (result.success) {
                emailsSent++;
                // Mark invoice as sent for this customer
                await db.query(
                    `UPDATE submission_customers
                     SET invoice_sent = true, customer_cost = $1
                     WHERE submission_id = $2 AND customer_id = $3`,
                    [customerTotal, submissionId, customer.customer_id]
                );
            } else {
                emailsFailed++;
                errors.push({ customer: customer.name, error: result.error });
            }
        }

        // Mark submission invoice as sent
        await db.query(
            `UPDATE submissions
             SET invoice_sent = true, invoice_sent_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [submissionId]
        );

        res.json({
            success: true,
            message: `Invoices sent: ${emailsSent} succeeded, ${emailsFailed} failed`,
            invoice_number: invoiceNumber,
            emails_sent: emailsSent,
            emails_failed: emailsFailed,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Generate invoices error:', error);
        res.status(500).json({ error: 'Failed to generate invoices', details: error.message });
    }
});

module.exports = router;
