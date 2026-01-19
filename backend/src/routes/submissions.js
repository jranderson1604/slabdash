const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const axios = require("axios");

// Helper function to fetch PSA order data
async function fetchPSAOrderData(psaSubmissionNumber, psaApiKey) {
  try {
    const response = await axios.get(
      `https://api.psacard.com/publicapi/order/GetSubmissionProgress/${psaSubmissionNumber}`,
      {
        headers: {
          "Authorization": `Bearer ${psaApiKey}`,
          "User-Agent": "SlabDash/1.0"
        },
        timeout: 15000
      }
    );
    return response.data;
  } catch (error) {
    console.error("PSA API error:", error.response?.data || error.message);
    return null;
  }
}

// List submissions
router.get("/", authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0, customer_id, status } = req.query;

    let query = `
      SELECT s.*, c.name as customer_name, c.email as customer_email,
             (SELECT COUNT(*) FROM cards WHERE submission_id = s.id) as card_count
      FROM submissions s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramIndex = 2;

    if (customer_id) {
      query += ` AND s.customer_id = $${paramIndex++}`;
      params.push(customer_id);
    }

    if (status === 'active') {
      query += ` AND s.shipped = false`;
    } else if (status === 'shipped') {
      query += ` AND s.shipped = true`;
    } else if (status === 'ready') {
      query += ` AND s.grades_ready = true AND s.shipped = false`;
    } else if (status === 'problem') {
      query += ` AND s.problem_order = true AND s.shipped = false`;
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    const countResult = await db.query(
      `SELECT COUNT(*) FROM submissions WHERE company_id = $1`,
      [req.user.company_id]
    );

    res.json({
      submissions: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error("List submissions error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Get submission by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
       FROM submissions s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1 AND s.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Get cards for this submission
    const cardsResult = await db.query(
      `SELECT * FROM cards WHERE submission_id = $1 ORDER BY id`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      cards: cardsResult.rows
    });
  } catch (error) {
    console.error("Get submission error:", error);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
});

// Create submission (with automatic PSA data fetching)
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      customer_id,
      internal_id,
      psa_submission_number,
      service_level,
      date_sent,
      notes
    } = req.body;

    let psaOrderData = null;

    // Automatically fetch PSA order data if PSA submission number is provided
    if (psa_submission_number) {
      try {
        const companyResult = await db.query(
          "SELECT psa_api_key FROM companies WHERE id = $1",
          [req.user.company_id]
        );

        const psaApiKey = companyResult.rows[0]?.psa_api_key;

        if (psaApiKey) {
          console.log(`Fetching PSA order data for ${psa_submission_number}...`);
          psaOrderData = await fetchPSAOrderData(psa_submission_number, psaApiKey);

          if (psaOrderData) {
            console.log("PSA order data fetched successfully:", {
              orderNumber: psaOrderData.OrderNumber,
              status: psaOrderData.Status,
              serviceLevel: psaOrderData.ServiceLevel,
              cardCount: psaOrderData.Cards?.length || 0
            });
          } else {
            console.log("PSA API returned no data - continuing without PSA data");
          }
        } else {
          console.log("No PSA API key configured - skipping PSA data fetch");
        }
      } catch (psaError) {
        console.error("PSA fetch failed, continuing without PSA data:", psaError.message);
        // Continue without PSA data - don't fail the whole submission
      }
    }

    // Check if PSA order is complete (grades ready)
    const psaStatus = psaOrderData?.Status || null;
    const gradesReady = psaStatus && typeof psaStatus === 'string' && (
      psaStatus.toLowerCase().includes('complete') ||
      psaStatus.toLowerCase().includes('ready') ||
      psaStatus.toLowerCase().includes('graded')
    );

    // Insert submission with data from PSA API if available
    const result = await db.query(
      `INSERT INTO submissions (
        company_id,
        customer_id,
        internal_id,
        psa_submission_number,
        service_level,
        date_sent,
        notes,
        psa_status,
        grades_ready,
        last_refreshed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.user.company_id,
        customer_id || null,
        internal_id || null,
        psa_submission_number || null,
        psaOrderData?.ServiceLevel || service_level || null,
        date_sent || null,
        notes || null,
        psaStatus,
        gradesReady || false,
        psa_submission_number && psaOrderData ? new Date() : null
      ]
    );

    const submission = result.rows[0];

    // If we got card data from PSA, automatically import the cards
    if (psaOrderData?.Cards && Array.isArray(psaOrderData.Cards) && psaOrderData.Cards.length > 0) {
      console.log(`Importing ${psaOrderData.Cards.length} cards from PSA order...`);

      for (const card of psaOrderData.Cards) {
        try {
          await db.query(
            `INSERT INTO cards (
              company_id,
              submission_id,
              customer_id,
              year,
              player_name,
              card_set,
              grade,
              psa_cert_number,
              card_images
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              req.user.company_id,
              submission.id,
              customer_id || null,
              card.Year || null,
              card.SubjectName || card.CardName || 'Unknown',
              card.Brand || card.Set || null,
              card.Grade || null,
              card.CertNumber || null,
              card.ImageURL ? JSON.stringify([card.ImageURL]) : null
            ]
          );
        } catch (cardError) {
          console.error(`Failed to import card:`, cardError.message, card);
          // Continue with other cards even if one fails
        }
      }
    }

    res.status(201).json({
      ...submission,
      psa_data_imported: !!psaOrderData,
      cards_imported: psaOrderData?.Cards?.length || 0
    });
  } catch (error) {
    console.error("Create submission error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Failed to create submission",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update submission
router.put("/:id", authenticate, async (req, res) => {
  try {
    const allowed = [
      'customer_id', 'internal_id', 'psa_submission_number', 'service_level',
      'date_sent', 'date_received', 'notes', 'grades_ready', 'shipped',
      'problem_order', 'problem_description', 'psa_status'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(req.params.id, req.user.company_id);

    const result = await db.query(
      `UPDATE submissions SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update submission error:", error);
    res.status(500).json({ error: "Failed to update submission" });
  }
});

// Delete submission
router.delete("/:id", authenticate, async (req, res) => {
  try {
    // First delete all cards in this submission
    await db.query(
      "DELETE FROM cards WHERE submission_id = $1 AND company_id = $2",
      [req.params.id, req.user.company_id]
    );

    // Then delete the submission
    const result = await db.query(
      "DELETE FROM submissions WHERE id = $1 AND company_id = $2 RETURNING id",
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.json({ message: "Submission deleted" });
  } catch (error) {
    console.error("Delete submission error:", error);
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

// Manually refresh submission from PSA
router.post("/:id/refresh", authenticate, async (req, res) => {
  try {
    // Get submission
    const submissionResult = await db.query(
      "SELECT * FROM submissions WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user.company_id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const submission = submissionResult.rows[0];

    if (!submission.psa_submission_number) {
      return res.status(400).json({ error: "No PSA submission number for this order" });
    }

    // Get company's PSA API key
    const companyResult = await db.query(
      "SELECT psa_api_key FROM companies WHERE id = $1",
      [req.user.company_id]
    );

    const psaApiKey = companyResult.rows[0]?.psa_api_key;

    if (!psaApiKey) {
      return res.status(400).json({ error: "PSA API key not configured" });
    }

    // Fetch latest data from PSA
    const psaOrderData = await fetchPSAOrderData(submission.psa_submission_number, psaApiKey);

    if (!psaOrderData) {
      return res.status(500).json({ error: "Failed to fetch data from PSA API" });
    }

    // Check if grades are ready based on PSA status
    const psaStatus = psaOrderData.Status;
    const gradesReady = psaStatus && (
      psaStatus.toLowerCase().includes('complete') ||
      psaStatus.toLowerCase().includes('ready') ||
      psaStatus.toLowerCase().includes('graded')
    );

    // Update submission
    await db.query(
      `UPDATE submissions
       SET service_level = COALESCE($1, service_level),
           psa_status = $2,
           grades_ready = $3,
           last_refreshed_at = NOW()
       WHERE id = $4`,
      [psaOrderData.ServiceLevel, psaStatus, gradesReady, submission.id]
    );

    // Update or import cards
    if (psaOrderData.Cards && psaOrderData.Cards.length > 0) {
      for (const card of psaOrderData.Cards) {
        // Check if card already exists
        const existingCard = await db.query(
          "SELECT id FROM cards WHERE submission_id = $1 AND psa_cert_number = $2",
          [submission.id, card.CertNumber]
        );

        if (existingCard.rows.length > 0) {
          // Update existing card
          await db.query(
            `UPDATE cards SET grade = $1, card_images = $2 WHERE id = $3`,
            [
              card.Grade,
              card.ImageURL ? JSON.stringify([card.ImageURL]) : null,
              existingCard.rows[0].id
            ]
          );
        } else {
          // Insert new card
          await db.query(
            `INSERT INTO cards (
              company_id, submission_id, customer_id, year, player_name,
              card_set, grade, psa_cert_number, card_images
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              req.user.company_id,
              submission.id,
              submission.customer_id,
              card.Year || null,
              card.SubjectName || card.CardName || 'Unknown',
              card.Brand || card.Set || null,
              card.Grade || null,
              card.CertNumber || null,
              card.ImageURL ? JSON.stringify([card.ImageURL]) : null
            ]
          );
        }
      }
    }

    res.json({
      message: "Submission refreshed from PSA",
      status: psaOrderData.Status,
      cards_updated: psaOrderData.Cards?.length || 0
    });
  } catch (error) {
    console.error("Refresh submission error:", error);
    res.status(500).json({
      error: "Failed to refresh submission",
      details: error.message
    });
  }
});

module.exports = router;
