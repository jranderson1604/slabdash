const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const axios = require("axios");

// Test PSA API connection
router.get("/test", authenticate, async (req, res) => {
  try {
    // Get company's PSA API key from database
    const result = await db.query(
      "SELECT psa_api_key FROM companies WHERE id = $1",
      [req.user.company_id]
    );

    const psaApiKey = result.rows[0]?.psa_api_key;

    if (!psaApiKey) {
      return res.status(400).json({
        error: "PSA API key not configured. Please add your API key in Settings."
      });
    }

    // Test the API key with a sample PSA cert lookup
    try {
      await axios.get("https://api.psacard.com/publicapi/cert/GetByCertNumber/12345678", {
        headers: {
          "Authorization": `Bearer ${psaApiKey}`,
          "User-Agent": "SlabDash/1.0"
        },
        timeout: 10000,
        validateStatus: (status) => status !== 401 // Accept all statuses except 401
      });

      res.json({
        success: true,
        message: "PSA API connection successful!"
      });
    } catch (error) {
      if (error.response?.status === 401) {
        return res.status(400).json({
          error: "Invalid PSA API key. Please check your API key in Settings."
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("PSA test error:", error);
    res.status(500).json({
      error: "Failed to test PSA connection",
      details: error.message
    });
  }
});

// Refresh all submissions from PSA
router.post("/refresh-all", authenticate, requireRole("owner", "admin"), async (req, res) => {
  try {
    // Get company's PSA API key
    const result = await db.query(
      "SELECT psa_api_key FROM companies WHERE id = $1",
      [req.user.company_id]
    );

    const psaApiKey = result.rows[0]?.psa_api_key;

    if (!psaApiKey) {
      return res.status(400).json({
        error: "PSA API key not configured"
      });
    }

    // Get all unshipped submissions for this company
    const submissions = await db.query(
      `SELECT id, psa_submission_number
       FROM submissions
       WHERE company_id = $1 AND shipped = false AND psa_submission_number IS NOT NULL`,
      [req.user.company_id]
    );

    let updated = 0;
    let errors = 0;

    // Refresh each submission (with rate limiting)
    for (const submission of submissions.rows) {
      try {
        // Call PSA API to get submission status
        const response = await axios.get(
          `https://api.psacard.com/publicapi/order/GetOrder/${submission.psa_submission_number}`,
          {
            headers: {
              "Authorization": `Bearer ${psaApiKey}`,
              "User-Agent": "SlabDash/1.0"
            },
            timeout: 10000
          }
        );

        if (response.data) {
          // Update submission with latest data from PSA
          await db.query(
            `UPDATE submissions
             SET service_level = COALESCE($1, service_level),
                 last_refreshed_at = NOW()
             WHERE id = $2`,
            [response.data.ServiceLevel, submission.id]
          );
          updated++;
        }

        // Rate limit: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Failed to refresh submission ${submission.psa_submission_number}:`, err.message);
        errors++;
      }
    }

    res.json({
      message: "Refresh completed",
      total: submissions.rows.length,
      updated,
      errors
    });
  } catch (error) {
    console.error("Refresh all error:", error);
    res.status(500).json({
      error: "Failed to refresh submissions",
      details: error.message
    });
  }
});

router.get("/", (req, res) => {
  res.json({ ok: true, route: "psa" });
});

module.exports = router;
