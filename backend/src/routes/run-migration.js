const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

/**
 * Manual migration endpoint to add card_count column
 * Call this once to run the migration manually
 */
router.post('/add-card-count', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        console.log('Running card_count migration...');

        // Run the migration directly
        await db.query(`
            ALTER TABLE submissions ADD COLUMN IF NOT EXISTS card_count INTEGER DEFAULT 0;
        `);

        console.log('✓ Migration complete: card_count column added');

        // Verify the column exists
        const result = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'submissions' AND column_name = 'card_count'
        `);

        if (result.rows.length > 0) {
            res.json({
                success: true,
                message: 'Migration completed successfully! card_count column added to submissions table.',
                column_exists: true
            });
        } else {
            res.json({
                success: false,
                message: 'Migration ran but column verification failed',
                column_exists: false
            });
        }

    } catch (error) {
        console.error('Migration error:', error);

        // Check if error is because column already exists
        if (error.message.includes('already exists') || error.code === '42701') {
            return res.json({
                success: true,
                message: 'Column already exists - no migration needed',
                column_exists: true
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to run migration',
            details: error.message
        });
    }
});

/**
 * Invoice and pickup code migration
 * Adds columns for invoice generation and customer-specific pickup codes
 */
router.post('/add-invoice-columns', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        console.log('Running invoice and pickup code migration...');
        const results = [];

        // Add invoice cost tracking to submissions table
        try {
            await db.query(`
                ALTER TABLE submissions
                ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
                ADD COLUMN IF NOT EXISTS invoice_sent BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS psa_service_cost DECIMAL(10,2),
                ADD COLUMN IF NOT EXISTS additional_fees DECIMAL(10,2),
                ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(20)
            `);
            results.push('✓ Added invoice columns to submissions table');
        } catch (error) {
            results.push(`✗ Submissions table: ${error.message}`);
        }

        // Add delivery method and shipping address to customers table
        try {
            await db.query(`
                ALTER TABLE customers
                ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'pickup',
                ADD COLUMN IF NOT EXISTS shipping_address TEXT
            `);
            results.push('✓ Added delivery columns to customers table');
        } catch (error) {
            results.push(`✗ Customers table: ${error.message}`);
        }

        // Add invoice tracking to submission_customers junction table
        try {
            await db.query(`
                ALTER TABLE submission_customers
                ADD COLUMN IF NOT EXISTS invoice_sent BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS customer_cost DECIMAL(10,2),
                ADD COLUMN IF NOT EXISTS picked_up BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(20)
            `);
            results.push('✓ Added pickup code column to submission_customers table - this enables customer-specific pickup codes!');
        } catch (error) {
            results.push(`✗ Submission_customers table: ${error.message}`);
        }

        // Add mailgun configuration to companies table
        try {
            await db.query(`
                ALTER TABLE companies
                ADD COLUMN IF NOT EXISTS mailgun_api_key TEXT,
                ADD COLUMN IF NOT EXISTS mailgun_domain VARCHAR(255),
                ADD COLUMN IF NOT EXISTS mailgun_from_email VARCHAR(255),
                ADD COLUMN IF NOT EXISTS service_level_pricing JSONB,
                ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS sport_categories JSONB
            `);
            results.push('✓ Added Mailgun config columns to companies table');
            results.push('✓ Added service level pricing column for invoice presets');
            results.push('✓ Added tax percentage column for state-specific tax rates');
            results.push('✓ Added sport categories column for custom card organization');
        } catch (error) {
            results.push(`✗ Companies table: ${error.message}`);
        }

        // Add sport column to cards table for categorization
        try {
            await db.query(`
                ALTER TABLE cards
                ADD COLUMN IF NOT EXISTS sport VARCHAR(100)
            `);
            results.push('✓ Added sport column to cards table for auto-categorization');
        } catch (error) {
            results.push(`✗ Cards table sport column: ${error.message}`);
        }

        // Create indexes for faster lookups
        try {
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_submissions_invoice
                ON submissions(invoice_sent, invoice_number)
            `);
            results.push('✓ Created index on submissions for faster invoice queries');
        } catch (error) {
            results.push(`✗ Index on submissions: ${error.message}`);
        }

        try {
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_submission_customers_pickup
                ON submission_customers(pickup_code)
                WHERE pickup_code IS NOT NULL
            `);
            results.push('✓ Created index on pickup codes for instant verification lookups');
        } catch (error) {
            results.push(`✗ Index on submission_customers: ${error.message}`);
        }

        console.log('✓ Invoice migration complete');

        res.json({
            success: true,
            message: 'Invoice and pickup code migration completed! You can now generate invoices and verify customer pickup codes.',
            results: results
        });

    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run invoice migration',
            details: error.message
        });
    }
});

/**
 * Check invoice migration status
 */
router.get('/check-invoice-status', authenticate, async (req, res) => {
    try {
        const checks = [];

        // Check submission_customers.pickup_code (most important!)
        const scPickupCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'submission_customers'
            AND column_name = 'pickup_code'
        `);
        checks.push({
            check: 'Customer Pickup Codes',
            status: scPickupCheck.rows.length > 0 ? '✓ Ready' : '✗ Need Migration',
            critical: true
        });

        // Check submission_customers.picked_up
        const scPickedUpCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'submission_customers'
            AND column_name = 'picked_up'
        `);
        checks.push({
            check: 'Pickup Status Tracking',
            status: scPickedUpCheck.rows.length > 0 ? '✓ Ready' : '✗ Need Migration',
            critical: true
        });

        // Check submissions invoice columns
        const submissionsCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'submissions'
            AND column_name IN ('invoice_number', 'psa_service_cost', 'additional_fees')
        `);
        checks.push({
            check: 'Invoice Generation',
            status: submissionsCheck.rows.length === 3 ? '✓ Ready' : '✗ Need Migration',
            critical: false
        });

        const allCritical = checks.filter(c => c.critical).every(c => c.status.includes('✓'));

        res.json({
            success: true,
            migration_needed: !allCritical,
            checks: checks,
            summary: allCritical
                ? '✓ All critical features are ready! Pickup code verification is enabled.'
                : '⚠ Migration needed - run POST /api/migration/add-invoice-columns to enable full functionality'
        });

    } catch (error) {
        console.error('Check migration error:', error);
        res.status(500).json({
            error: 'Failed to check migration status',
            details: error.message
        });
    }
});

module.exports = router;
