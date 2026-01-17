const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { authenticate } = require("../middleware/auth");
const { importSubmissionsFromCSV } = require("../services/csvImport");

const router = express.Router();

// Configure multer for CSV uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /csv|text\/csv|application\/csv/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = file.originalname.toLowerCase().endsWith(".csv");

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  }
});

// Import PSA CSV
router.post("/psa-csv", authenticate, upload.single("file"), async (req, res) => {
  try {
    const { company_id, id: user_id } = req.user;
    const { customer_id, psa_submission_number } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Convert buffer to string
    const csvContent = req.file.buffer.toString("utf-8");

    // Import submissions and cards
    // Use customer_id if provided, otherwise use logged-in user's ID as placeholder
    const results = await importSubmissionsFromCSV(
      csvContent,
      company_id,
      customer_id || user_id,
      psa_submission_number
    );

    res.json({
      message: "CSV import completed",
      ...results
    });
  } catch (err) {
    console.error("CSV import error:", err);
    res.status(500).json({
      error: "Failed to import CSV",
      details: err.message
    });
  }
});

// Preview CSV before import (doesn't save to database)
router.post("/psa-csv/preview", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const csvContent = req.file.buffer.toString("utf-8");
    const { parsePSACSV } = require("../services/csvImport");

    const submissions = parsePSACSV(csvContent);

    // Calculate totals
    const totalSubmissions = submissions.length;
    const totalCards = submissions.reduce((sum, sub) => sum + sub.cards.length, 0);

    res.json({
      totalSubmissions,
      totalCards,
      submissions: submissions.map(sub => ({
        psa_submission_number: sub.psa_submission_number,
        service_level: sub.service_level,
        card_count: sub.cards.length,
        sample_cards: sub.cards.slice(0, 3) // Show first 3 cards as sample
      }))
    });
  } catch (err) {
    console.error("CSV preview error:", err);
    res.status(500).json({
      error: "Failed to preview CSV",
      details: err.message
    });
  }
});

module.exports = router;
