const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

/**
 * Create a multi-card buyback offer (Admin only)
 * Body: {
 *   customer_id: UUID,
 *   cards: [{ card_id: UUID, offer_amount: number, grading_fee: number }],
 *   offer_message: string,
 *   response_deadline_hours: 24|48|72,
 *   is_bulk_offer: boolean,
 *   bulk_discount_percent: number (optional)
 * }
 */
router.post('/', authenticate, async (req, res) => {
  const client = await db.pool.getClient();

  try {
    const {
      customer_id,
      cards,
      offer_message,
      response_deadline_hours = 24,
      is_bulk_offer = false,
      bulk_discount_percent = 0
    } = req.body;

    // Validation
    if (!customer_id || !cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'customer_id and cards array required' });
    }

    // Verify all cards belong to customer
    const cardIds = cards.map(c => c.card_id);
    const cardCheck = await client.query(
      `SELECT c.id, c.grading_fee, c.description, c.card_images
       FROM cards c
       JOIN submissions s ON c.submission_id = s.id
       WHERE c.id = ANY($1) AND s.customer_id = $2 AND c.company_id = $3`,
      [cardIds, customer_id, req.user.company_id]
    );

    if (cardCheck.rows.length !== cards.length) {
      return res.status(400).json({ error: 'One or more cards not found or do not belong to customer' });
    }

    await client.query('BEGIN');

    // Calculate totals
    let totalOfferAmount = 0;
    let totalGradingFees = 0;

    cards.forEach(card => {
      totalOfferAmount += parseFloat(card.offer_amount || 0);
      totalGradingFees += parseFloat(card.grading_fee || 0);
    });

    // Apply bulk discount if enabled
    let finalOfferAmount = totalOfferAmount;
    if (is_bulk_offer && bulk_discount_percent > 0) {
      const discount = (totalOfferAmount * bulk_discount_percent) / 100;
      finalOfferAmount = totalOfferAmount - discount;
    }

    const finalPayout = finalOfferAmount - totalGradingFees;

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + response_deadline_hours);

    // Create buyback offer
    const offerResult = await client.query(
      `INSERT INTO buyback_offers (
        company_id, customer_id, offer_amount, offer_message,
        response_deadline_hours, expires_at, created_by,
        is_bulk_offer, bulk_discount_percent, total_grading_fees, final_payout
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.user.company_id,
        customer_id,
        finalOfferAmount,
        offer_message,
        response_deadline_hours,
        expiresAt,
        req.user.id,
        is_bulk_offer,
        bulk_discount_percent,
        totalGradingFees,
        finalPayout
      ]
    );

    const offer = offerResult.rows[0];

    // Insert cards into junction table
    for (const card of cards) {
      await client.query(
        `INSERT INTO buyback_offer_cards (
          buyback_offer_id, card_id, individual_offer_amount, grading_fee
        ) VALUES ($1, $2, $3, $4)`,
        [offer.id, card.card_id, card.offer_amount, card.grading_fee || 0]
      );
    }

    await client.query('COMMIT');

    // TODO: Send email notification
    // TODO: Send push notification

    // Fetch complete offer with cards
    const completeOffer = await getOfferWithCards(client, offer.id, req.user.company_id);

    res.json(completeOffer);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create buyback offer error:', error);
    res.status(500).json({ error: 'Failed to create buyback offer', details: error.message });
  } finally {
    client.release();
  }
});

/**
 * List buyback offers with cards
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, customer_id } = req.query;

    let query = `
      SELECT
        bo.*,
        cu.email as customer_email,
        cu.name as customer_name,
        u.name as created_by_name,
        COUNT(boc.id) as card_count
      FROM buyback_offers bo
      JOIN customers cu ON bo.customer_id = cu.id
      LEFT JOIN users u ON bo.created_by = u.id
      LEFT JOIN buyback_offer_cards boc ON bo.id = boc.buyback_offer_id
      WHERE bo.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramCount = 2;

    if (status) {
      params.push(status);
      query += ` AND bo.status = $${paramCount++}`;
    }

    if (customer_id) {
      params.push(customer_id);
      query += ` AND bo.customer_id = $${paramCount++}`;
    }

    query += ' GROUP BY bo.id, cu.email, cu.name, u.name ORDER BY bo.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('List buyback offers error:', error);
    res.status(500).json({ error: 'Failed to list buyback offers' });
  }
});

/**
 * Get single buyback offer with all cards
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const offer = await getOfferWithCards(db, req.params.id, req.user.company_id);

    if (!offer) {
      return res.status(404).json({ error: 'Buyback offer not found' });
    }

    res.json(offer);

  } catch (error) {
    console.error('Get buyback offer error:', error);
    res.status(500).json({ error: 'Failed to get buyback offer' });
  }
});

/**
 * Update buyback offer (Admin only)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { offer_message, response_deadline_hours, status } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (offer_message !== undefined) {
      params.push(offer_message);
      updates.push(`offer_message = $${paramCount++}`);
    }

    if (response_deadline_hours !== undefined) {
      params.push(response_deadline_hours);
      updates.push(`response_deadline_hours = $${paramCount++}`);

      // Recalculate expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + response_deadline_hours);
      params.push(expiresAt);
      updates.push(`expires_at = $${paramCount++}`);
    }

    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${paramCount++}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(req.params.id, req.user.company_id);

    const result = await db.query(
      `UPDATE buyback_offers
       SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND company_id = $${paramCount}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Buyback offer not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update buyback offer error:', error);
    res.status(500).json({ error: 'Failed to update buyback offer' });
  }
});

/**
 * Customer accepts buyback offer
 */
router.post('/:id/accept', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    const result = await db.query(
      `UPDATE buyback_offers
       SET status = 'accepted',
           customer_response = $1,
           responded_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND company_id = $3 AND status = 'pending'
       RETURNING *`,
      [message, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Buyback offer not found or already responded to' });
    }

    // TODO: Trigger payment processing
    // TODO: Send confirmation email

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Accept buyback offer error:', error);
    res.status(500).json({ error: 'Failed to accept buyback offer' });
  }
});

/**
 * Customer declines buyback offer
 */
router.post('/:id/decline', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    const result = await db.query(
      `UPDATE buyback_offers
       SET status = 'declined',
           customer_response = $1,
           responded_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND company_id = $3 AND status = 'pending'
       RETURNING *`,
      [message, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Buyback offer not found or already responded to' });
    }

    // TODO: Send declined notification email to admin

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Decline buyback offer error:', error);
    res.status(500).json({ error: 'Failed to decline buyback offer' });
  }
});

/**
 * Customer submits counter-offer (ONE TIME ONLY)
 */
router.post('/:id/counter-offer', authenticate, async (req, res) => {
  try {
    const { counter_amount, counter_message } = req.body;

    if (!counter_amount) {
      return res.status(400).json({ error: 'counter_amount is required' });
    }

    const result = await db.query(
      `UPDATE buyback_offers
       SET status = 'counter_offered',
           customer_counter_amount = $1,
           customer_counter_message = $2,
           counter_offered_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND company_id = $4 AND status = 'pending' AND customer_counter_amount IS NULL
       RETURNING *`,
      [counter_amount, counter_message, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Offer not found, already responded to, or counter-offer already submitted'
      });
    }

    // TODO: Send admin notification of counter-offer

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Counter-offer error:', error);
    res.status(500).json({ error: 'Failed to submit counter-offer' });
  }
});

/**
 * Admin responds to counter-offer
 */
router.post('/:id/respond-to-counter', authenticate, async (req, res) => {
  try {
    const { response, message } = req.body;

    if (!['accepted', 'declined', 'in_person'].includes(response)) {
      return res.status(400).json({ error: 'response must be: accepted, declined, or in_person' });
    }

    let newStatus = 'pending';
    if (response === 'accepted') newStatus = 'accepted';
    if (response === 'declined') newStatus = 'declined';

    const result = await db.query(
      `UPDATE buyback_offers
       SET admin_counter_response = $1,
           admin_counter_response_message = $2,
           admin_counter_responded_at = CURRENT_TIMESTAMP,
           status = $3,
           in_person_requested = $4
       WHERE id = $5 AND company_id = $6 AND status = 'counter_offered'
       RETURNING *`,
      [response, message, newStatus, response === 'in_person', req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found or not in counter-offered status' });
    }

    // TODO: Send customer notification of admin response

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Respond to counter-offer error:', error);
    res.status(500).json({ error: 'Failed to respond to counter-offer' });
  }
});

/**
 * Delete buyback offer (Admin only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Cards in junction table will auto-delete due to CASCADE
    const result = await db.query(
      'DELETE FROM buyback_offers WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Buyback offer not found' });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Delete buyback offer error:', error);
    res.status(500).json({ error: 'Failed to delete buyback offer' });
  }
});

/**
 * Helper: Get offer with all associated cards
 */
async function getOfferWithCards(dbClient, offerId, companyId) {
  const offerResult = await dbClient.query(
    `SELECT
      bo.*,
      cu.email as customer_email,
      cu.name as customer_name,
      cu.phone as customer_phone,
      u.name as created_by_name
     FROM buyback_offers bo
     JOIN customers cu ON bo.customer_id = cu.id
     LEFT JOIN users u ON bo.created_by = u.id
     WHERE bo.id = $1 AND bo.company_id = $2`,
    [offerId, companyId]
  );

  if (offerResult.rows.length === 0) {
    return null;
  }

  const offer = offerResult.rows[0];

  // Get associated cards
  const cardsResult = await dbClient.query(
    `SELECT
      boc.*,
      c.description,
      c.year,
      c.player_name,
      c.psa_cert_number,
      c.grade,
      c.card_images
     FROM buyback_offer_cards boc
     JOIN cards c ON boc.card_id = c.id
     WHERE boc.buyback_offer_id = $1`,
    [offerId]
  );

  offer.cards = cardsResult.rows;

  return offer;
}

module.exports = router;
