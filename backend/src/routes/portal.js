const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateCustomer } = require('../middleware/auth');
const stripeService = require('../services/stripe');

// Quick access endpoint for portal links (GET with token query param)
router.get('/access', async (req, res) => {
    try {
        const token = req.query.token;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // Find customer by portal access token
        const customerResult = await db.query(
            `SELECT c.*, co.name as company_name, co.slug as company_slug, co.primary_color, co.logo_url
             FROM customers c JOIN companies co ON c.company_id = co.id
             WHERE c.portal_access_token = $1 AND c.portal_access_enabled = true`,
            [token]
        );

        if (customerResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired portal link' });
        }

        const customer = customerResult.rows[0];

        // Get customer's submissions with cards
        const submissionsResult = await db.query(
            `SELECT
                s.id, s.internal_id, s.psa_submission_number, s.service_level,
                s.current_step, s.progress_percent, s.grades_ready, s.shipped,
                s.problem_order, s.date_sent, s.return_tracking,
                (SELECT COUNT(*) FROM cards WHERE submission_id = s.id) as card_count,
                (SELECT json_agg(json_build_object(
                    'id', c.id,
                    'description', c.description,
                    'grade', c.grade,
                    'psa_cert_number', c.psa_cert_number
                )) FROM cards c WHERE c.submission_id = s.id) as cards
             FROM submissions s
             WHERE s.customer_id = $1 OR s.id IN (
                 SELECT submission_id FROM submission_customers WHERE customer_id = $1
             )
             ORDER BY s.created_at DESC`,
            [customer.id]
        );

        // Get customer's buyback offers
        const buybackResult = await db.query(
            `SELECT bo.*,
                c.description as card_description,
                c.grade as card_grade,
                c.psa_cert_number,
                c.player_name,
                c.year,
                c.brand
             FROM buyback_offers bo
             LEFT JOIN cards c ON bo.card_id = c.id
             WHERE bo.customer_id = $1
             ORDER BY bo.created_at DESC`,
            [customer.id]
        );

        res.json({
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email
            },
            company: {
                name: customer.company_name,
                slug: customer.company_slug,
                primaryColor: customer.primary_color,
                logo_url: customer.logo_url
            },
            submissions: submissionsResult.rows.map(sub => ({
                ...sub,
                cards: sub.cards || []
            })),
            buybackOffers: buybackResult.rows
        });
    } catch (error) {
        console.error('Portal access error:', error);
        res.status(500).json({ error: 'Failed to load portal data' });
    }
});

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
                (SELECT COUNT(*) FROM cards WHERE customer_id = $1 AND grade IS NOT NULL) as graded_cards,
                (SELECT COUNT(*) FROM buyback_offers WHERE customer_id = $1 AND status = 'pending') as pending_offers,
                (SELECT COUNT(*) FROM buyback_offers WHERE customer_id = $1 AND status = 'accepted') as accepted_offers,
                (SELECT COALESCE(SUM(offer_price), 0) FROM buyback_offers WHERE customer_id = $1 AND status = 'paid') as total_earnings
        `, [req.customer.id]);
        res.json(stats.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Get customer's buyback offers
router.get('/buyback-offers', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT bo.*,
                c.description as card_description,
                c.grade as card_grade,
                c.psa_cert_number,
                c.player_name,
                c.year,
                c.brand,
                s.psa_submission_number
            FROM buyback_offers bo
            LEFT JOIN cards c ON bo.card_id = c.id
            LEFT JOIN submissions s ON c.submission_id = s.id
            WHERE bo.customer_id = $1
            ORDER BY bo.created_at DESC`,
            [req.customer.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get buyback offers' });
    }
});

// Get single buyback offer
router.get('/buyback-offers/:id', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT bo.*,
                c.description as card_description,
                c.grade as card_grade,
                c.psa_cert_number,
                c.player_name,
                c.year,
                c.brand,
                s.psa_submission_number
            FROM buyback_offers bo
            LEFT JOIN cards c ON bo.card_id = c.id
            LEFT JOIN submissions s ON c.submission_id = s.id
            WHERE bo.id = $1 AND bo.customer_id = $2`,
            [req.params.id, req.customer.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Buyback offer not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get buyback offer' });
    }
});

// Respond to buyback offer (accept/reject)
router.patch('/buyback-offers/:id/respond', authenticateCustomer, async (req, res) => {
    try {
        const { response, customer_response } = req.body; // response: 'accepted' or 'rejected'

        if (!response || !['accepted', 'rejected'].includes(response)) {
            return res.status(400).json({ error: 'Invalid response. Must be "accepted" or "rejected"' });
        }

        const offerCheck = await db.query(
            'SELECT id, status FROM buyback_offers WHERE id = $1 AND customer_id = $2',
            [req.params.id, req.customer.id]
        );

        if (offerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Buyback offer not found' });
        }

        if (offerCheck.rows[0].status !== 'pending') {
            return res.status(400).json({ error: 'This offer has already been responded to' });
        }

        const result = await db.query(
            `UPDATE buyback_offers
            SET status = $1, customer_response = $2, responded_at = NOW()
            WHERE id = $3 AND customer_id = $4
            RETURNING *`,
            [response, customer_response || null, req.params.id, req.customer.id]
        );

        // Notify shop owner of customer response
        console.log(`📧 Customer ${response} buyback offer #${req.params.id}`);
        // TODO: Send notification to shop owner

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Respond to buyback offer error:', error);
        res.status(500).json({ error: 'Failed to respond to buyback offer' });
    }
});

// Get documents for customer's submissions
router.get('/documents', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT d.*,
                s.psa_submission_number
            FROM documents d
            LEFT JOIN submissions s ON d.submission_id = s.id
            WHERE d.customer_id = $1 AND d.is_public = true
            ORDER BY d.created_at DESC`,
            [req.customer.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get documents' });
    }
});

// Respond to buyback offer (token-based, for portal access without login)
router.post('/buyback-offers/:id/respond', async (req, res) => {
    try {
        const token = req.query.token || req.body.token;
        const { response, customer_response } = req.body;

        if (!token) {
            return res.status(401).json({ error: 'Token is required' });
        }

        if (!response || !['accepted', 'rejected'].includes(response)) {
            return res.status(400).json({ error: 'Invalid response. Must be "accepted" or "rejected"' });
        }

        // Verify portal token and get customer
        const customerResult = await db.query(
            `SELECT c.id, c.name, c.email
             FROM customers c
             WHERE c.portal_access_token = $1
             AND c.portal_access_enabled = true
             AND (c.portal_token_expires IS NULL OR c.portal_token_expires > NOW())`,
            [token]
        );

        if (customerResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const customer = customerResult.rows[0];

        // Verify offer belongs to customer
        const offerCheck = await db.query(
            'SELECT id, status, offer_price FROM buyback_offers WHERE id = $1 AND customer_id = $2',
            [req.params.id, customer.id]
        );

        if (offerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Buyback offer not found' });
        }

        if (offerCheck.rows[0].status !== 'pending') {
            return res.status(400).json({ error: 'This offer has already been responded to' });
        }

        const offer = offerCheck.rows[0];

        // Update offer status
        const result = await db.query(
            `UPDATE buyback_offers
            SET status = $1, customer_response = $2, responded_at = NOW()
            WHERE id = $3 AND customer_id = $4
            RETURNING *`,
            [response, customer_response || null, req.params.id, customer.id]
        );

        // Notify shop owner of customer response
        console.log(`📧 Customer ${response} buyback offer #${req.params.id}`);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Respond to buyback offer error:', error);
        res.status(500).json({ error: 'Failed to respond to buyback offer' });
    }
});

module.exports = router;
