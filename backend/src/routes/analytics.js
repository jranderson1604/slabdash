const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/analytics/summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const cid = req.user.company_id;

    const [submissionsR, cardsR, customersR, revenueR] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE shipped = false AND picked_up = false) AS active,
           COUNT(*) FILTER (WHERE grades_ready = true) AS grades_ready,
           COUNT(*) FILTER (WHERE shipped = true OR picked_up = true) AS completed,
           COUNT(*) FILTER (WHERE problem_order = true AND shipped = false) AS problem,
           COUNT(*) AS total,
           ROUND(AVG(progress_percent) FILTER (WHERE shipped = false), 1) AS avg_progress
         FROM submissions WHERE company_id = $1`,
        [cid]
      ),
      db.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE grade IS NOT NULL) AS graded,
           COUNT(*) FILTER (WHERE grade = '10') AS gem_mint,
           COUNT(*) FILTER (WHERE grade = '9.5') AS pristine,
           COUNT(*) FILTER (WHERE grade = '9') AS mint,
           ROUND(AVG(CASE WHEN grade ~ '^[0-9]+(\\.[0-9]+)?$' THEN grade::numeric END), 2) AS avg_grade
         FROM cards WHERE company_id = $1`,
        [cid]
      ),
      db.query(
        `SELECT COUNT(*) AS total FROM customers WHERE company_id = $1`,
        [cid]
      ),
      db.query(
        `SELECT
           COALESCE(SUM(total_cost), 0) AS total_revenue,
           COALESCE(SUM(total_cost) FILTER (WHERE invoice_sent = true), 0) AS invoiced_revenue
         FROM submissions WHERE company_id = $1`,
        [cid]
      ),
    ]);

    res.json({
      submissions: submissionsR.rows[0],
      cards: cardsR.rows[0],
      customers: customersR.rows[0],
      revenue: revenueR.rows[0],
    });
  } catch (err) {
    console.error('[Analytics] summary error:', err.message);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

// GET /api/analytics/grade-distribution
router.get('/grade-distribution', authenticate, async (req, res) => {
  try {
    const cid = req.user.company_id;
    const result = await db.query(
      `SELECT grade, COUNT(*) AS count
       FROM cards
       WHERE company_id = $1
         AND grade IS NOT NULL
         AND grade ~ '^[0-9]+(\\.[0-9]+)?$'
       GROUP BY grade
       ORDER BY grade::numeric DESC`,
      [cid]
    );
    res.json({ grades: result.rows });
  } catch (err) {
    console.error('[Analytics] grade-distribution error:', err.message);
    res.status(500).json({ error: 'Failed to load grade distribution' });
  }
});

// GET /api/analytics/monthly-trends  (last 12 months)
router.get('/monthly-trends', authenticate, async (req, res) => {
  try {
    const cid = req.user.company_id;
    const result = await db.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
         COUNT(*) AS submissions,
         COUNT(*) FILTER (WHERE grades_ready = true) AS graded,
         COUNT(*) FILTER (WHERE shipped = true OR picked_up = true) AS completed
       FROM submissions
       WHERE company_id = $1
         AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
      [cid]
    );
    res.json({ months: result.rows });
  } catch (err) {
    console.error('[Analytics] monthly-trends error:', err.message);
    res.status(500).json({ error: 'Failed to load monthly trends' });
  }
});

// GET /api/analytics/service-levels
router.get('/service-levels', authenticate, async (req, res) => {
  try {
    const cid = req.user.company_id;
    const result = await db.query(
      `SELECT
         COALESCE(service_level, 'Unknown') AS service_level,
         COUNT(*) AS count,
         ROUND(AVG(card_count)) AS avg_cards
       FROM submissions
       WHERE company_id = $1
       GROUP BY service_level
       ORDER BY count DESC`,
      [cid]
    );
    res.json({ levels: result.rows });
  } catch (err) {
    console.error('[Analytics] service-levels error:', err.message);
    res.status(500).json({ error: 'Failed to load service levels' });
  }
});

// GET /api/analytics/turnaround
router.get('/turnaround', authenticate, async (req, res) => {
  try {
    const cid = req.user.company_id;
    const result = await db.query(
      `SELECT
         COALESCE(service_level, 'Unknown') AS service_level,
         COUNT(*) AS count,
         ROUND(AVG(COALESCE(date_graded, date_shipped) - date_sent)) AS avg_days,
         ROUND(MIN(COALESCE(date_graded, date_shipped) - date_sent)) AS min_days,
         ROUND(MAX(COALESCE(date_graded, date_shipped) - date_sent)) AS max_days
       FROM submissions
       WHERE company_id = $1
         AND (grades_ready = true OR shipped = true OR picked_up = true)
         AND date_sent IS NOT NULL
         AND COALESCE(date_graded, date_shipped) IS NOT NULL
       GROUP BY service_level
       ORDER BY avg_days ASC`,
      [cid]
    );
    res.json({ turnaround: result.rows });
  } catch (err) {
    console.error('[Analytics] turnaround error:', err.message);
    res.status(500).json({ error: 'Failed to load turnaround stats' });
  }
});

// GET /api/analytics/top-customers
router.get('/top-customers', authenticate, async (req, res) => {
  try {
    const cid = req.user.company_id;
    const result = await db.query(
      `SELECT
         cu.id, cu.name, cu.email,
         COUNT(DISTINCT c.id)::int AS card_count,
         COUNT(DISTINCT c.id) FILTER (WHERE c.grade IS NOT NULL) AS graded_count,
         ROUND(AVG(CASE WHEN c.grade ~ '^[0-9]+(\\.[0-9]+)?$' THEN c.grade::numeric END), 2) AS avg_grade
       FROM customers cu
       LEFT JOIN cards c ON c.customer_owner_id = cu.id AND c.company_id = $1
       WHERE cu.company_id = $1
       GROUP BY cu.id, cu.name, cu.email
       ORDER BY card_count DESC
       LIMIT 10`,
      [cid]
    );
    res.json({ customers: result.rows });
  } catch (err) {
    console.error('[Analytics] top-customers error:', err.message);
    res.status(500).json({ error: 'Failed to load top customers' });
  }
});

module.exports = router;
