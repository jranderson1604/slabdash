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
const ownerRoutes = require("./routes/owner");
const subscriptionRoutes = require("./routes/subscriptions");

const app = express();
const PORT = process.env.PORT || 3001;

/* -------------------- GLOBAL MIDDLEWARE -------------------- */

// Trust Railway proxy for rate limiting and proper IP detection
app.set('trust proxy', 1);

// CORS configuration - allow frontend domains
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://slabdash.app',
      'https://www.slabdash.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

    // Allow all Vercel preview and production URLs
    if (
      allowedOrigins.includes(origin) ||
      origin.includes('vercel.app') ||
      origin.includes('slabdash-8n99')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
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

// Serve manifest.json publicly (no auth required)
app.get("/manifest.json", (req, res) => {
  res.json({
    name: "SlabDash - PSA Card Tracking",
    short_name: "SlabDash",
    description: "Professional PSA card grading submission tracking for card shops",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF5F3",
    theme_color: "#FF8170",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/images/logo-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/images/logo-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  });
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
app.use("/api/owner", ownerRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

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
║  https://slabdash.app                            ║
╚══════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();



 
