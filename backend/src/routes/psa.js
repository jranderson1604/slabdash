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

    // Get all unshipped submissions for this company
    const submissions = await db.query(
      `SELECT id, psa_submission_number
       FROM submissions
       WHERE company_id = $1 AND shipped = false AND psa_submission_number IS NOT NULL`,
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
            const backoffDelay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
            console.log(`Rate limited on ${submissionNumber}, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
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

        // Rate limit: wait 2 seconds between requests to avoid 429 errors
        await new Promise(resolve => setTimeout(resolve, 2000));
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

        // Still wait on errors to avoid hammering the API
        await new Promise(resolve => setTimeout(resolve, 2000));
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

router.get("/", (req, res) => {
  res.json({ ok: true, route: "psa" });
});

module.exports = router;
