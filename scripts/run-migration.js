require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../database/migrations/002_simplified.sql'),
      'utf8'
    );

    console.log('📝 Running migration...');
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('New tables created:');
    console.log('  - documents');
    console.log('  - buyback_offers');
    console.log('');
    console.log('Features now enabled:');
    console.log('  ✓ CSV Import');
    console.log('  ✓ Document Upload');
    console.log('  ✓ Buyback Offers');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
