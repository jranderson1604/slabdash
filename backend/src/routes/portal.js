const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateCustomer } = require('../middleware/auth');

// Direct portal access via token (no login required)
router.get('/access', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token required' });

        const result = await db.query(
            `SELECT c.*, co.name as company_name, co.slug as company_slug, co.primary_color, co.logo_url
             FROM customers c JOIN companies co ON c.company_id = co.id
             WHERE c.portal_access_token = $1 AND c.portal_token_expires > NOW() AND c.portal_access_enabled = true`,
            [token]
        );

        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid or expired link' });

        const customer = result.rows[0];

        const submissions = await db.query(
            `SELECT s.*, (SELECT COUNT(*) FROM cards WHERE submission_id = s.id) as card_count
             FROM submissions s WHERE s.customer_id = $1 ORDER BY s.created_at DESC`,
            [customer.id]
        );

        for (let sub of submissions.rows) {
            const cards = await db.query('SELECT * FROM cards WHERE submission_id = $1', [sub.id]);
            const steps = await db.query('SELECT * FROM submission_steps WHERE submission_id = $1 ORDER BY step_index', [sub.id]);
            sub.cards = cards.rows;
            sub.steps = steps.rows;
        }

        res.json({
            customer: { id: customer.id, name: customer.name, email: customer.email },
            company: { name: customer.company_name, primaryColor: customer.primary_color, logo: customer.logo_url },
            submissions: submissions.rows
        });
    } catch (error) {
        console.error('Portal access error:', error);
        res.status(500).json({ error: 'Access failed' });
    }
});

// Customer login via magic link
router.post('/login', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required' });

        const result = await db.query(
            `SELECT c.*, co.name as company_name, co.primary_color
             FROM customers c JOIN companies co ON c.company_id = co.id
             WHERE c.portal_access_token = $1 AND c.portal_token_expires > NOW() AND c.portal_access_enabled = true`,
            [token]
        );

        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid or expired token' });

        const customer = result.rows[0];
        const jwtToken = jwt.sign({ customerId: customer.id, type: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token: jwtToken,
            customer: { id: customer.id, name: customer.name, email: customer.email },
            company: { name: customer.company_name, primaryColor: customer.primary_color }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get customer info
router.get('/me', authenticateCustomer, (req, res) => {
    res.json({
        customer: { id: req.customer.id, name: req.customer.name, email: req.customer.email },
        company: { name: req.customer.company_name, primaryColor: req.customer.primary_color }
    });
});

// Get customer submissions
router.get('/submissions', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, (SELECT COUNT(*) FROM cards WHERE submission_id = s.id) as card_count
             FROM submissions s WHERE s.customer_id = $1 ORDER BY s.created_at DESC`,
            [req.customer.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get submissions' });
    }
});

// Get single submission
router.get('/submissions/:id', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM submissions WHERE id = $1 AND customer_id = $2', [req.params.id, req.customer.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const cards = await db.query('SELECT * FROM cards WHERE submission_id = $1', [req.params.id]);
        const steps = await db.query('SELECT * FROM submission_steps WHERE submission_id = $1 ORDER BY step_index', [req.params.id]);

        res.json({ ...result.rows[0], cards: cards.rows, steps: steps.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get submission' });
    }
});

module.exports = router;
