const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// List customers
router.get('/', authenticate, async (req, res) => {
    try {
        const { search, limit = 100000, offset = 0 } = req.query;

        // Count query
        let countQuery = `SELECT COUNT(*) FROM customers WHERE company_id = $1`;
        const countParams = [req.companyId];

        if (search) {
            countQuery += ` AND (name ILIKE $2 OR email ILIKE $2)`;
            countParams.push(`%${search}%`);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        // Data query
        let query = `SELECT * FROM customers WHERE company_id = $1`;
        const params = [req.companyId];

        if (search) {
            query += ` AND (name ILIKE $2 OR email ILIKE $2)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);
        res.json({ customers: result.rows, total });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list customers' });
    }
});

// Get single customer
router.get('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM customers WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        const customer = result.rows[0];

        // Get all submissions for this customer via submission_customers join table
        const submissionsQuery = `
            SELECT s.*, COUNT(c.id) as card_count
            FROM submissions s
            INNER JOIN submission_customers sc ON s.id = sc.submission_id
            LEFT JOIN cards c ON s.id = c.submission_id
            WHERE sc.customer_id = $1 AND s.company_id = $2
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `;
        const submissions = await db.query(submissionsQuery, [req.params.id, req.companyId]);

        // Count total cards across all submissions
        const totalCards = submissions.rows.reduce((sum, sub) => sum + parseInt(sub.card_count || 0), 0);

        res.json({
            ...customer,
            recent_submissions: submissions.rows,
            total_submissions: submissions.rows.length,
            total_cards: totalCards
        });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ error: 'Failed to get customer' });
    }
});

// Create customer
router.post('/', authenticate, async (req, res) => {
    try {
        const { email, name, phone, address_line1, city, state, postal_code, notes } = req.body;
        if (!email || !name) return res.status(400).json({ error: 'Email and name required' });
        
        const existing = await db.query('SELECT id FROM customers WHERE company_id = $1 AND email = $2', [req.companyId, email.toLowerCase()]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Customer already exists' });
        
        const result = await db.query(
            `INSERT INTO customers (company_id, email, name, phone, address_line1, city, state, postal_code, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [req.companyId, email.toLowerCase(), name, phone, address_line1, city, state, postal_code, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// Update customer
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const allowed = ['name', 'phone', 'email', 'address_line1', 'city', 'state', 'postal_code', 'notes', 'portal_access_enabled'];
        const updates = [], values = [];
        let i = 1;
        
        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = $${i++}`);
                values.push(req.body[field]);
            }
        }
        
        if (updates.length === 0) return res.status(400).json({ error: 'No valid fields' });
        
        values.push(req.params.id, req.companyId);
        const result = await db.query(`UPDATE customers SET ${updates.join(', ')} WHERE id = $${i} AND company_id = $${i+1} RETURNING *`, values);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

// Delete customer
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM customers WHERE id = $1 AND company_id = $2 RETURNING id', [req.params.id, req.companyId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
        res.json({ message: 'Customer deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

// Send portal link
router.post('/:id/send-portal-link', authenticate, async (req, res) => {
    try {
        const token = uuidv4();
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        const result = await db.query(
            `UPDATE customers SET portal_access_token = $1, portal_token_expires = $2 WHERE id = $3 AND company_id = $4 RETURNING email`,
            [token, expires, req.params.id, req.companyId]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        const portalUrl = `${process.env.FRONTEND_URL}/portal?token=${token}`;
        res.json({ message: 'Portal link generated', portalUrl });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send portal link' });
    }
});

// Import customers from CSV (Shopify format)
router.post('/import-csv', authenticate, async (req, res) => {
    try {
        const { csvData } = req.body;

        // Helper function to parse CSV line with quoted fields
        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        // Parse CSV
        const lines = csvData.trim().split('\n');
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());

        console.log('CSV Import - Headers found:', headers);

        // Find column indices (flexible for different CSV formats)
        const emailIndex = headers.findIndex(h => h.includes('email'));
        const firstNameIndex = headers.findIndex(h => h.includes('first') && h.includes('name'));
        const lastNameIndex = headers.findIndex(h => h.includes('last') && h.includes('name'));
        const nameIndex = headers.findIndex(h => h.includes('name') && !h.includes('company') && !h.includes('first') && !h.includes('last'));
        const phoneIndex = headers.findIndex(h => h.includes('phone'));
        const addressIndex = headers.findIndex(h => h.includes('address') && !h.includes('2'));
        const cityIndex = headers.findIndex(h => h.includes('city'));
        const stateIndex = headers.findIndex(h => h.includes('state') || h.includes('province'));
        const zipIndex = headers.findIndex(h => h.includes('zip') || h.includes('postal'));

        let imported = 0;
        let skipped = 0;
        const errors = [];

        // Process each row (skip header)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = parseCSVLine(line);

            const email = emailIndex >= 0 ? cols[emailIndex]?.trim().toLowerCase() : null;
            let name = null;

            // Prioritize first + last name columns (common in Shopify)
            if (firstNameIndex >= 0 && lastNameIndex >= 0) {
                const first = cols[firstNameIndex]?.trim() || '';
                const last = cols[lastNameIndex]?.trim() || '';
                name = `${first} ${last}`.trim();
            }

            // Fall back to single name column if first+last not available
            if (!name && nameIndex >= 0) {
                name = cols[nameIndex]?.trim();
            }

            const phone = phoneIndex >= 0 ? cols[phoneIndex]?.trim() : null;
            const address = addressIndex >= 0 ? cols[addressIndex]?.trim() : null;
            const city = cityIndex >= 0 ? cols[cityIndex]?.trim() : null;
            const state = stateIndex >= 0 ? cols[stateIndex]?.trim() : null;
            const zip = zipIndex >= 0 ? cols[zipIndex]?.trim() : null;

            // Skip if no email or name
            if (!email || !name) {
                skipped++;
                errors.push(`Row ${i + 1}: Missing email or name`);
                continue;
            }

            try {
                // Check if customer already exists
                const existing = await db.query(
                    'SELECT id FROM customers WHERE company_id = $1 AND email = $2',
                    [req.companyId, email]
                );

                if (existing.rows.length > 0) {
                    skipped++;
                    continue;
                }

                // Insert customer
                await db.query(
                    `INSERT INTO customers (company_id, email, name, phone, address_line1, city, state, postal_code)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [req.companyId, email, name, phone, address, city, state, zip]
                );

                imported++;
                console.log(`Row ${i + 1}: Imported customer ${email}`);
            } catch (error) {
                errors.push(`Row ${i + 1}: ${error.message}`);
                console.error(`Row ${i + 1}: Error -`, error.message);
            }
        }

        console.log(`\n=== IMPORT SUMMARY ===`);
        console.log('Imported:', imported);
        console.log('Skipped:', skipped);
        console.log('Total rows:', lines.length - 1);

        res.json({
            success: true,
            imported,
            skipped,
            total: lines.length - 1,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Customer CSV import error:', error);
        res.status(500).json({
            error: 'Failed to import CSV',
            details: error.message
        });
    }
});

// Bulk delete customers
router.post('/bulk-delete', authenticate, async (req, res) => {
    try {
        const { customerIds } = req.body;

        if (!Array.isArray(customerIds) || customerIds.length === 0) {
            return res.status(400).json({ error: 'Customer IDs required' });
        }

        // Delete only customers belonging to this company
        const placeholders = customerIds.map((_, i) => `$${i + 2}`).join(', ');
        const result = await db.query(
            `DELETE FROM customers WHERE company_id = $1 AND id IN (${placeholders}) RETURNING id`,
            [req.companyId, ...customerIds]
        );

        res.json({
            success: true,
            deletedCount: result.rows.length,
            message: `Deleted ${result.rows.length} customer(s)`
        });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to delete customers' });
    }
});

// Delete all customers for company
router.post('/delete-all', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM customers WHERE company_id = $1 RETURNING id',
            [req.companyId]
        );

        res.json({
            success: true,
            deletedCount: result.rows.length,
            message: `Deleted all ${result.rows.length} customer(s)`
        });
    } catch (error) {
        console.error('Delete all error:', error);
        res.status(500).json({ error: 'Failed to delete all customers' });
    }
});

// Bulk add customers to submission
router.post('/bulk-add-to-submission', authenticate, async (req, res) => {
    try {
        const { customerIds, submissionId } = req.body;

        if (!Array.isArray(customerIds) || customerIds.length === 0) {
            return res.status(400).json({ error: 'Customer IDs required' });
        }

        if (!submissionId) {
            return res.status(400).json({ error: 'Submission ID required' });
        }

        // Verify submission belongs to this company
        const submissionCheck = await db.query(
            'SELECT id FROM submissions WHERE id = $1 AND company_id = $2',
            [submissionId, req.companyId]
        );

        if (submissionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        let added = 0;
        let skipped = 0;

        for (const customerId of customerIds) {
            try {
                // Verify customer belongs to this company
                const customerCheck = await db.query(
                    'SELECT id FROM customers WHERE id = $1 AND company_id = $2',
                    [customerId, req.companyId]
                );

                if (customerCheck.rows.length === 0) {
                    skipped++;
                    continue;
                }

                // Check if already linked
                const existingLink = await db.query(
                    'SELECT id FROM submission_customers WHERE submission_id = $1 AND customer_id = $2',
                    [submissionId, customerId]
                );

                if (existingLink.rows.length > 0) {
                    skipped++;
                    continue;
                }

                // Add link
                await db.query(
                    'INSERT INTO submission_customers (submission_id, customer_id) VALUES ($1, $2)',
                    [submissionId, customerId]
                );

                added++;
            } catch (error) {
                console.error(`Failed to link customer ${customerId}:`, error);
                skipped++;
            }
        }

        res.json({
            success: true,
            added,
            skipped,
            message: `Added ${added} customer(s) to submission${skipped > 0 ? `, skipped ${skipped}` : ''}`
        });
    } catch (error) {
        console.error('Bulk add to submission error:', error);
        res.status(500).json({ error: 'Failed to add customers to submission' });
    }
});

module.exports = router;
