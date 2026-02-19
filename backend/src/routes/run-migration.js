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

        // Fix unique constraint on submissions to allow same submission # across companies
        try {
            // Drop old constraint if it exists
            await db.query(`
                ALTER TABLE submissions
                DROP CONSTRAINT IF EXISTS submissions_psa_submission_number_key
            `);

            // Add new composite unique constraint
            await db.query(`
                ALTER TABLE submissions
                ADD CONSTRAINT submissions_company_psa_sub_unique
                UNIQUE (company_id, psa_submission_number)
            `);
            results.push('✓ Fixed submission number constraint to allow same submission # across different companies');
        } catch (error) {
            // Ignore if constraint already exists
            if (error.code === '42P07') {
                results.push('✓ Submission number constraint already updated');
            } else {
                results.push(`⚠ Submission constraint: ${error.message}`);
            }
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

        // Check cards sport column for categorization
        const sportCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'cards'
            AND column_name = 'sport'
        `);
        checks.push({
            check: 'Sport Categorization',
            status: sportCheck.rows.length > 0 ? '✓ Ready' : '✗ Need Migration',
            critical: false
        });

        // Check if submissions has the new composite unique constraint
        const constraintCheck = await db.query(`
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'submissions'
            AND constraint_name = 'submissions_company_psa_sub_unique'
        `);
        checks.push({
            check: 'Multi-Account Support',
            status: constraintCheck.rows.length > 0 ? '✓ Ready' : '✗ Need Migration',
            critical: false
        });

        const allCritical = checks.filter(c => c.critical).every(c => c.status.includes('✓'));
        const allChecks = checks.every(c => c.status.includes('✓'));

        res.json({
            success: true,
            migration_needed: !allChecks,
            checks: checks,
            summary: allChecks
                ? '✓ All features are ready!'
                : allCritical
                    ? '⚠ Additional features available - run migration to enable sport categorization and other features'
                    : '⚠ Migration needed - run migration to enable full functionality'
        });

    } catch (error) {
        console.error('Check migration error:', error);
        res.status(500).json({
            error: 'Failed to check migration status',
        });
    }
});

/**
 * Portal Enhancements Migration
 * Adds before photos, admin notes, price comps, and auto-refresh scheduling
 */
router.post('/add-portal-enhancements', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        console.log('Running portal enhancements migration...');
        const results = [];

        // Migration 019: Portal enhancements (before photos, notes, price estimates)
        try {
            await db.query(`
                -- Add before_photos column to cards (JSON array of photo URLs)
                ALTER TABLE cards ADD COLUMN IF NOT EXISTS before_photos JSONB DEFAULT '[]'::jsonb;

                -- Add admin_notes column to cards (visible to customers in portal)
                ALTER TABLE cards ADD COLUMN IF NOT EXISTS admin_notes TEXT;

                -- Add prep_notes column to cards (admin review/condition notes)
                ALTER TABLE cards ADD COLUMN IF NOT EXISTS prep_notes TEXT;

                -- Add price_estimate column for comp lookups
                ALTER TABLE cards ADD COLUMN IF NOT EXISTS price_estimate DECIMAL(10,2);

                -- Add last_comp_check timestamp
                ALTER TABLE cards ADD COLUMN IF NOT EXISTS last_comp_check TIMESTAMP WITH TIME ZONE;

                -- Add submission-level admin notes (general notes for the whole submission)
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS admin_notes TEXT;

                -- Add submission-level prep notes
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS prep_notes TEXT;
            `);
            results.push('✓ Added before photos, admin notes, and price estimate columns');
        } catch (error) {
            results.push(`✗ Portal enhancements (019): ${error.message}`);
        }

        // Create indexes for better performance
        try {
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_cards_before_photos ON cards USING GIN (before_photos);
            `);
            results.push('✓ Created index on before_photos for faster queries');
        } catch (error) {
            results.push(`✗ Before photos index: ${error.message}`);
        }

        // Migration 020: Comp lookups
        try {
            await db.query(`
                ALTER TABLE cards ADD COLUMN IF NOT EXISTS comp_lookups JSONB DEFAULT '[]'::jsonb;
            `);
            results.push('✓ Added comp_lookups column for price history tracking');
        } catch (error) {
            results.push(`✗ Comp lookups (020): ${error.message}`);
        }

        try {
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_cards_comp_lookups ON cards USING GIN (comp_lookups);
            `);
            results.push('✓ Created index on comp_lookups for faster queries');
        } catch (error) {
            results.push(`✗ Comp lookups index: ${error.message}`);
        }

        // Migration 021: Auto-refresh scheduling
        try {
            await db.query(`
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_enabled BOOLEAN DEFAULT FALSE;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_schedule VARCHAR(50) DEFAULT 'weekly';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_day_of_week INTEGER DEFAULT 1;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_hour INTEGER DEFAULT 9;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_email TEXT;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_auto_refresh TIMESTAMP WITH TIME ZONE;
            `);
            results.push('✓ Added auto-refresh scheduling settings');
        } catch (error) {
            results.push(`✗ Auto-refresh (021): ${error.message}`);
        }

        console.log('✓ Portal enhancements migration complete');

        res.json({
            success: true,
            message: 'Portal enhancements migration completed! You can now use before photos, price comps, card scanner, and auto-refresh features.',
            results: results
        });

    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run portal enhancements migration',
        });
    }
});

/**
 * Check portal enhancements migration status
 */
router.get('/check-portal-status', authenticate, async (req, res) => {
    try {
        const checks = [];

        // Check cards.before_photos
        const beforePhotosCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'cards'
            AND column_name = 'before_photos'
        `);
        checks.push({
            check: 'Before Photos Upload',
            status: beforePhotosCheck.rows.length > 0 ? '✓ Ready' : '✗ Need Migration',
            critical: true
        });

        // Check cards.admin_notes
        const adminNotesCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'cards'
            AND column_name = 'admin_notes'
        `);
        checks.push({
            check: 'Admin Notes',
            status: adminNotesCheck.rows.length > 0 ? '✓ Ready' : '✗ Need Migration',
            critical: true
        });

        // Check submissions.admin_notes
        const submissionNotesCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'submissions'
            AND column_name = 'admin_notes'
        `);
        checks.push({
            check: 'Submission-Level Notes',
            status: submissionNotesCheck.rows.length > 0 ? '✓ Ready' : '✗ Need Migration',
            critical: true
        });

        // Check cards.comp_lookups
        const compLookupsCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'cards'
            AND column_name = 'comp_lookups'
        `);
        checks.push({
            check: 'Price Comp Lookups',
            status: compLookupsCheck.rows.length > 0 ? '✓ Ready' : '✗ Need Migration',
            critical: false
        });

        // Check companies.auto_refresh_enabled
        const autoRefreshCheck = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'companies'
            AND column_name = 'auto_refresh_enabled'
        `);
        checks.push({
            check: 'Automatic PSA Refreshes',
            status: autoRefreshCheck.rows.length > 0 ? '✓ Ready' : '✗ Need Migration',
            critical: false
        });

        const allCritical = checks.filter(c => c.critical).every(c => c.status.includes('✓'));
        const allChecks = checks.every(c => c.status.includes('✓'));

        res.json({
            success: true,
            migration_needed: !allChecks,
            checks: checks,
            summary: allChecks
                ? '✓ All portal features are ready!'
                : allCritical
                    ? '⚠ Core portal features ready - run migration to enable price comps and auto-refresh'
                    : '❌ Migration required - customer portal features will not work until migration is run'
        });

    } catch (error) {
        console.error('Check migration error:', error);
        res.status(500).json({
            error: 'Failed to check migration status',
        });
    }
});

/**
 * Create blog_posts table
 */
router.post('/create-blog-posts', authenticate, requireRole('owner', 'admin'), async (req, res) => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS blog_posts (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              title VARCHAR(500) NOT NULL,
              body TEXT NOT NULL,
              author_name VARCHAR(255) DEFAULT 'SlabDash Team',
              published BOOLEAN DEFAULT true,
              pinned BOOLEAN DEFAULT false,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, created_at DESC)`);
        console.log('✓ Migration: blog_posts table created');
        res.json({ success: true, message: 'blog_posts table ready' });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
