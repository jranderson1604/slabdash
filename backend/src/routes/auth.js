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
            `SELECT u.*, c.name as company_name, c.slug as company_slug, c.psa_api_key IS NOT NULL as has_psa_key
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
            { userId: user.id, companyId: user.company_id },
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
                hasPsaKey: user.has_psa_key
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
            'INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id, name, slug',
            [companyName, companySlug]
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
            hasPsaKey: !!req.user.psa_api_key
        }
    });
});

module.exports = router;
