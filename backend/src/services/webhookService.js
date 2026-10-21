const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');

/**
 * Fire an outbound webhook for a given event.
 * Finds all enabled webhooks for the company that subscribe to this event,
 * then POSTs the payload to each URL with an HMAC signature header.
 *
 * @param {number} companyId
 * @param {string} event   e.g. 'submission.grades_ready'
 * @param {object} payload  The JSON body to send
 */
async function fireWebhook(companyId, event, payload) {
  try {
    const result = await db.query(
      `SELECT id, url, secret, events FROM webhooks
       WHERE company_id = $1 AND enabled = true`,
      [companyId]
    );

    if (result.rows.length === 0) return;

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    for (const wh of result.rows) {
      // Only fire if this webhook subscribes to the event (or '*')
      const events = wh.events || [];
      if (!events.includes(event) && !events.includes('*')) continue;

      const sig = wh.secret
        ? crypto.createHmac('sha256', wh.secret).update(body).digest('hex')
        : null;

      try {
        await axios.post(wh.url, body, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-SlabDash-Event': event,
            ...(sig ? { 'X-SlabDash-Signature': `sha256=${sig}` } : {}),
          },
        });

        // Log success
        await db.query(
          `UPDATE webhooks SET last_fired_at = NOW(), last_status = 200, error_count = 0 WHERE id = $1`,
          [wh.id]
        ).catch(() => {});

        console.log(`[Webhook] ${event} → ${wh.url} (200)`);
      } catch (err) {
        const status = err.response?.status || 0;
        await db.query(
          `UPDATE webhooks SET last_fired_at = NOW(), last_status = $1,
           error_count = COALESCE(error_count, 0) + 1 WHERE id = $2`,
          [status, wh.id]
        ).catch(() => {});
        console.error(`[Webhook] ${event} → ${wh.url} FAILED (${status}): ${err.message}`);
      }
    }
  } catch (err) {
    console.error('[Webhook] fireWebhook error:', err.message);
  }
}

module.exports = { fireWebhook };
