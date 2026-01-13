const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const psaService = require('../services/psaService');

// List cards
router.get('/', authenticate, async (req, res) => {
    try {
        const { submission_id, customer_id, limit = 50, offset = 0 } = req.query;
        let query = `SELECT c.*, s.psa_submission_number FROM cards c LEFT JOIN submissions s ON c.submission_id = s.id WHERE c.company_id = $1`;
        const params = [req.companyId];
        let i = 2;
        
        if (submission_id) { query += ` AND c.submission_id = $${i++}`; params.push(submission_id); }
        if (customer_id) { query += ` AND c.customer_id = $${i++}`; params.push(customer_id); }
        
        query += ` ORDER BY c.created_at DESC LIMIT $${i++} OFFSET $${i}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        res.json({ cards: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list cards' });
    }
});

// Get single card
router.get('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM cards WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get card' });
    }
});

// Create card
router.post('/', authenticate, async (req, res) => {
    try {
        const { submission_id, description, year, brand, card_number, player_name, team, variation, psa_cert_number } = req.body;
        if (!submission_id || !description) return res.status(400).json({ error: 'Submission ID and description required' });
        
        const subCheck = await db.query('SELECT customer_id FROM submissions WHERE id = $1 AND company_id = $2', [submission_id, req.companyId]);
        if (subCheck.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
        
        const result = await db.query(
            `INSERT INTO cards (company_id, submission_id, customer_id, description, year, brand, card_number, player_name, team, variation, psa_cert_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [req.companyId, submission_id, subCheck.rows[0].customer_id, description, year, brand, card_number, player_name, team, variation, psa_cert_number]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create card' });
    }
});

// Bulk create cards
router.post('/bulk', authenticate, async (req, res) => {
    try {
        const { submission_id, cards } = req.body;
        if (!submission_id || !Array.isArray(cards)) return res.status(400).json({ error: 'Submission ID and cards array required' });
        
        const subCheck = await db.query('SELECT customer_id FROM submissions WHERE id = $1 AND company_id = $2', [submission_id, req.companyId]);
        if (subCheck.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
        
        const created = [];
        for (const card of cards) {
            const result = await db.query(
                `INSERT INTO cards (company_id, submission_id, customer_id, description, year, brand, player_name)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [req.companyId, submission_id, subCheck.rows[0].customer_id, card.description, card.year, card.brand, card.player_name]
            );
            created.push(result.rows[0]);
        }
        
        res.status(201).json({ message: `Created ${created.length} cards`, cards: created });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create cards' });
    }
});

// Update card
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const allowed = ['description', 'year', 'brand', 'card_number', 'player_name', 'team', 'variation', 'psa_cert_number', 'grade', 'notes'];
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
        const result = await db.query(`UPDATE cards SET ${updates.join(', ')} WHERE id = $${i} AND company_id = $${i+1} RETURNING *`, values);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update card' });
    }
});

// Lookup cert
router.post('/:id/lookup-cert', authenticate, async (req, res) => {
    try {
        if (!req.user.psa_api_key) return res.status(400).json({ error: 'PSA API key not configured' });
        
        const cardResult = await db.query('SELECT * FROM cards WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
        if (cardResult.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
        
        const card = cardResult.rows[0];
        if (!card.psa_cert_number) return res.status(400).json({ error: 'No cert number' });
        
        const certResult = await psaService.getCertificate(req.user.psa_api_key, card.psa_cert_number);
        if (!certResult.success) return res.status(404).json({ error: certResult.error });
        
        const cert = certResult.data;
        await db.query(
            `UPDATE cards SET grade = $1, psa_cert_data = $2, status = 'graded' WHERE id = $3`,
            [cert.CardGrade || cert.Grade, JSON.stringify(cert), card.id]
        );
        
        const updated = await db.query('SELECT * FROM cards WHERE id = $1', [card.id]);
        res.json({ card: updated.rows[0], certData: cert });
    } catch (error) {
        res.status(500).json({ error: 'Failed to lookup cert' });
    }
});

// Delete
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM cards WHERE id = $1 AND company_id = $2 RETURNING id', [req.params.id, req.companyId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
        res.json({ message: 'Card deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete card' });
    }
});

module.exports = router;
