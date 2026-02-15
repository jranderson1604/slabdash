const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { getSubmissionProgress, parseProgressData, updateSubmissionFromPsa, getCertificate, getCertWithImages, parseCertData, estimateSubmissionProgress, getHistoricalDurations, getRefreshPriority } = require("../services/psaService");
const { normalizeServiceLevel } = require("../utils/serviceLevel");

// List submissions
router.get("/", authenticate, async (req, res) => {
  try {
    const { customer_id, status } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 500, 1), 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

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
    const submissionIds = result.rows.map(s => s.id);

    if (submissionIds.length === 0) {
      return res.json({ submissions: [], total: 0, limit: parseInt(limit), offset: parseInt(offset) });
    }

    // Batch load all related data in 3 parallel queries instead of N+1
    const [historicalDurations, linkedCustomersResult, cardsResult] = await Promise.all([
      getHistoricalDurations(req.user.company_id),
      db.query(
        `SELECT sc.submission_id, c.id, c.name, c.email, c.phone
         FROM submission_customers sc
         JOIN customers c ON sc.customer_id = c.id
         WHERE sc.submission_id = ANY($1::uuid[])
         ORDER BY c.name`,
        [submissionIds]
      ),
      db.query(
        `SELECT id, submission_id, player_name, description, year, card_set as brand, grade, psa_cert_number
         FROM cards
         WHERE submission_id = ANY($1::uuid[])
         ORDER BY id`,
        [submissionIds]
      ),
    ]);

    // Index linked customers by submission_id
    const customersBySubmission = {};
    for (const row of linkedCustomersResult.rows) {
      if (!customersBySubmission[row.submission_id]) customersBySubmission[row.submission_id] = [];
      customersBySubmission[row.submission_id].push({ id: row.id, name: row.name, email: row.email, phone: row.phone });
    }

    // For submissions with no junction-table customers, collect their direct customer_ids
    const directCustomerIds = [];
    for (const sub of result.rows) {
      if (!customersBySubmission[sub.id] && sub.customer_id) {
        directCustomerIds.push(sub.customer_id);
      }
    }

    // Batch load direct customers if any
    const directCustomerMap = {};
    if (directCustomerIds.length > 0) {
      const directResult = await db.query(
        `SELECT id, name, email, phone FROM customers WHERE id = ANY($1::uuid[])`,
        [directCustomerIds]
      );
      for (const c of directResult.rows) {
        directCustomerMap[c.id] = [{ id: c.id, name: c.name, email: c.email, phone: c.phone }];
      }
    }

    // Index cards by submission_id
    const cardsBySubmission = {};
    for (const card of cardsResult.rows) {
      if (!cardsBySubmission[card.submission_id]) cardsBySubmission[card.submission_id] = [];
      cardsBySubmission[card.submission_id].push(card);
    }

    // Assemble final results
    const submissionsWithCustomers = result.rows.map(submission => {
      const linkedCustomers = customersBySubmission[submission.id]
        || (submission.customer_id && directCustomerMap[submission.customer_id])
        || [];
      const estimate = estimateSubmissionProgress(submission, historicalDurations);
      const priority = getRefreshPriority(submission);

      return {
        ...submission,
        linked_customers: linkedCustomers,
        cards: cardsBySubmission[submission.id] || [],
        estimated: estimate,
        refreshPriority: priority,
      };
    });

    const countResult = await db.query(
      `SELECT COUNT(*) FROM submissions WHERE company_id = $1`,
      [req.user.company_id]
    );

    res.json({
      submissions: submissionsWithCustomers,
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

    const submission = result.rows[0];
    const historicalDurations = await getHistoricalDurations(req.user.company_id);
    const estimate = estimateSubmissionProgress(submission, historicalDurations);
    const priority = getRefreshPriority(submission);

    res.json({
      ...submission,
      cards: cardsResult.rows,
      linked_customers: linkedCustomersResult.rows,
      steps: stepsResult.rows,
      estimated: estimate,
      refreshPriority: priority,
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
      notes,
      override_existing
    } = req.body;

    // Check if submission with this PSA number already exists
    if (psa_submission_number) {
      const existingCheck = await db.query(
        "SELECT id FROM submissions WHERE company_id = $1 AND psa_submission_number = $2",
        [req.user.company_id, psa_submission_number]
      );

      if (existingCheck.rows.length > 0) {
        if (override_existing) {
          // Delete the existing submission and all related data
          const submissionId = existingCheck.rows[0].id;
          console.log(`Override requested: deleting existing submission ${submissionId} with PSA# ${psa_submission_number}`);

          // Delete cards
          await db.query(
            "DELETE FROM cards WHERE submission_id = $1 AND company_id = $2",
            [submissionId, req.user.company_id]
          );

          // Delete submission_customers links
          await db.query(
            "DELETE FROM submission_customers WHERE submission_id = $1",
            [submissionId]
          );

          // Delete submission
          await db.query(
            "DELETE FROM submissions WHERE id = $1 AND company_id = $2",
            [submissionId, req.user.company_id]
          );

          console.log(`Successfully deleted existing submission, creating new one...`);
        } else {
          return res.status(409).json({
            error: "A submission with this PSA number already exists",
            existing_submission_id: existingCheck.rows[0].id,
            message: "This PSA submission number is already being tracked"
          });
        }
      }
    }

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
            console.log("PSA order data fetched:", {
              orderNumber: parsedPsaData.orderNumber,
              currentStep: parsedPsaData.currentStep,
              progressPercent: parsedPsaData.progressPercent,
              gradesReady: parsedPsaData.gradesReady
            });
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
        normalizeServiceLevel(service_level) || null,
        date_sent || null,
        notes || null,
        parsedPsaData?.currentStep || null,
        parsedPsaData?.currentStep || 'Not Yet Sent',
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
      error: "Failed to create submission"
    });
  }
});

// Update submission
router.put("/:id", authenticate, async (req, res) => {
  try {
    const allowed = [
      'customer_id', 'internal_id', 'psa_submission_number', 'psa_order_number',
      'service_level', 'date_sent', 'date_received', 'notes', 'grades_ready',
      'shipped', 'problem_order', 'problem_description', 'psa_status',
      'declared_value', 'card_count', 'outbound_tracking', 'return_tracking'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        // Normalize service level names
        const value = field === 'service_level' ? normalizeServiceLevel(req.body[field]) : req.body[field];
        values.push(value);
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

    const updatedSubmission = result.rows[0];

    // If grades_ready is being set to true and no pickup code exists, generate one
    if (req.body.grades_ready === true && !updatedSubmission.pickup_code) {
      const generatePickupCode = () => {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const numbers = '0123456789';
        let code = '';
        for (let i = 0; i < 3; i++) {
          code += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        code += '-';
        for (let i = 0; i < 3; i++) {
          code += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
        return code;
      };

      let pickupCode;
      let attempts = 0;
      let isUnique = false;

      while (!isUnique && attempts < 10) {
        pickupCode = generatePickupCode();
        const existing = await db.query(
          'SELECT id FROM submissions WHERE pickup_code = $1',
          [pickupCode]
        );
        if (existing.rows.length === 0) {
          isUnique = true;
        }
        attempts++;
      }

      if (isUnique) {
        await db.query(
          'UPDATE submissions SET pickup_code = $1 WHERE id = $2',
          [pickupCode, req.params.id]
        );
        updatedSubmission.pickup_code = pickupCode;
      }
    }

    res.json(updatedSubmission);
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

// Clean up orphaned submission by PSA number
router.delete("/cleanup/:psa_number", authenticate, async (req, res) => {
  try {
    const { psa_number } = req.params;

    // Find the submission
    const findResult = await db.query(
      "SELECT id FROM submissions WHERE psa_submission_number = $1 AND company_id = $2",
      [psa_number, req.user.company_id]
    );

    if (findResult.rows.length === 0) {
      return res.status(404).json({ error: "No submission found with that PSA number" });
    }

    const submissionId = findResult.rows[0].id;

    // Delete associated cards first
    await db.query(
      "DELETE FROM cards WHERE submission_id = $1 AND company_id = $2",
      [submissionId, req.user.company_id]
    );

    // Delete submission_customers links
    await db.query(
      "DELETE FROM submission_customers WHERE submission_id = $1",
      [submissionId]
    );

    // Then delete the submission
    await db.query(
      "DELETE FROM submissions WHERE id = $1 AND company_id = $2",
      [submissionId, req.user.company_id]
    );

    res.json({
      message: "Submission deleted successfully",
      psa_number: psa_number,
      submission_id: submissionId
    });
  } catch (error) {
    console.error("Cleanup submission error:", error);
    res.status(500).json({ error: "Failed to clean up submission" });
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

    if (result.rateLimited) {
      return res.status(429).json({ error: result.error });
    }

    if (!result.success) {
      return res.status(500).json({ error: result.error || "Failed to fetch data from PSA API" });
    }

    // Update submission with latest PSA data
    const { parsed, changes } = await updateSubmissionFromPsa(submission.id, result.data);

    // Fetch updated submission with all related data
    const updatedResult = await db.query(
      `SELECT s.*, c.name as customer_name, c.email as customer_email
       FROM submissions s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1`,
      [submission.id]
    );

    const stepsResult = await db.query(
      `SELECT * FROM submission_steps WHERE submission_id = $1 ORDER BY step_index`,
      [submission.id]
    );

    res.json({
      message: "Submission refreshed from PSA",
      submission: {
        ...updatedResult.rows[0],
        steps: stepsResult.rows
      },
      changes: {
        hadChanges: changes.hadChanges,
        stepChanged: changes.stepChanged,
        previousStep: changes.previousStep,
        newStep: changes.newStep,
        progressDelta: changes.progressDelta || 0,
        gradesReady: parsed.gradesReady,
        shipped: parsed.shipped,
        problemOrder: parsed.problemOrder,
        milestonesSet: changes.milestonesSet,
      }
    });
  } catch (error) {
    console.error("Refresh submission error:", error);
    res.status(500).json({
      error: "Failed to refresh submission"
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

    // Verify customer belongs to the same company
    const customerCheck = await db.query(
      "SELECT id FROM customers WHERE id = $1 AND company_id = $2",
      [customer_id, req.user.company_id]
    );
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
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

    // Helper function to parse CSV line with quoted fields
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Parse CSV (PSA format: Cert #, Type, Description, Grade, After Service, Images)
    const lines = csvData.trim().split('\n');
    console.log('Total lines:', lines.length);
    console.log('Line 0 (header):', lines[0]);
    if (lines.length > 1) console.log('Line 1 (first data):', lines[1]);

    // Parse header line
    const headers = parseCSVLine(lines[0]);
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

      const cols = parseCSVLine(line);
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
        const cardResult = await db.query(
          `INSERT INTO cards (
            company_id, submission_id, customer_id, description,
            psa_cert_number, grade, card_images, status, player_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [
            req.user.company_id,
            submission.id,
            submission.customer_id,
            description,
            certNumber,
            grade,
            null, // Start with no images, will fetch from PSA API
            'graded',
            '' // player_name - empty for CSV imports, can be filled in manually
          ]
        );

        const cardId = cardResult.rows[0].id;
        console.log(`Row ${i + 1}: Card created with ID ${cardId}`);

        // Fetch cert data + images from PSA API
        if (req.user.psa_api_key) {
          try {
            const certResult = await getCertWithImages(req.user.psa_api_key, certNumber);
            if (certResult.success && certResult.data) {
              const cert = certResult.data;
              const parsed = parseCertData(cert);
              const updates = { psa_cert_data: JSON.stringify(cert) };

              if (parsed.playerName) updates.player_name = parsed.playerName;
              if (cert.images && cert.images.length > 0) updates.card_images = cert.images;

              const setClauses = [];
              const vals = [];
              let pi = 1;
              for (const [key, value] of Object.entries(updates)) {
                setClauses.push(`${key} = $${pi++}`);
                vals.push(value);
              }
              vals.push(cardId);

              await db.query(
                `UPDATE cards SET ${setClauses.join(', ')} WHERE id = $${pi}`,
                vals
              );
              console.log(`Row ${i + 1}: Enriched from PSA API (grade: ${parsed.grade}, images: ${cert.images?.length || 0})`);
            }
            // Rate limit between cert lookups
            await new Promise(r => setTimeout(r, 300));
          } catch (certError) {
            console.log(`Row ${i + 1}: PSA API cert lookup failed -`, certError.message);
          }
        }

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
      error: "Failed to import CSV"
    });
  }
});

// Admin endpoint to fix corrupted shipped statuses
router.post("/fix-shipped-status", authenticate, requireRole("owner", "admin"), async (req, res) => {
  try {
    // Reset shipped=true for submissions without tracking numbers
    const result = await db.query(`
      UPDATE submissions
      SET shipped = false
      WHERE company_id = $1
      AND shipped = true
      AND (return_tracking IS NULL OR return_tracking = '' OR return_tracking = 'null')
    `, [req.user.company_id]);

    res.json({
      success: true,
      message: `Fixed ${result.rowCount} submissions that were incorrectly marked as shipped`,
      fixed: result.rowCount
    });
  } catch (error) {
    console.error("Fix shipped status error:", error);
    res.status(500).json({ error: "Failed to fix shipped statuses" });
  }
});

// Verify pickup code and automatically mark customer as picked up
router.post("/verify-pickup-code", authenticate, requireRole("owner", "admin"), async (req, res) => {
  try {
    const { pickup_code } = req.body;

    if (!pickup_code) {
      return res.status(400).json({ error: "Pickup code is required" });
    }

    const cleanCode = pickup_code.toUpperCase().trim();

    // Try to find customer by their unique pickup code
    // First try with picked_up columns, fall back to simpler query if columns don't exist
    let result;
    let hasPickupColumns = true;

    try {
      result = await db.query(
        `SELECT sc.submission_id, sc.customer_id, sc.pickup_code, sc.picked_up, sc.picked_up_at,
                c.name as customer_name, c.email as customer_email,
                s.psa_submission_number, s.internal_id, s.company_id
         FROM submission_customers sc
         JOIN customers c ON sc.customer_id = c.id
         JOIN submissions s ON sc.submission_id = s.id
         WHERE sc.pickup_code = $1`,
        [cleanCode]
      );
    } catch (error) {
      // Columns don't exist yet - use simpler query
      console.log('Note: picked_up columns not found. Using fallback query.');
      hasPickupColumns = false;

      result = await db.query(
        `SELECT sc.submission_id, sc.customer_id, sc.pickup_code,
                c.name as customer_name, c.email as customer_email,
                s.psa_submission_number, s.internal_id, s.company_id
         FROM submission_customers sc
         JOIN customers c ON sc.customer_id = c.id
         JOIN submissions s ON sc.submission_id = s.id
         WHERE sc.pickup_code = $1`,
        [cleanCode]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invalid pickup code" });
    }

    const record = result.rows[0];

    // Verify submission belongs to this company
    if (record.company_id !== req.user.company_id) {
      return res.status(404).json({ error: "Invalid pickup code" });
    }

    // Check if already picked up (only if columns exist)
    if (hasPickupColumns && record.picked_up) {
      return res.json({
        success: true,
        already_picked_up: true,
        message: `${record.customer_name} already picked up on ${new Date(record.picked_up_at).toLocaleString()}`,
        customer: {
          name: record.customer_name,
          email: record.customer_email
        },
        submission: {
          number: record.psa_submission_number || record.internal_id
        },
        picked_up_at: record.picked_up_at
      });
    }

    // Automatically mark as picked up (if columns exist)
    if (hasPickupColumns) {
      try {
        await db.query(
          `UPDATE submission_customers
           SET picked_up = true, picked_up_at = CURRENT_TIMESTAMP
           WHERE submission_id = $1 AND customer_id = $2`,
          [record.submission_id, record.customer_id]
        );
      } catch (error) {
        console.log('Note: picked_up columns not found during update. Run migration to enable pickup tracking.');
      }
    }

    res.json({
      success: true,
      message: `${record.customer_name} marked as picked up!`,
      customer: {
        name: record.customer_name,
        email: record.customer_email
      },
      submission: {
        number: record.psa_submission_number || record.internal_id
      },
      picked_up_at: new Date().toISOString()
    });

  } catch (error) {
    console.error("Verify pickup code error:", error);
    res.status(500).json({ error: "Failed to verify pickup code" });
  }
});


module.exports = router;
