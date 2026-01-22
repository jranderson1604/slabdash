const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const result = await db.query(
            `SELECT u.*, c.name as company_name, c.slug as company_slug, c.psa_api_key IS NOT NULL as has_psa_key,
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
            { expiresIn: '7d' }
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
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, companyName } = req.body;

        if (!email || !password || !name || !companyName) {
            return res.status(400).json({ error: 'All fields required' });
        }

        // Check if user already exists
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create company
        const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const companyResult = await db.query(
            'INSERT INTO companies (name, slug, email) VALUES ($1, $2, $3) RETURNING id, name, slug',
            [companyName, companySlug, email.toLowerCase()]
        );
        const company = companyResult.rows[0];

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const userResult = await db.query(
            `INSERT INTO users (company_id, email, password_hash, name, role)
             VALUES ($1, $2, $3, $4, 'admin') RETURNING id, email, name, role`,
            [company.id, email.toLowerCase(), passwordHash, name]
        );
        const user = userResult.rows[0];

        // Generate token
        const token = jwt.sign(
            { userId: user.id, companyId: company.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
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
            hasPsaKey: !!req.user.psa_api_key,
            primary_color: req.user.primary_color || '#8842f0',
            background_color: req.user.background_color || '#f5f5f5',
            sidebar_color: req.user.sidebar_color || '#ffffff'
        }
    });
});

// ONE-TIME ENDPOINT: Set your own account to 'owner' role
// Visit: https://yoursite.com/api/auth/set-owner?email=your@email.com&secret=YOUR_SECRET
// Then DELETE this endpoint for security!
router.get('/set-owner', async (req, res) => {
    try {
        const { email, secret } = req.query;

        // Security: Require a secret key from environment
        const OWNER_SECRET = process.env.OWNER_SETUP_SECRET || 'change-me-in-production';

        if (!email || !secret) {
            return res.status(400).json({ error: 'Missing email or secret parameter' });
        }

        if (secret !== OWNER_SECRET) {
            return res.status(403).json({ error: 'Invalid secret key' });
        }

        // Set the user's role to 'owner'
        const result = await db.query(
            'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, name, email, role',
            ['owner', email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: `No user found with email: ${email}` });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            message: `✅ Successfully set ${user.name} (${user.email}) to OWNER role!`,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            next_steps: [
                '1. Log out of SlabDash',
                '2. Log back in with your account',
                '3. You will see "Platform Control" at the top of your sidebar',
                '4. DELETE this /set-owner endpoint from auth.js for security!'
            ]
        });
    } catch (error) {
        console.error('Set owner error:', error);
        res.status(500).json({ error: 'Failed to set owner role' });
    }
});

module.exports = router;
