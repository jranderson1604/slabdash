const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { parse } = require('csv-parse/sync');

/**
 * Import PSA bulk CSV export
 * Columns: Order #, Submission #, Status, Items, Service, After Service, Track Package, Arrived, Completed
 */
router.post('/import-psa-csv', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { csvData } = req.body;
        const companyId = req.user.company_id;

        if (!csvData) {
            return res.status(400).json({ error: 'CSV data is required' });
        }

        // Parse CSV
        const records = parse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true
        });

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (const record of records) {
            try {
                const orderNumber = record['Order #']?.trim() || '';
                const submissionNumber = record['Submission #']?.trim() || '';
                const status = record['Status']?.trim() || '';
                const items = parseInt(record['Items']) || 0;
                const service = record['Service']?.trim() || '';
                const trackingUrl = record['Track Package']?.trim() || '';
                const arrived = record['Arrived']?.trim() || '';
                const completed = record['Completed']?.trim() || '';

                // Skip if no submission number
                if (!submissionNumber) {
                    skipped++;
                    continue;
                }

                // Extract tracking number from URL if present
                let trackingNumber = '';
                if (trackingUrl && trackingUrl.includes('trknbr=')) {
                    trackingNumber = trackingUrl.split('trknbr=')[1] || trackingUrl;
                }

                // Parse date (format: "Jan 23, 2026" or "Jan 23, 2026 Estimated")
                let dateArrived = null;
                if (arrived) {
                    try {
                        const dateParts = arrived.replace(' Estimated', '').trim();
                        dateArrived = new Date(dateParts).toISOString().split('T')[0];
                    } catch (e) {
                        // Invalid date, skip
                    }
                }

                // Determine if shipped based on status
                const shipped = status.toLowerCase() === 'completed';
                const problemOrder = status.toLowerCase().includes('problem');

                // Check if submission already exists
                const existingResult = await db.query(
                    `SELECT id FROM submissions WHERE psa_submission_number = $1 AND company_id = $2`,
                    [submissionNumber, companyId]
                );

                if (existingResult.rows.length > 0) {
                    // Update existing submission
                    const submissionId = existingResult.rows[0].id;

                    await db.query(
                        `UPDATE submissions SET
                            psa_order_number = $1,
                            psa_status = $2,
                            card_count = $3,
                            service_level = $4,
                            return_tracking = $5,
                            date_sent = $6,
                            shipped = $7,
                            problem_order = $8,
                            last_api_update = CURRENT_TIMESTAMP
                         WHERE id = $9 AND company_id = $10`,
                        [
                            orderNumber || null,
                            status || null,
                            items,
                            service || null,
                            trackingNumber || null,
                            dateArrived,
                            shipped,
                            problemOrder,
                            submissionId,
                            companyId
                        ]
                    );

                    updated++;
                    console.log(`✓ Updated submission ${submissionNumber}`);
                } else {
                    // Create new submission
                    await db.query(
                        `INSERT INTO submissions (
                            company_id,
                            psa_submission_number,
                            psa_order_number,
                            psa_status,
                            card_count,
                            service_level,
                            return_tracking,
                            date_sent,
                            shipped,
                            problem_order,
                            internal_id,
                            last_api_update
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
                        [
                            companyId,
                            submissionNumber,
                            orderNumber || null,
                            status || null,
                            items,
                            service || null,
                            trackingNumber || null,
                            dateArrived,
                            shipped,
                            problemOrder,
                            submissionNumber // Use submission number as internal ID
                        ]
                    );

                    created++;
                    console.log(`✓ Created submission ${submissionNumber}`);
                }
            } catch (error) {
                console.error(`✗ Failed to process record:`, error.message);
                errors.push({
                    submission: record['Submission #'],
                    error: error.message
                });
                skipped++;
            }
        }

        res.json({
            success: true,
            message: `PSA import complete: ${created} created, ${updated} updated, ${skipped} skipped`,
            created,
            updated,
            skipped,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('PSA CSV import error:', error);
        res.status(500).json({
            error: 'Failed to import PSA CSV',
            details: error.message
        });
    }
});

module.exports = router;
