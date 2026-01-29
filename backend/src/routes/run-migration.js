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

module.exports = router;
