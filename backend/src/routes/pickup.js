const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

/**
 * Generate a random pickup code (format: ABC-123)
 */
function generatePickupCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O to avoid confusion with 1, 0
    const numbers = '0123456789';

    let code = '';
    // 3 letters
    for (let i = 0; i < 3; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    code += '-';
    // 3 numbers
    for (let i = 0; i < 3; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return code;
}

/**
 * Generate pickup code for a submission
 * Called when submission is marked as "grades ready"
 */
router.post('/generate-code/:submissionId', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { submissionId } = req.params;
        const companyId = req.user.company_id;

        // Verify submission belongs to company
        const submission = await db.query(
            'SELECT id, pickup_code FROM submissions WHERE id = $1 AND company_id = $2',
            [submissionId, companyId]
        );

        if (submission.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // If already has a code, return it
        if (submission.rows[0].pickup_code) {
            return res.json({
                success: true,
                pickup_code: submission.rows[0].pickup_code,
                message: 'Using existing pickup code'
            });
        }

        // Generate new unique code
        let pickupCode;
        let attempts = 0;
        let isUnique = false;

        while (!isUnique && attempts < 10) {
            pickupCode = generatePickupCode();

            // Check if code already exists
            const existing = await db.query(
                'SELECT id FROM submissions WHERE pickup_code = $1',
                [pickupCode]
            );

            if (existing.rows.length === 0) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({ error: 'Failed to generate unique pickup code' });
        }

        // Save pickup code
        await db.query(
            'UPDATE submissions SET pickup_code = $1 WHERE id = $2',
            [pickupCode, submissionId]
        );

        res.json({
            success: true,
            pickup_code: pickupCode,
            message: 'Pickup code generated successfully'
        });

    } catch (error) {
        console.error('Generate pickup code error:', error);
        res.status(500).json({ error: 'Failed to generate pickup code' });
    }
});

/**
 * Verify pickup code and mark as picked up
 */
router.post('/verify-pickup/:submissionId', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { pickup_code, picked_up_by, notes, skip_verification } = req.body;
        const companyId = req.user.company_id;

        // Get submission
        const submission = await db.query(
            `SELECT id, pickup_code, picked_up, psa_submission_number, internal_id
             FROM submissions
             WHERE id = $1 AND company_id = $2`,
            [submissionId, companyId]
        );

        if (submission.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const sub = submission.rows[0];

        // Check if already picked up
        if (sub.picked_up) {
            return res.status(400).json({ error: 'Submission already marked as picked up' });
        }

        // Verify pickup code (unless skipping verification)
        let codeVerified = false;
        if (skip_verification) {
            codeVerified = false; // Log that verification was skipped
        } else {
            if (!pickup_code) {
                return res.status(400).json({ error: 'Pickup code is required' });
            }

            if (pickup_code.toUpperCase() !== sub.pickup_code?.toUpperCase()) {
                return res.status(400).json({ error: 'Invalid pickup code' });
            }

            codeVerified = true;
        }

        // Mark as picked up
        await db.query(
            `UPDATE submissions
             SET picked_up = true,
                 picked_up_at = CURRENT_TIMESTAMP,
                 picked_up_by = $1,
                 shipped = true
             WHERE id = $2`,
            [picked_up_by || 'Unknown', submissionId]
        );

        // Log to pickup history
        await db.query(
            `INSERT INTO pickup_history (submission_id, pickup_code_verified, picked_up_by, pickup_notes, created_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [submissionId, codeVerified, picked_up_by || 'Unknown', notes || null, req.user.id]
        );

        res.json({
            success: true,
            message: 'Submission marked as picked up',
            code_verified: codeVerified,
            submission_number: sub.psa_submission_number || sub.internal_id
        });

    } catch (error) {
        console.error('Verify pickup error:', error);
        res.status(500).json({ error: 'Failed to verify pickup' });
    }
});

/**
 * Get pickup history for a submission
 */
router.get('/history/:submissionId', authenticate, async (req, res) => {
    try {
        const { submissionId } = req.params;
        const companyId = req.user.company_id;

        // Verify submission belongs to company
        const submission = await db.query(
            'SELECT id FROM submissions WHERE id = $1 AND company_id = $2',
            [submissionId, companyId]
        );

        if (submission.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Get pickup history
        const history = await db.query(
            `SELECT
                ph.id,
                ph.pickup_code_verified,
                ph.picked_up_by,
                ph.pickup_notes,
                ph.created_at,
                u.name as created_by_name
             FROM pickup_history ph
             LEFT JOIN users u ON ph.created_by = u.id
             WHERE ph.submission_id = $1
             ORDER BY ph.created_at DESC`,
            [submissionId]
        );

        res.json({
            success: true,
            history: history.rows
        });

    } catch (error) {
        console.error('Get pickup history error:', error);
        res.status(500).json({ error: 'Failed to get pickup history' });
    }
});

/**
 * Get submission by pickup code (for customer lookup)
 */
router.get('/lookup/:pickupCode', authenticate, async (req, res) => {
    try {
        const { pickupCode } = req.params;
        const companyId = req.user.company_id;

        const result = await db.query(
            `SELECT
                s.id,
                s.psa_submission_number,
                s.internal_id,
                s.pickup_code,
                s.picked_up,
                s.picked_up_at,
                s.picked_up_by,
                s.card_count,
                s.service_level,
                s.grades_ready
             FROM submissions s
             WHERE s.pickup_code = $1 AND s.company_id = $2`,
            [pickupCode.toUpperCase(), companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No submission found with this pickup code' });
        }

        res.json({
            success: true,
            submission: result.rows[0]
        });

    } catch (error) {
        console.error('Lookup by pickup code error:', error);
        res.status(500).json({ error: 'Failed to lookup submission' });
    }
});

module.exports = router;
