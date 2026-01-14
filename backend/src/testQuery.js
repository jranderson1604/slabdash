import pool from "./db.js";

const res = await pool.query(
  "SELECT psa_submission_number, current_status FROM submissions"
);

console.table(res.rows);
process.exit();
