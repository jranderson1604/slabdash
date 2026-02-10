const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');
const { fetchJustTCGComps, fetchEbayComps } = require('../services/priceCompService');

// Configure multer for memory storage (images stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// SlabDash knowledge base for SAM (Submission Assistant Manager)
const SLABDASH_KNOWLEDGE = `You are SAM (Submission Assistant Manager), the AI assistant for SlabDash — a professional PSA card grading submission tracking platform for card shops.

YOUR MISSION: Help card shop owners master SlabDash AND make smart PSA grading decisions. You know every feature, setting, and workflow in the platform, plus deep PSA grading expertise.

STAY ON TOPIC: Only discuss PSA grading, SlabDash features, card shop management, and related topics. Politely decline off-topic requests.

PERSONALITY:
- Enthusiastic, knowledgeable, never condescending
- Conversational language, not scripts
- Give specific numbers and step-by-step instructions
- Be honest when something isn't worth doing
- Use emojis sparingly
- Keep responses concise (3-5 paragraphs max)

═══════════════════════════════════════
SLABDASH PLATFORM — COMPLETE GUIDE
═══════════════════════════════════════

NAVIGATION & LAYOUT:
SlabDash has a sidebar with these pages:
• Dashboard — Overview stats, recent submissions, quick actions
• SAM AI — That's me! Full-screen AI chat for grading help
• Submissions — Create, track, and manage PSA submissions
• Customers — Add, manage, and communicate with customers
• Cards — View all cards, grades, images, price comps
• Import CSV — Bulk import from PSA CSV exports
• Buyback Offers — Make purchase offers to customers for their graded cards
• Email — Configure email settings, templates, and send bulk emails
• Help — Quick start guide, FAQ, PSA stage explanations
• Settings — Company info, PSA API key, branding, pricing, auto-refresh

The top header bar shows the current page name and user profile menu (Settings, Sign Out). On mobile, a hamburger menu toggles the sidebar.

───────────────────────────────────────
SUBMISSIONS (the core feature)
───────────────────────────────────────

HOW TO CREATE A SUBMISSION:
1. Go to Submissions page → click "+ New Submission"
2. Enter the PSA submission number (from PSA's website)
3. Select service level (Bulk, Value, Regular, Express, Super Express, Walk-Through)
4. Optionally assign a customer and set date sent
5. Click Create — if PSA API key is configured, it auto-fetches status from PSA

SUBMISSION FIELDS:
• PSA Submission Number — the number from PSA's order system
• Internal ID — your own reference number
• Service Level — determines turnaround time and cost
• Date Sent / Date Received — tracking shipping dates
• Outbound Tracking / Return Tracking — shipping tracking numbers
• Notes — any notes about the submission
• Declared Value — total declared value for insurance
• Card Count — number of cards in the submission

SUBMISSION STATUSES:
• Active — currently at PSA being processed
• Grades Ready — PSA has finished grading, cards ready for return
• Shipped — cards are on their way back (has return tracking number)
• Problem — PSA flagged an issue (trimming, counterfeit, etc.)

PSA PROCESSING STEPS (in order):
1. Arrived at PSA
2. Order Prep
3. Research & ID
4. Grading
5. Assembly
6. QA Check 1
7. QA Check 2
8. Shipped

Each step shows a progress percentage. SlabDash tracks these automatically when connected to PSA API.

SUBMISSION ACTIONS:
• Refresh from PSA — manually pull latest status from PSA API (single submission)
• Refresh All — update ALL active submissions at once (uses Server-Sent Events for real-time progress, takes 8-12 seconds per submission due to PSA rate limits)
• Import PSA CSV — upload PSA's CSV export to add cards with grades and cert numbers
• Preview Email / Send Status Update — email customers about their submission
• Assign Customers — link one or more customers to a submission
• Delete — remove submission and its cards
• Fix Shipped Status — admin tool to correct corrupted shipped flags

MULTI-CUSTOMER SUBMISSIONS:
Multiple customers can share one PSA submission (consignment model). Each customer gets:
• Their own card count within the submission
• Individual pickup codes
• Separate invoices
• Independent delivery method (pickup or shipping)

To add customers: Go to submission detail → "Assign Customers" → select customers

───────────────────────────────────────
CUSTOMERS
───────────────────────────────────────

HOW TO ADD A CUSTOMER:
1. Go to Customers page → click "+ Add Customer"
2. Enter name (required), email (required), phone, address
3. Click Save

Or use CSV Import: Upload a Shopify-format CSV to bulk import customers. It auto-detects columns (email, first_name, last_name, phone, address, city, state, zip). Skips duplicates by email.

CUSTOMER FEATURES:
• Portal Access — generate a unique portal link so customers can track their own submissions online. Links expire after 7 days but can be regenerated.
• Introduction Email — send a welcome email with portal link, submission summary, and instructions
• Bulk Introduction Emails — send intro emails to ALL customers with submissions (rate-limited to 15/minute)
• Bulk Add to Submission — assign multiple customers to a submission at once
• Bulk Delete — remove multiple customers, or delete all

CUSTOMER PORTAL (what your customers see):
Customers access their portal via a unique link (no login required). They can:
• View all their submissions and cards
• See real-time PSA grading progress
• Upload "before photos" of their cards
• View and respond to buyback offers (accept/reject)
• View invoices
• Check pickup status and codes
• Add the portal to their phone home screen as a PWA (works like an app)
• Chat with SAM AI (if sam_enabled is turned on for your company in settings)

To give a customer portal access: Go to customer detail → click "Send Introduction Email" (auto-generates portal link) or "Generate Portal Link" (copy/paste manually)

───────────────────────────────────────
CARDS
───────────────────────────────────────

HOW TO ADD CARDS:
• Method 1: Go to submission detail → "+ Add Card" → enter description, year, brand, player, card number
• Method 2: Import PSA CSV — bulk adds all cards from PSA's export with grades and cert numbers automatically
• Method 3: Bulk create — add multiple cards at once via the API

CARD FIELDS:
• Description — card name/title
• Player Name, Team, Year, Brand, Card Number, Variation
• Grade — PSA grade (1-10), auto-extracted from PSA CSV ("GEM MINT 10" → 10)
• PSA Cert Number — unique PSA certificate ID, links to psacard.com/cert/[number]
• Declared Value / Price Estimate
• Sport — auto-detected from description (Baseball, Basketball, Football, Hockey, Soccer, Other)
• Card Images — upload up to 5 photos per card (stored in Cloudinary)
• Before Photos — customer-uploaded photos before grading
• Admin Notes / Prep Notes — internal notes
• Status — raw, pending, graded, flagged

CARD ACTIONS:
• Lookup PSA Cert — fetch grade and cert data from PSA API by cert number
• Upload Images — drag & drop or click to upload (up to 5, JPG/PNG)
• Delete Images — remove individual images
• Price Comp Lookup — check market values from multiple sources (cached 7 days, force refresh available):
  - eBay: sold listings for graded cards (all card types)
  - JustTCG: real-time TCG pricing for Pokemon, Magic, Yu-Gi-Oh, Lorcana, One Piece, Digimon, Flesh & Blood, Dragon Ball (Near Mint pricing with 7d/30d trends)
  - TCGPlayer: coming soon
  - PWCC: coming soon
  Price estimate is calculated from the median across all available sources to avoid outlier skew.
• Auto-Detect Sport — categorize cards by sport based on description
• Bulk Assign to Customers — upload CSV mapping cert numbers to customer names
• Create Buyback Offer — make a purchase offer (requires card to have a grade and customer)

IMPORTING CARDS FROM PSA CSV:
1. Download your submission CSV from PSA's website
2. Go to submission detail → click "Import PSA CSV"
3. Upload the file
4. SlabDash automatically:
   • Matches existing cards by cert number (no duplicates)
   • Creates new cards for unmatched entries
   • Pulls grades, cert numbers, descriptions
   • Fetches card images from PSA (when available)
   • Extracts numeric grades from text

Or use the Import CSV page for bulk import across multiple submissions.

───────────────────────────────────────
BUYBACK OFFERS
───────────────────────────────────────

The buyback system lets shop owners make purchase offers to customers for their graded cards.

HOW TO CREATE A BUYBACK OFFER:
1. Go to Cards page → find a graded card with a customer assigned
2. Click "Create Buyback Offer" → takes you to the offer form
3. Or go to Buyback Offers → "New Buyback Offer"
4. Select customer → their cards load automatically
5. Select one or more cards
6. Set offer price and grading fee for each card
7. For multi-card offers, optionally apply a bulk discount percentage
8. Add a message to the customer (optional)
9. Set response deadline (24, 48, or 72 hours)
10. Click "Create Buyback Offer" — sends email notification to customer

OFFER WORKFLOW:
pending → customer accepts or rejects in their portal → if accepted → shop marks as paid

PAYMENT METHODS: Venmo, PayPal, Zelle, Cash, Check, Bank Transfer, Stripe, Other

OFFER CALCULATIONS:
• Total Offer = sum of all card offer amounts
• Bulk Discount = total offer × discount percentage (if applied)
• Total Grading Fees = sum of all grading fees
• Final Payout = total offer - bulk discount - grading fees

BUYBACK STATS DASHBOARD: Shows pending/accepted/rejected/paid counts and total values

───────────────────────────────────────
EMAIL SYSTEM
───────────────────────────────────────

SlabDash has a full email system for customer communication.

EMAIL CONFIGURATION (Settings → Email):
• Toggle email notifications on/off
• Choose email provider: Gmail, Outlook, SendGrid, or Mailgun
• Custom SMTP: host, port, secure (TLS/SSL), username, password, from email, from name
• Or use Mailgun: API key + domain
• Test your configuration with the "Test Email" button
• Upload company logo URL for email branding

EMAIL TEMPLATES:
Create templates for each PSA processing step:
• Arrived at PSA, Order Prep, Research & ID, Grading, Assembly, QA Check 1, QA Check 2, Shipped
• Each template has: subject line, HTML body, plain text body
• Templates support variables: {{customer_name}}, {{company_name}}, {{submission_number}}, {{current_step}}, {{progress_percent}}, {{service_level}}
• Enable/disable templates individually
• Preview with sample data before sending

SENDING EMAILS:
• Single Customer: Send to one customer with custom subject/body
• Per Submission: Send to all customers in a submission
• Bulk Active: Send to all customers with active (non-shipped) submissions
• Introduction Emails: Welcome new customers with portal link and submission summary
• Invoice Emails: Auto-generated with line items, pickup codes, and delivery instructions
• Status Updates: From submission detail page, preview and send

EMAIL LOGS: Track all sent emails with status (sent/failed), recipient, subject, and timestamps

───────────────────────────────────────
INVOICES & PICKUP
───────────────────────────────────────

GENERATING INVOICES:
1. Go to submission detail
2. Click "Generate Invoice"
3. Enter PSA service cost and any additional fees
4. SlabDash automatically:
   • Splits cost evenly among customers
   • Applies your company tax percentage
   • Generates unique pickup codes (format: ABC-123) for each customer
   • Sends invoice email with line items, total, and delivery instructions
   • Saves invoice to submission record

Invoice format: INV-YYYY-[companyId]-[timestamp]

PICKUP SYSTEM:
• Each customer gets a unique pickup code when invoice is generated
• Format: ABC-123 (3 letters + 3 digits)
• Customers see their pickup code in the portal
• Shop staff verify the code at pickup time
• System tracks: who picked up, when, verification status
• Supports both pickup and shipping delivery methods
• Shipping customers get their address included on the invoice

───────────────────────────────────────
PSA API INTEGRATION
───────────────────────────────────────

SETUP:
1. Go to Settings → PSA API Configuration
2. Enter your PSA API key (from your PSA account)
3. Click "Test Connection" — verifies the key works
4. Green indicator = connected, Yellow = not configured

WHAT PSA API DOES:
• Auto-fetches submission status when you create a new submission
• Refresh single submissions or all at once
• Pulls: current step, progress percentage, grades ready status, shipped status, tracking
• Looks up individual card cert numbers for grade data
• Rate limited: 8-12 second delays between requests (PSA allows ~15 req/min)
• Retries with exponential backoff on rate limit errors (10s → 30s → 60s)

AUTO-REFRESH:
Configure in Settings → Auto-Refresh Settings:
• Enable/disable automatic refresh
• Schedule: daily, weekly, or biweekly
• Choose day of week and hour
• Set email for refresh notifications
• System auto-checks all active submissions on schedule

REFRESH ALL (manual):
• Click "Refresh All" on Submissions page
• Uses Server-Sent Events for real-time progress
• Shows which submissions changed and what changed
• Logs changes to psa_refresh_logs table
• Can export refresh log as CSV

───────────────────────────────────────
SETTINGS & CONFIGURATION
───────────────────────────────────────

COMPANY INFORMATION:
• Company name, email, phone, website
• Logo URL (shown in customer portal and emails)

BRANDING (customers see these colors in their portal):
• Primary Color — main accent color
• Background Color — page background
• Sidebar Color — sidebar background
These are set via color pickers in Settings.

SERVICE LEVEL PRICING:
• Set custom prices for each PSA service level
• Stored as JSON — allows flexible pricing tiers
• Used in invoice calculations

TAX SETTINGS:
• Tax Percentage — applied to invoices before splitting among customers

SUBSCRIPTION PLANS:
• Starter ($29/mo) — 100 submissions/month, basic features
• Professional ($79/mo) — unlimited submissions, all features, priority support, custom branding
• Enterprise (custom) — multi-location, API access, dedicated support
• Managed via Stripe: checkout, customer portal, webhooks
• View current plan in Settings → Subscription

DATABASE MIGRATIONS:
• Check migration status and run migrations from Settings
• Migrations add new columns/tables as features are added
• Safe to run multiple times (uses IF NOT EXISTS)

───────────────────────────────────────
IMPORT CSV
───────────────────────────────────────

The Import CSV page handles bulk data import:

1. Upload a PSA CSV file (max 5MB)
2. Click "Preview Data" — shows:
   • Total submissions found
   • Total cards found
   • Average cards per submission
   • Sample data table (first 10 submissions)
3. Optionally enter PSA submission number or link to a customer
4. Click "Import" — creates/updates submissions and cards
5. Results show: submissions created, updated, cards created, errors

CSV FORMAT:
• Required columns: Order #, Player, Grade
• Optional columns: Service Level, Cert #, Year, Brand, Card #, Variety/Pedigree, Qualifier
• First row = column headers
• Auto-detects problem orders and grades-ready status
• Smart duplicate handling (upserts by PSA submission number)

IMPORT & REFRESH:
Advanced option that imports CSV then auto-refreshes each submission from PSA API. Two-phase operation with real-time progress.

───────────────────────────────────────
DASHBOARD
───────────────────────────────────────

The Dashboard shows at-a-glance stats:
• Total Customers
• Total Submissions (active, grades ready, problem orders)
• Total Cards
• Recent submissions list
• Quick action buttons

───────────────────────────────────────
CARD SCANNING (SAM feature)
───────────────────────────────────────

Users can upload a card photo and SAM will analyze it:
• Gradability assessment (worth grading? yes/no)
• Estimated PSA grade (1-10)
• Centering analysis (left-right, top-bottom ratios)
• Corner condition check
• Edge quality assessment
• Surface condition check
• Service level recommendation

To scan: Click "Scan Card" button in SAM chat, or upload an image in the chat.

───────────────────────────────────────
HELP PAGE
───────────────────────────────────────

The Help page includes:
• 60-second quick start guide
• Step-by-step submission management
• PSA processing stages explained
• Customer portal setup guide
• Buyback offers workflow
• CSV import instructions
• FAQ and troubleshooting

═══════════════════════════════════════
PSA GRADING EXPERTISE
═══════════════════════════════════════

PSA GRADING SCALE:
• PSA 10 (GEM MINT) — Perfect. Sharp corners, 55/45 centering or better, no defects
• PSA 9 (MINT) — Near perfect. 60/40 centering, one corner can have slight wear
• PSA 8 (NM-MT) — Very nice. 65/35 centering, minor corner/edge wear on 2-3 corners
• PSA 7 (NM) — Noticeable flaws. 70/30 centering, minor corner wear
• PSA 6 (EX-MT) — Moderate wear. 75/25 centering, visible corner/edge wear
• PSA 5 (EX) — Average. Obvious wear but no creases
• PSA 4-1 — Increasing wear, creases, stains

WHAT GRADERS CHECK (in order of importance):
1. Centering — most critical for 9s and 10s. Measure border widths on all sides.
2. Corners — use magnifying glass. Any white showing = PSA 8 max.
3. Edges — check all four sides for chipping.
4. Surface — check under angled light for scratches, print defects.
5. Print Quality — lines, off-register, fish eyes reduce grade.

COMMON GRADE KILLERS: Off-center (even 1mm), corner dings, edge chipping, print defects, surface scratches, wax stains, album damage.

PSA SERVICE LEVELS:
• Bulk ($19-25, 65+ days) — cards worth $100-500 graded
• Value ($40-50, 45+ days) — cards worth $300-800
• Regular ($75-100, 30+ days) — cards worth $500-1500
• Express ($150-200, 15+ days) — cards worth $1000-3000
• Super Express ($300+, 5-10 days) — cards worth $3000-10000
• Walk-Through ($600+, 1-2 days) — cards worth $10,000+

ROI FORMULA: Graded value ÷ Grading fee = ROI multiple. 20x+ = great (use Bulk), 10-20x = good, 5-10x = moderate, under 5x = probably not worth it.

PROFIT FORMULA: Profit = Graded Value - (Raw Value + Grading Cost + Shipping)

DECLARED VALUE: Estimate of graded value (not raw). Used for PSA insurance. Use the Price Comp Lookup to check eBay sold listings and JustTCG market prices for PSA 9/10 comps. For TCG cards (Pokemon, Magic, etc.), JustTCG provides real-time pricing with trend data. Insurance included under $500, then $3-$25+ per card above that.

TIMING: Submit during player hype (championships, breakouts, season starts). Wait during off-season, injuries, market cooling. Add 30-day buffer to PSA turnaround estimates.

COMMON PROBLEMS: Minimum grade not met ($5 rejection fee), evidence of trimming ($10 fee, not graded), authentic only (ungradable damage), miscut/OC qualifier, lost in transit (file insurance claim), longer turnaround (set realistic expectations).

POP REPORTS: Low population (under 100) = rarer = more valuable. Low PSA 10 pop (under 50) = huge premium. Compare 10 vs 9 counts to estimate value jump.

CUSTOMER COMMUNICATION:
✅ "PSA grading is subjective — two graders might differ by one grade"
✅ "Turnaround times are estimates, not guarantees"
✅ "Centering is the #1 factor for PSA 10s"
❌ Never guarantee a specific grade
❌ Never promise exact return dates

COST OPTIMIZATION: Use Bulk for non-urgent cards, batch submissions to split shipping, pre-screen cards, set PSA 8 minimum, group customers into single submissions, use economy shipping for Bulk.

WHEN ANSWERING:
1. Be conversational and natural
2. Give specific step-by-step instructions for SlabDash features
3. Give specific numbers and examples for grading questions
4. Explain the "why" behind your advice
5. Reference the exact page, button, or setting they need
6. Ask clarifying questions if needed
7. Keep responses focused and practical
`;

// Enhanced AI response function with comprehensive PSA and SlabDash knowledge
function generateSAMResponse(userMessage, context) {
  const messageLower = userMessage.toLowerCase();
  const words = messageLower.split(' ');

  // ═══════════════════════════════════════
  // PSA GRADING EXPERTISE
  // ═══════════════════════════════════════

  // GRADING STANDARDS & SCALE
  if ((messageLower.includes('what is') || messageLower.includes('what does') || messageLower.includes('mean')) &&
      (messageLower.includes('psa 10') || messageLower.includes('psa 9') || messageLower.includes('gem mint') || messageLower.includes('mint'))) {
    return '💎 **PSA Grading Scale:**\n\n**PSA 10 (GEM MINT)** - Perfect card!\n• 55/45 centering or better\n• Sharp corners (no white)\n• Clean edges (no chipping)\n• Flawless surface\n\n**PSA 9 (MINT)** - Near perfect\n• 60/40 centering\n• 1 corner can have slight wear\n• Minor edge wear allowed\n• 1-2 minor surface issues ok\n\n**PSA 8 (NM-MT)** - Very nice\n• 65/35 centering\n• Light corner wear on 2-3 corners\n• Visible edge wear ok\n• Minor scratches acceptable\n\n**The jump from PSA 9 to PSA 10 is HUGE** - PSA 10s often worth 2-5x more than PSA 9s!';
  }

  if (messageLower.includes('centering') || messageLower.includes('off-center') || messageLower.includes('oc')) {
    return '📐 **Centering - THE Most Important Factor:**\n\n**How to check:**\n• Measure border width on all 4 sides\n• Calculate left-to-right ratio\n• Calculate top-to-bottom ratio\n\n**PSA Standards:**\n• PSA 10: 55/45 or better (both directions)\n• PSA 9: 60/40 or better\n• PSA 8: 65/35 or better\n• PSA 7: 70/30 or better\n\n**Pro tip:** Even 1mm off-center can drop a card from PSA 10 to PSA 9. Centering matters MOST for high grades!\n\n**Advice:** Use a ruler or centering app before submitting expensive cards!';
  }

  if ((messageLower.includes('corner') || messageLower.includes('edge')) &&
      (messageLower.includes('wear') || messageLower.includes('damage') || messageLower.includes('check'))) {
    return '🔍 **Checking Corners & Edges:**\n\n**Corners (use magnifying glass):**\n• PSA 10: All 4 corners sharp, no white showing\n• PSA 9: 1 corner can have tiny touch of wear\n• PSA 8: 2-3 corners can show minor wear\n• Any white visible = PSA 8 maximum\n\n**Edges:**\n• PSA 10: Clean, no chipping\n• PSA 9: Minor wear on 1 edge ok\n• PSA 8: Light chipping visible\n\n**Common issues:**\n• Corner dings from storage\n• Edge chipping on older cards\n• Diamond cuts (factory issue)\n\n💡 **Pro tip:** Inspect under good light at multiple angles!';
  }

  if (messageLower.includes('surface') || messageLower.includes('scratch') || messageLower.includes('print defect')) {
    return '✨ **Surface Condition:**\n\n**What graders look for:**\n• Scratches (from handling/storage)\n• Print lines (factory defect)\n• Print spots/fish eyes\n• Wax stains (from old packs)\n• Album indentations\n\n**PSA 10:**\n• Perfect gloss, no scratches\n• No print defects\n• Clean surface front & back\n\n**PSA 9:**\n• 1-2 very minor surface issues allowed\n• Light scratches ok if not obvious\n\n**PSA 8:**\n• Several minor scratches ok\n• Print defects acceptable\n\n💡 **Check under light at an angle** - scratches show up better!';
  }

  // SERVICE LEVELS
  if ((messageLower.includes('service level') || messageLower.includes('which service') || messageLower.includes('bulk') ||
       messageLower.includes('express') || messageLower.includes('regular')) &&
      (messageLower.includes('use') || messageLower.includes('choose') || messageLower.includes('best') || messageLower.includes('recommend'))) {
    return '⚡ **PSA Service Levels - Which To Use:**\n\n**BULK ($19-25, 65+ days)**\n✅ Cards worth $100-500 graded\n✅ Not time-sensitive\n✅ Budget-conscious\n\n**REGULAR ($75-100, 30+ days)**\n✅ Cards worth $500-1500 graded\n✅ Standard turnaround\n✅ Professional dealers\n\n**EXPRESS ($150-200, 15+ days)**\n✅ Cards worth $1000-3000\n✅ Hot market conditions\n✅ Time-sensitive\n\n**SUPER EXPRESS ($300+, 5-10 days)**\n✅ Cards worth $3000-10000\n✅ Emergency situations\n\n**ROI Formula:**\nGraded value ÷ Grading fee = ROI\n• 20x+ = Use Bulk\n• 10-20x = Use Regular\n• 5-10x = Use Express\n• Under 5x = Maybe don\'t grade\n\n💡 **Example:** $500 card, $25 bulk = 20x ROI ✅';
  }

  // DECLARED VALUE
  if (messageLower.includes('declared value') || messageLower.includes('declare') ||
      (messageLower.includes('value') && messageLower.includes('insurance'))) {
    return '💰 **Declared Value - Critical for Insurance:**\n\n**What is it?**\nYour estimate of the card\'s GRADED value (not raw value).\n\n**How to set it:**\n1. Check eBay sold listings (same card, PSA 9/10)\n2. Use conservative estimate\n3. Round to nearest $25-50\n\n**Insurance costs:**\n• $0-$499: Included\n• $500-$999: +$3 per card\n• $1,000-$1,999: +$5 per card\n• $2,000-$4,999: +$10 per card\n• $5,000+: +$15-25 per card\n\n**Common mistakes:**\n❌ Declaring too low (not enough coverage)\n❌ Declaring too high (paying extra unnecessarily)\n❌ Using raw value (should be GRADED value)\n\n✅ **Declare realistic PSA 9-10 value based on comps**';
  }

  // GRADING DECISION (should I grade this?)
  if ((messageLower.includes('should i grade') || messageLower.includes('worth grading') ||
       messageLower.includes('grade this')) && !messageLower.includes('submission')) {
    return '🤔 **Should You Grade This Card?**\n\n**Quick ROI check:**\n1. What\'s the card worth RAW? (eBay sold)\n2. What\'s it worth graded PSA 9? PSA 10?\n3. What\'s the grading cost? (Bulk $25, Regular $75, etc)\n4. Add shipping: ~$10 round trip\n\n**Formula:**\nProfit = (Graded Value) - (Raw + Grading + Shipping)\n\n**Example - GOOD:**\n• Raw: $50\n• PSA 9: $200\n• Cost: $25 bulk + $10 ship = $35\n• Profit: $200 - $50 - $35 = **$115** ✅\n\n**Example - BAD:**\n• Raw: $5\n• PSA 9: $25\n• Cost: $75 regular + $10 ship = $85\n• Profit: $25 - $5 - $85 = **-$65** ❌\n\n**Worth it if:**\n• Graded value is 10x+ grading cost\n• Card has good centering\n• Market is stable/rising\n\n💡 Want me to walk through a specific card?';
  }

  // PSA TURNAROUND TIME
  if (messageLower.includes('how long') || messageLower.includes('turnaround') ||
      (messageLower.includes('when') && (messageLower.includes('back') || messageLower.includes('return')))) {
    return '⏱️ **PSA Turnaround Times:**\n\n**Official estimates:**\n• Bulk: 65+ business days\n• Value: 45+ business days\n• Regular: 30+ business days\n• Express: 15+ business days\n• Super Express: 5-10 business days\n• Walk-Through: 1-2 business days\n\n**REALITY CHECK:**\n⚠️ These are MINIMUMS, not guarantees\n• Can take 2x longer during busy periods\n• Add shipping time both ways (+7-14 days)\n• Holidays add delays\n• Backlogs happen\n\n**Set customer expectations:**\n✅ "Estimated 65+ days, could be 90-120"\n❌ "It\'ll be back in exactly 65 days"\n\n💡 **Pro tip:** Add 30-day buffer when promising return dates!';
  }

  // PSA POPULATION & RARITY
  if (messageLower.includes('population') || messageLower.includes('pop report') ||
      messageLower.includes('how many') || messageLower.includes('rarity')) {
    return '📊 **PSA Population Reports:**\n\n**What it shows:**\n• Total cards PSA has graded\n• Breakdown by grade (10s, 9s, 8s, etc)\n• Indicates rarity/scarcity\n\n**How to interpret:**\n• **Low pop** (under 100 total) = Rarer = More valuable\n• **High PSA 10 pop** = Less rare = Lower premium\n• **Low PSA 10 pop** (under 50) = HUGE value if you get one\n\n**Example:**\n2023 Topps Chrome Acuña Jr:\n• Total: 2,847 graded\n• PSA 10: 421 (14.8%)\n• PSA 9: 1,204 (42.3%)\n\n**Analysis:**\n• Only 14.8% get PSA 10 (harder than average)\n• Customer\'s card likely PSA 9 (statistically)\n• PSA 10 commands big premium\n\n💡 **Use pop reports to set customer expectations!**';
  }

  // COMMON PROBLEMS
  if ((messageLower.includes('problem') || messageLower.includes('issue') || messageLower.includes('rejected') ||
       messageLower.includes('minimum grade')) && messageLower.includes('psa')) {
    return '⚠️ **Common PSA Grading Problems:**\n\n**"Minimum Grade Not Met"**\n• Card graded below your minimum\n• Can accept lower grade or reject\n• Rejected = $5 handling fee\n• **Avoid:** Set realistic minimums\n\n**"Evidence of Trimming"**\n• Card suspected of being cut\n• Will NOT be graded\n• Charged $10 fee\n• **Avoid:** Check card dimensions\n\n**"Authentic Only" (no grade)**\n• Card is real but ungradable\n• Major damage (creases, etc)\n• **Avoid:** Pre-screen for damage\n\n**"Miscut/OC"**\n• Severe centering issues\n• Gets qualifier (PSA 8 OC)\n• Reduces value significantly\n• **Avoid:** Check centering first\n\n💡 **Pre-screen cards to avoid these fees!**';
  }

  // GRADING TIPS
  if (messageLower.includes('tip') || messageLower.includes('advice') ||
      (messageLower.includes('how to get') && messageLower.includes('psa 10'))) {
    return '💎 **Pro Tips for High Grades:**\n\n**Before submitting:**\n1. **Check centering** - Use ruler/app (most important!)\n2. **Inspect corners** - Magnifying glass for all 4\n3. **Check edges** - Look for chipping/wear\n4. **Surface check** - Light at angle for scratches\n5. **Fresh from pack** - Best chance at PSA 10\n\n**Handling tips:**\n• Never touch surface (oils from fingers)\n• Use card savers, not toploaders\n• Handle by edges only\n• Store flat, not stacked\n• Keep away from heat/humidity\n\n**Submission tips:**\n• Use Bulk for non-urgent ($25 vs $75+)\n• Set realistic minimums (don\'t set PSA 9 on borderline cards)\n• Declare accurate values (protect investment)\n• Ship with tracking + signature\n• Group submissions to save shipping\n\n**Customer communication:**\n✅ "This looks like strong PSA 9, maybe 10"\n❌ "This is definitely a PSA 10"\n\nBe honest about expectations!';
  }

  // COST OPTIMIZATION
  if ((messageLower.includes('save money') || messageLower.includes('cheaper') || messageLower.includes('cost') ||
       messageLower.includes('optimize')) && !messageLower.includes('declared')) {
    return '💵 **Save Money on PSA Grading:**\n\n**Big savings:**\n1. **Use Bulk** ($25 vs $75+ for Regular)\n   • For cards worth $100-500 graded\n   • Not time-sensitive\n\n2. **Batch submissions** \n   • Split shipping across many cards\n   • One $20 ship for 50 cards vs 50 separate ships\n\n3. **Pre-screen cards**\n   • Don\'t grade obvious PSA 7s or lower\n   • Only submit PSA 8+ candidates\n   • Saves grading fees on low-grade cards\n\n4. **Set minimums**\n   • PSA 8 minimum = don\'t pay for PSA 6s\n   • But be realistic (don\'t set PSA 9 on borderline)\n\n5. **Group customers**\n   • Combine into single submission\n   • Save on shipping\n\n**When to spend more:**\n• Express for hot cards ($1000+ value)\n• Higher insurance for valuable cards\n• Signature shipping (always worth it)\n\n💡 **Bulk + batching = biggest savings!**';
  }

  // ═══════════════════════════════════════
  // SLABDASH FEATURES
  // ═══════════════════════════════════════

  // SUBMISSIONS - Creating and managing
  if ((messageLower.includes('add') || messageLower.includes('create') || messageLower.includes('new')) &&
      (messageLower.includes('submission') || messageLower.includes('order'))) {
    return '📦 **Creating a New Submission:**\n\n1. Click **"+ New Submission"** at the top of the Submissions page\n2. Enter the **PSA submission number** (or create an internal ID)\n3. Select **service level** (Bulk, Regular, Express, etc.)\n4. Add **customer** (optional - can add later)\n5. Set **date sent** if needed\n6. Click **Create**!\n\nYou can add cards individually or import them later from PSA CSV. Want to know more about any step?';
  }

  if (messageLower.includes('edit') && messageLower.includes('submission')) {
    return '✏️ **Editing Submissions:**\n\n1. Go to submission detail page\n2. Click **"Edit"** button\n3. Update PSA number, service level, or dates\n4. Click **"Save Changes"**\n\nYou can also edit service levels directly from the submissions list by clicking the dropdown!';
  }

  if (messageLower.includes('delete') && messageLower.includes('submission')) {
    return '🗑️ **Deleting Submissions:**\n\n**Single submission:** Click ⋮ menu → Delete\n**Multiple:** Select checkboxes → "Delete Selected"\n\n⚠️ This permanently removes the submission and all its cards. Customer data stays safe.';
  }

  if (messageLower.includes('track') || messageLower.includes('status') || messageLower.includes('progress')) {
    return '📊 **Tracking Submission Progress:**\n\nSlabDash shows real-time PSA status:\n\n• **Progress bar** - Visual % complete\n• **Current step** - Where PSA is processing\n• **Service level** - Expected timeline\n• **Auto-refresh** - Get latest from PSA\n\nClick any submission to see full details including card-by-card grades!';
  }

  // EMAIL - All email features
  if ((messageLower.includes('email') || messageLower.includes('send') || messageLower.includes('notify')) &&
      (messageLower.includes('update') || messageLower.includes('status'))) {
    return '📧 **Sending Status Update Emails:**\n\n**Single submission:**\n1. Go to Submissions page\n2. Click ⋮ menu on any submission\n3. Click **"Preview Email"** to test first\n4. Click **"Send Status Update"**\n\n**All customers:**\nClick **"Email All"** button in toolbar\n\n**From submission detail:**\nClick **"Send Update"** button\n\n💡 Always preview first! Emails include current status, progress %, and service level.';
  }

  if (messageLower.includes('introduction') || messageLower.includes('welcome')) {
    return '👋 **Introduction Emails:**\n\nSend new customers a welcome email with:\n• How to use SlabDash\n• Their portal link\n• List of their submissions\n• Mobile app instructions\n\n**To send:**\n1. Go to Customers page or customer detail\n2. Click **"Preview Email"** to test\n3. Click **"Send Introduction Email"**\n\nGreat for first-time customers!';
  }

  if (messageLower.includes('preview') || (messageLower.includes('test') && messageLower.includes('email'))) {
    return '👀 **Email Previews:**\n\nEVERY email feature has a preview option!\n\n1. Click **"Preview Email"** button\n2. Enter your test email address\n3. Click **"Send Test Email"**\n4. Check your inbox to see exactly what customers will receive\n\nPreviews have [TEST PREVIEW] in the subject line. Always test before sending to customers!';
  }

  // CUSTOMERS - Customer management
  if ((messageLower.includes('add') || messageLower.includes('create')) && messageLower.includes('customer')) {
    return '👥 **Adding Customers:**\n\n**Method 1 - Customers page:**\n1. Click **"+ Add Customer"**\n2. Fill in name, email, phone\n3. Click **Save**\n\n**Method 2 - During submission:**\nAdd customer while creating submission\n\n**Method 3 - Bulk import:**\nUse CSV import for multiple customers\n\n💡 Customers can be linked to multiple submissions!';
  }

  if (messageLower.includes('portal') || (messageLower.includes('customer') && messageLower.includes('track'))) {
    return '🔗 **Customer Portal:**\n\nLet customers track their own cards!\n\n**Setup:**\n1. Go to customer detail page\n2. Click **"Send Introduction Email"** (includes portal link)\n   OR\n3. Click **"Generate Portal Link"** (copy/paste yourself)\n\n**What customers see:**\n• All their submissions\n• Card details and grades\n• Real-time status updates\n• Can add to phone home screen!\n\nPortal links work for 1 year. Customers don\'t need to log in!';
  }

  if (messageLower.includes('assign') && (messageLower.includes('customer') || messageLower.includes('submission'))) {
    return '🔗 **Assigning Customers to Submissions:**\n\n**Single customer:**\n1. Go to submission detail\n2. Click **"Assign Customers"**\n3. Select customer from list\n\n**Multiple customers:**\n1. Go to Customers page\n2. Select customers (checkboxes)\n3. Click **"Add to Submission"**\n4. **Search** for submission by number\n5. Click **Add**\n\nGreat for group orders where multiple people share one submission!';
  }

  // CARDS - Card management
  if (messageLower.includes('import') && (messageLower.includes('card') || messageLower.includes('csv') || messageLower.includes('psa'))) {
    return '📥 **Importing Cards from PSA:**\n\n1. **Download CSV** from PSA website\n2. Go to **submission detail** page\n3. Click **"Import PSA CSV"** button\n4. Upload the file\n5. **Auto-matching happens!**\n   • Updates existing cards\n   • Adds new cards\n   • Pulls grades, cert numbers, status\n\n**CSV Import** (toolbar button):\n• Import to existing or new submission\n• Auto-refresh after import\n• Great for bulk updates!\n\nNo duplicate cards created - smart matching by cert number!';
  }

  if ((messageLower.includes('add') || messageLower.includes('create')) && messageLower.includes('card')) {
    return '🃏 **Adding Individual Cards:**\n\n1. Go to submission detail page\n2. Click **"+ Add Card"** button\n3. Fill in:\n   • Card description (player, year, set)\n   • Declared value\n   • Sport/category\n   • Customer (optional)\n4. Click **Save**\n\n**Tips:**\n• Import CSV for bulk adds\n• Assign customers to cards for tracking\n• Update cards when PSA grades them';
  }

  if (messageLower.includes('grade') || messageLower.includes('cert')) {
    return '💎 **Card Grades & Cert Numbers:**\n\nPSA grades appear after importing CSV:\n\n• **Grade** - 1-10 rating (10 is perfect!)\n• **Cert number** - Unique PSA identifier\n• **Card images** - Upload front/back photos\n\n**Auto-populate:**\nImport PSA CSV to automatically fill grades and cert numbers for all cards in a submission!';
  }

  // PSA INTEGRATION
  if (messageLower.includes('psa') && (messageLower.includes('api') || messageLower.includes('key') || messageLower.includes('connect'))) {
    return '🔑 **PSA API Integration:**\n\n**Setup:**\n1. Go to **Settings → Company Settings**\n2. Enter your **PSA API key**\n3. Click **Save**\n\n**Benefits:**\n• Auto-refresh submission status\n• Pull grades and cert numbers\n• Track progress through PSA steps\n• Save time vs manual updates\n\n**Get API key:** Contact PSA or check your PSA account settings.';
  }

  if (messageLower.includes('refresh') && (messageLower.includes('psa') || messageLower.includes('submission'))) {
    return '🔄 **Refreshing from PSA:**\n\n**Single submission:**\n1. Click ⋮ menu → **"Refresh from PSA"**\n2. Waits 8-12 seconds (avoid rate limits)\n3. Updates status, progress, grades\n\n**All submissions:**\nClick **"Refresh All"** button\n• Updates active submissions\n• Skips completed ones\n• PSA limits: 100 calls/day\n\n⚠️ Need PSA API key first! (Settings → Company)';
  }

  // SERVICE LEVELS
  if (messageLower.includes('service') && messageLower.includes('level')) {
    return '⚡ **PSA Service Levels:**\n\n**Economy Tiers:**\n• **Bulk** - $19-25, 65+ days\n• **Value** - ~$40, 45+ days\n\n**Standard Tiers:**\n• **Regular** - ~$75, 30+ days\n• **Express** - ~$150, 15+ days\n\n**Premium Tiers:**\n• **Super Express** - ~$300, 5+ days\n• **Walk-Through** - ~$600, 1-2 days\n\n**In SlabDash:**\n• Set during submission creation\n• Edit anytime from submissions list\n• Track different timelines\n• Filter by service level\n\nPrices and times vary - check PSA website for current rates!';
  }

  // SETTINGS
  if (messageLower.includes('setting') || messageLower.includes('config')) {
    return '⚙️ **Settings & Configuration:**\n\n**Company Settings:**\n• PSA API key\n• Company name\n• Logo upload\n\n**Email Settings:**\n• Enable/disable notifications\n• Custom SMTP (or use default)\n• Test email configuration\n• Email templates\n\n**Subscription:**\n• View current plan\n• Upgrade/downgrade\n• Billing history\n\nAccess: Click your profile → **Settings**';
  }

  // GENERAL HELP
  if (messageLower.includes('help') || messageLower.includes('what can') || messageLower.includes('how to use')) {
    return '👋 **Hey! I\'m SAM (Submission Assistant Manager), your SlabDash guide!**\n\nI can help you with:\n\n📦 **Submissions**\n• Creating & editing\n• Tracking status\n• Importing PSA data\n\n📧 **Emails**\n• Status updates\n• Welcome emails\n• Previewing before sending\n\n👥 **Customers**\n• Adding & managing\n• Portal access\n• Bulk assignments\n\n🃏 **Cards**\n• Adding individually\n• Importing from CSV\n• Grades & cert numbers\n\n⚙️ **Settings**\n• PSA API integration\n• Email configuration\n• Subscriptions\n\nJust ask me anything! Like "How do I import cards?" or "How do I send emails?"';
  }

  // PRICING
  if (messageLower.includes('price') || messageLower.includes('cost') || messageLower.includes('plan') || messageLower.includes('subscription')) {
    return '💰 **SlabDash Pricing & Plans:**\n\n**Starter** - $29/mo\n• 100 submissions/month\n• Basic features\n• Email support\n\n**Professional** - $79/mo\n• Unlimited submissions\n• All features\n• Priority support\n• Custom branding\n\n**Enterprise** - Custom\n• Multi-location\n• API access\n• Dedicated support\n\n**View plans:** Settings → Subscription\n\n💡 All plans include customer portal, email notifications, and PSA integration!';
  }

  // SPECIFIC FEATURES
  if (messageLower.includes('invoice') || messageLower.includes('billing')) {
    return '💵 **Invoices & Billing:**\n\n• Create invoices for customers\n• Track payments\n• Download PDF invoices\n• Email directly to customers\n\n**Access:** Submission detail → **Invoices** tab\n\nGreat for charging customers for grading services!';
  }

  if (messageLower.includes('search') || messageLower.includes('find')) {
    return '🔍 **Search & Filtering:**\n\n**Submissions:**\n• Search by PSA number or customer\n• Filter by status (active/shipped/problems)\n• Filter by service level\n• Sort by date/number\n\n**Customers:**\n• Search by name, email, phone\n• Filter by submissions\n\n**Cards:**\n• Search by description\n• Filter by sport/category\n• Filter by grade\n\nUse the search bar at the top of each page!';
  }

  if (messageLower.includes('mobile') || messageLower.includes('phone') || messageLower.includes('app')) {
    return '📱 **Mobile App (PWA):**\n\nSlabDash works on phones!\n\n**For you:**\n• Open SlabDash in mobile browser\n• Works like a native app\n• Fast and responsive\n\n**For customers:**\n• Send them portal link\n• They can **"Add to Home Screen"**\n• Portal becomes an app icon!\n• Check submissions anytime\n\n**iOS:** Share → Add to Home Screen\n**Android:** Menu → Add to Home Screen\n\nNo app store needed!';
  }

  // TROUBLESHOOTING
  if (messageLower.includes('not working') || messageLower.includes('broken') || messageLower.includes('error')) {
    return '🔧 **Troubleshooting:**\n\n**Common fixes:**\n1. **Refresh page** (Ctrl+F5 or Cmd+Shift+R)\n2. **Clear browser cache**\n3. **Check PSA API key** (if using PSA features)\n4. **Verify email settings** (if emails not sending)\n\n**Still stuck?**\n• Check Help page for guides\n• Contact support\n• Check status page for outages\n\nTell me what\'s not working and I\'ll help troubleshoot!';
  }

  // FRIENDLY GREETINGS
  if (messageLower.includes('hi') || messageLower.includes('hello') || messageLower.includes('hey') ||
      messageLower.includes('thanks') || messageLower.includes('thank you')) {
    return '👋 Hey there! Happy to help! What would you like to know about SlabDash? I can explain any feature or walk you through tasks step-by-step! 😊';
  }

  // CATCH-ALL - More helpful than before
  return '🤔 **Great question!** I can help you with:\n\n• **Submissions** - Create, edit, track, refresh\n• **Emails** - Send updates, previews, welcome emails\n• **Customers** - Add, manage, portal access\n• **Cards** - Import CSV, add cards, grades\n• **PSA Integration** - API setup, auto-refresh\n• **Settings** - Email config, subscriptions\n\n**Try asking:**\n• "How do I add a submission?"\n• "How do I send email updates?"\n• "How do customers track their cards?"\n• "How do I import cards from PSA?"\n• "How do I set up PSA API?"\n\nWhat specific task do you need help with? 😊';
}

/**
 * Detect if a chat message is asking about card pricing/value
 * and extract card details for lookup
 */
function detectPricingQuery(message) {
  const lower = message.toLowerCase();

  // Check if the message is about pricing/value
  const pricingKeywords = ['price', 'value', 'worth', 'cost', 'comp', 'market', 'how much', 'what is', 'what\'s', 'selling for', 'going for', 'what do', 'what does'];
  const hasPricingIntent = pricingKeywords.some(kw => lower.includes(kw));
  if (!hasPricingIntent) return null;

  // Try to detect game type
  let game = '';
  let sport = '';
  if (lower.includes('pokemon') || lower.includes('pokémon')) game = 'pokemon';
  else if (lower.includes('magic') || lower.includes('mtg')) game = 'mtg';
  else if (lower.includes('yu-gi-oh') || lower.includes('yugioh')) game = 'yugioh';
  else if (lower.includes('lorcana')) game = 'disney-lorcana';
  else if (lower.includes('one piece')) game = 'one-piece-card-game';
  else if (lower.includes('digimon')) game = 'digimon-card-game';
  else if (lower.includes('baseball')) sport = 'baseball';
  else if (lower.includes('basketball')) sport = 'basketball';
  else if (lower.includes('football')) sport = 'football';

  // Extract card name — remove pricing keywords and game names to get the card description
  let cardQuery = message;
  const removePatterns = [
    /how much is/i, /what is/i, /what's/i, /what are/i, /what do/i,
    /worth\??/i, /value of/i, /price of/i, /price for/i, /price check/i,
    /comp for/i, /comps for/i, /market value/i, /selling for/i, /going for/i,
    /can you (look up|check|find|get)/i, /look up/i,
    /pokemon|pokémon|magic|mtg|yu-gi-oh|yugioh|lorcana|digimon|one piece/gi,
    /baseball|basketball|football|hockey|soccer/gi,
    /psa\s*\d+/gi, /a\s+/i, /the\s+/i, /\?/g
  ];
  for (const pattern of removePatterns) {
    cardQuery = cardQuery.replace(pattern, ' ');
  }
  cardQuery = cardQuery.replace(/\s+/g, ' ').trim();

  if (cardQuery.length < 2) return null;

  return {
    query: cardQuery,
    game,
    sport,
    brand: game || sport
  };
}

/**
 * Fetch comps for a chat pricing query
 */
async function fetchCompsForChat(parsedQuery) {
  const cardForLookup = {
    player_name: parsedQuery.query,
    description: parsedQuery.query,
    brand: parsedQuery.brand,
    sport: parsedQuery.sport
  };

  try {
    const compPromises = [fetchJustTCGComps(cardForLookup)];
    if (process.env.EBAY_APP_ID) {
      compPromises.push(fetchEbayComps(cardForLookup));
    }

    const results = await Promise.all(compPromises);
    const available = results.filter(r => r.available && r.count > 0);

    if (available.length === 0) return null;

    // Build a pricing context string for SAM
    const lines = ['LIVE PRICING DATA (include this in your response):'];
    for (const comp of available) {
      const src = comp.source === 'justtcg' ? 'JustTCG' : comp.source === 'ebay' ? 'eBay' : comp.source;
      lines.push(`${src}: ${comp.count} listings — Avg $${comp.stats.average.toFixed(2)}, Median $${comp.stats.median.toFixed(2)} (Range: $${comp.stats.min.toFixed(2)}–$${comp.stats.max.toFixed(2)})`);

      // Include top listings for context
      if (comp.listings?.length > 0) {
        const topListings = comp.listings.slice(0, 3);
        for (const listing of topListings) {
          let detail = `  - ${listing.title}: $${listing.price.toFixed(2)}`;
          if (listing.condition) detail += ` (${listing.condition})`;
          if (listing.printing) detail += ` [${listing.printing}]`;
          if (listing.priceChange7d) {
            detail += ` | 7d: ${listing.priceChange7d > 0 ? '+' : ''}$${listing.priceChange7d.toFixed(2)}`;
          }
          lines.push(detail);
        }
      }
    }

    // Calculate overall estimate
    const medians = available.filter(s => s.stats?.median).map(s => s.stats.median);
    if (medians.length > 0) {
      const estimate = Math.round((medians.reduce((a, b) => a + b, 0) / medians.length) * 100) / 100;
      lines.push(`Overall estimated value: $${estimate.toFixed(2)}`);
    }

    return lines.join('\n');
  } catch (error) {
    console.error('Error fetching comps for chat:', error.message);
    return null;
  }
}

/**
 * Generate AI-powered response using Anthropic Claude
 * Falls back to rule-based responses if API key not configured
 */
async function generateAIResponse(message, history) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // If no API key, use rule-based responses
  if (!apiKey) {
    console.log('⚠️ Using rule-based SAM (no Anthropic API key configured)');
    return generateSAMResponse(message, history);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    // Convert history to Anthropic format
    const conversationHistory = (history || [])
      .filter(msg => msg.role && msg.content)
      .slice(-10) // Keep last 10 messages for context
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

    console.log(`🤖 Calling Claude AI for SAM response...`);

    // Call Anthropic API with enhanced conversational settings
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048, // Increased for more detailed responses
      temperature: 0.8, // Add some creativity while staying accurate
      system: SLABDASH_KNOWLEDGE,
      messages: [
        ...conversationHistory,
        {
          role: 'user',
          content: message
        }
      ]
    });

    // Extract text from response
    const aiMessage = response.content[0].text;

    console.log(`✅ SAM AI response generated (${response.usage.input_tokens} in, ${response.usage.output_tokens} out)`);

    return aiMessage;

  } catch (error) {
    console.error('❌ Anthropic API error:', error.message);
    console.error('❌ Full error details:', JSON.stringify({ status: error.status, type: error.type, code: error.code }, null, 2));

    // Throw so the caller can include error info in response
    throw error;
  }
}

// Chat endpoint
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`\n🔵 SAM Chat Request: "${message.substring(0, 50)}..."`);
    console.log(`📊 API Key Status: ${process.env.ANTHROPIC_API_KEY ? '✅ SET' : '❌ NOT SET'}`);

    // Check if this is a pricing question and fetch comps in parallel
    let pricingContext = null;
    const pricingQuery = detectPricingQuery(message);
    if (pricingQuery) {
      console.log(`💰 Detected pricing query for: "${pricingQuery.query}" (game: ${pricingQuery.game || 'none'}, sport: ${pricingQuery.sport || 'none'})`);
      pricingContext = await fetchCompsForChat(pricingQuery);
      if (pricingContext) {
        console.log(`📊 Got live pricing data to inject into SAM context`);
      }
    }

    // Generate AI-powered response (with fallback to rule-based)
    let responseMessage;
    let mode;
    let aiError = null;

    try {
      // If we have pricing data, inject it into the message so SAM can reference it
      const enrichedMessage = pricingContext
        ? `${message}\n\n[SYSTEM: ${pricingContext}]`
        : message;
      responseMessage = await generateAIResponse(enrichedMessage, history);
      mode = 'AI (Claude)';
    } catch (error) {
      aiError = error.message;
      console.log('⚠️ Falling back to rule-based SAM due to API error');
      responseMessage = generateSAMResponse(message, history);
      mode = 'Rule-based fallback';
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      mode = 'Rule-based (no API key)';
    }

    console.log(`📤 Response Mode: ${mode}`);
    console.log(`📝 Response Preview: "${responseMessage.substring(0, 100)}..."\n`);

    res.json({
      message: responseMessage,
      timestamp: new Date().toISOString(),
      ai_powered: mode === 'AI (Claude)',
      mode: mode,
      ...(aiError && { ai_error: aiError })
    });

  } catch (error) {
    console.error('❌ SAM chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// Card scanning endpoint - analyze card image for gradability
router.post('/scan', authenticate, upload.single('image'), async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: 'Card scanning requires Anthropic API key',
        message: '📷 Card scanning is temporarily unavailable. Please ask me questions about grading instead!'
      });
    }

    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imageFile = req.file;
    const imageBase64 = imageFile.buffer.toString('base64');
    const mediaType = imageFile.mimetype || 'image/jpeg';

    const anthropic = new Anthropic({ apiKey });

    // Analyze card image with Claude's vision capabilities
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `You are SAM, a card identification expert. Your job is to ACCURATELY identify this card so we can pull the exact market price. Be honest and straightforward — never hype up a card.

STEP 1 — IDENTIFY THE CARD (critical):
Read every visible detail on the card:
• **Card Name** — the exact name printed on the card
• **Year** — printed year or copyright year
• **Set** — the exact set name (e.g., "Crown Zenith", "Evolving Skies", "Modern Horizons 3"). Read the set logo/text carefully.
• **Card Number** — the number printed on the card (e.g., "037/159", "SV049", "#25"). Include the full number with denominator if visible.
• **Game** — Pokemon, Magic: The Gathering, Yu-Gi-Oh, etc.
• **Sport** — Baseball, Basketball, Football, Hockey, etc.
• **Attributes** — holo, reverse holo, full art, alt art, foil, refractor, RC, 1st edition, numbered (/25, /99), autograph, etc.
• **Rarity** — look at rarity symbols on the card

Be exact. Read text as printed. If you can't read something, say so — don't guess.

STEP 2 — HONEST ASSESSMENT (2-3 lines max):
• Quick centering + any visible flaws
• Estimated PSA grade (single number)
• Be REALISTIC about grading: if the card is worth less than $10-15 raw, grading costs $20+ and makes zero financial sense. Say that directly. Don't tell someone to grade a $1 card. Only recommend grading if the graded value would significantly exceed the cost.

FORMAT:
**Card:** [Name] — [Year] [Set] #[Number]
[Game/Sport] | [Attributes] | [Rarity]

**Condition:** [1-2 sentences. Estimated PSA grade. Honest grading recommendation based on card value — if it's a common card worth a few bucks, say "not worth the grading fee."]

AT THE VERY END, output this hidden JSON on its own line (will be stripped from display):
<!--CARD_ID:{"name":"Card Name","set":"Set Name","number":"037/159","year":"2023","game":"pokemon","sport":"","rarity":"Ultra Rare","attributes":"full art, holo"}-->
For "game": pokemon, mtg, yugioh, disney-lorcana, one-piece-card-game, digimon-card-game, flesh-and-blood-tcg, dragon-ball-super-fusion-world, or "" for sports.
For "sport": baseball, basketball, football, hockey, soccer, or "" for TCG.
Include the FULL card number with denominator (e.g. "037/159" not just "37"). Only include fields you can read.`
            }
          ]
        }
      ]
    });

    const rawAnalysis = response.content[0].text;
    console.log('📝 Raw scan response length:', rawAnalysis.length);

    // Extract the hidden card ID JSON from the analysis
    let cardInfo = null;
    let analysis = rawAnalysis;

    // Try multiple patterns for CARD_ID extraction (model might format differently)
    const cardIdPatterns = [
      /<!--CARD_ID:(.*?)-->/s,
      /<!--CARD_ID:\s*(.*?)\s*-->/s,
      /\[CARD_ID:(.*?)\]/s,
      /```json\s*\{[^}]*"name"[^}]*\}\s*```/s,
    ];

    for (const pattern of cardIdPatterns) {
      const match = rawAnalysis.match(pattern);
      if (match) {
        try {
          let jsonStr = match[1] || match[0];
          // Clean up if it's wrapped in code blocks
          jsonStr = jsonStr.replace(/```json\s*/, '').replace(/\s*```/, '').trim();
          cardInfo = JSON.parse(jsonStr);
          analysis = rawAnalysis.replace(match[0], '').trim();
          console.log('✅ Parsed CARD_ID from scan:', JSON.stringify(cardInfo));
          break;
        } catch (e) {
          console.log('⚠️ Failed to parse card ID pattern:', e.message, 'match:', match[0]?.substring(0, 100));
        }
      }
    }

    // FALLBACK: If CARD_ID tag wasn't found, try to extract card info from the analysis text
    if (!cardInfo) {
      console.log('⚠️ No CARD_ID tag found — extracting card info from text...');
      cardInfo = {};

      // Try to extract card name from "Card Identified:" section
      const identMatch = analysis.match(/Card Identified[:\s]*\n?\*?\*?([^\n*—]+)/i);
      if (identMatch) {
        cardInfo.name = identMatch[1].replace(/^[\s\*]+|[\s\*]+$/g, '').trim();
      }

      // Try to detect game type from text
      const lowerAnalysis = analysis.toLowerCase();
      if (lowerAnalysis.includes('pokémon') || lowerAnalysis.includes('pokemon')) cardInfo.game = 'pokemon';
      else if (lowerAnalysis.includes('magic: the gathering') || lowerAnalysis.includes('magic the gathering') || lowerAnalysis.includes('mtg')) cardInfo.game = 'mtg';
      else if (lowerAnalysis.includes('yu-gi-oh') || lowerAnalysis.includes('yugioh')) cardInfo.game = 'yugioh';
      else if (lowerAnalysis.includes('lorcana')) cardInfo.game = 'disney-lorcana';
      else if (lowerAnalysis.includes('digimon')) cardInfo.game = 'digimon-card-game';
      else if (lowerAnalysis.includes('one piece')) cardInfo.game = 'one-piece-card-game';

      // Try to extract set name
      const setMatch = analysis.match(/(?:set|expansion|series)[:\s]+([^\n,()]+)/i);
      if (setMatch) cardInfo.set = setMatch[1].trim();

      // Try to extract card number
      const numMatch = analysis.match(/#(\d+(?:\/\d+)?)/);
      if (numMatch) cardInfo.number = numMatch[1];

      // Try to extract year
      const yearMatch = analysis.match(/\b(19\d{2}|20[0-2]\d)\b/);
      if (yearMatch) cardInfo.year = yearMatch[1];

      if (cardInfo.name || cardInfo.game) {
        console.log('📋 Fallback card info extracted:', JSON.stringify(cardInfo));
      } else {
        console.log('❌ Could not extract any card info from analysis text');
        cardInfo = null;
      }
    }

    // Try to extract structured data from the analysis
    const gradable = analysis.toLowerCase().includes('worth grading') && !analysis.toLowerCase().includes('not worth grading');

    // Try to extract estimated grade
    let estimatedGrade = null;
    const gradeMatch = analysis.match(/PSA\s*(\d+)/i);
    if (gradeMatch) {
      estimatedGrade = `PSA ${gradeMatch[1]}`;
    }

    // Determine condition summary
    let condition = 'Unknown';
    if (analysis.toLowerCase().includes('gem mint') || analysis.toLowerCase().includes('psa 10')) {
      condition = 'Gem Mint (PSA 10 candidate)';
    } else if (analysis.toLowerCase().includes('mint') || analysis.toLowerCase().includes('psa 9')) {
      condition = 'Mint (PSA 9 likely)';
    } else if (analysis.toLowerCase().includes('near mint') || analysis.toLowerCase().includes('psa 8')) {
      condition = 'Near Mint (PSA 8 likely)';
    } else if (analysis.toLowerCase().includes('psa 7')) {
      condition = 'Near Mint (PSA 7 likely)';
    }

    // Fetch price comps if we identified the card
    let pricing = null;
    if (cardInfo && (cardInfo.name || cardInfo.set || cardInfo.game)) {
      console.log(`📊 Fetching comps for scanned card:`, JSON.stringify(cardInfo));
      try {
        const cardForLookup = {
          player_name: cardInfo.name || '',
          set_name: cardInfo.set || '',
          card_number: cardInfo.number || '',
          year: cardInfo.year || '',
          brand: cardInfo.game || cardInfo.sport || '',
          game: cardInfo.game || '',
          description: `${cardInfo.name || ''} ${cardInfo.set || ''}`.trim(),
          sport: cardInfo.sport || ''
        };

        // Fetch from available sources in parallel
        const compPromises = [fetchJustTCGComps(cardForLookup)];
        if (process.env.EBAY_APP_ID) {
          compPromises.push(fetchEbayComps(cardForLookup));
        }

        const compResults = await Promise.all(compPromises);

        // Log ALL results for debugging
        for (const r of compResults) {
          console.log(`📊 ${r.source}: available=${r.available}, count=${r.count || 0}, error=${r.error || 'none'}`);
        }

        const availableComps = compResults.filter(c => c.available && c.count > 0);

        if (availableComps.length > 0) {
          pricing = {
            sources: compResults.reduce((acc, c) => { acc[c.source] = c; return acc; }, {}),
            totalListings: compResults.reduce((sum, c) => sum + (c.count || 0), 0),
            priceEstimate: null
          };

          const medians = availableComps.filter(s => s.stats?.median).map(s => s.stats.median);
          if (medians.length > 0) {
            pricing.priceEstimate = Math.round((medians.reduce((a, b) => a + b, 0) / medians.length) * 100) / 100;
          }

          console.log(`💰 Found ${pricing.totalListings} comp listings, estimate: $${pricing.priceEstimate || 'N/A'}`);
        } else {
          console.log('⚠️ No comp sources returned results');
          // Still include sources info so frontend can show what was tried
          pricing = {
            sources: compResults.reduce((acc, c) => { acc[c.source] = c; return acc; }, {}),
            totalListings: 0,
            priceEstimate: null,
            noResults: true
          };
        }
      } catch (compError) {
        console.error('❌ Error fetching comps for scanned card:', compError.message);
        pricing = { error: compError.message, totalListings: 0, priceEstimate: null };
      }
    } else {
      console.log('⚠️ No card info available for comp lookup');
    }

    res.json({
      message: analysis,
      analysis: analysis,
      gradable: gradable,
      estimatedGrade: estimatedGrade,
      condition: condition,
      cardInfo: cardInfo,
      pricing: pricing,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('SAM scan error:', error);
    res.status(500).json({
      error: 'Failed to analyze card image',
      message: '😅 Hmm, I\'m having trouble analyzing that image. Make sure it\'s a clear photo of the card! Try again?',
      details: error.message
    });
  }
});

// Get SAM tips (random helpful tips for dashboard)
router.get('/tips', authenticate, async (req, res) => {
  const tips = [
    // SlabDash features
    '💡 Tip: You can preview emails before sending them to customers!',
    '⚡ Tip: Use "Refresh All" to update all active submissions from PSA at once!',
    '📱 Tip: Customers can add their tracking portal to their phone home screen!',
    '🎯 Tip: Bulk import cards from PSA CSV files to save time!',
    '📧 Tip: Send introduction emails to new customers so they know how to track their cards!',
    '👥 Tip: You can assign multiple customers to a single submission!',
    '🌟 Tip: Use the customer portal link to let customers check their own status!',

    // PSA grading expertise
    '💎 Tip: Centering is THE most important factor for PSA 10s - check it first!',
    '📐 Tip: 55/45 centering or better is required for PSA 10 - use a ruler to check!',
    '🔍 Tip: Inspect corners with a magnifying glass - tiny white spots kill PSA 10s!',
    '✨ Tip: Check surface for scratches under angled light before submitting!',
    '💰 Tip: Use Bulk service ($25) for cards worth $100-500 graded - saves money!',
    '⚡ Tip: Use Express ($150+) only for cards worth $1000+ graded - ROI matters!',
    '📊 Tip: Check PSA population reports to see how rare PSA 10s are for that card!',
    '🎯 Tip: Fresh-from-pack cards have the best chance at PSA 10!',
    '⏱️ Tip: Add 30-day buffer to PSA turnaround estimates when setting expectations!',
    '💵 Tip: Batch submissions together to split shipping costs across many cards!',
    '⚠️ Tip: Set realistic grade minimums - PSA 8 minimum is better than PSA 9 on borderline cards!',
    '🔒 Tip: Always use tracking + signature when shipping to PSA - protect your investment!',
    '📦 Tip: Use card savers (not toploaders) when shipping to PSA - they prefer them!',
    '💡 Tip: Declared value should be GRADED value (PSA 9/10), not raw card value!',
    '🚀 Tip: Hot market? Submit cards immediately before prices cool down!',
    '❄️ Tip: Off-season is great for Bulk submissions - less urgency, lower cost!',
    '🎓 Tip: PSA 10 is worth 2-5x more than PSA 9 - centering makes the difference!',
    '📈 Tip: If only 10-15% of cards get PSA 10, expect PSA 9 for most cards!',
  ];

  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  res.json({ tip: randomTip });
});

module.exports = router;
