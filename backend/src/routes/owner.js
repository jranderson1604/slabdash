const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireOwner } = require('../middleware/auth');

// Get all companies (shops)
router.get('/companies', authenticate, requireOwner, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                c.*,
                COUNT(DISTINCT u.id) as user_count,
                COUNT(DISTINCT cu.id) as customer_count,
                COUNT(DISTINCT s.id) as submission_count,
                COUNT(DISTINCT ca.id) as card_count
            FROM companies c
            LEFT JOIN users u ON c.id = u.company_id AND u.is_active = true
            LEFT JOIN customers cu ON c.id = cu.company_id
            LEFT JOIN submissions s ON c.id = s.company_id
            LEFT JOIN cards ca ON c.id = ca.company_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Owner companies error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Get platform statistics
router.get('/stats', authenticate, requireOwner, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM companies) as total_companies,
                (SELECT COUNT(*) FROM customers) as total_customers,
                (SELECT COUNT(*) FROM submissions) as total_submissions,
                (SELECT COUNT(*) FROM cards) as total_cards,
                (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users
        `);

        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Owner stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get all customers across platform
router.get('/customers', authenticate, requireOwner, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const result = await db.query(`
            SELECT
                c.*,
                co.name as company_name,
                co.slug as company_slug,
                COUNT(DISTINCT s.id) as submission_count
            FROM customers c
            JOIN companies co ON c.company_id = co.id
            LEFT JOIN submissions s ON c.id = s.customer_id
            GROUP BY c.id, co.id
            ORDER BY c.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        res.json(result.rows);
    } catch (error) {
        console.error('Owner customers error:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Get recent activity across platform
router.get('/activity', authenticate, requireOwner, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const result = await db.query(`
            SELECT
                s.id,
                s.tracking_number,
                s.status,
                s.created_at,
                s.updated_at,
                c.name as customer_name,
                c.email as customer_email,
                co.name as company_name,
                co.slug as company_slug
            FROM submissions s
            JOIN customers c ON s.customer_id = c.id
            JOIN companies co ON s.company_id = co.id
            ORDER BY s.updated_at DESC
            LIMIT $1
        `, [limit]);

        res.json(result.rows);
    } catch (error) {
        console.error('Owner activity error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// Update company subscription plan
router.patch('/companies/:id/plan', authenticate, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, status } = req.body;

        const result = await db.query(
            `UPDATE companies
             SET subscription_plan = $1, subscription_status = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [plan, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update company plan error:', error);
        res.status(500).json({ error: 'Failed to update company plan' });
    }
});

module.exports = router;
