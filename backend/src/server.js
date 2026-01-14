import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";
import { getSubmissionProgress, getCertByNumber } from "./psaService.js";

dotenv.config();

const { Pool } = pg;
const app = express();

/* =========================
   DATABASE
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

/* =========================
   CONFIG
========================= */
const PORT = 3001;
const DEFAULT_USER_ID = "65131003-ee78-42e8-a81c-e34c83dd9d95";

/* =========================
   PSA STATE (IN-MEMORY)
========================= */
let PSA_API_KEY = null;
let lastPsaCallAt = 0;
const PSA_COOLDOWN_MS = 60 * 1000;

function canCallPsa() {
  return Date.now() - lastPsaCallAt > PSA_COOLDOWN_MS;
}
function markPsaCall() {
  lastPsaCallAt = Date.now();
}

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   HEALTH
========================= */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/* =========================
   LIST SUBMISSIONS
========================= */
app.get("/api/submissions", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.psa_submission_number,
        s.current_status,
        s.total_value,
        s.insurance_value,
        COUNT(c.id)::int AS card_count
      FROM submissions s
      LEFT JOIN cards c ON c.submission_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =========================
   SINGLE SUBMISSION + CARDS
========================= */
app.get("/api/submissions/:psa", async (req, res) => {
  try {
    const psa = req.params.psa;

    const sub = await pool.query(
      `SELECT * FROM submissions WHERE psa_submission_number = $1`,
      [psa]
    );

    if (!sub.rows.length) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const cards = await pool.query(
      `SELECT * FROM cards WHERE submission_id = $1 ORDER BY created_at ASC`,
      [sub.rows[0].id]
    );

    res.json({
      submission: sub.rows[0],
      cards: cards.rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =========================
   PSA CONNECT
========================= */
app.post("/api/psa/connect", (req, res) => {
  const { apiKey, dryRun } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "API key required" });
  }

  PSA_API_KEY = apiKey.trim();

  if (dryRun) {
    return res.json({ ok: true, dryRun: true });
  }

  res.json({ ok: true });
});

/* =========================
   PSA SYNC — SUBMISSION
========================= */
app.post("/api/psa/sync/submission", async (req, res) => {
  const { submissionNumber } = req.body;

  if (!PSA_API_KEY) {
    return res.status(400).json({ error: "PSA not connected" });
  }
  if (!submissionNumber) {
    return res.status(400).json({ error: "submissionNumber required" });
  }
  if (!canCallPsa()) {
    return res.status(429).json({ error: "PSA cooldown active" });
  }

  try {
    const psa = await getSubmissionProgress(
      PSA_API_KEY,
      submissionNumber
    );
    markPsaCall();

    await pool.query(
      `
      INSERT INTO submissions (user_id, psa_submission_number, current_status)
      VALUES ($1, $2, $3)
      ON CONFLICT (psa_submission_number)
      DO UPDATE SET current_status = EXCLUDED.current_status
      `,
      [
        DEFAULT_USER_ID,
        submissionNumber,
        psa.status || "Unknown"
      ]
    );

    res.json({ ok: true, status: psa.status || "Unknown" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =========================
   PSA SYNC — CERT
========================= */
app.post("/api/psa/sync/cert", async (req, res) => {
  const { submissionNumber, certNumber } = req.body;

  if (!PSA_API_KEY) {
    return res.status(400).json({ error: "PSA not connected" });
  }
  if (!submissionNumber || !certNumber) {
    return res.status(400).json({ error: "submissionNumber and certNumber required" });
  }
  if (!canCallPsa()) {
    return res.status(429).json({ error: "PSA cooldown active" });
  }

  try {
    const sub = await pool.query(
      `SELECT id FROM submissions WHERE psa_submission_number = $1`,
      [submissionNumber]
    );

    if (!sub.rows.length) {
      return res.status(400).json({ error: "Submission not found locally" });
    }

    const cert = await getCertByNumber(
      PSA_API_KEY,
      certNumber
    );
    markPsaCall();

    await pool.query(
      `
      INSERT INTO cards
        (submission_id, year, player_name, card_set, grade, psa_cert_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (psa_cert_number) DO NOTHING
      `,
      [
        sub.rows[0].id,
        cert.year,
        cert.playerName,
        cert.setName,
        cert.grade,
        certNumber
      ]
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`SlabDash backend running on http://localhost:${PORT}`);
});
