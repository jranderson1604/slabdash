const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const result = await db.query(
            `SELECT u.*, c.name as company_name, c.slug as company_slug, c.psa_api_key
             FROM users u JOIN companies c ON u.company_id = c.id
             WHERE u.id = $1 AND u.is_active = true`,
            [decoded.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        req.user = result.rows[0];
        req.companyId = result.rows[0].company_id;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
        res.status(401).json({ error: 'Invalid token' });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
};

const authenticateCustomer = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.type !== 'customer') {
            return res.status(401).json({ error: 'Invalid token type' });
        }
        
        const result = await db.query(
            `SELECT c.*, co.name as company_name, co.slug as company_slug, co.primary_color, co.logo_url
             FROM customers c JOIN companies co ON c.company_id = co.id
             WHERE c.id = $1 AND c.portal_access_enabled = true`,
            [decoded.customerId]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Customer not found' });
        }
        
        req.customer = result.rows[0];
        req.companyId = result.rows[0].company_id;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { authenticate, requireRole, authenticateCustomer };
