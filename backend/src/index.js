require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const db = require("./db");

// route modules
const authRoutes = require("./routes/auth");
const submissionRoutes = require("./routes/submissions");
const psaRoutes = require("./routes/psa");
const shopRoutes = require("./routes/shops");
const companyRoutes = require("./routes/companies");
const customerRoutes = require("./routes/customers");
const cardRoutes = require("./routes/cards");
const portalRoutes = require("./routes/portal");
const documentRoutes = require("./routes/documents");
const buybackRoutes = require("./routes/buyback");
const importRoutes = require("./routes/import");

const app = express();
const PORT = process.env.PORT || 3001;

/* -------------------- GLOBAL MIDDLEWARE -------------------- */

// Trust Railway proxy for rate limiting and proper IP detection
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

/* -------------------- RATE LIMITING -------------------- */

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api", apiLimiter);

/* -------------------- HEALTH & META -------------------- */

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      ok: true,
      service: "SlabDash API",
      database: "connected",
      timestamp: new Date().toISOString(),
      message: "✅ v2.0 - Document upload, CSV import, and buyback system ready!"
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      service: "SlabDash API",
      database: "disconnected",
      timestamp: new Date().toISOString()
    });
  }
});

app.get("/", (req, res) => {
  res.send("SlabDash API is running v2");
});

/* -------------------- API ROUTES -------------------- */

app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/psa", psaRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/buyback", buybackRoutes);
app.use("/api/import", importRoutes);

/* -------------------- 404 HANDLER -------------------- */

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

/* -------------------- ERROR HANDLER -------------------- */

app.use((err, req, res, next) => {
  console.error("API Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  });
});

/* -------------------- SERVER START -------------------- */

async function startServer() {
  try {
    await db.query("SELECT 1");
    console.log("✓ Database connected");

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════╗
║                  SLABDASH API                   ║
║                                                  ║
║  Environment : ${process.env.NODE_ENV || "dev"}                   
║  Port        : ${PORT}                            
║  Status      : Live                              
║                                                  ║
║  https://slabdash.io                             ║
╚══════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();



 
