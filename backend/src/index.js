require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const db = require("./db");
const { initializeScheduler } = require("./scheduler");

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
const emailTemplatesRoutes = require("./routes/email-templates");
const emailTemplateSetupRoutes = require("./routes/email-template-setup");
const emailSenderRoutes = require("./routes/email-sender");
const pushRoutes = require("./routes/push");
const psaImportRoutes = require("./routes/psa-import");
const runMigrationRoutes = require("./routes/run-migration");
const pickupRoutes = require("./routes/pickup");
const invoiceRoutes = require("./routes/invoices");
const dashyRoutes = require("./routes/dashy");
const samRoutes = require("./routes/sam");

const app = express();
const PORT = process.env.PORT || 3001;

/* -------------------- GLOBAL MIDDLEWARE -------------------- */

// Serve static files from public directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

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
      message: "✅ v2.1 - PSA CSV import, bulk emails, and card_count migration ready!"
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
app.use("/api/email-templates", emailTemplatesRoutes);
app.use("/api/email-setup", emailTemplateSetupRoutes);
app.use("/api/email-sender", emailSenderRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/psa-import", psaImportRoutes);
app.use("/api/migration", runMigrationRoutes);
app.use("/api/pickup", pickupRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashy", dashyRoutes);
app.use("/api/sam", samRoutes);

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

    // Run essential migrations automatically
    try {
      console.log("Running automatic migrations...");

      // Add card_count column if it doesn't exist
      await db.query(`
        ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS card_count INTEGER DEFAULT 0;
      `);
      console.log("✓ Migration: card_count column ensured");

      // Remove user_id NOT NULL constraint if column exists (legacy cleanup)
      await db.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'submissions' AND column_name = 'user_id'
          ) THEN
            ALTER TABLE submissions ALTER COLUMN user_id DROP NOT NULL;
          END IF;
        END $$;
      `);
      console.log("✓ Migration: user_id constraint removed if exists");

      // CRITICAL FIX: Reset shipped status for submissions without tracking numbers
      // This fixes corrupted data from buggy CSV imports
      const resetResult = await db.query(`
        UPDATE submissions
        SET shipped = false
        WHERE shipped = true
        AND (return_tracking IS NULL OR return_tracking = '' OR return_tracking = 'null');
      `);

      if (resetResult.rowCount > 0) {
        console.log(`✓ Migration: Fixed ${resetResult.rowCount} incorrectly shipped submissions`);
      } else {
        console.log("✓ Migration: No corrupted shipped statuses found");
      }

      // Customer auth columns for self-service login
      await db.query(`
        ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
        ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255),
        ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
      `);
      console.log("✓ Migration: Customer auth columns ensured");

      // Company columns for subscriptions, SAM, and shop code
      await db.query(`
        ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS sam_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS shop_code VARCHAR(4);
      `);
      console.log("✓ Migration: Company stripe/sam/shop_code columns ensured");

      // Auto-enable SAM for all companies (it's a core feature)
      await db.query(`UPDATE companies SET sam_enabled = TRUE WHERE sam_enabled IS NOT TRUE`);

      // Generate 4-digit shop codes for companies that don't have one
      const companiesWithoutCode = await db.query(
        `SELECT id FROM companies WHERE shop_code IS NULL`
      );
      for (const row of companiesWithoutCode.rows) {
        let code;
        let unique = false;
        while (!unique) {
          code = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
          const exists = await db.query(
            `SELECT 1 FROM companies WHERE shop_code = $1`, [code]
          );
          unique = exists.rows.length === 0;
        }
        await db.query(
          `UPDATE companies SET shop_code = $1 WHERE id = $2`, [code, row.id]
        );
      }
      if (companiesWithoutCode.rows.length > 0) {
        console.log(`✓ Migration: Generated shop codes for ${companiesWithoutCode.rows.length} companies`);
      }

      // SAM token system: add token balance to customers and usage tracking table
      await db.query(`
        ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS sam_token_balance INTEGER DEFAULT 0;
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS sam_usage (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
          message_count INTEGER DEFAULT 0,
          scan_count INTEGER DEFAULT 0,
          tokens_used INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(customer_id, usage_date)
        );
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_sam_usage_customer_date ON sam_usage(customer_id, usage_date);
      `);
      // SAM token purchase history
      await db.query(`
        CREATE TABLE IF NOT EXISTS sam_token_purchases (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          bundle VARCHAR(50) NOT NULL,
          token_count INTEGER NOT NULL,
          amount_cents INTEGER NOT NULL,
          stripe_session_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log("✓ Migration: SAM token system columns ensured");

      // Ensure PSA refresh tracking columns exist on submissions
      await db.query(`
        ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS last_api_update TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMP;
      `);
      console.log("✓ Migration: PSA refresh tracking columns ensured");

      // Step transition history — logs every status change for activity feeds and analytics
      await db.query(`
        CREATE TABLE IF NOT EXISTS submission_status_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
          company_id UUID NOT NULL,
          from_step VARCHAR(100),
          to_step VARCHAR(100),
          from_progress INTEGER,
          to_progress INTEGER,
          event_type VARCHAR(50) NOT NULL DEFAULT 'step_change',
          details JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_status_history_submission ON submission_status_history(submission_id, created_at DESC)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_status_history_company ON submission_status_history(company_id, created_at DESC)`);
      console.log("✓ Migration: Step transition history table ensured");

      // Push subscriptions: add customer_id for portal customer push notifications
      await db.query(`
        ALTER TABLE push_subscriptions
        ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_push_sub_customer ON push_subscriptions(customer_id) WHERE customer_id IS NOT NULL`);
      console.log("✓ Migration: Customer push subscription column ensured");

      // PSA refresh logs table
      await db.query(`
        CREATE TABLE IF NOT EXISTS psa_refresh_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          total_submissions INTEGER DEFAULT 0,
          updated_count INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          change_log JSONB,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_refresh_logs_company ON psa_refresh_logs(company_id, created_at DESC)`);
      console.log("✓ Migration: PSA refresh logs table ensured");

    } catch (migrationError) {
      // Don't fail startup if migration has issues, just log it
      console.warn("⚠ Migration warning:", migrationError.message);
    }

    // Initialize scheduled tasks (cron jobs)
    try {
      initializeScheduler();
      console.log("✓ Scheduler initialized");
    } catch (schedulerError) {
      console.warn("⚠ Scheduler initialization warning:", schedulerError.message);
    }

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



 
// Railway redeploy trigger
