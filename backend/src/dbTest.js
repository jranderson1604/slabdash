import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 👇 Required to resolve paths in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👇 Explicitly load .env from backend folder
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pg;

// 🔎 Debug check (temporary)
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is NOT loaded");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testDB() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB connected at:", res.rows[0].now);
    process.exit(0);
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
}

testDB();
