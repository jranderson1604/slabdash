const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { authenticate, requireOwner } = require('../middleware/auth');

// All owner routes require authentication + owner role
router.use(authenticate, requireOwner);

// ─── PLATFORM STATS ──────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM companies) as total_shops,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM submissions) as total_submissions,
        (SELECT COUNT(*) FROM cards) as total_cards,
        (SELECT COUNT(*) FROM submissions WHERE shipped = false AND (picked_up IS NULL OR picked_up = false)) as active_submissions,
        (SELECT COUNT(*) FROM submissions WHERE shipped = true OR picked_up = true) as shipped_submissions,
        (SELECT COUNT(*) FROM submissions WHERE grades_ready = true AND shipped = false AND (picked_up IS NULL OR picked_up = false)) as ready_submissions,
        (SELECT COUNT(*) FROM submissions WHERE problem_order = true AND shipped = false AND (picked_up IS NULL OR picked_up = false)) as problem_submissions,
        (SELECT COUNT(*) FROM companies WHERE created_at >= NOW() - INTERVAL '30 days') as new_shops_30d,
        (SELECT COUNT(*) FROM submissions WHERE created_at >= NOW() - INTERVAL '7 days') as submissions_7d,
        (SELECT COUNT(*) FROM submissions WHERE created_at >= NOW() - INTERVAL '30 days') as submissions_30d,
        (SELECT COUNT(*) FROM customers WHERE created_at >= NOW() - INTERVAL '30 days') as new_customers_30d
    `);

    let waitlist_count = 0;
    try {
      const wl = await db.query('SELECT COUNT(*) FROM waitlist');
      waitlist_count = parseInt(wl.rows[0].count);
    } catch (e) { /* table may not exist */ }

    res.json({ ...stats.rows[0], waitlist_count });
  } catch (error) {
    console.error('[Owner] Stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── COMPANIES ───────────────────────────────────────────────────

router.get('/companies', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.*,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT cu.id) as customer_count,
        COUNT(DISTINCT s.id) as submission_count,
        COUNT(DISTINCT ca.id) as card_count,
        COUNT(DISTINCT CASE WHEN s.shipped = false AND (s.picked_up IS NULL OR s.picked_up = false) THEN s.id END) as active_submissions,
        COUNT(DISTINCT CASE WHEN s.shipped = true OR s.picked_up = true THEN s.id END) as shipped_submissions,
        COUNT(DISTINCT CASE WHEN s.grades_ready = true AND s.shipped = false AND (s.picked_up IS NULL OR s.picked_up = false) THEN s.id END) as ready_submissions,
        COUNT(DISTINCT CASE WHEN s.problem_order = true AND s.shipped = false AND (s.picked_up IS NULL OR s.picked_up = false) THEN s.id END) as problem_submissions,
        MAX(s.last_refreshed_at) as last_submission_refresh
      FROM companies c
      LEFT JOIN users u ON c.id = u.company_id AND u.is_active = true
      LEFT JOIN customers cu ON c.id = cu.company_id
      LEFT JOIN submissions s ON c.id = s.company_id
      LEFT JOIN cards ca ON c.id = ca.company_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    const companies = result.rows.map(c => ({
      ...c,
      has_psa_key: !!c.psa_api_key,
      psa_api_key_preview: c.psa_api_key ? '····' + c.psa_api_key.slice(-4) : null,
      psa_api_key: undefined,
    }));

    res.json(companies);
  } catch (error) {
    console.error('[Owner] Companies error:', error.message);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

router.patch('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      'name', 'email', 'plan', 'psa_api_key', 'sam_enabled',
      'auto_refresh_enabled', 'auto_refresh_interval_hours',
      'email_notifications_enabled',
    ];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        values.push(req.body[field]);
        idx++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await db.query(
      `UPDATE companies SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = result.rows[0];
    const changed = Object.keys(req.body).filter(k => allowed.includes(k));
    console.log(`[Owner] Updated "${company.name}": ${changed.join(', ')}`);

    res.json({
      ...company,
      has_psa_key: !!company.psa_api_key,
      psa_api_key_preview: company.psa_api_key ? '····' + company.psa_api_key.slice(-4) : null,
      psa_api_key: undefined,
    });
  } catch (error) {
    console.error('[Owner] Update company error:', error.message);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// ─── PSA KEY MANAGEMENT ──────────────────────────────────────────

router.post('/companies/:id/clear-psa-key', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE companies SET psa_api_key = NULL, updated_at = NOW() WHERE id = $1 RETURNING name',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    console.log(`[Owner] Cleared PSA key for "${result.rows[0].name}"`);
    res.json({ success: true, company: result.rows[0].name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear PSA key' });
  }
});

router.post('/clear-all-psa-keys', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE companies SET psa_api_key = NULL, updated_at = NOW() RETURNING id, name'
    );
    console.log(`[Owner] Cleared PSA keys from ${result.rowCount} companies`);
    res.json({ success: true, cleared: result.rowCount, companies: result.rows.map(r => r.name) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear PSA keys' });
  }
});

// ─── USER MANAGEMENT ─────────────────────────────────────────────

router.get('/companies/:id/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users WHERE company_id = $1 ORDER BY role DESC, name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/companies/:id/users/:userId/reset-password', async (req, res) => {
  try {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];
    tempPassword += 'A1!';

    const hash = await bcrypt.hash(tempPassword, 10);
    const result = await db.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2 AND company_id = $3 RETURNING name, email`,
      [hash, req.params.userId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    console.log(`[Owner] Reset password for "${result.rows[0].name}" (${result.rows[0].email})`);
    res.json({ success: true, tempPassword, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.patch('/companies/:companyId/users/:userId', async (req, res) => {
  try {
    const { is_active, role } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (is_active !== undefined) { updates.push(`is_active = $${idx}`); values.push(is_active); idx++; }
    if (role !== undefined) { updates.push(`role = $${idx}`); values.push(role); idx++; }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.params.userId, req.params.companyId);
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1} RETURNING id, name, email, role, is_active`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ─── PSA REFRESH ─────────────────────────────────────────────────

router.post('/companies/:id/trigger-refresh', async (req, res) => {
  try {
    const company = await db.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (company.rows.length === 0) return res.status(404).json({ error: 'Company not found' });

    const c = company.rows[0];
    if (!c.psa_api_key) return res.status(400).json({ error: 'No PSA API key configured' });

    const { runCompanyRefresh } = require('../services/scheduledRefreshService');
    const result = await runCompanyRefresh(c, c.psa_api_key);

    console.log(`[Owner] Manual refresh for "${c.name}": ${result?.updatedCount || 0} updated`);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Owner] Trigger refresh error:', error.message);
    res.status(500).json({ error: error.message || 'Refresh failed' });
  }
});

// ─── SYSTEM HEALTH ───────────────────────────────────────────────

router.get('/system-health', async (req, res) => {
  try {
    const refreshes = await db.query(`
      SELECT c.id, c.name, c.auto_refresh_enabled, c.last_auto_refresh,
             c.psa_api_key IS NOT NULL as has_psa_key,
             c.sam_enabled,
             (SELECT MAX(last_refreshed_at) FROM submissions WHERE company_id = c.id) as last_submission_refresh,
             (SELECT COUNT(*) FROM submissions WHERE company_id = c.id AND shipped = false) as active_count
      FROM companies c ORDER BY c.name
    `);

    let recent_logs = [];
    try {
      const logs = await db.query(`
        SELECT rl.*, c.name as company_name
        FROM psa_refresh_logs rl
        JOIN companies c ON rl.company_id = c.id
        ORDER BY rl.created_at DESC LIMIT 10
      `);
      recent_logs = logs.rows;
    } catch (e) { /* table may not exist */ }

    res.json({ companies: refreshes.rows, recent_logs });
  } catch (error) {
    console.error('[Owner] System health error:', error.message);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// ─── WAITLIST ────────────────────────────────────────────────────

router.get('/waitlist', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM waitlist ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
});

router.delete('/waitlist/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM waitlist WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ─── NEWSLETTER ──────────────────────────────────────────────────

router.post('/newsletter', async (req, res) => {
  try {
    const { subject, message, targetPlan } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message required' });
    }

    let query = `
      SELECT DISTINCT u.email, u.name, c.name as company_name, c.plan
      FROM companies c
      JOIN users u ON c.id = u.company_id
      WHERE u.is_active = true AND u.role IN ('admin', 'owner')
    `;
    const params = [];
    if (targetPlan && targetPlan !== 'all') {
      query += ' AND c.plan = $1';
      params.push(targetPlan);
    }

    const result = await db.query(query, params);
    res.json({ success: true, recipientCount: result.rows.length, recipients: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to prepare newsletter' });
  }
});

// ─── ACTIVITY ────────────────────────────────────────────────────

router.get('/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const result = await db.query(`
      (
        SELECT 'new_shop' as type, c.id, c.name as label,
               c.plan, c.created_at, NULL as detail
        FROM companies c ORDER BY c.created_at DESC LIMIT 5
      )
      UNION ALL
      (
        SELECT 'submission' as type, co.id, co.name as label,
               co.plan, s.created_at,
               s.psa_submission_number as detail
        FROM submissions s
        JOIN companies co ON s.company_id = co.id
        WHERE s.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY s.created_at DESC LIMIT 15
      )
      ORDER BY created_at DESC LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ─── DELETE COMPANY ──────────────────────────────────────────────

router.delete('/companies/:id', async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const company = await client.query('SELECT id, name FROM companies WHERE id = $1', [id]);
    if (company.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Company not found' });
    }

    const companyName = company.rows[0].name;
    await client.query(
      `DELETE FROM submission_customers WHERE submission_id IN (SELECT id FROM submissions WHERE company_id = $1)`, [id]
    );
    await client.query('DELETE FROM cards WHERE company_id = $1', [id]);
    await client.query('DELETE FROM submissions WHERE company_id = $1', [id]);
    await client.query('DELETE FROM customers WHERE company_id = $1', [id]);
    await client.query('DELETE FROM users WHERE company_id = $1', [id]);
    await client.query('DELETE FROM companies WHERE id = $1', [id]);

    await client.query('COMMIT');
    console.log(`[Owner] Deleted company "${companyName}" (${id})`);
    res.json({ success: true, message: `Deleted "${companyName}" and all related data` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Owner] Delete company error:', error.message);
    res.status(500).json({ error: 'Failed to delete company' });
  } finally {
    client.release();
  }
});

// ─── PLATFORM ANALYTICS ──────────────────────────────────────────

router.get('/platform-analytics', async (req, res) => {
  try {
    const [featuresR, growthR, revenueR] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE psa_api_key IS NOT NULL AND psa_api_key != '') AS psa_connected,
          COUNT(*) FILTER (WHERE sam_enabled = true) AS sam_enabled,
          COUNT(*) FILTER (WHERE auto_refresh_enabled = true) AS auto_refresh,
          COUNT(*) FILTER (WHERE email_notifications_enabled = true) AS email_notifications,
          COUNT(*) AS total
        FROM companies
      `),
      db.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COUNT(*) AS new_shops
        FROM companies
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `),
      db.query(`
        SELECT
          COALESCE(SUM(total_cost), 0) AS total_revenue,
          COALESCE(ROUND(AVG(card_count), 1), 0) AS avg_cards_per_submission,
          COALESCE(MAX(card_count), 0) AS max_cards
        FROM submissions
      `),
    ]);

    res.json({
      features: featuresR.rows[0],
      growth: growthR.rows,
      revenue: revenueR.rows[0],
    });
  } catch (err) {
    console.error('[Owner] Platform analytics error:', err.message);
    res.status(500).json({ error: 'Failed to load platform analytics' });
  }
});

module.exports = router;
