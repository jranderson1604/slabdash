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
async function sendInvoiceEmail(customer, submission, lineItems, subtotal, taxAmount, taxPercentage, total, pickupCode, companyName, mailgunConfig) {
    const mg = mailgun.client({
        username: 'api',
        key: mailgunConfig.api_key
    });

    const deliveryMethod = customer.delivery_method || 'pickup';
    const deliveryInfo = deliveryMethod === 'pickup'
        ? `<div style="background: #FFF5F2; border: 2px solid #FFD4C9; border-radius: 8px; padding: 20px; margin: 20px 0;">
             <p style="margin: 0 0 12px 0; font-weight: 700; color: #FF8170; font-size: 15px;">📍 Pickup Information</p>
             <p style="margin: 0; font-size: 14px; color: #6B4E3D;">Your pickup code:</p>
             <div style="background: linear-gradient(135deg, #FF8170 0%, #F07057 100%); color: white; padding: 16px 24px; border-radius: 8px; margin: 12px 0; text-align: center; box-shadow: 0 4px 12px rgba(255, 129, 112, 0.3);">
                <strong style="font-size: 32px; font-family: 'Inter', -apple-system, 'Courier New', monospace; letter-spacing: 6px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${pickupCode}</strong>
             </div>
             <p style="margin: 10px 0 0 0; font-size: 13px; color: #8B6F5C; font-weight: 500;">Please show this code when picking up your cards.</p>
           </div>`
        : `<div style="background: #FFF5F2; border: 2px solid #FFD4C9; border-radius: 8px; padding: 20px; margin: 20px 0;">
             <p style="margin: 0 0 12px 0; font-weight: 700; color: #FF8170; font-size: 15px;">📦 Shipping Information</p>
             <p style="margin: 0; font-size: 14px; color: #6B4E3D;">Your cards will be shipped to:</p>
             <p style="margin: 10px 0 0 0; font-size: 14px; color: #2C2416; white-space: pre-line; font-weight: 500;">${customer.shipping_address || 'Address on file'}</p>
           </div>`;

    const lineItemsHtml = lineItems.map((item, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#FFFFFF' : '#FFF5F2'};">
            <td style="padding: 14px 16px; border-bottom: 1px solid #FFD4C9; color: #1C1C21; font-size: 14px;">${item.description}</td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #FFD4C9; text-align: center; color: #6c757d; font-size: 14px;">${item.quantity}</td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #FFD4C9; text-align: right; color: #6c757d; font-size: 14px;">$${item.unit_price.toFixed(2)}</td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #FFD4C9; text-align: right; font-weight: 600; color: #1C1C21; font-size: 15px;">$${item.total.toFixed(2)}</td>
        </tr>
    `).join('');

    const subject = `Invoice for Submission ${submission.psa_submission_number || submission.internal_id} - $${total.toFixed(2)}`;

    const bodyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #F5F0EB;">
            <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <!-- Header with SlabDash Branding -->
                <div style="background: linear-gradient(135deg, #FF8170 0%, #F07057 100%); padding: 40px 30px; text-align: center; position: relative;">
                    <div style="background: white; display: inline-block; padding: 16px 32px; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                        <img src="${process.env.LOGO_URL || 'https://i.imgur.com/placeholder.png'}" alt="SlabDash Logo" style="height: 45px; display: block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
                        <span style="font-family: 'Inter', Arial, sans-serif; font-size: 24px; font-weight: 800; color: #FF8170; letter-spacing: -0.5px; display: none;">SLABDASH</span>
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Invoice</h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 8px 0 0 0; font-size: 16px; font-weight: 500;">${companyName}</p>
                </div>

                <!-- Invoice Details -->
                <div style="padding: 35px 30px; background-color: #F5F0EB;">
                    <!-- Customer & Invoice Info -->
                    <div style="background: #FFFFFF; border-left: 4px solid #FF8170; padding: 20px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <table style="width: 100%;">
                            <tr>
                                <td style="vertical-align: top; width: 50%;">
                                    <p style="margin: 0; color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Bill To</p>
                                    <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #1C1C21;">${customer.name}</p>
                                    <p style="margin: 4px 0 0 0; color: #6c757d; font-size: 14px;">${customer.email}</p>
                                </td>
                                <td style="vertical-align: top; text-align: right; width: 50%;">
                                    <p style="margin: 0; color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Invoice #</p>
                                    <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #FF8170;">${submission.invoice_number}</p>
                                    <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 13px;">Submission: ${submission.psa_submission_number || submission.internal_id}</p>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Delivery Method -->
                    ${deliveryInfo}

                    <!-- Line Items -->
                    <table style="width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid #FFD4C9; border-radius: 8px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #FF8170 0%, #F07057 100%);">
                                <th style="padding: 14px 16px; text-align: left; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                                <th style="padding: 14px 16px; text-align: center; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                                <th style="padding: 14px 16px; text-align: right; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Unit Price</th>
                                <th style="padding: 14px 16px; text-align: right; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lineItemsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #FFFFFF;">
                                <td colspan="3" style="padding: 12px 16px; text-align: right; font-size: 15px; font-weight: 600; color: #6c757d; border-top: 2px solid #FFD4C9;">Subtotal:</td>
                                <td style="padding: 12px 16px; text-align: right; font-size: 16px; font-weight: 600; color: #1C1C21; border-top: 2px solid #FFD4C9;">$${subtotal.toFixed(2)}</td>
                            </tr>
                            ${taxPercentage > 0 ? `
                            <tr style="background-color: #FFFFFF;">
                                <td colspan="3" style="padding: 12px 16px; text-align: right; font-size: 15px; font-weight: 600; color: #6c757d;">Tax (${taxPercentage}%):</td>
                                <td style="padding: 12px 16px; text-align: right; font-size: 16px; font-weight: 600; color: #1C1C21;">$${taxAmount.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            <tr style="background-color: #FFF5F2;">
                                <td colspan="3" style="padding: 18px 16px; text-align: right; font-size: 18px; font-weight: 700; color: #1C1C21; ${taxPercentage > 0 ? 'border-top: 2px solid #FFD4C9;' : ''}">Total Due:</td>
                                <td style="padding: 18px 16px; text-align: right; font-size: 26px; font-weight: 700; color: #FF8170; ${taxPercentage > 0 ? 'border-top: 2px solid #FFD4C9;' : ''}">$${total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Payment Instructions -->
                    <div style="background: linear-gradient(to right, #FFF8F0, #FFE8D9); border-left: 4px solid #FF8170; border-radius: 8px; padding: 20px; margin: 25px 0;">
                        <p style="margin: 0 0 10px 0; font-weight: 700; color: #D96846; font-size: 15px;">💳 Payment Instructions</p>
                        <p style="margin: 0; font-size: 14px; color: #8B4513; line-height: 1.6;">Please have payment ready when ${deliveryMethod === 'pickup' ? 'picking up' : 'you receive'} your cards. We accept cash, credit cards, and digital payments.</p>
                    </div>

                    <div style="border-top: 2px solid #FFD4C9; padding-top: 25px; margin-top: 30px; text-align: center;">
                        <p style="margin: 0; color: #1C1C21; font-size: 16px; font-weight: 600;">Thank you for your business!</p>
                        <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 13px;">If you have any questions about this invoice, please contact us.</p>
                    </div>
                </div>

                <!-- Footer with SlabDash Branding -->
                <div style="background: linear-gradient(135deg, #FF8170 0%, #F07057 100%); padding: 25px 30px; text-align: center;">
                    <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500;">Powered by</p>
                    <p style="margin: 5px 0 0 0; color: white; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">SLABDASH</p>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 11px;">Professional Card Grading Management</p>
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

SUBTOTAL: $${subtotal.toFixed(2)}
${taxPercentage > 0 ? `TAX (${taxPercentage}%): $${taxAmount.toFixed(2)}\n` : ''}TOTAL DUE: $${total.toFixed(2)}

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
 * Preview invoice before sending
 */
router.get('/preview/:submissionId', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { submissionId } = req.params;
        const companyId = req.user.company_id;

        // Get submission details
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

        // Filter customers with valid email addresses
        const customersWithEmails = customersResult.rows.filter(c => c.email && c.email.trim() !== '');

        if (customersWithEmails.length === 0) {
            return res.status(400).json({
                error: 'No customers with email addresses for this submission',
                message: 'Please add email addresses to customers before generating invoices.',
                total_customers: customersResult.rows.length
            });
        }

        // Get card count for the submission
        const cardsResult = await db.query(
            `SELECT COUNT(*) as count FROM cards WHERE submission_id = $1`,
            [submissionId]
        );

        // Generate invoice number preview
        const year = new Date().getFullYear();
        const invoiceNumber = submission.invoice_number || generateInvoiceNumber(companyId, year);

        res.json({
            success: true,
            invoice_number: invoiceNumber,
            submission_number: submission.psa_submission_number || submission.internal_id,
            psa_service_cost: parseFloat(submission.psa_service_cost) || 0,
            additional_fees: parseFloat(submission.additional_fees) || 0,
            customers: customersWithEmails.map(c => ({
                id: c.customer_id,
                name: c.name,
                email: c.email,
                delivery_method: 'pickup', // Default to pickup
                pickup_code: c.pickup_code || '(Will be generated)',
                card_count: cardsResult.rows[0].count
            }))
        });

    } catch (error) {
        console.error('Invoice preview error:', error);
        res.status(500).json({ error: 'Failed to generate preview', details: error.message });
    }
});

/**
 * Generate and send invoices for a submission
 */
router.post('/generate/:submissionId', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { psa_service_cost, additional_fees } = req.body;
        const companyId = req.user.company_id;

        // Get submission with cards and customers
        let submissionResult;
        try {
            submissionResult = await db.query(
                `SELECT s.*, comp.name as company_name, comp.tax_percentage
                 FROM submissions s
                 JOIN companies comp ON s.company_id = comp.id
                 WHERE s.id = $1 AND s.company_id = $2`,
                [submissionId, companyId]
            );
        } catch (error) {
            // Fallback if tax_percentage column doesn't exist yet
            if (error.code === '42703') {
                console.log('Note: tax_percentage column not found. Run migration to add it.');
                submissionResult = await db.query(
                    `SELECT s.*, comp.name as company_name, 0 as tax_percentage
                     FROM submissions s
                     JOIN companies comp ON s.company_id = comp.id
                     WHERE s.id = $1 AND s.company_id = $2`,
                    [submissionId, companyId]
                );
            } else {
                throw error;
            }
        }

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

        // Filter customers with valid email addresses
        const customersWithEmails = customersResult.rows.filter(c => c.email && c.email.trim() !== '');

        if (customersWithEmails.length === 0) {
            return res.status(400).json({
                error: 'No customers with email addresses for this submission',
                message: 'Please add email addresses to customers before generating invoices.',
                total_customers: customersResult.rows.length
            });
        }

        // Get all cards with their costs
        const cardsResult = await db.query(
            `SELECT * FROM cards WHERE submission_id = $1 ORDER BY id`,
            [submissionId]
        );

        // Save PSA service cost and additional fees to submission (if columns exist)
        if (psa_service_cost !== undefined || additional_fees !== undefined) {
            try {
                await db.query(
                    `UPDATE submissions
                     SET psa_service_cost = COALESCE($1, psa_service_cost),
                         additional_fees = COALESCE($2, additional_fees)
                     WHERE id = $3`,
                    [psa_service_cost || null, additional_fees || null, submissionId]
                );
            } catch (error) {
                // Columns don't exist yet - run migration first
                console.log('Note: psa_service_cost/additional_fees columns not found. Run migration to add them.');
            }
        }

        // Generate invoice number if not exists
        let invoiceNumber = submission.invoice_number;
        if (!invoiceNumber) {
            const year = new Date().getFullYear();
            invoiceNumber = generateInvoiceNumber(companyId, year);

            try {
                await db.query(
                    'UPDATE submissions SET invoice_number = $1 WHERE id = $2',
                    [invoiceNumber, submissionId]
                );
            } catch (error) {
                // Column doesn't exist yet - run migration first
                console.log('Note: invoice_number column not found. Invoice will be generated but not saved. Run migration to add it.');
            }
        }

        // Get mailgun config - try database first, fall back to environment variables
        let mailgunConfig = {
            api_key: null,
            domain: null,
            from_email: null
        };

        try {
            const configResult = await db.query(
                `SELECT mailgun_api_key, mailgun_domain, mailgun_from_email
                 FROM companies WHERE id = $1`,
                [companyId]
            );

            if (configResult.rows[0]) {
                mailgunConfig = {
                    api_key: configResult.rows[0].mailgun_api_key,
                    domain: configResult.rows[0].mailgun_domain,
                    from_email: configResult.rows[0].mailgun_from_email
                };
            }
        } catch (error) {
            console.log('Note: mailgun columns not found in companies table. Using environment variables.');
        }

        // Fall back to environment variables if not set in database
        mailgunConfig.api_key = mailgunConfig.api_key || process.env.DEFAULT_MAILGUN_API_KEY;
        mailgunConfig.domain = mailgunConfig.domain || process.env.DEFAULT_MAILGUN_DOMAIN;
        mailgunConfig.from_email = mailgunConfig.from_email || process.env.DEFAULT_FROM_EMAIL;

        if (!mailgunConfig.api_key || !mailgunConfig.domain) {
            return res.status(400).json({
                error: 'Mailgun not configured',
                message: 'Please configure Mailgun API key and domain in environment variables or company settings'
            });
        }

        // Pickup code generation helper
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

        // Calculate total invoice amount with tax
        const psaCost = parseFloat(psa_service_cost) || parseFloat(submission.psa_service_cost) || 0;
        const addFees = parseFloat(additional_fees) || parseFloat(submission.additional_fees) || 0;
        const subtotal = psaCost + addFees;

        // Get tax percentage from company settings (default to 0 if column doesn't exist)
        let taxPercentage = 0;
        try {
            taxPercentage = parseFloat(submission.tax_percentage) || 0;
        } catch (error) {
            console.log('Note: tax_percentage column not found. Run migration to add it.');
        }

        const taxAmount = subtotal * (taxPercentage / 100);
        const totalInvoice = subtotal + taxAmount;

        // Split evenly among customers with emails
        const perCustomerCost = totalInvoice / customersWithEmails.length;
        const perCustomerSubtotal = subtotal / customersWithEmails.length;
        const perCustomerTax = taxAmount / customersWithEmails.length;

        // Send invoice to each customer
        let emailsSent = 0;
        let emailsFailed = 0;
        const errors = [];

        for (const customer of customersWithEmails) {
            // Generate unique pickup code for this customer if submission is ready
            let customerPickupCode = null;
            if (submission.grades_ready) {
                customerPickupCode = generatePickupCode();

                // Save pickup code to submission_customers table
                try {
                    await db.query(
                        `UPDATE submission_customers
                         SET pickup_code = $1
                         WHERE submission_id = $2 AND customer_id = $3`,
                        [customerPickupCode, submissionId, customer.customer_id]
                    );
                } catch (error) {
                    // Column doesn't exist yet - pickup code will still be used in emails but not saved
                    console.log('Note: pickup_code column not found in submission_customers. Run migration to add it.');
                }
            }

            // Create line items for this customer
            const lineItems = [];

            // Add PSA service cost line item
            if (psaCost > 0) {
                lineItems.push({
                    description: `PSA Grading Service (${submission.service_level || 'Standard'})`,
                    quantity: 1,
                    unit_price: psaCost / customersWithEmails.length,
                    total: psaCost / customersWithEmails.length
                });
            }

            // Add additional fees line item
            if (addFees > 0) {
                lineItems.push({
                    description: 'Additional Fees (Shipping, Handling, etc.)',
                    quantity: 1,
                    unit_price: addFees / customersWithEmails.length,
                    total: addFees / customersWithEmails.length
                });
            }

            const customerTotal = perCustomerCost;

            // Send invoice email with customer-specific pickup code
            const result = await sendInvoiceEmail(
                customer,
                { ...submission, invoice_number: invoiceNumber },
                lineItems,
                perCustomerSubtotal,
                perCustomerTax,
                taxPercentage,
                customerTotal,
                customerPickupCode,
                submission.company_name,
                mailgunConfig
            );

            if (result.success) {
                emailsSent++;
                // Mark invoice as sent for this customer
                try {
                    await db.query(
                        `UPDATE submission_customers
                         SET invoice_sent = true, customer_cost = $1
                         WHERE submission_id = $2 AND customer_id = $3`,
                        [customerTotal, submissionId, customer.customer_id]
                    );
                } catch (error) {
                    // Columns don't exist yet - invoice was still sent successfully
                    console.log('Note: invoice_sent/customer_cost columns not found in submission_customers. Run migration to add them.');
                }
            } else {
                emailsFailed++;
                errors.push({ customer: customer.name, error: result.error });
            }
        }

        // Mark submission invoice as sent
        try {
            await db.query(
                `UPDATE submissions
                 SET invoice_sent = true, invoice_sent_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [submissionId]
            );
        } catch (error) {
            // Columns don't exist yet - invoices were still sent successfully
            console.log('Note: invoice_sent/invoice_sent_at columns not found in submissions. Run migration to add them.');
        }

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
