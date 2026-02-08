# SlabDash Setup Instructions

## 🚨 CRITICAL: Fix Customer Portal Loading

Your customer portals are failing because the database is missing required columns. Follow these steps:

### Option 1: Run Migration Script (Recommended)

```bash
cd backend
node run-portal-migration.js
```

This will add all required portal enhancement columns to your database.

### Option 2: Run on Railway

If you're hosting on Railway, you can run the migration there:

```bash
railway run node backend/run-portal-migration.js
```

### What This Fixes

The migration adds these critical columns:
- `submissions.admin_notes` - Admin notes for submissions
- `submissions.prep_notes` - Prep notes for submissions
- `cards.before_photos` - Before photos array
- `cards.admin_notes` - Admin notes for individual cards
- `cards.prep_notes` - Prep notes for cards
- `cards.price_estimate` - Price estimate tracking
- `cards.comp_lookups` - Comp lookup history
- `companies.auto_refresh_*` - Auto-refresh scheduling

Without these columns, the portal throws: `"column s.admin_notes does not exist"`

---

## 🤖 Setup SAM AI Assistant

SAM can use Anthropic's Claude AI for intelligent responses. Here's how to enable it:

### Step 1: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/settings/keys
2. Sign up or log in to your Anthropic account
3. Click **"Create Key"**
4. Copy your API key (starts with `sk-ant-api03-...`)

### Step 2: Add API Key to Environment

Open `backend/.env` and add your key:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

### Step 3: Restart Backend

```bash
cd backend
npm start
```

### How SAM Works

- **With API Key**: SAM uses Claude AI for intelligent, context-aware responses
- **Without API Key**: SAM falls back to rule-based responses (still works!)
- **Security**: SAM is locked down to ONLY answer SlabDash and card grading questions

### Testing SAM

1. Log in to SlabDash admin
2. Click the SAM robot icon (🤖) in bottom-right
3. Ask questions like:
   - "How do I add a new submission?"
   - "What does PSA service level mean?"
   - "How do I send portal links to customers?"

SAM will refuse to answer off-topic questions:
- ❌ "Write me a poem"
- ❌ "Help me with my homework"
- ❌ "What's the weather?"
- ✅ "How do I track PSA submissions?"

---

## 📊 Verify Everything Works

### Check Portal Status

```bash
cd backend
node -e "require('dotenv').config(); const db = require('./src/db'); db.query(\`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'admin_notes')\`).then(r => console.log('Portal ready:', r.rows[0].exists)).catch(e => console.error(e)).finally(() => process.exit())"
```

### Check SAM AI Status

```bash
cd backend
node -e "require('dotenv').config(); console.log('SAM AI Enabled:', !!process.env.ANTHROPIC_API_KEY)"
```

---

## 🎯 Quick Start Checklist

- [ ] Run portal migration: `node backend/run-portal-migration.js`
- [ ] Add Anthropic API key to `backend/.env`
- [ ] Restart backend server
- [ ] Test customer portal access
- [ ] Test SAM assistant chat

---

## 🆘 Troubleshooting

### "column s.admin_notes does not exist"
→ Run the portal migration script (see above)

### "SAM responses are generic"
→ Check that `ANTHROPIC_API_KEY` is set in `.env`

### "Migration script won't connect to database"
→ Make sure `DATABASE_URL` in `.env` is correct
→ If on Railway, run: `railway run node backend/run-portal-migration.js`

### "Portal still not loading"
→ Check backend logs for specific error
→ Verify migration ran successfully
→ Try restarting backend server

---

## 📝 Notes

- **Migration is safe**: Uses `ADD COLUMN IF NOT EXISTS` - won't break existing data
- **API key is optional**: SAM works without it, just less intelligent
- **Security**: SAM has strict guardrails - only answers SlabDash questions
- **Cost**: Anthropic Claude API costs ~$3-15 per million tokens (very cheap for chat)

---

Need help? Check the backend logs or ask SAM! 🤖
