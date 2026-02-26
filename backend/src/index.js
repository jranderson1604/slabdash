require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
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
const waitlistRoutes = require("./routes/waitlist");
const blogRoutes = require("./routes/blog");
const analyticsRoutes = require("./routes/analytics");
const webhooksRoutes = require("./routes/webhooks");
const auditRoutes = require("./routes/audit");
const cardImportRoutes = require("./routes/cardImport");

/* -------------------- STARTUP VALIDATION -------------------- */
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

/* -------------------- GLOBAL ERROR HANDLERS -------------------- */
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

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

    // Include FRONTEND_URL from environment if set
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/+$/, ''));
    }

    // Allow listed origins and Vercel preview deployments for this project
    if (
      allowedOrigins.includes(origin) ||
      origin.match(/^https:\/\/slabdash[a-z0-9-]*\.vercel\.app$/)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(helmet({
  contentSecurityPolicy: false, // Frontend handles CSP
  crossOriginEmbedderPolicy: false, // Allow embedded resources
}));
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan("dev"));
}

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

app.get("/pitch", (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pitch-deck.html'));
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
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/card-import", cardImportRoutes);

/* -------------------- 404 HANDLER -------------------- */

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

/* -------------------- ERROR HANDLER -------------------- */

app.use((err, req, res, next) => {
  // Log full error server-side, never expose internals to client
  console.error("API Error:", err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : (err.message || "Internal server error")
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

      // Portal enhancements (migration 019): before photos, notes, price estimates
      await db.query(`
        ALTER TABLE cards
        ADD COLUMN IF NOT EXISTS before_photos JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS admin_notes TEXT,
        ADD COLUMN IF NOT EXISTS prep_notes TEXT,
        ADD COLUMN IF NOT EXISTS price_estimate DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS last_comp_check TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS comp_lookups JSONB DEFAULT '[]'::jsonb;
      `);
      await db.query(`
        ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS admin_notes TEXT,
        ADD COLUMN IF NOT EXISTS prep_notes TEXT;
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_cards_before_photos ON cards USING GIN (before_photos)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_cards_comp_lookups ON cards USING GIN (comp_lookups)`);
      console.log("✓ Migration: Portal enhancements columns ensured (before_photos, notes, comps)");

      // Auto-refresh scheduling (migration 021)
      await db.query(`
        ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS auto_refresh_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS auto_refresh_schedule VARCHAR(50) DEFAULT 'weekly',
        ADD COLUMN IF NOT EXISTS auto_refresh_day_of_week INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS auto_refresh_hour INTEGER DEFAULT 9,
        ADD COLUMN IF NOT EXISTS auto_refresh_email TEXT,
        ADD COLUMN IF NOT EXISTS last_auto_refresh TIMESTAMP WITH TIME ZONE;
      `);
      console.log("✓ Migration: Auto-refresh scheduling columns ensured");

      // Daily grades digest settings
      await db.query(`
        ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS refresh_digest_enabled BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS refresh_digest_hour INTEGER DEFAULT 8,
        ADD COLUMN IF NOT EXISTS refresh_digest_last_sent TIMESTAMP WITH TIME ZONE;
      `);
      await db.query(`
        ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS grades_ready_pending_digest BOOLEAN DEFAULT FALSE;
      `);
      console.log("✓ Migration: Daily digest columns ensured");

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
      try {
        await db.query(`
          ALTER TABLE push_subscriptions
          ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
        `);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_push_sub_customer ON push_subscriptions(customer_id) WHERE customer_id IS NOT NULL`);
        console.log("✓ Migration: Customer push subscription column ensured");
      } catch (e) {
        console.warn("⚠ Migration: push_subscriptions customer_id skipped:", e.message);
      }

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

      // Pickup tracking columns on submissions
      await db.query(`
        ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS picked_up BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS picked_up_by VARCHAR(255);
      `);
      console.log("✓ Migration: picked_up columns ensured");

    } catch (migrationError) {
      // Don't fail startup if migration has issues, just log it
      console.warn("⚠ Migration warning:", migrationError.message);
    }

    // Blog posts — separate block so it always runs regardless of earlier migration failures
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS blog_posts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(500) NOT NULL,
          body TEXT NOT NULL,
          author_name VARCHAR(255) DEFAULT 'SlabDash Team',
          published BOOLEAN DEFAULT true,
          pinned BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, created_at DESC)`);
      console.log("✓ Migration: Blog posts table ensured");
    } catch (migrationError) {
      console.warn("⚠ Blog posts migration warning:", migrationError.message);
    }

    // Waitlist table — separate block so earlier failures don't block it
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS waitlist (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) NOT NULL UNIQUE,
          shop_name VARCHAR(255),
          role VARCHAR(100),
          source VARCHAR(100) DEFAULT 'landing_page',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email)`);
      await db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`);
      await db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS verification_token VARCHAR(100)`);
      console.log("✓ Migration: Waitlist table ensured");
    } catch (migrationError) {
      console.warn("⚠ Waitlist migration warning:", migrationError.message);
    }

    // JWT logout invalidation — add last_logout_at to users
    try {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMP WITH TIME ZONE;
      `);
      console.log("✓ Migration: last_logout_at column ensured");
    } catch (migrationError) {
      console.warn("⚠ last_logout_at migration warning:", migrationError.message);
    }

    // Outbound webhooks table
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          secret TEXT,
          events JSONB NOT NULL DEFAULT '["*"]'::jsonb,
          enabled BOOLEAN DEFAULT TRUE,
          last_fired_at TIMESTAMP WITH TIME ZONE,
          last_status INTEGER,
          error_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_webhooks_company ON webhooks(company_id);
      `);
      console.log("✓ Migration: webhooks table ensured");
    } catch (migrationError) {
      console.warn("⚠ webhooks migration warning:", migrationError.message);
    }

    // Audit log table
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100),
          entity_id INTEGER,
          details JSONB,
          ip VARCHAR(64),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
      `);
      console.log("✓ Migration: audit_logs table ensured");
    } catch (migrationError) {
      console.warn("⚠ audit_logs migration warning:", migrationError.message);
    }

    // Trial expiry system — add trial_ends_at to companies
    try {
      await db.query(`
        ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
      `);
      // Backfill: give existing free-plan companies a trial end date 14 days from now
      // so they see the countdown rather than immediately being locked
      await db.query(`
        UPDATE companies
        SET trial_ends_at = NOW() + INTERVAL '14 days'
        WHERE plan IS NULL OR plan = 'free'
          AND trial_ends_at IS NULL;
      `);
      console.log("✓ Migration: trial_ends_at column ensured");
    } catch (migrationError) {
      console.warn("⚠ trial_ends_at migration warning:", migrationError.message);
    }

    // Admin email verification + system config
    try {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP WITH TIME ZONE;
      `);
      // Treat all existing users as already verified (they pre-date this feature)
      await db.query(`UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE`);
      console.log("✓ Migration: users email_verified columns ensured");
    } catch (migrationError) {
      console.warn("⚠ users email_verified migration warning:", migrationError.message);
    }

    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS system_config (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log("✓ Migration: system_config table ensured");
    } catch (migrationError) {
      console.warn("⚠ system_config migration warning:", migrationError.message);
    }

    // Manual admin approval column
    try {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT NULL;
      `);
      // Backfill: users that pre-date this feature are already approved
      await db.query(`UPDATE users SET approved = TRUE WHERE approved IS NULL AND email_verified = TRUE`);
      console.log("✓ Migration: users approved column ensured");
    } catch (migrationError) {
      console.warn("⚠ users approved migration warning:", migrationError.message);
    }

    // Initialize scheduled tasks (cron jobs)
    try {
      initializeScheduler();
      console.log("✓ Scheduler initialized");
    } catch (schedulerError) {
      console.warn("⚠ Scheduler initialization warning:", schedulerError.message);
    }

    const server = app.listen(PORT, () => {
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

    // Graceful shutdown for Railway redeploys (SIGTERM)
    const shutdown = (signal) => {
      console.log(`\n⏳ ${signal} received — shutting down gracefully...`);
      server.close(() => {
        console.log('✓ HTTP server closed');
        db.end().then(() => {
          console.log('✓ Database pool closed');
          process.exit(0);
        }).catch(() => process.exit(0));
      });
      // Force exit after 10s if graceful shutdown stalls
      setTimeout(() => {
        console.error('⚠ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
