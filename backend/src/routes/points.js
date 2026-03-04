const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { getConfig, upsertConfig, awardPoints, redeemPoints } = require('../services/pointsService');

const router = express.Router();

// GET /api/points/config
router.get('/config', authenticate, async (req, res) => {
  try {
    const config = await getConfig(req.user.company_id);
    res.json(config);
  } catch (err) {
    console.error('Get points config error:', err);
    res.status(500).json({ error: 'Failed to fetch points config' });
  }
});

// PATCH /api/points/config
router.patch('/config', authenticate, async (req, res) => {
  try {
    const config = await upsertConfig(req.user.company_id, req.body);
    res.json(config);
  } catch (err) {
    console.error('Update points config error:', err);
    res.status(500).json({ error: 'Failed to update points config' });
  }
});

// GET /api/points/leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.email,
        COALESCE(c.points_balance, 0) as points_balance,
        COALESCE(c.lifetime_points_earned, 0) as lifetime_points_earned
       FROM customers c
       WHERE c.company_id = $1
         AND COALESCE(c.lifetime_points_earned, 0) > 0
       ORDER BY c.lifetime_points_earned DESC
       LIMIT 50`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/points/customers/:id — balance + transaction history
router.get('/customers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const customerResult = await db.query(
      `SELECT id, name, email,
        COALESCE(points_balance, 0) as points_balance,
        COALESCE(lifetime_points_earned, 0) as lifetime_points_earned
       FROM customers WHERE id = $1 AND company_id = $2`,
      [id, req.user.company_id]
    );
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const txResult = await db.query(
      `SELECT pt.*, u.name as created_by_name
       FROM points_transactions pt
       LEFT JOIN users u ON pt.created_by = u.id
       WHERE pt.customer_id = $1 AND pt.company_id = $2
       ORDER BY pt.created_at DESC
       LIMIT 100`,
      [id, req.user.company_id]
    );

    res.json({
      ...customerResult.rows[0],
      transactions: txResult.rows
    });
  } catch (err) {
    console.error('Get customer points error:', err);
    res.status(500).json({ error: 'Failed to fetch customer points' });
  }
});

// POST /api/points/customers/:id/adjust — manual award or deduct
router.post('/customers/:id/adjust', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount === 0) {
      return res.status(400).json({ error: 'amount is required and cannot be zero' });
    }
    if (!description) {
      return res.status(400).json({ error: 'description is required' });
    }

    // Verify customer belongs to company
    const check = await db.query(
      'SELECT id FROM customers WHERE id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    let tx;
    if (amount > 0) {
      tx = await awardPoints(
        req.user.company_id, id, amount,
        'manual_adjust', null, null,
        description, req.user.id
      );
    } else {
      tx = await redeemPoints(
        req.user.company_id, id, Math.abs(amount),
        description, req.user.id
      );
    }

    res.status(201).json(tx);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Adjust points error:', err);
    res.status(500).json({ error: 'Failed to adjust points' });
  }
});

// POST /api/points/customers/:id/redeem — redeem points for a discount
router.post('/customers/:id/redeem', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { points, description } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ error: 'points must be a positive number' });
    }

    const check = await db.query(
      'SELECT id FROM customers WHERE id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const config = await getConfig(req.user.company_id);
    if (!config.enabled) {
      return res.status(400).json({ error: 'Rewards program is not enabled' });
    }
    if (points < config.min_redemption_points) {
      return res.status(400).json({
        error: `Minimum redemption is ${config.min_redemption_points} points`
      });
    }

    const discountDollars = (points / config.redemption_rate).toFixed(2);
    const tx = await redeemPoints(
      req.user.company_id, id, points,
      description || `Redeemed ${points} pts for $${discountDollars} discount`,
      req.user.id
    );

    res.status(201).json({ ...tx, discount_dollars: parseFloat(discountDollars) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Redeem points error:', err);
    res.status(500).json({ error: 'Failed to redeem points' });
  }
});

module.exports = router;
