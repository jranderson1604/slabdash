const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { getLimits } = require('../config/tierLimits');

// Get settings
router.get('/settings', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, slug, email, phone, website, logo_url, psa_api_key,
             primary_color, background_color, sidebar_color,
             auto_refresh_enabled, auto_refresh_interval_hours,
             email_notifications_enabled, smtp_host, smtp_port, smtp_secure,
             smtp_user, from_email, from_name, company_logo_url, use_custom_smtp,
             plan, service_level_pricing, tax_percentage, sam_enabled, shop_code, created_at
             FROM companies WHERE id = $1`,
            [req.user.company_id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Update settings
router.patch('/settings', authenticate, async (req, res) => {
    try {
        // Check which columns exist in the companies table
        const columnCheckResult = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'companies'
            AND column_name IN ('service_level_pricing', 'tax_percentage')
        `);

        const existingColumns = new Set(columnCheckResult.rows.map(r => r.column_name));

        const allowed = [
            'name', 'email', 'phone', 'website', 'logo_url', 'primary_color',
            'background_color', 'sidebar_color',
            'psa_api_key', 'auto_refresh_enabled', 'auto_refresh_interval_hours',
            'email_notifications_enabled', 'smtp_host', 'smtp_port', 'smtp_secure',
            'smtp_user', 'smtp_password', 'from_email', 'from_name', 'company_logo_url',
            'use_custom_smtp', 'service_level_pricing', 'tax_percentage', 'sam_enabled'
        ];
        const updates = [], values = [];
        const skippedFields = [];
        let i = 1;

        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                // Skip fields that don't exist in database yet
                if ((field === 'service_level_pricing' || field === 'tax_percentage') && !existingColumns.has(field)) {
                    skippedFields.push(field);
                    console.log(`Note: Skipping ${field} - column not found. Run migration to add it.`);
                    continue;
                }

                // Handle JSONB fields
                if (field === 'service_level_pricing') {
                    updates.push(`${field} = $${i++}::jsonb`);
                    values.push(JSON.stringify(req.body[field]));
                } else {
                    updates.push(`${field} = $${i++}`);
                    values.push(req.body[field]);
                }
            }
        }

        if (updates.length === 0) {
            if (skippedFields.length > 0) {
                return res.status(400).json({
                    error: 'Database migration required',
                    message: `The following fields require migration: ${skippedFields.join(', ')}. Please run the database migration from Settings page.`,
                    skipped_fields: skippedFields
                });
            }
            return res.status(400).json({ error: 'No valid fields' });
        }

        values.push(req.user.company_id);
        const result = await db.query(`UPDATE companies SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Set PSA API key
router.post('/psa-key', authenticate, async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) return res.status(400).json({ error: 'API key required' });

        // Test the key
        const axios = require('axios');
        try {
            await axios.get('https://api.psacard.com/publicapi/cert/GetByCertNumber/12345678', {
                headers: { 'Authorization': `Bearer ${apiKey}` },
                timeout: 10000,
                validateStatus: (s) => s !== 401
            });
        } catch (e) {
            if (e.response?.status === 401) return res.status(400).json({ error: 'Invalid PSA API key' });
        }

        // Check if another company is already using this key
        const duplicateCheck = await db.query(
            'SELECT id, name FROM companies WHERE psa_api_key = $1 AND id != $2',
            [apiKey, req.user.company_id]
        );

        await db.query('UPDATE companies SET psa_api_key = $1 WHERE id = $2', [apiKey, req.user.company_id]);

        if (duplicateCheck.rows.length > 0) {
            const otherNames = duplicateCheck.rows.map(r => r.name).join(', ');
            return res.json({
                message: 'PSA API key saved',
                warning: `This API key is also used by: ${otherNames}. Sharing a key across companies doubles API usage and can cause rate limiting. Consider removing the key from unused companies.`
            });
        }

        res.json({ message: 'PSA API key saved' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save API key' });
    }
});

// Get stats
router.get('/stats', authenticate, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM customers WHERE company_id = $1) as total_customers,
                (SELECT COUNT(*) FROM submissions WHERE company_id = $1) as total_submissions,
                (SELECT COUNT(*) FROM submissions WHERE company_id = $1 AND shipped = false) as active_submissions,
                (SELECT COUNT(*) FROM submissions WHERE company_id = $1 AND grades_ready = true AND shipped = false) as grades_ready,
                (SELECT COUNT(*) FROM submissions WHERE company_id = $1 AND problem_order = true AND shipped = false) as problem_orders,
                (SELECT COUNT(*) FROM cards WHERE company_id = $1) as total_cards
        `, [req.user.company_id]);
        res.json(stats.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Get current plan usage vs limits
router.get('/usage', authenticate, async (req, res) => {
    try {
        const { company_id, plan } = req.user;
        const limits = getLimits(plan || 'free');

        const [cardResult, custResult, monthCardResult] = await Promise.all([
            db.query('SELECT COUNT(*) FROM cards WHERE company_id = $1', [company_id]),
            db.query('SELECT COUNT(*) FROM customers WHERE company_id = $1', [company_id]),
            db.query(
                `SELECT COUNT(*) FROM cards WHERE company_id = $1
                 AND created_at >= date_trunc('month', NOW())`,
                [company_id]
            )
        ]);

        const cardsThisMonth = parseInt(monthCardResult.rows[0].count, 10);
        const totalCustomers = parseInt(custResult.rows[0].count, 10);
        const cardLimit = limits.cards_per_month === Infinity ? null : limits.cards_per_month;
        const customerLimit = limits.customers === Infinity ? null : limits.customers;

        res.json({
            plan: plan || 'free',
            cards_this_month: cardsThisMonth,
            cards_limit: cardLimit,
            cards_percent: cardLimit ? Math.round((cardsThisMonth / cardLimit) * 100) : 0,
            customers: totalCustomers,
            customers_limit: customerLimit,
            customers_percent: customerLimit ? Math.round((totalCustomers / customerLimit) * 100) : 0,
            total_cards: parseInt(cardResult.rows[0].count, 10),
        });
    } catch (error) {
        console.error('Get usage error:', error);
        res.status(500).json({ error: 'Failed to get usage' });
    }
});

// Get auto-refresh settings
router.get('/auto-refresh-settings', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT auto_refresh_enabled, auto_refresh_schedule, auto_refresh_day_of_week,
                    auto_refresh_hour, auto_refresh_email, last_auto_refresh
             FROM companies WHERE id = $1`,
            [req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get auto-refresh settings error:', error);
        res.status(500).json({ error: 'Failed to get auto-refresh settings' });
    }
});

// Update auto-refresh settings
router.patch('/auto-refresh-settings', authenticate, async (req, res) => {
    try {
        const {
            auto_refresh_enabled,
            auto_refresh_schedule,
            auto_refresh_day_of_week,
            auto_refresh_hour,
            auto_refresh_email
        } = req.body;

        // Validate schedule if provided
        if (auto_refresh_schedule && !['daily', 'weekly', 'biweekly'].includes(auto_refresh_schedule)) {
            return res.status(400).json({ error: 'Invalid schedule. Must be: daily, weekly, or biweekly' });
        }

        // Validate day of week if provided
        if (auto_refresh_day_of_week !== undefined && (auto_refresh_day_of_week < 0 || auto_refresh_day_of_week > 6)) {
            return res.status(400).json({ error: 'Invalid day of week. Must be 0-6 (0=Sunday)' });
        }

        // Validate hour if provided
        if (auto_refresh_hour !== undefined && (auto_refresh_hour < 0 || auto_refresh_hour > 23)) {
            return res.status(400).json({ error: 'Invalid hour. Must be 0-23' });
        }

        const updates = [];
        const values = [];
        let i = 1;

        if (auto_refresh_enabled !== undefined) {
            updates.push(`auto_refresh_enabled = $${i++}`);
            values.push(auto_refresh_enabled);
        }

        if (auto_refresh_schedule) {
            updates.push(`auto_refresh_schedule = $${i++}`);
            values.push(auto_refresh_schedule);
        }

        if (auto_refresh_day_of_week !== undefined) {
            updates.push(`auto_refresh_day_of_week = $${i++}`);
            values.push(auto_refresh_day_of_week);
        }

        if (auto_refresh_hour !== undefined) {
            updates.push(`auto_refresh_hour = $${i++}`);
            values.push(auto_refresh_hour);
        }

        if (auto_refresh_email !== undefined) {
            updates.push(`auto_refresh_email = $${i++}`);
            values.push(auto_refresh_email || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        values.push(req.user.company_id);
        const result = await db.query(
            `UPDATE companies SET ${updates.join(', ')} WHERE id = $${i}
             RETURNING auto_refresh_enabled, auto_refresh_schedule, auto_refresh_day_of_week,
                       auto_refresh_hour, auto_refresh_email, last_auto_refresh`,
            values
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update auto-refresh settings error:', error);
        res.status(500).json({ error: 'Failed to update auto-refresh settings' });
    }
});

module.exports = router;
