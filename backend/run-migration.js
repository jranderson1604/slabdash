const fs = require('fs');
const path = require('path');
const db = require('./src/db');

async function runMigration() {
  try {
    const migrationFile = path.join(__dirname, 'migrations', '008_add_psa_status_column.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Running migration: 008_add_psa_status_column.sql');
    await db.query(sql);
    console.log('✓ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
