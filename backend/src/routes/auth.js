const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// User login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const result = await db.query(
            `SELECT u.id, u.company_id, u.email, u.name, u.role, u.password_hash,
             c.name as company_name, c.slug as company_slug, c.shop_code as company_shop_code,
             c.psa_api_key IS NOT NULL as has_psa_key,
             c.primary_color, c.background_color, c.sidebar_color
             FROM users u JOIN companies c ON u.company_id = c.id
             WHERE u.email = $1 AND u.is_active = true`,
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
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
                sidebar_color: user.sidebar_color || '#ffffff'
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
        const { email, password, name, companyName } = req.body;

        if (!email || !password || !name || !companyName) {
            return res.status(400).json({ error: 'All fields required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const passwordError = isValidPassword(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        if (name.length > 255 || companyName.length > 255) {
            return res.status(400).json({ error: 'Name or company name is too long' });
        }

        // Check if user already exists
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create company
        const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
        const companyResult = await db.query(
            'INSERT INTO companies (name, slug, email) VALUES ($1, $2, $3) RETURNING id, name, slug',
            [companyName.slice(0, 255), companySlug, email.toLowerCase()]
        );
        const company = companyResult.rows[0];

        // Hash password with cost factor 12
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const userResult = await db.query(
            `INSERT INTO users (company_id, email, password_hash, name, role)
             VALUES ($1, $2, $3, $4, 'admin') RETURNING id, email, name, role`,
            [company.id, email.toLowerCase(), passwordHash, name.slice(0, 255)]
        );
        const user = userResult.rows[0];

        // Generate token
        const token = jwt.sign(
            { userId: user.id, companyId: company.id, role: user.role },
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
                id: company.id,
                name: company.name,
                slug: company.slug,
                hasPsaKey: false
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
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
            sidebar_color: req.user.sidebar_color || '#ffffff'
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
