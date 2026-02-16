const { execSync } = require('child_process');
const db = require('./src/db');
const fs = require('fs');
const path = require('path');

async function runMigration(filename, label) {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', filename),
      'utf8'
    );
    await db.query(sql);
    console.log(`✓ ${label}`);
  } catch (error) {
    if (error.message.includes('already exists') || error.code === '42701') {
      console.log(`✓ ${label} (already applied)`);
    } else {
      console.error(`✗ ${label}: ${error.message}`);
    }
  }
}

async function runMigrationsAndStart() {
  console.log('Running database migrations...');

  await runMigration('008_add_psa_status_column.sql', 'Migration 008: PSA status columns');
  await runMigration('009_add_theme_colors.sql', 'Migration 009: Theme color columns');
  await runMigration('010_add_multi_customer_support.sql', 'Migration 010: Multi-customer support');
  await runMigration('011_add_email_notifications.sql', 'Migration 011: Email notifications');
  await runMigration('012_add_email_mode_option.sql', 'Migration 012: Email mode option');
  await runMigration('013_add_default_email_templates.sql', 'Migration 013: Default email templates');
  await runMigration('014_add_push_notifications.sql', 'Migration 014: Push notification subscriptions');
  await runMigration('015_add_card_count_column.sql', 'Migration 015: Card count column');
  await runMigration('016_add_pickup_system.sql', 'Migration 016: Pickup system');
  await runMigration('017_add_invoicing_system.sql', 'Migration 017: Invoicing system');
  await runMigration('018_add_psa_refresh_logs.sql', 'Migration 018: PSA refresh logs');
  await runMigration('019_add_portal_enhancements.sql', 'Migration 019: Portal enhancements');
  await runMigration('020_add_comp_lookups.sql', 'Migration 020: Comp lookups');
  await runMigration('021_add_auto_refresh_schedule.sql', 'Migration 021: Auto refresh schedule');
  await runMigration('022_add_customer_email_opt_in.sql', 'Migration 022: Customer email opt-in');
  await runMigration('023_improve_refresh_system.sql', 'Migration 023: Refresh system improvements');
  await runMigration('024_add_submission_milestone_columns.sql', 'Migration 024: Submission milestone columns');
  await runMigration('add_missing_columns.sql', 'Migration: Missing columns');
  await runMigration('add_sam_enabled.sql', 'Migration: SAM enabled flag');
  await runMigration('add_submission_images.sql', 'Migration: Submission images');

  console.log('All migrations processed!\n');

  // Start the server
  console.log('Starting server...');
  require('./src/index.js');
}

runMigrationsAndStart();
