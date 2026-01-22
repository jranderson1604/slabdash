const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireOwner } = require('../middleware/auth');

// TEMPORARY: Skip auth check if user has owner role in database
const checkOwner = async (req, res, next) => {
    try {
        // First try normal auth
        await new Promise((resolve, reject) => {
            authenticate(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Check if owner
        if (req.user?.role === 'owner') {
            return next();
        }

        return res.status(403).json({ error: 'Not an owner' });
    } catch (authError) {
        // Auth failed, but let's check database directly by user ID from token attempt
        return res.status(401).json({ error: 'Authentication failed', details: authError.message });
    }
};

// Get all companies (shops)
router.get('/companies', checkOwner, async (req, res) => {
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
        console.error('Get companies error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Get all customers across all shops
router.get('/customers', authenticate, requireOwner, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                cu.*,
                co.name as company_name,
                co.slug as company_slug,
                COUNT(DISTINCT s.id) as submission_count,
                COUNT(DISTINCT c.id) as card_count
            FROM customers cu
            LEFT JOIN companies co ON cu.company_id = co.id
            LEFT JOIN submissions s ON cu.id = s.customer_id
            LEFT JOIN cards c ON cu.id = c.customer_id
            GROUP BY cu.id, co.id
            ORDER BY cu.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get all customers error:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Get platform statistics
router.get('/stats', checkOwner, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM companies) as total_companies,
                (SELECT COUNT(*) FROM companies WHERE plan = 'free') as free_plan_count,
                (SELECT COUNT(*) FROM companies WHERE plan IN ('starter', 'pro', 'enterprise')) as paid_plan_count,
                (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
                (SELECT COUNT(*) FROM customers WHERE portal_access_enabled = true) as total_customers,
                (SELECT COUNT(*) FROM submissions) as total_submissions,
                (SELECT COUNT(*) FROM submissions WHERE shipped = false) as active_submissions,
                (SELECT COUNT(*) FROM cards) as total_cards,
                (SELECT COUNT(*) FROM cards WHERE grade IS NOT NULL) as graded_cards,
                (SELECT COUNT(*) FROM buyback_offers) as total_buyback_offers,
                (SELECT COUNT(*) FROM buyback_offers WHERE status = 'pending') as pending_buyback_offers,
                (SELECT COALESCE(SUM(offer_price), 0) FROM buyback_offers WHERE status = 'paid') as total_buyback_value
        `);
        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Get platform stats error:', error);
        res.status(500).json({ error: 'Failed to fetch platform stats' });
    }
});

// Get recent activity across all companies
router.get('/activity', authenticate, requireOwner, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const submissions = await db.query(`
            SELECT
                s.id, s.psa_submission_number, s.internal_id, s.created_at,
                'submission' as activity_type,
                c.name as company_name,
                cu.name as customer_name
            FROM submissions s
            LEFT JOIN companies c ON s.company_id = c.id
            LEFT JOIN customers cu ON s.customer_id = cu.id
            ORDER BY s.created_at DESC
            LIMIT $1
        `, [limit]);

        const companies = await db.query(`
            SELECT
                id, name, created_at,
                'company' as activity_type
            FROM companies
            ORDER BY created_at DESC
            LIMIT $1
        `, [limit]);

        const offers = await db.query(`
            SELECT
                bo.id, bo.offer_price, bo.status, bo.created_at,
                'buyback' as activity_type,
                c.name as company_name,
                cu.name as customer_name
            FROM buyback_offers bo
            LEFT JOIN companies c ON bo.company_id = c.id
            LEFT JOIN customers cu ON bo.customer_id = cu.id
            ORDER BY bo.created_at DESC
            LIMIT $1
        `, [limit]);

        const activity = [
            ...submissions.rows,
            ...companies.rows,
            ...offers.rows
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);

        res.json(activity);
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// Update company plan/subscription
router.patch('/companies/:id/plan', authenticate, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, plan_expires_at } = req.body;

        const validPlans = ['free', 'starter', 'pro', 'enterprise'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan type' });
        }

        const result = await db.query(
            'UPDATE companies SET plan = $1, plan_expires_at = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [plan, plan_expires_at || null, id]
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
