const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { fireWebhook } = require('../services/webhookService');

const VALID_EVENTS = [
  '*',
  'submission.grades_ready',
  'submission.shipped',
  'submission.problem',
  'submission.step_changed',
  'customer.created',
  'card.graded',
];

// List webhooks for this company
router.get('/', authenticate, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, url, events, enabled, last_fired_at, last_status, error_count, created_at
       FROM webhooks WHERE company_id = $1 ORDER BY created_at DESC`,
      [req.user.company_id]
    );
    res.json({ webhooks: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

// Create webhook
router.post('/', authenticate, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { url, events = ['*'] } = req.body;
    if (!url || !/^https?:\/\/.+/.test(url)) {
      return res.status(400).json({ error: 'Valid URL required' });
    }
    const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({ error: `Invalid events: ${invalidEvents.join(', ')}` });
    }

    const secret = crypto.randomBytes(24).toString('hex');
    const result = await db.query(
      `INSERT INTO webhooks (company_id, url, secret, events, enabled)
       VALUES ($1, $2, $3, $4, true) RETURNING id, url, events, enabled, created_at`,
      [req.user.company_id, url, secret, JSON.stringify(events)]
    );

    // Return secret only on creation
    res.status(201).json({ webhook: { ...result.rows[0], secret } });
  } catch (err) {
    console.error('[Webhooks] create error:', err.message);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// Update webhook
router.patch('/:id', authenticate, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { url, events, enabled } = req.body;
    const fields = [];
    const values = [];
    let i = 1;

    if (url !== undefined) { fields.push(`url = $${i++}`); values.push(url); }
    if (events !== undefined) { fields.push(`events = $${i++}`); values.push(JSON.stringify(events)); }
    if (enabled !== undefined) { fields.push(`enabled = $${i++}`); values.push(enabled); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.params.id, req.user.company_id);
    const result = await db.query(
      `UPDATE webhooks SET ${fields.join(', ')} WHERE id = $${i++} AND company_id = $${i++}
       RETURNING id, url, events, enabled`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ webhook: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// Delete webhook
router.delete('/:id', authenticate, requireRole('owner', 'admin'), async (req, res) => {
  try {
    await db.query(
      `DELETE FROM webhooks WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// Test webhook — fires a ping event to the endpoint
router.post('/:id/test', authenticate, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, url, secret, events FROM webhooks WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await fireWebhook(req.user.company_id, 'ping', { message: 'Test ping from SlabDash' });
    res.json({ success: true, message: `Test ping sent to ${result.rows[0].url}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send test' });
  }
});

// Get available events
router.get('/events', authenticate, (req, res) => {
  res.json({ events: VALID_EVENTS });
});

module.exports = router;
