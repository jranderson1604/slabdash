require('dotenv').config();
const db = require('./src/db');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
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

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    // Don't fail if columns already exist
    if (error.message.includes('already exists') || error.code === '42701') {
      console.log('⚠ Columns already exist, skipping...');
      process.exit(0);
    }
    process.exit(1);
  }
}

runMigrations();
