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
