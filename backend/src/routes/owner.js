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
                (SELECT COUNT(*) FROM companies) as total_shops,
                (SELECT COUNT(*) FROM companies WHERE plan = 'pro') as pro_shops,
                (SELECT COUNT(*) FROM companies WHERE plan = 'enterprise') as enterprise_shops,
                (SELECT COUNT(*) FROM companies WHERE plan = 'starter') as starter_shops,
                (SELECT COUNT(*) FROM companies WHERE plan = 'free') as free_shops,
                (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
                (SELECT COUNT(*) FROM submissions) as total_submissions,
                (SELECT COUNT(*) FROM cards) as total_cards,
                (SELECT COUNT(*) FROM companies WHERE created_at >= NOW() - INTERVAL '30 days') as new_shops_30d,
                (SELECT COUNT(*) FROM submissions WHERE created_at >= NOW() - INTERVAL '7 days') as submissions_7d
        `);

        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Owner stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Send newsletter to all shops
router.post('/newsletter', authenticate, requireOwner, async (req, res) => {
    try {
        const { subject, message, targetPlan } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message required' });
        }

        // Get all companies (optionally filtered by plan)
        let query = `
            SELECT DISTINCT u.email, u.name, c.name as company_name, c.plan
            FROM companies c
            JOIN users u ON c.id = u.company_id
            WHERE u.is_active = true AND u.role IN ('admin', 'owner')
        `;
        const params = [];

        if (targetPlan && targetPlan !== 'all') {
            query += ` AND c.plan = $1`;
            params.push(targetPlan);
        }

        const result = await db.query(query, params);

        // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        // For now, just return the recipients list
        res.json({
            success: true,
            recipientCount: result.rows.length,
            recipients: result.rows,
            message: 'Newsletter functionality ready - integrate with email service to send'
        });
    } catch (error) {
        console.error('Newsletter error:', error);
        res.status(500).json({ error: 'Failed to prepare newsletter' });
    }
});

// Get recent shop activity
router.get('/activity', authenticate, requireOwner, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const result = await db.query(`
            (
                SELECT
                    'new_shop' as activity_type,
                    c.id,
                    c.name as shop_name,
                    c.plan,
                    c.email,
                    c.created_at,
                    NULL as detail
                FROM companies c
                ORDER BY c.created_at DESC
                LIMIT 5
            )
            UNION ALL
            (
                SELECT
                    'submission_activity' as activity_type,
                    co.id,
                    co.name as shop_name,
                    co.plan,
                    co.email,
                    s.created_at,
                    COUNT(*)::text || ' submissions' as detail
                FROM submissions s
                JOIN companies co ON s.company_id = co.id
                WHERE s.created_at >= NOW() - INTERVAL '7 days'
                GROUP BY co.id, co.name, co.plan, co.email, s.created_at
                ORDER BY s.created_at DESC
                LIMIT 10
            )
            ORDER BY created_at DESC
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
