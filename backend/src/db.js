const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Run this once to add form_images column
const addFormImagesColumn = async () => {
  try {
    await pool.query(`
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS form_images TEXT[]
    `);
    console.log('✅ form_images column added');
  } catch (error) {
    console.error('Migration error:', error);
  }
};

// Uncomment to run migration
//addFormImagesColumn();

module.exports = { query: (text, params) => pool.query(text, params), pool };