const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|gif|heic/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images and PDF files are allowed"));
    }
  }
});

// Upload document
router.post("/", authenticate, upload.single("file"), async (req, res) => {
  try {
    const { company_id, user_id } = req.user;
    const { submission_id, customer_id, document_type, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Verify submission belongs to company if provided
    if (submission_id) {
      const submissionCheck = await db.query(
        "SELECT id FROM submissions WHERE id = $1 AND company_id = $2",
        [submission_id, company_id]
      );
      if (submissionCheck.rows.length === 0) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Submission not found" });
      }
    }

    // Verify customer belongs to company if provided
    if (customer_id) {
      const customerCheck = await db.query(
        "SELECT id FROM customers WHERE id = $1 AND company_id = $2",
        [customer_id, company_id]
      );
      if (customerCheck.rows.length === 0) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Customer not found" });
      }
    }

    const result = await db.query(
      `INSERT INTO documents (
        company_id, submission_id, customer_id, file_name, file_path,
        file_type, file_size, mime_type, document_type, description,
        uploaded_by_user_id, upload_source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        company_id,
        submission_id || null,
        customer_id || null,
        req.file.originalname,
        req.file.path,
        path.extname(req.file.originalname),
        req.file.size,
        req.file.mimetype,
        document_type || "other",
        description || null,
        user_id,
        req.body.upload_source || "web"
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Upload document error:", err);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// Get documents (with filters)
router.get("/", authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { submission_id, customer_id, document_type } = req.query;

    let query = `
      SELECT d.*,
        s.psa_submission_number,
        c.name as customer_name,
        u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN submissions s ON d.submission_id = s.id
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN users u ON d.uploaded_by_user_id = u.id
      WHERE d.company_id = $1
    `;
    const params = [company_id];
    let paramCount = 1;

    if (submission_id) {
      paramCount++;
      query += ` AND d.submission_id = $${paramCount}`;
      params.push(submission_id);
    }

    if (customer_id) {
      paramCount++;
      query += ` AND d.customer_id = $${paramCount}`;
      params.push(customer_id);
    }

    if (document_type) {
      paramCount++;
      query += ` AND d.document_type = $${paramCount}`;
      params.push(document_type);
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get documents error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Get single document
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `SELECT d.*,
        s.psa_submission_number,
        c.name as customer_name,
        u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN submissions s ON d.submission_id = s.id
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN users u ON d.uploaded_by_user_id = u.id
      WHERE d.id = $1 AND d.company_id = $2`,
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get document error:", err);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// Download/view document
router.get("/:id/file", authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const result = await db.query(
      "SELECT file_path, file_name, mime_type FROM documents WHERE id = $1 AND company_id = $2",
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const { file_path, file_name, mime_type } = result.rows[0];

    if (!fs.existsSync(file_path)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader("Content-Type", mime_type);
    res.setHeader("Content-Disposition", `inline; filename="${file_name}"`);
    res.sendFile(file_path);
  } catch (err) {
    console.error("Download document error:", err);
    res.status(500).json({ error: "Failed to download document" });
  }
});

// Delete document
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const result = await db.query(
      "SELECT file_path FROM documents WHERE id = $1 AND company_id = $2",
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const { file_path } = result.rows[0];

    // Delete from database
    await db.query("DELETE FROM documents WHERE id = $1", [id]);

    // Delete file from disk
    if (fs.existsSync(file_path)) {
      fs.unlinkSync(file_path);
    }

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete document error:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

module.exports = router;
