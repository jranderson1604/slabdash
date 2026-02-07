const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const psaService = require('../services/psaService');
const priceCompService = require('../services/priceCompService');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const upload = multer({ storage: multer.memoryStorage() });
const { detectSport } = require('../utils/sportDetection');

// List cards
router.get('/', authenticate, async (req, res) => {
    try {
        const { submission_id, customer_id, limit = 200, offset = 0 } = req.query;
        let query = `
            SELECT c.*,
                   s.psa_submission_number,
                   s.internal_id,
                   cu.name as customer_name,
                   cu.email as customer_email
            FROM cards c
            LEFT JOIN submissions s ON c.submission_id = s.id
            LEFT JOIN customers cu ON c.customer_id = cu.id
            WHERE c.company_id = $1`;
        const params = [req.companyId];
        let i = 2;

        if (submission_id) { query += ` AND c.submission_id = $${i++}`; params.push(submission_id); }
        if (customer_id) { query += ` AND c.customer_id = $${i++}`; params.push(customer_id); }

        query += ` ORDER BY c.created_at DESC LIMIT $${i++} OFFSET $${i}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        // Also get grade statistics
        const statsQuery = `
            SELECT
                COUNT(*) as total_cards,
                COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as graded_count,
                COUNT(CASE WHEN grade = '10' THEN 1 END) as gem_mint_count,
                COUNT(CASE WHEN grade IN ('9', '9.5') THEN 1 END) as mint_count,
                COUNT(CASE WHEN grade::numeric < 9 AND grade IS NOT NULL THEN 1 END) as other_count
            FROM cards WHERE company_id = $1
        `;
        const statsResult = await db.query(statsQuery, [req.companyId]);

        res.json({
            cards: result.rows,
            stats: statsResult.rows[0]
        });
    } catch (error) {
        console.error('Failed to list cards:', error);
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
        const allowed = ['description', 'year', 'brand', 'card_number', 'player_name', 'team', 'variation', 'psa_cert_number', 'grade', 'notes', 'customer_owner_id', 'sport'];
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

// Upload card images
router.post('/:id/images', authenticate, upload.array('images', 5), async (req, res) => {
    try {
        const cardResult = await db.query('SELECT * FROM cards WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
        if (cardResult.rows.length === 0) return res.status(404).json({ error: 'Card not found' });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images provided' });
        }

        const imageUrls = [];
        for (const file of req.files) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'slabdash/cards', resource_type: 'image' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(file.buffer);
            });
            imageUrls.push(result.secure_url);
        }

        // Get existing images and append new ones
        const card = cardResult.rows[0];
        const existingImages = card.card_images || [];
        const allImages = [...existingImages, ...imageUrls];

        await db.query(
            'UPDATE cards SET card_images = $1 WHERE id = $2',
            [allImages, req.params.id]
        );

        const updated = await db.query('SELECT * FROM cards WHERE id = $1', [req.params.id]);
        res.json({ card: updated.rows[0], uploadedUrls: imageUrls });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

// Delete card image
router.delete('/:id/images/:imageIndex', authenticate, async (req, res) => {
    try {
        const cardResult = await db.query('SELECT * FROM cards WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
        if (cardResult.rows.length === 0) return res.status(404).json({ error: 'Card not found' });

        const card = cardResult.rows[0];
        const images = card.card_images || [];
        const imageIndex = parseInt(req.params.imageIndex);

        if (imageIndex < 0 || imageIndex >= images.length) {
            return res.status(400).json({ error: 'Invalid image index' });
        }

        images.splice(imageIndex, 1);

        await db.query('UPDATE cards SET card_images = $1 WHERE id = $2', [images, req.params.id]);

        const updated = await db.query('SELECT * FROM cards WHERE id = $1', [req.params.id]);
        res.json({ card: updated.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// Auto-detect sports for cards in a submission
router.post('/auto-detect-sports', authenticate, async (req, res) => {
    try {
        const { submissionId } = req.body;

        if (!submissionId) {
            return res.status(400).json({ error: 'Submission ID required' });
        }

        // Get all cards for this submission
        const cardsResult = await db.query(
            'SELECT * FROM cards WHERE submission_id = $1 AND company_id = $2',
            [submissionId, req.user.company_id]
        );

        const cards = cardsResult.rows;
        const detected = [];
        const skipped = [];

        for (const card of cards) {
            // Skip if already has sport assigned
            if (card.sport) {
                skipped.push({ id: card.id, reason: 'Already categorized', sport: card.sport });
                continue;
            }

            // Detect sport
            const detectedSport = detectSport(card);

            // Update card with detected sport
            try {
                await db.query(
                    'UPDATE cards SET sport = $1 WHERE id = $2',
                    [detectedSport, card.id]
                );
                detected.push({
                    id: card.id,
                    description: card.description,
                    player_name: card.player_name,
                    sport: detectedSport
                });
            } catch (error) {
                // Column might not exist yet
                console.log('Note: sport column not found. Run migration first.');
                return res.status(400).json({
                    error: 'Sport column not found',
                    message: 'Please run the database migration from Settings page to enable sport categorization.'
                });
            }
        }

        res.json({
            success: true,
            summary: {
                total: cards.length,
                detected: detected.length,
                skipped: skipped.length
            },
            detected,
            skipped
        });
    } catch (error) {
        console.error('Auto-detect sports error:', error);
        res.status(500).json({ error: 'Failed to auto-detect sports', details: error.message });
    }
});

// Bulk assign cards to customers via CSV
router.post('/bulk-assign', authenticate, async (req, res) => {
    try {
        const { csvData, submissionId } = req.body;

        if (!csvData || !submissionId) {
            return res.status(400).json({ error: 'CSV data and submission ID required' });
        }

        // Verify submission belongs to company
        const subCheck = await db.query(
            'SELECT id FROM submissions WHERE id = $1 AND company_id = $2',
            [submissionId, req.user.company_id]
        );
        if (subCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Parse CSV (expecting: cert_number, customer_name or cert_number, customer_email)
        const lines = csvData.trim().split('\n');
        const assignments = [];
        const errors = [];

        // Skip header row if present
        const startIndex = lines[0].toLowerCase().includes('cert') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const [certNumber, customerIdentifier] = line.split(',').map(s => s.trim());

            if (!certNumber || !customerIdentifier) {
                errors.push({ line: i + 1, error: 'Missing cert number or customer identifier' });
                continue;
            }

            assignments.push({ certNumber, customerIdentifier, lineNumber: i + 1 });
        }

        // Get all customers for this company
        const customersResult = await db.query(
            'SELECT id, name, email FROM customers WHERE company_id = $1',
            [req.user.company_id]
        );
        const customers = customersResult.rows;

        // Match assignments to customers
        const matched = [];
        const unmatched = [];

        for (const assignment of assignments) {
            const { certNumber, customerIdentifier, lineNumber } = assignment;

            // Try to find customer by name or email (case insensitive)
            const customer = customers.find(c =>
                c.name.toLowerCase() === customerIdentifier.toLowerCase() ||
                c.email.toLowerCase() === customerIdentifier.toLowerCase()
            );

            if (customer) {
                matched.push({ certNumber, customerId: customer.id, customerName: customer.name });
            } else {
                unmatched.push({ certNumber, customerIdentifier, lineNumber });
            }
        }

        // Get all cards for this submission
        const cardsResult = await db.query(
            'SELECT id, psa_cert_number FROM cards WHERE submission_id = $1 AND company_id = $2',
            [submissionId, req.user.company_id]
        );
        const cards = cardsResult.rows;

        // Execute bulk assignment
        const assigned = [];
        const notFound = [];

        for (const match of matched) {
            const card = cards.find(c => c.psa_cert_number === match.certNumber);

            if (card) {
                await db.query(
                    'UPDATE cards SET customer_id = $1 WHERE id = $2',
                    [match.customerId, card.id]
                );

                // Also update submission_customers junction table
                try {
                    await db.query(
                        `INSERT INTO submission_customers (submission_id, customer_id)
                         VALUES ($1, $2)
                         ON CONFLICT (submission_id, customer_id) DO NOTHING`,
                        [submissionId, match.customerId]
                    );
                } catch (err) {
                    // Junction table might not exist, that's okay
                    console.log('Note: submission_customers table update skipped');
                }

                assigned.push({ certNumber: match.certNumber, customerName: match.customerName });
            } else {
                notFound.push({ certNumber: match.certNumber, reason: 'Card not found in submission' });
            }
        }

        res.json({
            success: true,
            summary: {
                total: assignments.length,
                assigned: assigned.length,
                unmatched: unmatched.length,
                notFound: notFound.length,
                errors: errors.length
            },
            assigned,
            unmatched,
            notFound,
            errors
        });
    } catch (error) {
        console.error('Bulk assign error:', error);
        res.status(500).json({ error: 'Failed to bulk assign cards', details: error.message });
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

// Lookup price comps for a card
router.post('/:id/lookup-price', authenticate, async (req, res) => {
    try {
        // Get card with full details
        const cardResult = await db.query(
            'SELECT * FROM cards WHERE id = $1 AND company_id = $2',
            [req.params.id, req.companyId]
        );

        if (cardResult.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const card = cardResult.rows[0];

        // Check if comp data is recent (optional - can force refresh with force=true query param)
        const forceRefresh = req.query.force === 'true';
        if (!forceRefresh && card.last_comp_check) {
            const isStale = priceCompService.isCompDataStale(card.last_comp_check, 7);
            if (!isStale) {
                return res.json({
                    message: 'Comp data is recent (less than 7 days old)',
                    cached: true,
                    card: {
                        id: card.id,
                        price_estimate: card.price_estimate,
                        last_comp_check: card.last_comp_check,
                        comp_lookups: card.comp_lookups
                    }
                });
            }
        }

        // Fetch comp data from all sources
        const compResult = await priceCompService.fetchAllComps(card);

        // Store comp result in comp_lookups array (keep last 10 lookups)
        const existingLookups = card.comp_lookups || [];
        const updatedLookups = [compResult, ...existingLookups].slice(0, 10);

        // Update card with new price estimate and comp data
        await db.query(
            `UPDATE cards
             SET price_estimate = $1,
                 last_comp_check = NOW(),
                 comp_lookups = $2
             WHERE id = $3`,
            [compResult.priceEstimate, JSON.stringify(updatedLookups), card.id]
        );

        // Return updated card
        const updatedCard = await db.query('SELECT * FROM cards WHERE id = $1', [card.id]);

        res.json({
            success: true,
            message: `Found ${compResult.totalListings} comps across ${Object.keys(compResult.sources).filter(k => compResult.sources[k].available && compResult.sources[k].count > 0).length} sources`,
            card: updatedCard.rows[0],
            compResult
        });
    } catch (error) {
        console.error('Price comp lookup error:', error);
        res.status(500).json({ error: 'Failed to lookup price comps', details: error.message });
    }
});

// Get comp lookup history for a card
router.get('/:id/comps', authenticate, async (req, res) => {
    try {
        const cardResult = await db.query(
            'SELECT id, description, player_name, year, brand, grade, price_estimate, last_comp_check, comp_lookups FROM cards WHERE id = $1 AND company_id = $2',
            [req.params.id, req.companyId]
        );

        if (cardResult.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const card = cardResult.rows[0];

        res.json({
            card: {
                id: card.id,
                description: card.description,
                player_name: card.player_name,
                year: card.year,
                brand: card.brand,
                grade: card.grade,
                price_estimate: card.price_estimate,
                last_comp_check: card.last_comp_check
            },
            comps: card.comp_lookups || [],
            isStale: priceCompService.isCompDataStale(card.last_comp_check, 7)
        });
    } catch (error) {
        console.error('Get comps error:', error);
        res.status(500).json({ error: 'Failed to get comp data' });
    }
});

module.exports = router;
