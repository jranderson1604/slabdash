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
    console.error("PSA test error:", error.message);
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

    // Smart filtering: only refresh submissions that actually need it
    // 1. Active (not shipped) with a PSA number
    // 2. Skip ones refreshed in the last 30 minutes (they're fresh)
    // 3. Prioritize by urgency (problem orders first, then by staleness)
    // 4. Cap at 30 per batch to avoid rate limits
    const submissions = await db.query(
      `SELECT id, psa_submission_number, progress_percent, shipped, date_sent,
              current_step, service_level, problem_order, grades_ready,
              last_refreshed_at, picked_up
       FROM submissions
       WHERE company_id = $1
         AND psa_submission_number IS NOT NULL
         AND shipped = false
         AND (last_refreshed_at IS NULL OR last_refreshed_at < NOW() - INTERVAL '30 minutes')
       ORDER BY
         problem_order DESC,
         last_refreshed_at ASC NULLS FIRST,
         created_at DESC
       LIMIT 30`,
      [req.user.company_id]
    );

    // Also get the total active count so user knows scope
    const totalActiveResult = await db.query(
      `SELECT COUNT(*) FROM submissions WHERE company_id = $1 AND psa_submission_number IS NOT NULL AND shipped = false`,
      [req.user.company_id]
    );
    const totalActive = parseInt(totalActiveResult.rows[0].count);

    // Set up Server-Sent Events for real-time progress
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const total = submissions.rows.length;
    let updated = 0;
    let errors = 0;
    const changeLog = [];
    let clientDisconnected = false;

    // Handle client disconnect — stop refreshing if browser closes
    req.on('close', () => { clientDisconnected = true; });

    // Safe write helper — won't throw if client disconnected
    const send = (data) => {
      if (clientDisconnected) return;
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { clientDisconnected = true; }
    };

    const { getSubmissionProgress, updateSubmissionFromPsa, isRateLimited, getDailyUsage } = require('../services/psaService');
    const usage = getDailyUsage();
    send({ type: 'start', total, totalActive, updated: 0, errors: 0, dailyUsage: usage });

    for (let i = 0; i < submissions.rows.length; i++) {
      if (clientDisconnected) break;

      const submission = submissions.rows[i];

      // Check global rate limit before each request
      if (isRateLimited().limited) {
        send({ type: 'rate_limited', message: 'PSA rate limit reached — stopping refresh', total, current: i, updated, errors });
        break;
      }

      try {
        // batch: true uses 10s spacing instead of 1.5s — stays under PSA limits
        const result = await getSubmissionProgress(psaApiKey, submission.psa_submission_number, { batch: true });

        if (result.rateLimited) {
          const msg = result.dailyLimitReached
            ? 'Daily API limit reached — refresh will resume tomorrow'
            : 'PSA rate limit reached — stopping refresh';
          send({ type: 'rate_limited', message: msg, total, current: i, updated, errors, dailyUsage: getDailyUsage() });
          break;
        }

        if (result.success && result.data) {
          const updateResult = await updateSubmissionFromPsa(submission.id, result.data);
          const { changes } = updateResult;

          changeLog.push(changes.hadChanges
            ? {
                submissionNumber: changes.submissionNumber,
                hadChanges: true,
                stepChanged: changes.stepChanged,
                previousStep: changes.previousStep,
                newStep: changes.newStep,
                progressChanged: changes.progressChanged,
                previousProgress: changes.previousProgress,
                newProgress: changes.newProgress,
                progressDelta: changes.progressDelta || 0,
                statusChanged: changes.statusChanged,
                gradesReady: changes.newGradesReady,
                shipped: changes.newShipped,
                problem: changes.newProblem,
                timestamp: new Date().toISOString()
              }
            : {
                submissionNumber: changes.submissionNumber,
                noChange: true,
                currentStep: changes.newStep,
                currentProgress: changes.newProgress,
                timestamp: new Date().toISOString()
              }
          );

          updated++;
          send({
            type: 'progress', total, current: i + 1, updated, errors,
            submissionNumber: submission.psa_submission_number,
            status: 'success',
            hadChanges: changes.hadChanges,
            stepChanged: changes.stepChanged,
            progressDelta: changes.progressDelta
          });
        } else {
          errors++;
          changeLog.push({
            submissionNumber: submission.psa_submission_number,
            error: true, errorMessage: result.error || 'Unknown error',
            timestamp: new Date().toISOString()
          });
          send({
            type: 'progress', total, current: i + 1, updated, errors,
            submissionNumber: submission.psa_submission_number, status: 'error'
          });
        }
      } catch (err) {
        console.error(`[PSA] Refresh error for ${submission.psa_submission_number}: ${err.message}`);
        errors++;
        changeLog.push({
          submissionNumber: submission.psa_submission_number,
          error: true, errorMessage: err.message,
          timestamp: new Date().toISOString()
        });
        send({
          type: 'progress', total, current: i + 1, updated, errors,
          submissionNumber: submission.psa_submission_number, status: 'error'
        });
      }
    }

    // Store change log
    try {
      await db.query(
        `INSERT INTO psa_refresh_logs (company_id, total_submissions, updated_count, error_count, change_log, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.company_id, total, updated, errors, JSON.stringify(changeLog), req.user.id]
      );
    } catch (dbError) {
      console.error('[PSA] Failed to save refresh log:', dbError.message);
    }

    const changedCount = changeLog.filter(c => c.hadChanges).length;
    const noChangeCount = changeLog.filter(c => c.noChange).length;
    const skippedCount = totalActive - total;
    send({
      type: 'complete', total, totalActive, updated, errors, changedCount, noChangeCount, skippedCount,
      message: `Refresh completed: ${changedCount} changed, ${noChangeCount} unchanged, ${errors} errors` +
        (skippedCount > 0 ? `, ${skippedCount} skipped (recently refreshed)` : ''),
      dailyUsage: getDailyUsage(),
      changeLogAvailable: true
    });

    if (!clientDisconnected) res.end();
  } catch (error) {
    console.error('[PSA] Refresh all error:', error.message);
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to refresh submissions', details: error.message })}\n\n`);
      res.end();
    } catch { /* client already gone */ }
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
    console.error("Normalize service levels error:", error.message);
    res.status(500).json({
      error: "Failed to normalize service levels",
      details: error.message
    });
  }
});

// Get latest refresh log
router.get("/refresh-log/latest", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, total_submissions, updated_count, error_count, change_log, created_at
       FROM psa_refresh_logs
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.json({ hasLog: false, message: 'No refresh logs found' });
    }

    res.json({ hasLog: true, log: result.rows[0] });
  } catch (error) {
    console.error("Get refresh log error:", error.message);
    res.status(500).json({
      error: "Failed to get refresh log",
      details: error.message
    });
  }
});

// Export refresh log as CSV
router.get("/refresh-log/:id/csv", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT change_log, created_at FROM psa_refresh_logs WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Refresh log not found' });
    }

    const changeLog = result.rows[0].change_log;
    const timestamp = result.rows[0].created_at;

    // Generate CSV
    const csvRows = [];
    csvRows.push('Submission Number,Status,Previous Step,New Step,Step Changed,Previous Progress %,New Progress %,Progress Delta,Grades Ready,Shipped,Problem,Error Message,Timestamp');

    for (const change of changeLog) {
      if (change.error) {
        csvRows.push([
          change.submissionNumber,
          'Error',
          '',
          '',
          'No',
          '',
          '',
          '',
          '',
          '',
          '',
          change.errorMessage || '',
          change.timestamp
        ].join(','));
      } else if (change.noChange) {
        csvRows.push([
          change.submissionNumber,
          'No Change',
          change.currentStep || '',
          change.currentStep || '',
          'No',
          change.currentProgress || '',
          change.currentProgress || '',
          '0',
          '',
          '',
          '',
          '',
          change.timestamp
        ].join(','));
      } else {
        csvRows.push([
          change.submissionNumber,
          change.hadChanges ? 'Changed' : 'No Change',
          change.previousStep || '',
          change.newStep || '',
          change.stepChanged ? 'Yes' : 'No',
          change.previousProgress || '',
          change.newProgress || '',
          change.progressDelta || '0',
          change.gradesReady ? 'Yes' : 'No',
          change.shipped ? 'Yes' : 'No',
          change.problem ? 'Yes' : 'No',
          '',
          change.timestamp
        ].join(','));
      }
    }

    const csv = csvRows.join('\n');
    const filename = `psa-refresh-${new Date(timestamp).toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error("Export CSV error:", error.message);
    res.status(500).json({
      error: "Failed to export CSV",
      details: error.message
    });
  }
});

// Send weekly update — manual trigger by admin
// Refreshes all active submissions from PSA, then sends the email report
router.post("/send-weekly-update", authenticate, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyResult = await db.query(
      `SELECT c.id, c.name, c.psa_api_key, u.email as owner_email
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id AND u.role = 'owner'
       WHERE c.id = $1`,
      [req.user.company_id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    const company = companyResult.rows[0];

    if (!company.psa_api_key) {
      return res.status(400).json({ error: "PSA API key not configured" });
    }

    // Check rate limit — once per week
    try {
      const lastUpdateResult = await db.query(
        `SELECT created_at FROM psa_refresh_logs
         WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [company.id]
      );

      if (lastUpdateResult.rows.length > 0) {
        const lastUpdate = new Date(lastUpdateResult.rows[0].created_at);
        const daysSinceLastUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceLastUpdate < 6) {
          return res.status(429).json({
            error: "Weekly update already sent recently",
            lastSent: lastUpdate.toISOString(),
            nextAvailable: new Date(lastUpdate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            daysRemaining: Math.ceil(7 - daysSinceLastUpdate)
          });
        }
      }
    } catch (e) {
      // psa_refresh_logs table might not exist
    }

    const { runCompanyRefresh, sendRefreshReport } = require('../services/scheduledRefreshService');

    // Run the refresh
    const results = await runCompanyRefresh(company, company.psa_api_key);

    if (results.rateLimited) {
      return res.status(429).json({
        error: `PSA API rate limited — try again in ${results.retryAfterMin} minutes`,
        retryAfterMin: results.retryAfterMin
      });
    }

    // Send the email report
    const emailTo = req.body.email || company.owner_email || req.user.email;
    if (emailTo) {
      await sendRefreshReport({ ...company, owner_email: emailTo }, results, results.changeLog);
    }

    res.json({
      success: true,
      message: "Weekly update sent",
      totalSubmissions: results.totalSubmissions,
      updatedCount: results.updatedCount,
      errorCount: results.errorCount,
      emailSentTo: emailTo || null,
      changesCount: results.changeLog.filter(c => c.hadChanges).length,
    });
  } catch (error) {
    console.error("Send weekly update error:", error.message);
    res.status(500).json({ error: "Failed to send weekly update", details: error.message });
  }
});

// Get current PSA API usage stats
router.get("/usage", authenticate, async (req, res) => {
  try {
    const { getDailyUsage, isRateLimited } = require('../services/psaService');
    const usage = getDailyUsage();
    const rl = isRateLimited();

    res.json({
      ...usage,
      rateLimited: rl.limited,
      rateLimitedUntil: rl.limited ? new Date(Date.now() + rl.retryAfterMs).toISOString() : null,
      retryAfterMin: rl.limited ? rl.retryAfterMin : 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get usage stats" });
  }
});

router.get("/", (req, res) => {
  res.json({ ok: true, route: "psa" });
});

module.exports = router;
