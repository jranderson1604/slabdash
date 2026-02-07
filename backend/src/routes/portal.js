const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateCustomer } = require('../middleware/auth');
const stripeService = require('../services/stripe');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const upload = multer({ storage: multer.memoryStorage() });

// Quick access endpoint for portal links (GET with token query param)
router.get('/access', async (req, res) => {
    try {
        const token = req.query.token;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // Find customer by portal access token
        const customerResult = await db.query(
            `SELECT c.*, co.name as company_name, co.slug as company_slug, co.primary_color, co.logo_url
             FROM customers c JOIN companies co ON c.company_id = co.id
             WHERE c.portal_access_token = $1 AND c.portal_access_enabled = true`,
            [token]
        );

        if (customerResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired portal link' });
        }

        const customer = customerResult.rows[0];

        // Get customer's submissions with cards
        const submissionsResult = await db.query(
            `SELECT
                s.id, s.internal_id, s.psa_submission_number, s.service_level,
                s.current_step, s.progress_percent, s.grades_ready, s.shipped,
                s.problem_order, s.date_sent, s.return_tracking, s.admin_notes, s.prep_notes,
                (SELECT COUNT(*) FROM cards WHERE submission_id = s.id) as card_count,
                (SELECT json_agg(json_build_object(
                    'id', c.id,
                    'description', c.description,
                    'player_name', c.player_name,
                    'brand', c.brand,
                    'year', c.year,
                    'grade', c.grade,
                    'psa_cert_number', c.psa_cert_number,
                    'before_photos', c.before_photos,
                    'admin_notes', c.admin_notes,
                    'prep_notes', c.prep_notes,
                    'price_estimate', c.price_estimate
                )) FROM cards c WHERE c.submission_id = s.id) as cards
             FROM submissions s
             WHERE s.customer_id = $1 OR s.id IN (
                 SELECT submission_id FROM submission_customers WHERE customer_id = $1
             )
             ORDER BY s.created_at DESC`,
            [customer.id]
        );

        // Get customer's buyback offers
        const buybackResult = await db.query(
            `SELECT bo.*,
                c.description as card_description,
                c.grade as card_grade,
                c.psa_cert_number,
                c.player_name,
                c.year,
                c.brand
             FROM buyback_offers bo
             LEFT JOIN cards c ON bo.card_id = c.id
             WHERE bo.customer_id = $1
             ORDER BY bo.created_at DESC`,
            [customer.id]
        );

        res.json({
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email
            },
            company: {
                name: customer.company_name,
                slug: customer.company_slug,
                primaryColor: customer.primary_color,
                logo_url: customer.logo_url
            },
            submissions: submissionsResult.rows.map(sub => ({
                ...sub,
                cards: sub.cards || []
            })),
            buybackOffers: buybackResult.rows
        });
    } catch (error) {
        console.error('Portal access error:', error);
        res.status(500).json({ error: 'Failed to load portal data' });
    }
});

// Customer login via magic link
router.post('/login', async (req, res) => {
    try {
        const { token, email } = req.body;
        
        if (token) {
            const result = await db.query(
                `SELECT c.*, co.name as company_name, co.slug as company_slug, co.primary_color, co.logo_url
                 FROM customers c JOIN companies co ON c.company_id = co.id
                 WHERE c.portal_access_token = $1 AND c.portal_token_expires > NOW() AND c.portal_access_enabled = true`,
                [token]
            );
            
            if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid or expired token' });
            
            const customer = result.rows[0];
            await db.query('UPDATE customers SET portal_access_token = NULL WHERE id = $1', [customer.id]);
            
            const jwtToken = jwt.sign({ customerId: customer.id, type: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });
            
            res.json({
                token: jwtToken,
                customer: { id: customer.id, name: customer.name, email: customer.email },
                company: { name: customer.company_name, slug: customer.company_slug, primaryColor: customer.primary_color }
            });
        } else {
            res.json({ message: 'If your email is registered, you will receive a login link.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get customer info
router.get('/me', authenticateCustomer, (req, res) => {
    res.json({
        customer: { id: req.customer.id, name: req.customer.name, email: req.customer.email },
        company: { name: req.customer.company_name, primaryColor: req.customer.primary_color }
    });
});

// Get customer's submissions
router.get('/submissions', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, internal_id, psa_submission_number, current_step, progress_percent, grades_ready, shipped, problem_order,
                    (SELECT COUNT(*) FROM cards WHERE submission_id = submissions.id) as card_count
             FROM submissions WHERE customer_id = $1 ORDER BY created_at DESC`,
            [req.customer.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get submissions' });
    }
});

// Get single submission
router.get('/submissions/:id', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM submissions WHERE id = $1 AND customer_id = $2',
            [req.params.id, req.customer.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
        
        const cards = await db.query('SELECT * FROM cards WHERE submission_id = $1', [req.params.id]);
        const steps = await db.query('SELECT * FROM submission_steps WHERE submission_id = $1 ORDER BY step_index', [req.params.id]);
        
        res.json({ ...result.rows[0], cards: cards.rows, steps: steps.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get submission' });
    }
});

// Get customer stats
router.get('/stats', authenticateCustomer, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM submissions WHERE customer_id = $1) as total_submissions,
                (SELECT COUNT(*) FROM submissions WHERE customer_id = $1 AND shipped = false) as active_submissions,
                (SELECT COUNT(*) FROM cards WHERE customer_id = $1) as total_cards,
                (SELECT COUNT(*) FROM cards WHERE customer_id = $1 AND grade IS NOT NULL) as graded_cards,
                (SELECT COUNT(*) FROM buyback_offers WHERE customer_id = $1 AND status = 'pending') as pending_offers,
                (SELECT COUNT(*) FROM buyback_offers WHERE customer_id = $1 AND status = 'accepted') as accepted_offers,
                (SELECT COALESCE(SUM(offer_price), 0) FROM buyback_offers WHERE customer_id = $1 AND status = 'paid') as total_earnings
        `, [req.customer.id]);
        res.json(stats.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Get all customer's cards across all submissions (supports both JWT and portal token)
router.get('/cards', async (req, res) => {
    try {
        let customerId;

        // Check for portal access token first
        const token = req.query.token;
        if (token) {
            const customerResult = await db.query(
                'SELECT id FROM customers WHERE portal_access_token = $1 AND portal_access_enabled = true',
                [token]
            );
            if (customerResult.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid portal token' });
            }
            customerId = customerResult.rows[0].id;
        } else {
            // Fall back to JWT authentication
            const authMiddleware = authenticateCustomer;
            await new Promise((resolve, reject) => {
                authMiddleware(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            customerId = req.customer.id;
        }

        const result = await db.query(
            `SELECT c.*,
                s.psa_submission_number,
                s.internal_id,
                s.grades_ready,
                s.shipped
             FROM cards c
             LEFT JOIN submissions s ON c.submission_id = s.id
             WHERE c.customer_owner_id = $1 OR s.customer_id = $1
             ORDER BY c.created_at DESC`,
            [customerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get cards error:', error);
        res.status(500).json({ error: 'Failed to get cards' });
    }
});

// Upload images to customer's card
router.post('/cards/:id/images', authenticateCustomer, upload.array('images', 5), async (req, res) => {
    try {
        // Verify card belongs to customer
        const cardResult = await db.query(
            `SELECT c.* FROM cards c
             LEFT JOIN submissions s ON c.submission_id = s.id
             WHERE c.id = $1 AND (c.customer_owner_id = $2 OR s.customer_id = $2)`,
            [req.params.id, req.customer.id]
        );

        if (cardResult.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found or access denied' });
        }

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

        const card = cardResult.rows[0];
        const existingImages = card.card_images || [];
        const updatedImages = [...existingImages, ...imageUrls];

        const updated = await db.query(
            'UPDATE cards SET card_images = $1 WHERE id = $2 RETURNING *',
            [JSON.stringify(updatedImages), req.params.id]
        );

        res.json({ card: updated.rows[0], uploadedUrls: imageUrls });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

// Get customer's pickups (submissions ready for pickup or completed)
router.get('/pickups', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*,
                sc.delivery_method,
                sc.shipping_address,
                sc.customer_cost,
                (SELECT COUNT(*) FROM cards WHERE submission_id = s.id AND customer_owner_id = $1) as my_card_count
             FROM submissions s
             LEFT JOIN submission_customers sc ON s.id = sc.submission_id AND sc.customer_id = $1
             WHERE (s.customer_id = $1 OR sc.customer_id = $1)
               AND s.grades_ready = true
             ORDER BY s.picked_up ASC, s.created_at DESC`,
            [req.customer.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get pickups' });
    }
});

// Get customer's invoices
router.get('/invoices', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                s.id,
                s.psa_submission_number,
                s.internal_id,
                s.invoice_number,
                s.invoice_sent_at,
                s.total_cost as submission_total,
                sc.customer_cost,
                sc.invoice_sent,
                (SELECT COUNT(*) FROM cards WHERE submission_id = s.id AND customer_owner_id = $1) as card_count
             FROM submissions s
             LEFT JOIN submission_customers sc ON s.id = sc.submission_id AND sc.customer_id = $1
             WHERE (s.customer_id = $1 OR sc.customer_id = $1)
               AND s.invoice_sent = true
             ORDER BY s.invoice_sent_at DESC`,
            [req.customer.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get invoices' });
    }
});

// Get customer's buyback offers
router.get('/buyback-offers', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT bo.*,
                c.description as card_description,
                c.grade as card_grade,
                c.psa_cert_number,
                c.player_name,
                c.year,
                c.brand,
                s.psa_submission_number
            FROM buyback_offers bo
            LEFT JOIN cards c ON bo.card_id = c.id
            LEFT JOIN submissions s ON c.submission_id = s.id
            WHERE bo.customer_id = $1
            ORDER BY bo.created_at DESC`,
            [req.customer.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get buyback offers' });
    }
});

// Get single buyback offer
router.get('/buyback-offers/:id', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT bo.*,
                c.description as card_description,
                c.grade as card_grade,
                c.psa_cert_number,
                c.player_name,
                c.year,
                c.brand,
                s.psa_submission_number
            FROM buyback_offers bo
            LEFT JOIN cards c ON bo.card_id = c.id
            LEFT JOIN submissions s ON c.submission_id = s.id
            WHERE bo.id = $1 AND bo.customer_id = $2`,
            [req.params.id, req.customer.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Buyback offer not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get buyback offer' });
    }
});

// Respond to buyback offer (accept/reject)
router.patch('/buyback-offers/:id/respond', authenticateCustomer, async (req, res) => {
    try {
        const { response, customer_response } = req.body; // response: 'accepted' or 'rejected'

        if (!response || !['accepted', 'rejected'].includes(response)) {
            return res.status(400).json({ error: 'Invalid response. Must be "accepted" or "rejected"' });
        }

        const offerCheck = await db.query(
            'SELECT id, status FROM buyback_offers WHERE id = $1 AND customer_id = $2',
            [req.params.id, req.customer.id]
        );

        if (offerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Buyback offer not found' });
        }

        if (offerCheck.rows[0].status !== 'pending') {
            return res.status(400).json({ error: 'This offer has already been responded to' });
        }

        const result = await db.query(
            `UPDATE buyback_offers
            SET status = $1, customer_response = $2, responded_at = NOW()
            WHERE id = $3 AND customer_id = $4
            RETURNING *`,
            [response, customer_response || null, req.params.id, req.customer.id]
        );

        // Notify shop owner of customer response
        console.log(`📧 Customer ${response} buyback offer #${req.params.id}`);
        // TODO: Send notification to shop owner

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Respond to buyback offer error:', error);
        res.status(500).json({ error: 'Failed to respond to buyback offer' });
    }
});

// Get documents for customer's submissions
router.get('/documents', authenticateCustomer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT d.*,
                s.psa_submission_number
            FROM documents d
            LEFT JOIN submissions s ON d.submission_id = s.id
            WHERE d.customer_id = $1 AND d.is_public = true
            ORDER BY d.created_at DESC`,
            [req.customer.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get documents' });
    }
});

// Respond to buyback offer (token-based, for portal access without login)
router.post('/buyback-offers/:id/respond', async (req, res) => {
    try {
        const token = req.query.token || req.body.token;
        const { response, customer_response } = req.body;

        if (!token) {
            return res.status(401).json({ error: 'Token is required' });
        }

        if (!response || !['accepted', 'rejected'].includes(response)) {
            return res.status(400).json({ error: 'Invalid response. Must be "accepted" or "rejected"' });
        }

        // Verify portal token and get customer
        const customerResult = await db.query(
            `SELECT c.id, c.name, c.email
             FROM customers c
             WHERE c.portal_access_token = $1
             AND c.portal_access_enabled = true
             AND (c.portal_token_expires IS NULL OR c.portal_token_expires > NOW())`,
            [token]
        );

        if (customerResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const customer = customerResult.rows[0];

        // Verify offer belongs to customer
        const offerCheck = await db.query(
            'SELECT id, status, offer_price FROM buyback_offers WHERE id = $1 AND customer_id = $2',
            [req.params.id, customer.id]
        );

        if (offerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Buyback offer not found' });
        }

        if (offerCheck.rows[0].status !== 'pending') {
            return res.status(400).json({ error: 'This offer has already been responded to' });
        }

        const offer = offerCheck.rows[0];

        // Update offer status
        const result = await db.query(
            `UPDATE buyback_offers
            SET status = $1, customer_response = $2, responded_at = NOW()
            WHERE id = $3 AND customer_id = $4
            RETURNING *`,
            [response, customer_response || null, req.params.id, customer.id]
        );

        // Notify shop owner of customer response
        console.log(`📧 Customer ${response} buyback offer #${req.params.id}`);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Respond to buyback offer error:', error);
        res.status(500).json({ error: 'Failed to respond to buyback offer' });
    }
});

// Upload before photo for a card (customer-facing portal)
router.post('/cards/:cardId/before-photo', upload.single('photo'), async (req, res) => {
    try {
        const token = req.query.token;
        const { cardId } = req.params;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // Verify portal access
        const customerResult = await db.query(
            `SELECT c.id, c.company_id
             FROM customers c
             WHERE c.portal_access_token = $1 AND c.portal_access_enabled = true`,
            [token]
        );

        if (customerResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid portal token' });
        }

        const customer = customerResult.rows[0];

        // Verify card belongs to this customer's submissions
        const cardCheck = await db.query(
            `SELECT c.id, c.before_photos, c.player_name, c.description, s.company_id
             FROM cards c
             JOIN submissions s ON c.submission_id = s.id
             WHERE c.id = $1
             AND (s.customer_id = $2 OR s.id IN (
                 SELECT submission_id FROM submission_customers WHERE customer_id = $2
             ))`,
            [cardId, customer.id]
        );

        if (cardCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found or access denied' });
        }

        const card = cardCheck.rows[0];

        // Upload to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `slabdash/${card.company_id}/cards/before`,
                transformation: [
                    { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }
                ],
                format: 'jpg'
            },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return res.status(500).json({ error: 'Failed to upload photo' });
                }

                try {
                    // Get current before_photos array
                    const currentPhotos = card.before_photos || [];
                    const newPhotos = [...currentPhotos, {
                        url: result.secure_url,
                        public_id: result.public_id,
                        uploaded_at: new Date().toISOString()
                    }];

                    // Update card with new photo
                    const updated = await db.query(
                        `UPDATE cards
                         SET before_photos = $1, updated_at = NOW()
                         WHERE id = $2
                         RETURNING id, before_photos, player_name, description, admin_notes, prep_notes`,
                        [JSON.stringify(newPhotos), cardId]
                    );

                    res.json({
                        success: true,
                        card: updated.rows[0],
                        photo: {
                            url: result.secure_url,
                            public_id: result.public_id
                        }
                    });
                } catch (dbError) {
                    console.error('Database update error:', dbError);
                    res.status(500).json({ error: 'Failed to save photo reference' });
                }
            }
        );

        uploadStream.end(req.file.buffer);
    } catch (error) {
        console.error('Upload before photo error:', error);
        res.status(500).json({ error: 'Failed to upload before photo' });
    }
});

// Get enhanced card data including before photos and admin notes
router.get('/cards/:cardId', async (req, res) => {
    try {
        const token = req.query.token;
        const { cardId } = req.params;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // Verify portal access
        const customerResult = await db.query(
            `SELECT c.id
             FROM customers c
             WHERE c.portal_access_token = $1 AND c.portal_access_enabled = true`,
            [token]
        );

        if (customerResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid portal token' });
        }

        const customer = customerResult.rows[0];

        // Get card with all details
        const cardResult = await db.query(
            `SELECT
                c.id, c.player_name, c.description, c.brand, c.year, c.card_number,
                c.grade, c.psa_cert_number, c.declared_value, c.price_estimate,
                c.before_photos, c.admin_notes, c.prep_notes, c.last_comp_check,
                c.created_at, c.updated_at,
                s.psa_submission_number, s.internal_id, s.service_level
             FROM cards c
             JOIN submissions s ON c.submission_id = s.id
             WHERE c.id = $1
             AND (s.customer_id = $2 OR s.id IN (
                 SELECT submission_id FROM submission_customers WHERE customer_id = $2
             ))`,
            [cardId, customer.id]
        );

        if (cardResult.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found or access denied' });
        }

        res.json(cardResult.rows[0]);
    } catch (error) {
        console.error('Get card error:', error);
        res.status(500).json({ error: 'Failed to get card details' });
    }
});

module.exports = router;
