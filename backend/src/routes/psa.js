const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const axios = require("axios");
const { normalizeServiceLevel } = require("../utils/serviceLevel");

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

// Refresh all submissions from PSA with real-time progress
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

    // Get submissions that need refreshing:
    // 1. All active submissions (progress < 100 and not shipped)
    // 2. The most recent completed submission (to catch any final updates)
    // This saves API calls by not refreshing old completed orders
    const submissions = await db.query(
      `SELECT id, psa_submission_number, progress_percent, shipped, date_sent
       FROM submissions
       WHERE company_id = $1
         AND psa_submission_number IS NOT NULL
         AND (
           -- Active submissions (not complete)
           (progress_percent < 100 AND shipped = false)
           OR
           -- Most recent completed submission only
           id = (
             SELECT id FROM submissions
             WHERE company_id = $1
               AND psa_submission_number IS NOT NULL
               AND (progress_percent >= 100 OR shipped = true)
             ORDER BY date_sent DESC, created_at DESC
             LIMIT 1
           )
         )
       ORDER BY date_sent DESC, created_at DESC`,
      [req.user.company_id]
    );

    // Set up Server-Sent Events for real-time progress
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const total = submissions.rows.length;
    let updated = 0;
    let errors = 0;

    // Send initial progress
    res.write(`data: ${JSON.stringify({ type: 'start', total, updated: 0, errors: 0 })}\n\n`);

    const { getSubmissionProgress, updateSubmissionFromPsa } = require('../services/psaService');

    // Helper function to retry with exponential backoff on rate limit
    const getSubmissionWithRetry = async (apiKey, submissionNumber, maxRetries = 3) => {
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await getSubmissionProgress(apiKey, submissionNumber);
          return result;
        } catch (err) {
          lastError = err;
          // Check if it's a rate limit error (429)
          if (err.response?.status === 429 && attempt < maxRetries) {
            // Very aggressive backoff: 10s, 30s, 60s
            const backoffDelay = Math.pow(3, attempt) * 10000;
            // Add random jitter to prevent synchronized retries
            const jitter = Math.random() * 5000;
            const totalDelay = backoffDelay + jitter;
            console.log(`Rate limited on ${submissionNumber}, retrying in ${Math.round(totalDelay/1000)}s (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, totalDelay));
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    };

    // Refresh each submission with rate limiting and retries
    for (let i = 0; i < submissions.rows.length; i++) {
      const submission = submissions.rows[i];
      try {
        // Get submission progress from PSA API with retry logic
        const result = await getSubmissionWithRetry(psaApiKey, submission.psa_submission_number);

        if (result.success && result.data) {
          // Update submission with latest data (this also triggers email notifications)
          await updateSubmissionFromPsa(submission.id, result.data);
          updated++;

          // Send progress update
          res.write(`data: ${JSON.stringify({
            type: 'progress',
            total,
            current: i + 1,
            updated,
            errors,
            submissionNumber: submission.psa_submission_number,
            status: 'success'
          })}\n\n`);
        } else {
          errors++;

          // Send error update
          res.write(`data: ${JSON.stringify({
            type: 'progress',
            total,
            current: i + 1,
            updated,
            errors,
            submissionNumber: submission.psa_submission_number,
            status: 'error'
          })}\n\n`);
        }

        // Rate limit: wait 8-12 seconds between requests to avoid 429 errors
        const baseDelay = 8000;
        const jitter = Math.random() * 4000; // 0-4s random jitter
        await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
      } catch (err) {
        console.error(`Failed to refresh submission ${submission.psa_submission_number}:`, err.message);
        errors++;

        // Send error update
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          total,
          current: i + 1,
          updated,
          errors,
          submissionNumber: submission.psa_submission_number,
          status: 'error',
          error: err.message
        })}\n\n`);

        // After error, wait even longer (15-20s) before next request
        await new Promise(resolve => setTimeout(resolve, 15000 + Math.random() * 5000));
      }
    }

    // Send completion
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      total,
      updated,
      errors,
      message: `Refresh completed: ${updated} updated, ${errors} errors`
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error("Refresh all error:", error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Failed to refresh submissions',
      details: error.message
    })}\n\n`);
    res.end();
  }
});

// Normalize all existing service level names
router.post("/normalize-service-levels", authenticate, requireRole("owner", "admin"), async (req, res) => {
  try {
    // Get all submissions with service levels
    const submissions = await db.query(
      `SELECT id, service_level FROM submissions WHERE company_id = $1 AND service_level IS NOT NULL`,
      [req.user.company_id]
    );

    let updated = 0;
    for (const sub of submissions.rows) {
      const normalized = normalizeServiceLevel(sub.service_level);
      if (normalized !== sub.service_level) {
        await db.query(
          `UPDATE submissions SET service_level = $1 WHERE id = $2`,
          [normalized, sub.id]
        );
        updated++;
      }
    }

    res.json({
      success: true,
      message: `Normalized ${updated} service level names`,
      total: submissions.rows.length,
      updated
    });
  } catch (error) {
    console.error("Normalize service levels error:", error);
    res.status(500).json({
      error: "Failed to normalize service levels",
      details: error.message
    });
  }
});

router.get("/", (req, res) => {
  res.json({ ok: true, route: "psa" });
});

module.exports = router;
