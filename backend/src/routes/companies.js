const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// Get settings
router.get('/settings', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, slug, email, phone, website, logo_url, psa_api_key,
             primary_color, auto_refresh_enabled, auto_refresh_interval_hours,
             email_notifications_enabled, plan, created_at
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
        const allowed = [
            'name', 'email', 'phone', 'website', 'logo_url', 'primary_color',
            'psa_api_key', 'auto_refresh_enabled', 'auto_refresh_interval_hours',
            'email_notifications_enabled'
        ];
        const updates = [], values = [];
        let i = 1;

        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = $${i++}`);
                values.push(req.body[field]);
            }
        }

        if (updates.length === 0) return res.status(400).json({ error: 'No valid fields' });

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
        
        await db.query('UPDATE companies SET psa_api_key = $1 WHERE id = $2', [apiKey, req.user.company_id]);
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

module.exports = router;
