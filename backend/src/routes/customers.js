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

module.exports = router;
