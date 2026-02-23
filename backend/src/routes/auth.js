const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Rate limiter for login: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Rate limiter for registration: 3 per hour per IP
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many registration attempts. Please try again later.' }
});

// Input validation helpers
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) => {
    if (!password || password.length < 8) return 'Password must be at least 8 characters';
    if (password.length > 128) return 'Password is too long';
    if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    return null;
};

// Helper: get email service (lazy to avoid circular deps)
let _emailService;
const email = () => {
    if (!_emailService) _emailService = require('../services/emailService');
    return _emailService;
};

// Helper: get active invite code from system_config
const getInviteCode = async () => {
    try {
        const res = await db.query(
            "SELECT value FROM system_config WHERE key = 'registration_invite_code'",
        );
        return res.rows[0]?.value || null;
    } catch {
        return null;
    }
};

// User login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email: emailInput, password } = req.body;

        if (!emailInput || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (!isValidEmail(emailInput)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const result = await db.query(
            `SELECT u.id, u.company_id, u.email, u.name, u.role, u.password_hash,
             u.email_verified,
             c.name as company_name, c.slug as company_slug, c.shop_code as company_shop_code,
             c.psa_api_key IS NOT NULL as has_psa_key,
             c.primary_color, c.background_color, c.sidebar_color,
             c.plan, c.trial_ends_at
             FROM users u JOIN companies c ON u.company_id = c.id
             WHERE u.email = $1 AND u.is_active = true`,
            [emailInput.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Block unverified accounts
        if (user.email_verified === false) {
            return res.status(403).json({
                error: 'Please verify your email before logging in.',
                email_unverified: true,
                email: user.email
            });
        }

        const token = jwt.sign(
            { userId: user.id, companyId: user.company_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d', algorithm: 'HS256' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            company: {
                id: user.company_id,
                name: user.company_name,
                slug: user.company_slug,
                shop_code: user.company_shop_code,
                hasPsaKey: user.has_psa_key,
                primary_color: user.primary_color || '#8842f0',
                background_color: user.background_color || '#f5f5f5',
                sidebar_color: user.sidebar_color || '#ffffff',
                plan: user.plan || 'free',
                trial_ends_at: user.trial_ends_at
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// User registration
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { email: emailInput, password, name, companyName, inviteCode } = req.body;

        if (!emailInput || !password || !name || !companyName) {
            return res.status(400).json({ error: 'All fields required' });
        }

        if (!isValidEmail(emailInput)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const passwordError = isValidPassword(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        if (name.length > 255 || companyName.length > 255) {
            return res.status(400).json({ error: 'Name or company name is too long' });
        }

        // Invite code check
        const requiredCode = await getInviteCode();
        if (requiredCode) {
            if (!inviteCode || inviteCode.trim().toLowerCase() !== requiredCode.trim().toLowerCase()) {
                return res.status(403).json({ error: 'Invalid invite code. Contact SlabDash to get access.' });
            }
        }

        // Check if user already exists
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [emailInput.toLowerCase()]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create company (14-day trial starts now)
        const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
        const companyResult = await db.query(
            `INSERT INTO companies (name, slug, email, plan, trial_ends_at)
             VALUES ($1, $2, $3, 'free', NOW() + INTERVAL '14 days')
             RETURNING id, name, slug, plan, trial_ends_at`,
            [companyName.slice(0, 255), companySlug, emailInput.toLowerCase()]
        );
        const company = companyResult.rows[0];

        // Hash password with cost factor 12
        const passwordHash = await bcrypt.hash(password, 12);

        // Generate email verification token (expires in 24 hours)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Create user — not yet verified
        const userResult = await db.query(
            `INSERT INTO users (company_id, email, password_hash, name, role, email_verified, email_verification_token, email_verification_expires)
             VALUES ($1, $2, $3, $4, 'admin', FALSE, $5, $6) RETURNING id, email, name, role`,
            [company.id, emailInput.toLowerCase(), passwordHash, name.slice(0, 255), verificationToken, verificationExpires]
        );
        const user = userResult.rows[0];

        // Send verification email
        try {
            await email().sendAdminVerificationEmail(emailInput.toLowerCase(), name, verificationToken);
        } catch (emailErr) {
            console.error('[Auth] Verification email failed:', emailErr.message);
        }

        res.json({
            pending: true,
            message: "Account created! Check your email to verify your address before logging in."
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Verify account email
router.get('/verify-account/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const result = await db.query(
            `SELECT u.id, u.email, u.email_verified, u.email_verification_expires
             FROM users u WHERE u.email_verification_token = $1`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired verification link.' });
        }

        const user = result.rows[0];

        if (user.email_verified) {
            return res.json({ success: true, already: true, message: 'Email already verified. You can log in.' });
        }

        if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
            return res.status(410).json({ error: 'Verification link has expired. Please request a new one.' });
        }

        await db.query(
            `UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1`,
            [user.id]
        );

        res.json({ success: true, message: 'Email verified! You can now log in to SlabDash.' });
    } catch (error) {
        console.error('Verify account error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email: emailInput } = req.body;
        if (!emailInput || !isValidEmail(emailInput)) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        const result = await db.query(
            'SELECT id, name, email_verified FROM users WHERE email = $1 AND is_active = true',
            [emailInput.toLowerCase()]
        );

        // Always return success to prevent email enumeration
        if (result.rows.length === 0 || result.rows[0].email_verified) {
            return res.json({ success: true, message: 'If that email is registered and unverified, a new link has been sent.' });
        }

        const user = result.rows[0];
        const newToken = crypto.randomBytes(32).toString('hex');
        const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.query(
            'UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3',
            [newToken, newExpires, user.id]
        );

        try {
            await email().sendAdminVerificationEmail(emailInput.toLowerCase(), user.name, newToken);
        } catch (emailErr) {
            console.error('[Auth] Resend verification email failed:', emailErr.message);
        }

        res.json({ success: true, message: 'If that email is registered and unverified, a new link has been sent.' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role
        },
        company: {
            id: req.user.company_id,
            name: req.user.company_name,
            slug: req.user.company_slug,
            shop_code: req.user.company_shop_code,
            hasPsaKey: !!req.user.psa_api_key,
            primary_color: req.user.primary_color || '#8842f0',
            background_color: req.user.background_color || '#f5f5f5',
            sidebar_color: req.user.sidebar_color || '#ffffff',
            plan: req.user.plan || 'free',
            trial_ends_at: req.user.trial_ends_at
        }
    });
});

// Change password (authenticated)
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        const passwordError = isValidPassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        const result = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!match) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

        console.log(`[Auth] Password changed for user ${req.user.email}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Logout — invalidates the current token by recording logout time
router.post('/logout', authenticate, async (req, res) => {
    try {
        await db.query('UPDATE users SET last_logout_at = NOW() WHERE id = $1', [req.user.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Version check (no secrets exposed)
router.get('/version', (req, res) => {
    res.json({
        version: '2.2.0',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
