const express = require('express');
const router = express.Router();
const db = require('../db');

// Lazy-load email to avoid circular deps at startup
let sendWaitlistEmail;
const getEmailFn = () => {
  if (!sendWaitlistEmail) {
    sendWaitlistEmail = require('../services/emailService').sendWaitlistConfirmationEmail;
  }
  return sendWaitlistEmail;
};

/**
 * POST /api/waitlist — Join the waitlist
 */
router.post('/', async (req, res) => {
  try {
    const { email, shop_name, role } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if already on waitlist
    const existing = await db.query(
      'SELECT id FROM waitlist WHERE email = $1',
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, message: "You're already on the list!" });
    }

    // Insert
    await db.query(
      `INSERT INTO waitlist (email, shop_name, role, source)
       VALUES ($1, $2, $3, $4)`,
      [cleanEmail, shop_name?.trim() || null, role?.trim() || null, 'landing_page']
    );

    // Send confirmation email (non-blocking — don't fail the response)
    try {
      await getEmailFn()(cleanEmail, shop_name?.trim());
    } catch (emailErr) {
      console.error('[Waitlist] Confirmation email failed:', emailErr.message);
    }

    res.json({ success: true, message: "You're on the list!" });
  } catch (err) {
    console.error('[Waitlist] Error:', err.message);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

/**
 * GET /api/waitlist/count — Public waitlist count for social proof
 */
router.get('/count', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM waitlist');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch {
    res.json({ count: 0 });
  }
});

module.exports = router;
