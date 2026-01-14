const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateCustomer } = require('../middleware/auth');

// Customer login via magic link
router.post('/login', async (req, res) => {
    try {
        const { token, email } = req.body;
        
        if (token) {
            const result = await db.query(
                `SELECT c.*, co.name as company_name, co.slug as company_slug, co.primary_color, co.logo_url
                 FROM customers c JOIN companies co ON c.company_id = co.id
                 WHERE c.portal_access_token = $1 AND c.portal_token_expires > NOW() AND c.portal_access_enabled = true`,
                [token]
            );
            
            if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid or expired token' });
            
            const customer = result.rows[0];
            await db.query('UPDATE customers SET portal_access_token = NULL WHERE id = $1', [customer.id]);
            
            const jwtToken = jwt.sign({ customerId: customer.id, type: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });
            
            res.json({
                token: jwtToken,
                customer: { id: customer.id, name: customer.name, email: customer.email },
                company: { name: customer.company_name, slug: customer.company_slug, primaryColor: customer.primary_color }
            });
        } else {
            res.json({ message: 'If your email is registered, you will receive a login link.' });
        }
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

// Get customer's submissions
router.get('/submissions', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, internal_id, psa_submission_number, current_step, progress_percent, grades_ready, shipped, problem_order,
                    (SELECT COUNT(*) FROM cards WHERE submission_id = submissions.id) as card_count
             FROM submissions WHERE customer_id = $1 ORDER BY created_at DESC`,
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
        const result = await db.query(
            'SELECT * FROM submissions WHERE id = $1 AND customer_id = $2',
            [req.params.id, req.customer.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
        
        const cards = await db.query('SELECT * FROM cards WHERE submission_id = $1', [req.params.id]);
        const steps = await db.query('SELECT * FROM submission_steps WHERE submission_id = $1 ORDER BY step_index', [req.params.id]);
        
        res.json({ ...result.rows[0], cards: cards.rows, steps: steps.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get submission' });
    }
});

// Get customer stats
router.get('/stats', authenticateCustomer, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM submissions WHERE customer_id = $1) as total_submissions,
                (SELECT COUNT(*) FROM submissions WHERE customer_id = $1 AND shipped = false) as active_submissions,
                (SELECT COUNT(*) FROM cards WHERE customer_id = $1) as total_cards,
                (SELECT COUNT(*) FROM cards WHERE customer_id = $1 AND grade IS NOT NULL) as graded_cards
        `, [req.customer.id]);
        res.json(stats.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;
