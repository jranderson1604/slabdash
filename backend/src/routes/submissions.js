const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const psaService = require('../services/psaService');

// List submissions
router.get('/', authenticate, async (req, res) => {
    try {
        const { customer_id, shipped, limit = 50, offset = 0 } = req.query;
        let query = `SELECT s.*, c.name as customer_name, c.email as customer_email,
                     (SELECT COUNT(*) FROM cards WHERE submission_id = s.id) as card_count
                     FROM submissions s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.company_id = $1`;
        const params = [req.companyId];
        let i = 2;
        
        if (customer_id) { query += ` AND s.customer_id = $${i++}`; params.push(customer_id); }
        if (shipped !== undefined) { query += ` AND s.shipped = $${i++}`; params.push(shipped === 'true'); }
        
        query += ` ORDER BY s.created_at DESC LIMIT $${i++} OFFSET $${i}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        res.json({ submissions: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list submissions' });
    }
});

// Get single submission
router.get('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, c.name as customer_name FROM submissions s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = $1 AND s.company_id = $2`,
            [req.params.id, req.companyId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
        
        const cards = await db.query('SELECT * FROM cards WHERE submission_id = $1', [req.params.id]);
        const steps = await db.query('SELECT * FROM submission_steps WHERE submission_id = $1 ORDER BY step_index', [req.params.id]);
        
        res.json({ ...result.rows[0], cards: cards.rows, steps: steps.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get submission' });
    }
});

// Create submission
router.post('/', authenticate, async (req, res) => {
    try {
        const { customer_id, internal_id, psa_submission_number, service_level, date_sent, notes } = req.body;
        
        const result = await db.query(
            `INSERT INTO submissions (company_id, customer_id, internal_id, psa_submission_number, service_level, date_sent, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.companyId, customer_id, internal_id, psa_submission_number, service_level, date_sent, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create submission' });
    }
});

// Update submission
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const allowed = ['customer_id', 'internal_id', 'psa_submission_number', 'service_level', 'date_sent', 'outbound_tracking', 'return_tracking', 'notes'];
        const updates = [], values = [];
        let i = 1;
        
        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = $${i++}`);
                values.push(req.body[field]);
            }
        }
        
        if (updates.length === 0) return res.status(400).json({ error: 'No valid fields' });
        
        values.push(req.params.id, req.companyId);
        const result = await db.query(`UPDATE submissions SET ${updates.join(', ')} WHERE id = $${i} AND company_id = $${i+1} RETURNING *`, values);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update submission' });
    }
});

// Refresh from PSA
router.post('/:id/refresh', authenticate, async (req, res) => {
    try {
        if (!req.user.psa_api_key) return res.status(400).json({ error: 'PSA API key not configured' });
        
        const subResult = await db.query('SELECT * FROM submissions WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
        if (subResult.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
        
        const submission = subResult.rows[0];
        if (!submission.psa_submission_number) return res.status(400).json({ error: 'No PSA submission number' });
        
        const psaResult = await psaService.getSubmissionProgress(req.user.psa_api_key, submission.psa_submission_number);
        if (!psaResult.success) return res.status(404).json({ error: psaResult.error });
        
        const parsed = await psaService.updateSubmissionFromPsa(submission.id, psaResult.data);
        await psaService.logApiCall(req.companyId, `/order/GetSubmissionProgress/${submission.psa_submission_number}`, 'GET', {}, 200, psaResult.data);
        
        const updated = await db.query('SELECT * FROM submissions WHERE id = $1', [submission.id]);
        res.json({ submission: updated.rows[0], psaData: parsed });
    } catch (error) {
        res.status(500).json({ error: 'Failed to refresh submission' });
    }
});

// Refresh all
router.post('/refresh-all', authenticate, async (req, res) => {
    try {
        if (!req.user.psa_api_key) return res.status(400).json({ error: 'PSA API key not configured' });
        
        const submissions = await db.query(
            `SELECT id, psa_submission_number FROM submissions WHERE company_id = $1 AND shipped = false AND psa_submission_number IS NOT NULL`,
            [req.companyId]
        );
        
        let updated = 0, errors = 0;
        for (const sub of submissions.rows) {
            try {
                const result = await psaService.getSubmissionProgress(req.user.psa_api_key, sub.psa_submission_number);
                if (result.success) { await psaService.updateSubmissionFromPsa(sub.id, result.data); updated++; }
                else errors++;
                await new Promise(r => setTimeout(r, 500));
            } catch { errors++; }
        }
        
        res.json({ message: 'Refresh complete', total: submissions.rows.length, updated, errors });
    } catch (error) {
        res.status(500).json({ error: 'Failed to refresh' });
    }
});

// Assign customer
router.post('/:id/assign-customer', authenticate, async (req, res) => {
    try {
        const { customer_id } = req.body;
        if (!customer_id) return res.status(400).json({ error: 'Customer ID required' });
        
        const result = await db.query(
            `UPDATE submissions SET customer_id = $1 WHERE id = $2 AND company_id = $3 RETURNING *`,
            [customer_id, req.params.id, req.companyId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
        
        await db.query('UPDATE cards SET customer_id = $1 WHERE submission_id = $2', [customer_id, req.params.id]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to assign customer' });
    }
});

// Delete
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM submissions WHERE id = $1 AND company_id = $2 RETURNING id', [req.params.id, req.companyId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
        res.json({ message: 'Submission deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete submission' });
    }
});

module.exports = router;
