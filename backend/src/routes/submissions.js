const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// List submissions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, shipped } = req.query;
    
    let query = `
      SELECT s.*, c.name as customer_name, c.email as customer_email
      FROM submissions s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.company_id = $1
    `;
    
    const params = [req.user.company_id];
    
    if (shipped !== undefined) {
      query += ` AND s.shipped = $${params.length + 1}`;
      params.push(shipped === 'true');
    }
    
    query += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await db.query(query, params);
    res.json({ submissions: result.rows });
  } catch (error) {
    console.error('List submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Get single submission
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `SELECT s.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
       FROM submissions s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1 AND s.company_id = $2`,
      [id, req.user.company_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// Create submission
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      customer_id,
      internal_id,
      psa_submission_number,
      service_level,
      date_sent,
      notes
    } = req.body;
    
    const result = await db.query(
      `INSERT INTO submissions (
        company_id, customer_id, internal_id, psa_submission_number,
        service_level, date_sent, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.user.company_id,
        customer_id || null,
        internal_id || null,
        psa_submission_number || null,
        service_level || null,
        date_sent || null,
        notes || null
      ]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// Update submission
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id,
      internal_id,
      psa_submission_number,
      service_level,
      date_sent,
      date_received,
      shipped,
      notes,
      current_status
    } = req.body;
    
    const result = await db.query(
      `UPDATE submissions SET
        customer_id = COALESCE($1, customer_id),
        internal_id = COALESCE($2, internal_id),
        psa_submission_number = COALESCE($3, psa_submission_number),
        service_level = COALESCE($4, service_level),
        date_sent = COALESCE($5, date_sent),
        date_received = COALESCE($6, date_received),
        shipped = COALESCE($7, shipped),
        notes = COALESCE($8, notes),
        current_status = COALESCE($9, current_status),
        updated_at = NOW()
      WHERE id = $10 AND company_id = $11
      RETURNING *`,
      [
        customer_id,
        internal_id,
        psa_submission_number,
        service_level,
        date_sent,
        date_received,
        shipped,
        notes,
        current_status,
        id,
        req.user.company_id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// Delete submission
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM submissions WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, req.user.company_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// Upload form image to submission
router.post('/:id/images', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { id } = req.params;
    const base64Image = req.file.buffer.toString('base64');
    const imageData = `data:${req.file.mimetype};base64,${base64Image}`;

    // Add image to form_images array
    const result = await db.query(
      `UPDATE submissions 
       SET form_images = array_append(COALESCE(form_images, ARRAY[]::text[]), $1)
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [imageData, id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ success: true, submission: result.rows[0] });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;