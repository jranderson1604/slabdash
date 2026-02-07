require('dotenv').config();
const db = require('./src/db');

async function runPortalMigrations() {
  try {
    console.log('🔧 Running portal enhancement migrations...\n');

    // Migration 019: Portal enhancements (admin_notes, prep_notes, before_photos, price_estimate)
    console.log('Running Migration 019: Portal enhancements...');
    await db.query(`
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS before_photos JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS prep_notes TEXT;
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS price_estimate DECIMAL(10,2);
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS last_comp_check TIMESTAMP WITH TIME ZONE;
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS prep_notes TEXT;
    `);
    console.log('✅ Migration 019: Portal enhancement columns added\n');

    // Migration 020: Comp lookups
    console.log('Running Migration 020: Comp lookups...');
    await db.query(`
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS comp_lookups JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('✅ Migration 020: Comp lookup tracking added\n');

    // Migration 021: Auto-refresh scheduling
    console.log('Running Migration 021: Auto-refresh scheduling...');
    await db.query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_enabled BOOLEAN DEFAULT FALSE;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_schedule VARCHAR(50) DEFAULT 'weekly';
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_day_of_week INTEGER DEFAULT 1;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_hour INTEGER DEFAULT 9;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_refresh_email TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_auto_refresh TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✅ Migration 021: Auto-refresh scheduling added\n');

    // Verify migrations
    console.log('🔍 Verifying migrations...');
    const verification = await db.query(`
      SELECT
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'admin_notes') as sub_admin_notes,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'prep_notes') as sub_prep_notes,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'before_photos') as card_before_photos,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'admin_notes') as card_admin_notes,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'prep_notes') as card_prep_notes,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'price_estimate') as card_price_estimate,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'comp_lookups') as card_comp_lookups,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'auto_refresh_enabled') as company_auto_refresh
    `);

    const status = verification.rows[0];
    console.log('\n📊 Migration Status:');
    console.log('  Submissions:');
    console.log(`    ✓ admin_notes: ${status.sub_admin_notes ? '✅' : '❌'}`);
    console.log(`    ✓ prep_notes: ${status.sub_prep_notes ? '✅' : '❌'}`);
    console.log('  Cards:');
    console.log(`    ✓ before_photos: ${status.card_before_photos ? '✅' : '❌'}`);
    console.log(`    ✓ admin_notes: ${status.card_admin_notes ? '✅' : '❌'}`);
    console.log(`    ✓ prep_notes: ${status.card_prep_notes ? '✅' : '❌'}`);
    console.log(`    ✓ price_estimate: ${status.card_price_estimate ? '✅' : '❌'}`);
    console.log(`    ✓ comp_lookups: ${status.card_comp_lookups ? '✅' : '❌'}`);
    console.log('  Companies:');
    console.log(`    ✓ auto_refresh_enabled: ${status.company_auto_refresh ? '✅' : '❌'}`);

    console.log('\n✨ All portal enhancement migrations completed successfully!');
    console.log('🎉 Customer portals should now load without errors.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runPortalMigrations();
