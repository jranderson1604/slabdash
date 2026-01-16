const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Create buyback offer
router.post("/", authenticate, async (req, res) => {
  try {
    const { company_id, user_id } = req.user;
    const { card_id, offer_price, message, expires_at } = req.body;

    if (!card_id || !offer_price) {
      return res.status(400).json({ error: "card_id and offer_price are required" });
    }

    // Verify card belongs to company and get customer_id
    const cardResult = await db.query(
      `SELECT c.id, c.customer_id, c.description, c.grade, c.psa_cert_number,
        cu.name as customer_name, cu.email as customer_email
      FROM cards c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      WHERE c.id = $1 AND c.company_id = $2`,
      [card_id, company_id]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ error: "Card not found" });
    }

    const card = cardResult.rows[0];

    if (!card.customer_id) {
      return res.status(400).json({ error: "Card does not have an associated customer" });
    }

    // Check for existing pending offer
    const existingOffer = await db.query(
      `SELECT id FROM buyback_offers
      WHERE card_id = $1 AND status = 'pending'`,
      [card_id]
    );

    if (existingOffer.rows.length > 0) {
      return res.status(400).json({ error: "A pending offer already exists for this card" });
    }

    const result = await db.query(
      `INSERT INTO buyback_offers (
        company_id, card_id, customer_id, offer_price, message,
        offered_by_user_id, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        company_id,
        card_id,
        card.customer_id,
        offer_price,
        message || null,
        user_id,
        expires_at || null,
        "pending"
      ]
    );

    // TODO: Send notification to customer via email/SMS
    console.log(`📧 Buyback offer created for ${card.customer_email}: $${offer_price} for ${card.description}`);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create buyback offer error:", err);
    res.status(500).json({ error: "Failed to create buyback offer" });
  }
});

// Get buyback offers (with filters)
router.get("/", authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { status, customer_id, card_id, payment_status } = req.query;

    let query = `
      SELECT bo.*,
        c.description as card_description,
        c.grade as card_grade,
        c.psa_cert_number,
        c.player_name,
        c.year,
        c.brand,
        cu.name as customer_name,
        cu.email as customer_email,
        u.name as offered_by_name,
        s.psa_submission_number
      FROM buyback_offers bo
      LEFT JOIN cards c ON bo.card_id = c.id
      LEFT JOIN customers cu ON bo.customer_id = cu.id
      LEFT JOIN users u ON bo.offered_by_user_id = u.id
      LEFT JOIN submissions s ON c.submission_id = s.id
      WHERE bo.company_id = $1
    `;
    const params = [company_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND bo.status = $${paramCount}`;
      params.push(status);
    }

    if (customer_id) {
      paramCount++;
      query += ` AND bo.customer_id = $${paramCount}`;
      params.push(customer_id);
    }

    if (card_id) {
      paramCount++;
      query += ` AND bo.card_id = $${paramCount}`;
      params.push(card_id);
    }

    if (payment_status) {
      paramCount++;
      query += ` AND bo.payment_status = $${paramCount}`;
      params.push(payment_status);
    }

    query += ` ORDER BY bo.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get buyback offers error:", err);
    res.status(500).json({ error: "Failed to fetch buyback offers" });
  }
});

// Get single buyback offer
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `SELECT bo.*,
        c.description as card_description,
        c.grade as card_grade,
        c.psa_cert_number,
        c.player_name,
        c.year,
        c.brand,
        cu.name as customer_name,
        cu.email as customer_email,
        u.name as offered_by_name,
        s.psa_submission_number
      FROM buyback_offers bo
      LEFT JOIN cards c ON bo.card_id = c.id
      LEFT JOIN customers cu ON bo.customer_id = cu.id
      LEFT JOIN users u ON bo.offered_by_user_id = u.id
      LEFT JOIN submissions s ON c.submission_id = s.id
      WHERE bo.id = $1 AND bo.company_id = $2`,
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Buyback offer not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get buyback offer error:", err);
    res.status(500).json({ error: "Failed to fetch buyback offer" });
  }
});

// Update buyback offer status (shop owner)
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { id } = req.params;
    const { status, payment_method, payment_id } = req.body;

    const validStatuses = ["pending", "accepted", "rejected", "paid", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const offerCheck = await db.query(
      "SELECT id FROM buyback_offers WHERE id = $1 AND company_id = $2",
      [id, company_id]
    );

    if (offerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Buyback offer not found" });
    }

    let updateQuery = `UPDATE buyback_offers SET status = $1`;
    const params = [status, id, company_id];
    let paramCount = 3;

    if (status === "paid") {
      paramCount++;
      updateQuery += `, paid_at = NOW(), payment_status = 'completed'`;
      if (payment_method) {
        paramCount++;
        updateQuery += `, payment_method = $${paramCount}`;
        params.splice(3, 0, payment_method);
      }
      if (payment_id) {
        paramCount++;
        updateQuery += `, payment_id = $${paramCount}`;
        params.push(payment_id);
      }
    }

    updateQuery += ` WHERE id = $2 AND company_id = $3 RETURNING *`;

    const result = await db.query(updateQuery, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update buyback offer status error:", err);
    res.status(500).json({ error: "Failed to update buyback offer status" });
  }
});

// Delete/cancel buyback offer
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM buyback_offers WHERE id = $1 AND company_id = $2 RETURNING *",
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Buyback offer not found" });
    }

    res.json({ message: "Buyback offer deleted successfully" });
  } catch (err) {
    console.error("Delete buyback offer error:", err);
    res.status(500).json({ error: "Failed to delete buyback offer" });
  }
});

// Get buyback stats (for dashboard)
router.get("/stats/summary", authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;

    const result = await db.query(
      `SELECT
        COUNT(*) as total_offers,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_offers,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_offers,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_offers,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_offers,
        COALESCE(SUM(offer_price) FILTER (WHERE status = 'pending'), 0) as pending_value,
        COALESCE(SUM(offer_price) FILTER (WHERE status = 'accepted'), 0) as accepted_value,
        COALESCE(SUM(offer_price) FILTER (WHERE status = 'paid'), 0) as paid_value
      FROM buyback_offers
      WHERE company_id = $1`,
      [company_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get buyback stats error:", err);
    res.status(500).json({ error: "Failed to fetch buyback stats" });
  }
});

module.exports = router;
