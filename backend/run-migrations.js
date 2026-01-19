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
