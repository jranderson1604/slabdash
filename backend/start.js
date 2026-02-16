const { execSync } = require('child_process');
const db = require('./src/db');
const fs = require('fs');
const path = require('path');

async function runMigrationsAndStart() {
  try {
    console.log('Running database migrations...');

    // Migration 008: PSA status columns
    const migration008 = fs.readFileSync(
      path.join(__dirname, 'migrations/008_add_psa_status_column.sql'),
      'utf8'
    );
    await db.query(migration008);
    console.log('✓ Migration 008: PSA status columns added');

    // Migration 009: Theme colors
    const migration009 = fs.readFileSync(
      path.join(__dirname, 'migrations/009_add_theme_colors.sql'),
      'utf8'
    );
    await db.query(migration009);
    console.log('✓ Migration 009: Theme color columns added');

    // Migration 010: Multi-customer support
    const migration010 = fs.readFileSync(
      path.join(__dirname, 'migrations/010_add_multi_customer_support.sql'),
      'utf8'
    );
    await db.query(migration010);
    console.log('✓ Migration 010: Multi-customer support added');

    // Migration 011: Email notifications
    const migration011 = fs.readFileSync(
      path.join(__dirname, 'migrations/011_add_email_notifications.sql'),
      'utf8'
    );
    await db.query(migration011);
    console.log('✓ Migration 011: Email notifications added');

    // Migration 012: Email mode option
    const migration012 = fs.readFileSync(
      path.join(__dirname, 'migrations/012_add_email_mode_option.sql'),
      'utf8'
    );
    await db.query(migration012);
    console.log('✓ Migration 012: Email mode option added');

    // Migration 013: Default email templates
    const migration013 = fs.readFileSync(
      path.join(__dirname, 'migrations/013_add_default_email_templates.sql'),
      'utf8'
    );
    await db.query(migration013);
    console.log('✓ Migration 013: Default email templates for all PSA steps added');

    // Migration 014: Push notifications
    const migration014 = fs.readFileSync(
      path.join(__dirname, 'migrations/014_add_push_notifications.sql'),
      'utf8'
    );
    await db.query(migration014);
    console.log('✓ Migration 014: Push notification subscriptions added');

    // Migration 015: Card count column
    const migration015 = fs.readFileSync(
      path.join(__dirname, 'migrations/015_add_card_count_column.sql'),
      'utf8'
    );
    await db.query(migration015);
    console.log('✓ Migration 015: Card count column added');

    // Migration 016: Pickup system
    const migration016 = fs.readFileSync(
      path.join(__dirname, 'migrations/016_add_pickup_system.sql'),
      'utf8'
    );
    await db.query(migration016);
    console.log('✓ Migration 016: Pickup system with codes and audit trail added');

    // Migration 017: Invoicing system
    const migration017 = fs.readFileSync(
      path.join(__dirname, 'migrations/017_add_invoicing_system.sql'),
      'utf8'
    );
    await db.query(migration017);
    console.log('✓ Migration 017: Invoicing system with costs and delivery preferences added');

    // Migration 018: PSA refresh logs
    const migration018 = fs.readFileSync(
      path.join(__dirname, 'migrations/018_add_psa_refresh_logs.sql'),
      'utf8'
    );
    await db.query(migration018);
    console.log('✓ Migration 018: PSA refresh logs added');

    // Migration 019: Portal enhancements
    const migration019 = fs.readFileSync(
      path.join(__dirname, 'migrations/019_add_portal_enhancements.sql'),
      'utf8'
    );
    await db.query(migration019);
    console.log('✓ Migration 019: Portal enhancements added');

    // Migration 020: Comp lookups
    const migration020 = fs.readFileSync(
      path.join(__dirname, 'migrations/020_add_comp_lookups.sql'),
      'utf8'
    );
    await db.query(migration020);
    console.log('✓ Migration 020: Comp lookups added');

    // Migration 021: Auto refresh schedule
    const migration021 = fs.readFileSync(
      path.join(__dirname, 'migrations/021_add_auto_refresh_schedule.sql'),
      'utf8'
    );
    await db.query(migration021);
    console.log('✓ Migration 021: Auto refresh schedule added');

    // Migration 022: Customer email opt-in
    const migration022 = fs.readFileSync(
      path.join(__dirname, 'migrations/022_add_customer_email_opt_in.sql'),
      'utf8'
    );
    await db.query(migration022);
    console.log('✓ Migration 022: Customer email opt-in added');

    // Migration 023: Improve refresh system
    const migration023 = fs.readFileSync(
      path.join(__dirname, 'migrations/023_improve_refresh_system.sql'),
      'utf8'
    );
    await db.query(migration023);
    console.log('✓ Migration 023: Refresh system improvements added');

    // Migration 024: Add submission milestone columns (date_received, date_graded, etc.)
    const migration024 = fs.readFileSync(
      path.join(__dirname, 'migrations/024_add_submission_milestone_columns.sql'),
      'utf8'
    );
    await db.query(migration024);
    console.log('✓ Migration 024: Submission milestone columns added');

    // Migration: Add missing columns (admin_notes, prep_notes, etc.)
    const migrationMissing = fs.readFileSync(
      path.join(__dirname, 'migrations/add_missing_columns.sql'),
      'utf8'
    );
    await db.query(migrationMissing);
    console.log('✓ Migration: Missing columns added');

    // Migration: Add SAM enabled flag
    const migrationSam = fs.readFileSync(
      path.join(__dirname, 'migrations/add_sam_enabled.sql'),
      'utf8'
    );
    await db.query(migrationSam);
    console.log('✓ Migration: SAM enabled flag added');

    // Migration: Add submission images
    const migrationImages = fs.readFileSync(
      path.join(__dirname, 'migrations/add_submission_images.sql'),
      'utf8'
    );
    await db.query(migrationImages);
    console.log('✓ Migration: Submission images added');

    console.log('All migrations completed successfully!\n');
  } catch (error) {
    // Don't fail if columns already exist
    if (error.message.includes('already exists') || error.code === '42701') {
      console.log('⚠ Columns already exist, skipping migrations...\n');
    } else {
      console.error('Migration warning:', error.message, '\n');
    }
  }

  // Start the server (don't exit, just require it)
  console.log('Starting server...');
  require('./src/index.js');
}

runMigrationsAndStart();
