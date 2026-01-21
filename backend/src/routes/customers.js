const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// List customers
router.get('/', authenticate, async (req, res) => {
    try {
        const { search, limit = 50, offset = 0 } = req.query;
        let query = `SELECT * FROM customers WHERE company_id = $1`;
        const params = [req.companyId];
        
        if (search) {
            query += ` AND (name ILIKE $2 OR email ILIKE $2)`;
            params.push(`%${search}%`);
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        res.json({ customers: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list customers' });
    }
});

// Get single customer
router.get('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM customers WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
        
        const submissions = await db.query('SELECT * FROM submissions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10', [req.params.id]);
        res.json({ ...result.rows[0], recent_submissions: submissions.rows });
    } catch (error) {
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

module.exports = router;
