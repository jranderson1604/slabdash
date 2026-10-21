const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');

// Export all company data (GDPR data portability)
router.get('/export', authenticate, async (req, res) => {
  try {
    const companyId = req.companyId;

    const [companyRes, usersRes, customersRes, submissionsRes, cardsRes, buybackRes] = await Promise.all([
      db.query(`SELECT id, name, slug, email, phone, website, plan, created_at FROM companies WHERE id = $1`, [companyId]),
      db.query(`SELECT id, email, name, role, created_at FROM users WHERE company_id = $1 AND is_active = true`, [companyId]),
      db.query(`SELECT id, email, name, phone, address_line1, city, state, postal_code, notes, created_at FROM customers WHERE company_id = $1`, [companyId]),
      db.query(`SELECT id, order_number, service_level, status, submitted_at, returned_at, notes, created_at FROM submissions WHERE company_id = $1`, [companyId]),
      db.query(`SELECT id, cert_number, player_name, year, brand, grade, submission_id, created_at FROM cards WHERE company_id = $1`, [companyId]),
      db.query(`SELECT id, customer_id, offer_amount, status, created_at FROM buyback_offers WHERE company_id = $1`, [companyId]),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      company: companyRes.rows[0],
      users: usersRes.rows,
      customers: customersRes.rows,
      submissions: submissionsRes.rows,
      cards: cardsRes.rows,
      buyback_offers: buybackRes.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="slabdash-export-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Delete account — requires password confirmation, deletes entire company + cascade
router.delete('/delete', authenticate, async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ error: 'Type DELETE MY ACCOUNT to confirm' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password required to confirm deletion' });
    }

    // Only admins can delete the account
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only account admins can delete the account' });
    }

    // Verify password
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, userRes.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    // Cancel Stripe subscription if active
    try {
      const companyRes = await db.query('SELECT stripe_subscription_id FROM companies WHERE id = $1', [req.companyId]);
      const subId = companyRes.rows[0]?.stripe_subscription_id;
      if (subId && process.env.STRIPE_SECRET_KEY) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(subId);
      }
    } catch (stripeErr) {
      console.warn('Could not cancel Stripe subscription during account deletion:', stripeErr.message);
    }

    // Delete company — cascades to all related tables via FK constraints
    await db.query('DELETE FROM companies WHERE id = $1', [req.companyId]);

    console.log(`[Account] Company ${req.companyId} deleted by user ${req.user.id}`);
    res.json({ success: true, message: 'Account and all data permanently deleted.' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

module.exports = router;
