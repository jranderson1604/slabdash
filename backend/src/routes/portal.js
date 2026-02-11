const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authenticateCustomer } = require('../middleware/auth');
const stripeService = require('../services/stripe');
const cardScannerService = require('../services/cardScannerService');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const upload = multer({ storage: multer.memoryStorage() });
const { fetchJustTCGComps, fetchEbayComps, fetchGradedPricing } = require('../services/priceCompService');

// ============================================
// SECURITY: Strict rate limiter for auth endpoints
// 5 attempts per 15 minutes per IP
// ============================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  keyGenerator: (req) => {
    // Rate limit by IP + email combo to prevent distributed attacks
    const email = (req.body?.email || '').toLowerCase();
    return `${req.ip}:${email}`;
  }
});

// Password validation: min 8 chars, at least 1 letter, at least 1 number
const validatePassword = (password) => {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
};

// Account lockout: 5 failed attempts = 30 minute lock
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const checkAccountLock = (customer) => {
  if (customer.locked_until && new Date(customer.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(customer.locked_until) - new Date()) / 60000);
    return `Account locked. Try again in ${minutesLeft} minutes.`;
  }
  return null;
};

// ============================================
// CUSTOMER AUTH ENDPOINTS
// ============================================

// Look up shop by slug (returns minimal public info only)
router.get('/auth/shop-lookup/:slug', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT name, slug, primary_color, logo_url FROM companies WHERE slug = $1`,
      [req.params.slug.toLowerCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to look up shop' });
  }
});

// Customer login with email + password + shop slug
router.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { slug, email, password } = req.body;

    if (!slug || !email || !password) {
      return res.status(400).json({ error: 'Shop code, email, and password are required' });
    }

    // Find company by slug
    const companyResult = await db.query(
      `SELECT id, name, slug, primary_color, logo_url, sam_enabled FROM companies WHERE slug = $1`,
      [slug.toLowerCase()]
    );
    if (companyResult.rows.length === 0) {
      // Timing-safe: same error message whether shop exists or not
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const company = companyResult.rows[0];

    // Find customer by email + company
    const customerResult = await db.query(
      `SELECT id, name, email, password_hash, portal_access_enabled,
              failed_login_attempts, locked_until
       FROM customers
       WHERE company_id = $1 AND LOWER(email) = $2`,
      [company.id, email.toLowerCase()]
    );

    if (customerResult.rows.length === 0) {
      // Timing-safe: run bcrypt compare even when user not found
      await bcrypt.compare(password, '$2a$12$invalidhashtowastetimenothinghere1234567890');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const customer = customerResult.rows[0];

    // Check portal access
    if (!customer.portal_access_enabled) {
      return res.status(403).json({ error: 'Portal access is disabled. Contact your shop.' });
    }

    // Check account lockout
    const lockMessage = checkAccountLock(customer);
    if (lockMessage) {
      return res.status(423).json({ error: lockMessage });
    }

    // Check if password is set
    if (!customer.password_hash) {
      return res.status(401).json({
        error: 'No password set. Use your magic link to set up a password.',
        code: 'NO_PASSWORD'
      });
    }

    // Verify password (bcrypt cost 12)
    const passwordMatch = await bcrypt.compare(password, customer.password_hash);

    if (!passwordMatch) {
      // Increment failed attempts
      const newAttempts = (customer.failed_login_attempts || 0) + 1;
      const updates = { failed_login_attempts: newAttempts };

      if (newAttempts >= LOCKOUT_THRESHOLD) {
        updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS);
        console.log(`🔒 Customer ${email} locked out after ${newAttempts} failed attempts`);
      }

      const setClauses = Object.entries(updates).map(([k, v], i) => `${k} = $${i + 1}`);
      const values = Object.values(updates);
      values.push(customer.id);
      await db.query(
        `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
        values
      );

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Success — reset failed attempts, update last login
    await db.query(
      `UPDATE customers SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1`,
      [customer.id]
    );

    // Issue JWT (24h expiration — shorter than admin for security)
    const token = jwt.sign(
      { customerId: customer.id, type: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email },
      company: { name: company.name, slug: company.slug, primaryColor: company.primary_color, logo_url: company.logo_url, sam_enabled: company.sam_enabled }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Set password (from magic link — requires valid portal token)
router.post('/auth/setup-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Find customer by portal token
    const customerResult = await db.query(
      `SELECT c.id, c.name, c.email, c.company_id, c.password_hash,
              co.name as company_name, co.slug as company_slug, co.primary_color, co.logo_url, co.sam_enabled
       FROM customers c
       JOIN companies co ON c.company_id = co.id
       WHERE c.portal_access_token = $1 AND c.portal_access_enabled = true`,
      [token]
    );

    if (customerResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const customer = customerResult.rows[0];

    // Hash password with cost factor 12
    const passwordHash = await bcrypt.hash(password, 12);

    // Update customer with password
    await db.query(
      `UPDATE customers SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $2`,
      [passwordHash, customer.id]
    );

    // Issue JWT
    const jwtToken = jwt.sign(
      { customerId: customer.id, type: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      customer: { id: customer.id, name: customer.name, email: customer.email },
      company: { name: customer.company_name, slug: customer.company_slug, primaryColor: customer.primary_color, logo_url: customer.logo_url, sam_enabled: customer.sam_enabled },
      message: 'Password set successfully! You can now log in with your email and password.'
    });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Forgot password — sends a reset link
router.post('/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { slug, email } = req.body;

    // Always return same message whether user exists or not (timing-safe)
    const successMessage = 'If your email is registered, you will receive a password reset link.';

    if (!slug || !email) {
      return res.json({ message: successMessage });
    }

    // Find company
    const companyResult = await db.query(
      `SELECT id FROM companies WHERE slug = $1`, [slug.toLowerCase()]
    );
    if (companyResult.rows.length === 0) {
      return res.json({ message: successMessage });
    }

    // Find customer
    const customerResult = await db.query(
      `SELECT id, email, name FROM customers WHERE company_id = $1 AND LOWER(email) = $2 AND portal_access_enabled = true`,
      [companyResult.rows[0].id, email.toLowerCase()]
    );

    if (customerResult.rows.length === 0) {
      return res.json({ message: successMessage });
    }

    const customer = customerResult.rows[0];

    // Generate secure reset token (32 bytes = 64 hex chars)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `UPDATE customers SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
      [resetToken, resetExpires, customer.id]
    );

    // Send reset email
    try {
      const { sendPasswordResetEmail } = require('../services/emailService');
      await sendPasswordResetEmail(customer.id, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError.message);
      // Don't expose email sending failure to user
    }

    res.json({ message: successMessage });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.json({ message: 'If your email is registered, you will receive a password reset link.' });
  }
});

// Reset password with token
router.post('/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Find customer by reset token (not expired)
    const customerResult = await db.query(
      `SELECT id FROM customers
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );

    if (customerResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired reset link. Request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear reset token + lockout
    await db.query(
      `UPDATE customers
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL,
           failed_login_attempts = 0, locked_until = NULL
       WHERE id = $2`,
      [passwordHash, customerResult.rows[0].id]
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Update customer profile (requires JWT auth)
router.patch('/profile', authenticateCustomer, async (req, res) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    const updates = {};

    // Update name
    if (name && name.trim()) {
      updates.name = name.trim();
    }

    // Update phone
    if (phone !== undefined) {
      updates.phone = phone.trim() || null;
    }

    // Update email (requires verification in production — for now just update)
    if (email && email.trim() && email.toLowerCase() !== req.customer.email.toLowerCase()) {
      // Check uniqueness within company
      const existing = await db.query(
        `SELECT id FROM customers WHERE company_id = $1 AND LOWER(email) = $2 AND id != $3`,
        [req.customer.company_id, email.toLowerCase(), req.customer.id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use by another customer' });
      }
      updates.email = email.trim().toLowerCase();
    }

    // Change password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }

      // Verify current password
      const customerResult = await db.query(
        `SELECT password_hash FROM customers WHERE id = $1`, [req.customer.id]
      );
      const passwordMatch = await bcrypt.compare(currentPassword, customerResult.rows[0].password_hash || '');
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      updates.password_hash = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    updates.updated_at = new Date();

    const setClauses = Object.entries(updates).map(([k, v], i) => `${k} = $${i + 1}`);
    const values = Object.values(updates);
    values.push(req.customer.id);

    await db.query(
      `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
      values
    );

    res.json({
      message: 'Profile updated',
      customer: {
        name: updates.name || req.customer.name,
        email: updates.email || req.customer.email,
        phone: updates.phone !== undefined ? updates.phone : req.customer.phone
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Multer config for SAM card scanning (10MB, images only)
const scanUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Quick access endpoint for portal links (GET with token query param)
router.get('/access', async (req, res) => {
    try {
        const token = req.query.token;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // Find customer by portal access token
        const customerResult = await db.query(
            `SELECT c.*, co.name as company_name, co.slug as company_slug, co.primary_color, co.logo_url, co.sam_enabled
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
                email: customer.email,
                email_opt_in: customer.email_opt_in !== false // default true
            },
            company: {
                name: customer.company_name,
                slug: customer.company_slug,
                primaryColor: customer.primary_color,
                logo_url: customer.logo_url,
                sam_enabled: customer.sam_enabled || false
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

// Toggle email notification preference (token-based portal access)
router.patch('/email-preference', async (req, res) => {
    try {
        const token = req.query.token;
        const { email_opt_in } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        if (typeof email_opt_in !== 'boolean') {
            return res.status(400).json({ error: 'email_opt_in must be a boolean' });
        }

        // Verify portal access
        const customerResult = await db.query(
            'SELECT id FROM customers WHERE portal_access_token = $1 AND portal_access_enabled = true',
            [token]
        );

        if (customerResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired portal link' });
        }

        const customerId = customerResult.rows[0].id;

        // Try to update — column may not exist yet if migration hasn't run
        try {
            await db.query(
                'UPDATE customers SET email_opt_in = $1 WHERE id = $2',
                [email_opt_in, customerId]
            );
        } catch (dbErr) {
            if (dbErr.code === '42703') {
                // Column doesn't exist yet — add it on the fly
                await db.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT TRUE');
                await db.query(
                    'UPDATE customers SET email_opt_in = $1 WHERE id = $2',
                    [email_opt_in, customerId]
                );
            } else {
                throw dbErr;
            }
        }

        res.json({ success: true, email_opt_in });
    } catch (error) {
        console.error('Email preference update error:', error);
        res.status(500).json({ error: 'Failed to update email preference' });
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

// Scan a before photo to extract card information (customer-facing portal)
router.post('/cards/:cardId/scan-photo', async (req, res) => {
    try {
        const token = req.query.token;
        const { cardId } = req.params;
        const { photoUrl } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        if (!photoUrl) {
            return res.status(400).json({ error: 'Photo URL required' });
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
            `SELECT c.id
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

        // Scan the card photo
        const scanResult = await cardScannerService.scanCard(photoUrl);

        res.json(scanResult);
    } catch (error) {
        console.error('Scan photo error:', error);
        res.status(500).json({ error: 'Failed to scan photo' });
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

// SAM Chat endpoint for customer portal (token-based)
router.post('/sam/chat', async (req, res) => {
    try {
        const token = req.query.token;
        const { message, history } = req.body;

        if (!token) {
            return res.status(401).json({ error: 'Token is required' });
        }

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Verify portal token and check SAM access
        const customerResult = await db.query(
            `SELECT c.id, c.name, c.email, c.company_id, co.sam_enabled
             FROM customers c
             JOIN companies co ON c.company_id = co.id
             WHERE c.portal_access_token = $1
             AND c.portal_access_enabled = true
             AND (c.portal_token_expires IS NULL OR c.portal_token_expires > NOW())`,
            [token]
        );

        if (customerResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const customer = customerResult.rows[0];

        // Check if company has SAM enabled
        if (!customer.sam_enabled) {
            return res.status(403).json({
                error: 'SAM Assistant is not available',
                message: 'Your shop has not enabled the SAM AI assistant feature. Contact your shop to learn more!'
            });
        }

        // Import SAM service (same as admin SAM)
        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });

        // SAM knowledge base (customer-focused, honest)
        const SAM_KNOWLEDGE = `
You are SAM (Submission Assistant Manager), a PSA card grading expert and AI assistant for SlabDash.

You're helping a CUSTOMER through their card shop's portal. Be friendly, knowledgeable, and HONEST.

IMPORTANT RULES:
- You're talking to an END CUSTOMER, not shop staff. Keep explanations simple.
- Be REALISTIC. Don't hype up cheap cards. If a card is worth $1-5 raw, grading costs $20+ and makes NO financial sense. Say so directly.
- Only recommend grading if the graded value significantly exceeds the cost.
- When you have LIVE PRICING DATA, cite specific numbers. Don't make up prices.
- Keep responses concise (3-5 paragraphs max).

PSA GRADING SCALE:
• PSA 10 (GEM MINT) — Perfect. 55/45 centering or better, razor sharp corners, no defects
• PSA 9 (MINT) — Near perfect. 60/40 centering, 1 corner can have slight wear
• PSA 8 (NM-MT) — Very nice. 65/35 centering, minor corner/edge wear
• PSA 7 (NM) — Noticeable flaws. 70/30 centering, visible wear
• PSA 6 and below — Increasing wear, centering issues, creases

4 GRADING PILLARS: Centering (most important for 10s), Corners, Edges, Surface

PSA SERVICE LEVELS:
• Bulk ($19-25, 65+ days) — cards worth $100-500 graded
• Regular ($75-100, 30+ days) — cards worth $500-1500
• Express ($150-200, 15+ days) — cards worth $1000-3000
• Super Express/Walk-Through ($300-600+, 1-10 days) — high-value cards

ROI FORMULA: Graded value ÷ Grading fee = ROI multiple
• 20x+ = Great, 10-20x = Good, 5-10x = Marginal, Under 5x = Don't grade

REALITY CHECK:
• Grading costs $20+ minimum (bulk service). Add $10 shipping each way.
• A $5 card graded PSA 10 might be worth $15. After $30+ in fees, you LOSE money.
• Only grade if the PSA 10 value is at least 3-5x the total cost (grading + shipping).
• Most modern cards don't get PSA 10 — expect PSA 9 as the realistic outcome.

PRICING: We pull live market data from JustTCG and eBay. When pricing data is provided in the conversation, use those real numbers.

You can scan cards! Tell customers they can upload a card photo for instant ID, pricing, and gradability assessment.
`;

        // Check if this is a pricing question and fetch comps
        let pricingContext = null;
        const pricingKeywords = ['price', 'value', 'worth', 'cost', 'comp', 'market', 'how much', 'what is', 'what\'s', 'selling for', 'going for'];
        const hasPricingIntent = pricingKeywords.some(kw => message.toLowerCase().includes(kw));

        if (hasPricingIntent) {
            try {
                // Extract card name from message (strip pricing keywords)
                let cardQuery = message;
                const removePatterns = [
                    /how much is/i, /what is/i, /what's/i, /what are/i,
                    /worth\??/i, /value of/i, /price of/i, /price for/i,
                    /comp for/i, /comps for/i, /market value/i, /selling for/i, /going for/i,
                    /can you (look up|check|find|get)/i, /look up/i,
                    /pokemon|pokémon|magic|mtg|yu-gi-oh|yugioh|lorcana|digimon|one piece/gi,
                    /psa\s*\d+/gi, /a\s+/i, /the\s+/i, /\?/g
                ];
                for (const pattern of removePatterns) {
                    cardQuery = cardQuery.replace(pattern, ' ');
                }
                cardQuery = cardQuery.replace(/\s+/g, ' ').trim();

                if (cardQuery.length >= 2) {
                    // Detect game type
                    const lower = message.toLowerCase();
                    let game = '';
                    if (lower.includes('pokemon') || lower.includes('pokémon')) game = 'pokemon';
                    else if (lower.includes('magic') || lower.includes('mtg')) game = 'mtg';
                    else if (lower.includes('yu-gi-oh') || lower.includes('yugioh')) game = 'yugioh';
                    else if (lower.includes('lorcana')) game = 'disney-lorcana';
                    else if (lower.includes('one piece')) game = 'one-piece-card-game';
                    else if (lower.includes('digimon')) game = 'digimon-card-game';

                    // Fetch graded pricing breakdown
                    const gradedPricing = await fetchGradedPricing({
                        name: cardQuery,
                        game: game,
                        sport: '',
                    });

                    const hasSomeData = gradedPricing.raw?.available || gradedPricing.psa8?.available || gradedPricing.psa9?.available || gradedPricing.psa10?.available;

                    if (hasSomeData) {
                        const lines = ['LIVE PRICING DATA (include these numbers in your response):'];

                        if (gradedPricing.raw?.available && gradedPricing.raw.count > 0) {
                            lines.push(`RAW (ungraded): Avg $${gradedPricing.raw.avg.toFixed(2)} (${gradedPricing.raw.count} listings)`);
                        }
                        for (const [key, label] of [['psa8', 'PSA 8'], ['psa9', 'PSA 9'], ['psa10', 'PSA 10']]) {
                            const tier = gradedPricing[key];
                            if (tier?.available && tier.count > 0) {
                                lines.push(`${label}: Avg $${tier.avg.toFixed(2)} (${tier.count} sold)`);
                            } else {
                                lines.push(`${label}: No sold data found`);
                            }
                        }
                        lines.push('\nPresent the raw value, then show PSA 8, 9, and 10 values so the customer sees the grading upside.');

                        pricingContext = lines.join('\n');
                        console.log(`💰 Portal chat: Got graded pricing for "${cardQuery}"`);
                    }
                }
            } catch (pricingError) {
                console.error('Portal pricing lookup error:', pricingError.message);
            }
        }

        // Build conversation history
        const conversationHistory = (history || [])
            .filter(msg => msg.role && msg.content)
            .slice(-5)
            .map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }));

        // Enrich message with pricing data if available
        const enrichedMessage = pricingContext
            ? `${message}\n\n[SYSTEM: ${pricingContext}]`
            : message;

        // Call Claude API with system prompt
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 1024,
            system: SAM_KNOWLEDGE + `\n\nCustomer name: ${customer.name}`,
            messages: [
                ...conversationHistory,
                {
                    role: 'user',
                    content: enrichedMessage
                }
            ]
        });

        const assistantMessage = response.content[0].text;

        res.json({
            message: assistantMessage,
            model: 'claude-sonnet-4-5',
            ai_powered: true,
            mode: 'AI (Claude)'
        });
    } catch (error) {
        console.error('Customer portal SAM chat error:', error);

        // Check if Anthropic API key is missing
        if (error.message?.includes('API key')) {
            return res.status(500).json({
                error: 'SAM is not configured yet',
                message: 'The AI assistant is being set up. Please try again later!'
            });
        }

        res.status(500).json({
            error: 'Failed to get response from SAM',
            message: 'Oops! SAM is having trouble right now. Please try again in a moment!'
        });
    }
});

// SAM Card Scan endpoint for customer portal (token-based)
router.post('/sam/scan', scanUpload.single('image'), async (req, res) => {
    try {
        const token = req.query.token;

        if (!token) {
            return res.status(401).json({ error: 'Token is required' });
        }

        // Verify portal token and check SAM access
        const customerResult = await db.query(
            `SELECT c.id, c.name, c.email, c.company_id, co.sam_enabled
             FROM customers c
             JOIN companies co ON c.company_id = co.id
             WHERE c.portal_access_token = $1
             AND c.portal_access_enabled = true
             AND (c.portal_token_expires IS NULL OR c.portal_token_expires > NOW())`,
            [token]
        );

        if (customerResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const customer = customerResult.rows[0];

        if (!customer.sam_enabled) {
            return res.status(403).json({
                error: 'SAM Assistant is not available',
                message: 'Your shop has not enabled the SAM AI assistant feature.'
            });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                error: 'Card scanning requires Anthropic API key',
                message: 'Card scanning is temporarily unavailable. Please try again later!'
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        const imageFile = req.file;
        const imageBase64 = imageFile.buffer.toString('base64');
        const mediaType = imageFile.mimetype || 'image/jpeg';

        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey });

        // Analyze card with Claude vision
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 2048,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: imageBase64
                            }
                        },
                        {
                            type: 'text',
                            text: `You are SAM, a card identification expert. Your job is to ACCURATELY identify this card so we can pull the EXACT market price — the wrong parallel or missing card number means wrong pricing.

STEP 1 — IDENTIFY THE CARD (critical — read EVERYTHING on the card):
• **Card Name** — the exact player/character name printed on the card
• **Year** — printed year or copyright year
• **Brand/Product** — the product line (e.g., "Prizm", "Topps Chrome", "Crown Zenith", "Evolving Skies")
• **Set** — the specific set within the product if different from brand
• **Card Number** — the FULL number printed on the card (e.g., "239", "037/159", "SV049"). Include the complete number with any denominator.
• **Parallel/Variant** — THIS IS CRITICAL for pricing. Identify the exact parallel:
  - Sports: Base, Silver Prizm, Gold Prizm /10, Red White & Blue, Mojo, Cracked Ice, Color Blast, Refractor, Gold Refractor, Xfractor, Pink, Green, Orange /299, Red /199, Blue /75, etc.
  - Pokemon: Regular, Reverse Holo, Full Art, Alt Art, Illustration Rare, Special Art Rare, Gold, Rainbow, etc.
  - Look at the card surface (rainbow shimmer = prizm/refractor, solid color border = color parallel, numbered = short print)
  - If the card is numbered (e.g., /25, /99, /199), ALWAYS include this — it's a key price differentiator
• **Serial Number** — if the card is numbered (e.g., "12/25", "056/199"), note the serial
• **Game** — Pokemon, Magic: The Gathering, Yu-Gi-Oh, etc.
• **Sport** — Baseball, Basketball, Football, Hockey, etc.
• **Attributes** — RC (rookie card), 1st edition, autograph, memorabilia/patch, etc.
• **Rarity** — look at rarity symbols

Read text EXACTLY as printed. If a card is a Silver Prizm, say "Silver Prizm" not just "Prizm". If it's a base card, say "Base". The parallel determines 90% of the card's value.

STEP 2 — HONEST ASSESSMENT (2-3 lines max):
• Quick centering + any visible flaws
• Estimated PSA grade (single number)
• Be REALISTIC: if the card is worth less than $10-15 raw, grading costs $20+. Say that directly.

FORMAT:
**Card:** [Name] — [Year] [Brand] [Set] #[Number]
[Game/Sport] | **[Parallel/Variant]** | [Attributes] | [Rarity]
[Serial: X/Y if numbered]

**Condition:** [1-2 sentences. PSA grade estimate. Honest grading recommendation.]

AT THE VERY END, output this hidden JSON on its own line (will be stripped from display):
<!--CARD_ID:{"name":"Card Name","set":"Set Name","number":"239","year":"2024","game":"","sport":"basketball","parallel":"Silver Prizm","serial":"/199","rarity":"","attributes":"RC"}-->
IMPORTANT RULES for CARD_ID:
- "parallel": The EXACT variant/parallel name. Use "Base" for base cards. Examples: "Silver Prizm", "Gold Prizm", "Cracked Ice", "Refractor", "Holo", "Full Art", "Alt Art", "Illustration Rare", "Reverse Holo", "Mojo", "Red White Blue"
- "serial": If numbered, include as "/25" or "/199". Leave "" if not numbered.
- "number": The card number WITHOUT leading zeros (e.g., "239" not "0239"). Include denominator if on card (e.g., "037/159").
- "name": Player/character name only (e.g., "Stephon Castle" not "Stephon Castle RC")
- "set": The product name (e.g., "Prizm", "Topps Chrome", "Crown Zenith")
- "game": pokemon, mtg, yugioh, disney-lorcana, one-piece-card-game, digimon-card-game, flesh-and-blood-tcg, dragon-ball-super-fusion-world, or "" for sports.
- "sport": baseball, basketball, football, hockey, soccer, or "" for TCG.
- "attributes": Comma-separated. RC, 1st edition, autograph, patch, memorabilia, etc.
Only include fields you can actually read from the card.`
                        }
                    ]
                }
            ]
        });

        const rawAnalysis = response.content[0].text;
        console.log('📝 Portal scan response length:', rawAnalysis.length);

        // Extract the hidden card ID JSON
        let cardInfo = null;
        let analysis = rawAnalysis;

        const cardIdPatterns = [
            /<!--CARD_ID:(.*?)-->/s,
            /<!--CARD_ID:\s*(.*?)\s*-->/s,
            /\[CARD_ID:(.*?)\]/s,
        ];

        for (const pattern of cardIdPatterns) {
            const match = rawAnalysis.match(pattern);
            if (match) {
                try {
                    let jsonStr = match[1] || match[0];
                    jsonStr = jsonStr.replace(/```json\s*/, '').replace(/\s*```/, '').trim();
                    cardInfo = JSON.parse(jsonStr);
                    analysis = rawAnalysis.replace(match[0], '').trim();
                    console.log('✅ Portal scan CARD_ID:', JSON.stringify(cardInfo));
                    break;
                } catch (e) {
                    console.log('⚠️ Portal scan: Failed to parse CARD_ID:', e.message);
                }
            }
        }

        // Fallback: extract card info from text
        if (!cardInfo) {
            console.log('⚠️ Portal scan: No CARD_ID tag — extracting from text...');
            cardInfo = {};
            const lowerAnalysis = analysis.toLowerCase();
            if (lowerAnalysis.includes('pokémon') || lowerAnalysis.includes('pokemon')) cardInfo.game = 'pokemon';
            else if (lowerAnalysis.includes('magic') || lowerAnalysis.includes('mtg')) cardInfo.game = 'mtg';
            else if (lowerAnalysis.includes('yu-gi-oh') || lowerAnalysis.includes('yugioh')) cardInfo.game = 'yugioh';
            else if (lowerAnalysis.includes('lorcana')) cardInfo.game = 'disney-lorcana';

            const numMatch = analysis.match(/#(\d+(?:\/\d+)?)/);
            if (numMatch) cardInfo.number = numMatch[1];

            const yearMatch = analysis.match(/\b(19\d{2}|20[0-2]\d)\b/);
            if (yearMatch) cardInfo.year = yearMatch[1];

            if (!cardInfo.game && !cardInfo.name) cardInfo = null;
        }

        // Extract grade and condition
        const gradable = analysis.toLowerCase().includes('worth grading') && !analysis.toLowerCase().includes('not worth grading');
        let estimatedGrade = null;
        const gradeMatch = analysis.match(/PSA\s*(\d+)/i);
        if (gradeMatch) estimatedGrade = `PSA ${gradeMatch[1]}`;

        let condition = 'Unknown';
        if (analysis.toLowerCase().includes('gem mint') || analysis.toLowerCase().includes('psa 10')) {
            condition = 'Gem Mint (PSA 10 candidate)';
        } else if (analysis.toLowerCase().includes('psa 9')) {
            condition = 'Mint (PSA 9 likely)';
        } else if (analysis.toLowerCase().includes('psa 8')) {
            condition = 'Near Mint (PSA 8 likely)';
        } else if (analysis.toLowerCase().includes('psa 7')) {
            condition = 'Near Mint (PSA 7 likely)';
        }

        // Fetch graded pricing breakdown (Raw, PSA 8, PSA 9, PSA 10)
        let pricing = null;
        if (cardInfo && (cardInfo.name || cardInfo.set || cardInfo.game)) {
            console.log(`📊 Portal scan: Fetching graded pricing for:`, JSON.stringify(cardInfo));
            try {
                const gradedPricing = await fetchGradedPricing(cardInfo);
                pricing = {
                    ...gradedPricing,
                    priceEstimate: gradedPricing.rawEstimate,
                };
                console.log(`💰 Portal scan graded pricing complete: ${pricing.totalListings} total listings`);
            } catch (compError) {
                console.error('❌ Portal scan comp error:', compError.message);
                pricing = { error: compError.message, totalListings: 0, priceEstimate: null };
            }
        }

        res.json({
            message: analysis,
            analysis: analysis,
            gradable: gradable,
            estimatedGrade: estimatedGrade,
            condition: condition,
            cardInfo: cardInfo,
            pricing: pricing,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Portal SAM scan error:', error);
        res.status(500).json({
            error: 'Failed to analyze card image',
            message: 'Having trouble analyzing that image. Make sure it\'s a clear photo of the card and try again!',
            details: error.message
        });
    }
});

module.exports = router;
