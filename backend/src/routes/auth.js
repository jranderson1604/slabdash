const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
    try {
        const { companyName, name, email, password } = req.body;
        
        if (!companyName || !name || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const passwordHash = await bcrypt.hash(password, 12);
        
        const companyResult = await db.query(
            `INSERT INTO companies (name, slug, email) VALUES ($1, $2, $3) RETURNING id, name, slug`,
            [companyName, slug + '-' + Date.now(), email.toLowerCase()]
        );
        const company = companyResult.rows[0];
        
        const userResult = await db.query(
            `INSERT INTO users (company_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, 'owner') RETURNING id, email, name, role`,
            [company.id, email.toLowerCase(), passwordHash, name]
        );
        const user = userResult.rows[0];
        
        const token = jwt.sign({ userId: user.id, companyId: company.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, company });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await db.query(
            `SELECT u.*, c.name as company_name, c.slug as company_slug FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = $1 AND u.is_active = true`,
            [email.toLowerCase()]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
        
        const token = jwt.sign({ userId: user.id, companyId: user.company_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            company: { id: user.company_id, name: user.company_name, slug: user.company_slug }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
    res.json({
        user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role },
        company: { id: req.user.company_id, name: req.user.company_name, slug: req.user.company_slug, hasPsaKey: !!req.user.psa_api_key }
    });
});

module.exports = router;
