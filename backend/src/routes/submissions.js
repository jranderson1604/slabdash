const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { getSubmissionProgress, parseProgressData, updateSubmissionFromPsa, tryGetOrderDetails } = require("../services/psaService");

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

    // Get linked customers (for consignment tracking)
    const linkedCustomersResult = await db.query(
      `SELECT sc.id as link_id, sc.card_count, sc.notes, c.id, c.name, c.email, c.phone
       FROM submission_customers sc
       JOIN customers c ON sc.customer_id = c.id
       WHERE sc.submission_id = $1
       ORDER BY c.name`,
      [req.params.id]
    );

    // Get submission steps
    const stepsResult = await db.query(
      `SELECT * FROM submission_steps WHERE submission_id = $1 ORDER BY step_index`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      cards: cardsResult.rows,
      linked_customers: linkedCustomersResult.rows,
      steps: stepsResult.rows
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

    let parsedPsaData = null;

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
          const result = await getSubmissionProgress(psaApiKey, psa_submission_number);

          if (result.success) {
            parsedPsaData = parseProgressData(result.data);
            console.log("PSA order data fetched and parsed:", {
              orderNumber: parsedPsaData.orderNumber,
              currentStep: parsedPsaData.currentStep,
              progressPercent: parsedPsaData.progressPercent,
              gradesReady: parsedPsaData.gradesReady
            });

            // EXPERIMENTAL: Try to find an endpoint that returns card data
            if (parsedPsaData.orderNumber) {
              console.log('\n🔍 EXPLORING PSA API FOR CARD DATA...\n');
              try {
                const explorationResults = await tryGetOrderDetails(
                  psaApiKey,
                  parsedPsaData.orderNumber,
                  psa_submission_number
                );

                if (explorationResults.successful) {
                  console.log('\n✅ SUCCESS! Found working endpoint:', explorationResults.successful.endpoint);
                  console.log('Response data structure:', Object.keys(explorationResults.successful.data));
                } else {
                  console.log('\n❌ No working endpoint found for card data');
                }
              } catch (exploreError) {
                console.error('Endpoint exploration error:', exploreError.message);
              }
            }
          } else {
            console.log("PSA API returned no data:", result.error);
          }
        } else {
          console.log("No PSA API key configured - skipping PSA data fetch");
        }
      } catch (psaError) {
        console.error("PSA fetch failed, continuing without PSA data:", psaError.message);
        // Continue without PSA data - don't fail the whole submission
      }
    }

    // Insert submission with data from PSA API if available
    const result = await db.query(
      `INSERT INTO submissions (
        company_id,
        user_id,
        customer_id,
        internal_id,
        psa_submission_number,
        service_level,
        date_sent,
        notes,
        psa_status,
        current_step,
        progress_percent,
        grades_ready,
        shipped,
        problem_order,
        accounting_hold,
        last_refreshed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        req.user.company_id,
        req.user.id,
        customer_id || null,
        internal_id || null,
        psa_submission_number || null,
        service_level || null,
        date_sent || null,
        notes || null,
        parsedPsaData?.currentStep || null,
        parsedPsaData?.currentStep || null,
        parsedPsaData?.progressPercent || 0,
        parsedPsaData?.gradesReady || false,
        parsedPsaData?.shipped || false,
        parsedPsaData?.problemOrder || false,
        parsedPsaData?.accountingHold || false,
        parsedPsaData ? new Date() : null
      ]
    );

    const submission = result.rows[0];

    res.status(201).json({
      ...submission,
      psa_data_imported: !!parsedPsaData
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

    // Fetch and update submission from PSA
    const result = await getSubmissionProgress(psaApiKey, submission.psa_submission_number);

    if (!result.success) {
      return res.status(500).json({ error: result.error || "Failed to fetch data from PSA API" });
    }

    // Update submission with latest PSA data
    const parsed = await updateSubmissionFromPsa(submission.id, result.data);

    res.json({
      message: "Submission refreshed from PSA",
      currentStep: parsed.currentStep,
      progressPercent: parsed.progressPercent,
      gradesReady: parsed.gradesReady
    });
  } catch (error) {
    console.error("Refresh submission error:", error);
    res.status(500).json({
      error: "Failed to refresh submission",
      details: error.message
    });
  }
});

// Add customer to submission (for consignment tracking)
router.post("/:id/customers", authenticate, async (req, res) => {
  try {
    const { customer_id, card_count, notes } = req.body;

    // Verify submission belongs to company
    const submissionCheck = await db.query(
      "SELECT id FROM submissions WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user.company_id]
    );

    if (submissionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Add customer link
    const result = await db.query(
      `INSERT INTO submission_customers (submission_id, customer_id, card_count, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (submission_id, customer_id) DO UPDATE
       SET card_count = $3, notes = $4
       RETURNING *`,
      [req.params.id, customer_id, card_count || 0, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Add customer error:", error);
    res.status(500).json({ error: "Failed to add customer to submission" });
  }
});

// Remove customer from submission
router.delete("/:id/customers/:customerId", authenticate, async (req, res) => {
  try {
    // Verify submission belongs to company
    const submissionCheck = await db.query(
      "SELECT id FROM submissions WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user.company_id]
    );

    if (submissionCheck.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Remove customer link
    const result = await db.query(
      "DELETE FROM submission_customers WHERE submission_id = $1 AND customer_id = $2 RETURNING *",
      [req.params.id, req.params.customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not linked to this submission" });
    }

    res.json({ message: "Customer removed from submission" });
  } catch (error) {
    console.error("Remove customer error:", error);
    res.status(500).json({ error: "Failed to remove customer from submission" });
  }
});

// Import cards from PSA CSV
router.post("/:id/import-csv", authenticate, async (req, res) => {
  try {
    const { csvData } = req.body;

    // Verify submission belongs to company
    const submissionResult = await db.query(
      "SELECT * FROM submissions WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user.company_id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const submission = submissionResult.rows[0];

    console.log('\n=== CSV IMPORT DEBUG ===');
    console.log('CSV Data length:', csvData?.length);
    console.log('CSV Data preview:', csvData?.substring(0, 200));

    // Parse CSV (PSA format: Cert #, Type, Description, Grade, After Service, Images)
    const lines = csvData.trim().split('\n');
    console.log('Total lines:', lines.length);
    console.log('Line 0 (header):', lines[0]);
    if (lines.length > 1) console.log('Line 1 (first data):', lines[1]);

    const headers = lines[0].split('\t');
    console.log('Headers found:', headers);

    // Find column indices
    const certIndex = headers.findIndex(h => h.toLowerCase().includes('cert'));
    const typeIndex = headers.findIndex(h => h.toLowerCase().includes('type'));
    const descIndex = headers.findIndex(h => h.toLowerCase().includes('description'));
    const gradeIndex = headers.findIndex(h => h.toLowerCase().includes('grade'));
    const imagesIndex = headers.findIndex(h => h.toLowerCase().includes('images'));

    console.log('Column indices:', { certIndex, typeIndex, descIndex, gradeIndex, imagesIndex });

    let imported = 0;
    let skipped = 0;
    const errors = [];

    // Process each row (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`Row ${i + 1}: Empty line, skipping`);
        continue;
      }

      const cols = line.split('\t');
      console.log(`Row ${i + 1} columns (${cols.length}):`, cols);

      const certNumber = certIndex >= 0 ? cols[certIndex]?.trim() : null;
      const description = descIndex >= 0 ? cols[descIndex]?.trim() : null;
      const gradeRaw = gradeIndex >= 0 ? cols[gradeIndex]?.trim() : null;
      const imageUrl = imagesIndex >= 0 ? cols[imagesIndex]?.trim() : null;

      console.log(`Row ${i + 1} parsed:`, { certNumber, description, gradeRaw });

      if (!certNumber || !description) {
        skipped++;
        errors.push(`Row ${i + 1}: Missing cert number or description`);
        console.log(`Row ${i + 1}: Skipped - missing data`);
        continue;
      }

      // Extract numeric grade from text like "NEAR MINT-MINT 8" or "GEM MINT 10"
      let grade = null;
      if (gradeRaw) {
        const gradeMatch = gradeRaw.match(/\d+(\.\d+)?/);
        if (gradeMatch) {
          grade = gradeMatch[0];
        }
      }

      try {
        // Check if card already exists
        const existingCard = await db.query(
          "SELECT id FROM cards WHERE submission_id = $1 AND psa_cert_number = $2",
          [submission.id, certNumber]
        );

        if (existingCard.rows.length > 0) {
          skipped++;
          continue;
        }

        // Create card
        await db.query(
          `INSERT INTO cards (
            company_id, submission_id, customer_id, description,
            psa_cert_number, grade, card_images, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            req.user.company_id,
            submission.id,
            submission.customer_id,
            description,
            certNumber,
            grade,
            imageUrl ? JSON.stringify([imageUrl]) : null,
            'graded'
          ]
        );

        imported++;
        console.log(`Row ${i + 1}: Successfully imported card ${certNumber}`);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
        console.log(`Row ${i + 1}: Error -`, error.message);
      }
    }

    console.log('\n=== IMPORT SUMMARY ===');
    console.log('Imported:', imported);
    console.log('Skipped:', skipped);
    console.log('Total rows:', lines.length - 1);
    console.log('Errors:', errors);

    res.json({
      success: true,
      imported,
      skipped,
      total: lines.length - 1,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("CSV import error:", error);
    res.status(500).json({
      error: "Failed to import CSV",
      details: error.message
    });
  }
});

module.exports = router;
