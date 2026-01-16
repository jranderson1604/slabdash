const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Multer memory storage for CSV files
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * CSV Format:
 * customer_email, psa_cert_number, card_name, year, player_name, offer_amount, notified, image_url_1, image_url_2, image_url_3
 */
router.post('/upload-csv', authenticate, upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const { submission_id } = req.body;

    if (!submission_id) {
      return res.status(400).json({ error: 'submission_id is required' });
    }

    // Verify submission belongs to company
    const submissionCheck = await db.query(
      'SELECT id, customer_id FROM submissions WHERE id = $1 AND company_id = $2',
      [submission_id, req.user.company_id]
    );

    if (submissionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionCheck.rows[0];
    const results = [];
    const errors = [];

    // Parse CSV
    const csvData = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => csvData.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNum = i + 2; // +2 because of header row and 0-index

      try {
        // Extract data
        const customer_email = row.customer_email?.trim();
        const psa_cert_number = row.psa_cert_number?.trim();
        const card_name = row.card_name?.trim();
        const year = row.year?.trim();
        const player_name = row.player_name?.trim();
        const offer_amount = row.offer_amount ? parseFloat(row.offer_amount) : null;
        const notified = row.notified?.toLowerCase() === 'yes' || row.notified?.toLowerCase() === 'true';

        // Collect image URLs (supports up to 5 images)
        const card_images = [];
        for (let j = 1; j <= 5; j++) {
          const imgUrl = row[`image_url_${j}`]?.trim();
          if (imgUrl) card_images.push(imgUrl);
        }

        // Validate required fields
        if (!card_name) {
          errors.push({ row: rowNum, error: 'card_name is required' });
          continue;
        }

        // Get or verify customer
        let customer_id = submission.customer_id;

        if (customer_email && customer_email !== '') {
          const customerResult = await db.query(
            'SELECT id FROM customers WHERE email = $1 AND company_id = $2',
            [customer_email, req.user.company_id]
          );

          if (customerResult.rows.length === 0) {
            errors.push({ row: rowNum, error: `Customer with email ${customer_email} not found` });
            continue;
          }

          customer_id = customerResult.rows[0].id;
        }

        // Insert card
        const cardResult = await db.query(
          `INSERT INTO cards (
            submission_id, customer_id, company_id, description,
            year, player_name, psa_cert_number, card_images,
            buyback_interest_notified, buyback_notified_at,
            declared_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, description, psa_cert_number`,
          [
            submission_id,
            customer_id,
            req.user.company_id,
            card_name,
            year,
            player_name,
            psa_cert_number,
            card_images,
            notified,
            notified ? new Date() : null,
            offer_amount
          ]
        );

        results.push({
          row: rowNum,
          card_id: cardResult.rows[0].id,
          card_name: cardResult.rows[0].description,
          psa_cert: cardResult.rows[0].psa_cert_number,
          images_count: card_images.length
        });

      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error);
        errors.push({ row: rowNum, error: error.message });
      }
    }

    res.json({
      success: true,
      imported: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Failed to process CSV file', details: error.message });
  }
});

/**
 * Get CSV template
 */
router.get('/csv-template', authenticate, (req, res) => {
  const template = 'customer_email,psa_cert_number,card_name,year,player_name,offer_amount,notified,image_url_1,image_url_2,image_url_3\n' +
                   'john@example.com,12345678,2023 Topps Chrome Mike Trout,2023,Mike Trout,150.00,yes,https://example.com/img1.jpg,https://example.com/img2.jpg,\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="card_import_template.csv"');
  res.send(template);
});

/**
 * Upload individual card images (Cloudinary)
 */
router.post('/cards/:cardId/upload-images', authenticate, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { image_urls } = req.body;

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
      return res.status(400).json({ error: 'image_urls array is required' });
    }

    // Verify card belongs to company
    const cardCheck = await db.query(
      'SELECT id, card_images FROM cards WHERE id = $1 AND company_id = $2',
      [cardId, req.user.company_id]
    );

    if (cardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const existingImages = cardCheck.rows[0].card_images || [];
    const updatedImages = [...existingImages, ...image_urls];

    const result = await db.query(
      'UPDATE cards SET card_images = $1 WHERE id = $2 RETURNING *',
      [updatedImages, cardId]
    );

    res.json({
      success: true,
      card: result.rows[0],
      total_images: updatedImages.length
    });

  } catch (error) {
    console.error('Upload card images error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

/**
 * Remove card image
 */
router.delete('/cards/:cardId/images/:imageIndex', authenticate, async (req, res) => {
  try {
    const { cardId, imageIndex } = req.params;
    const index = parseInt(imageIndex);

    const cardCheck = await db.query(
      'SELECT id, card_images FROM cards WHERE id = $1 AND company_id = $2',
      [cardId, req.user.company_id]
    );

    if (cardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const images = cardCheck.rows[0].card_images || [];

    if (index < 0 || index >= images.length) {
      return res.status(400).json({ error: 'Invalid image index' });
    }

    images.splice(index, 1);

    const result = await db.query(
      'UPDATE cards SET card_images = $1 WHERE id = $2 RETURNING *',
      [images, cardId]
    );

    res.json({
      success: true,
      card: result.rows[0],
      remaining_images: images.length
    });

  } catch (error) {
    console.error('Delete card image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

/**
 * Mark card as notified for buyback interest
 */
router.post('/cards/:cardId/mark-notified', authenticate, async (req, res) => {
  try {
    const { cardId } = req.params;

    const result = await db.query(
      `UPDATE cards
       SET buyback_interest_notified = true, buyback_notified_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [cardId, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ success: true, card: result.rows[0] });

  } catch (error) {
    console.error('Mark card notified error:', error);
    res.status(500).json({ error: 'Failed to mark card as notified' });
  }
});

module.exports = router;
