const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

// Lazy-load email to avoid circular deps at startup
let sendVerificationEmail;
const getEmailFn = () => {
  if (!sendVerificationEmail) {
    sendVerificationEmail = require('../services/emailService').sendWaitlistVerificationEmail;
  }
  return sendVerificationEmail;
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
      'SELECT id, verified FROM waitlist WHERE email = $1',
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].verified) {
        return res.json({ success: true, message: "You're already verified!" });
      }
      // Resend verification — generate a fresh token
      const token = crypto.randomBytes(32).toString('hex');
      await db.query(
        'UPDATE waitlist SET verification_token = $1 WHERE email = $2',
        [token, cleanEmail]
      );
      try {
        await getEmailFn()(cleanEmail, shop_name?.trim(), token);
      } catch (emailErr) {
        console.error('[Waitlist] Verification email failed:', emailErr.message);
      }
      return res.json({ success: true, message: "Check your email to verify your address!" });
    }

    const token = crypto.randomBytes(32).toString('hex');

    // Insert
    await db.query(
      `INSERT INTO waitlist (email, shop_name, role, source, verification_token, verified)
       VALUES ($1, $2, $3, $4, $5, FALSE)`,
      [cleanEmail, shop_name?.trim() || null, role?.trim() || null, 'landing_page', token]
    );

    // Send verification email (non-blocking)
    try {
      await getEmailFn()(cleanEmail, shop_name?.trim(), token);
    } catch (emailErr) {
      console.error('[Waitlist] Verification email failed:', emailErr.message);
    }

    res.json({ success: true, message: "Check your email to verify your address!" });
  } catch (err) {
    console.error('[Waitlist] Error:', err.message);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

/**
 * GET /api/waitlist/verify/:token — Verify email from link
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Invalid token' });

    const result = await db.query(
      'SELECT id, verified FROM waitlist WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired verification link' });
    }

    if (result.rows[0].verified) {
      return res.json({ success: true, already: true, message: "Email already verified!" });
    }

    await db.query(
      'UPDATE waitlist SET verified = TRUE, verification_token = NULL WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({ success: true, message: "Email verified! You're on the list." });
  } catch (err) {
    console.error('[Waitlist] Verify error:', err.message);
    res.status(500).json({ error: 'Verification failed' });
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
