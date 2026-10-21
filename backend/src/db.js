const { Pool } = require("pg");

const isLocalDB = process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway PostgreSQL does not provide verifiable CA certs by default.
  // Set DB_SSL_REJECT_UNAUTHORIZED=true in production if your provider supports it.
  ssl: isLocalDB
    ? false
    : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' },
  // Connection pool limits
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Export pool with query helper
module.exports = pool;
module.exports.pool = pool;
