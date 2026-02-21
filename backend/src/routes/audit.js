const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/audit — paginated audit log for this company
router.get('/', authenticate, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity_type, user_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = ['al.company_id = $1'];
    const values = [req.user.company_id];
    let i = 2;

    if (action) { conditions.push(`al.action = $${i++}`); values.push(action); }
    if (entity_type) { conditions.push(`al.entity_type = $${i++}`); values.push(entity_type); }
    if (user_id) { conditions.push(`al.user_id = $${i++}`); values.push(user_id); }

    const where = conditions.join(' AND ');

    const [rows, total] = await Promise.all([
      db.query(
        `SELECT al.id, al.action, al.entity_type, al.entity_id, al.details,
                al.ip, al.created_at,
                u.name as user_name, u.email as user_email
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE ${where}
         ORDER BY al.created_at DESC
         LIMIT $${i++} OFFSET $${i++}`,
        [...values, Number(limit), offset]
      ),
      db.query(`SELECT COUNT(*) FROM audit_logs al WHERE ${where}`, values),
    ]);

    res.json({
      logs: rows.rows,
      total: parseInt(total.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error('[Audit] list error:', err.message);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});

module.exports = router;
