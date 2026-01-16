# SlabDash v2.0 - Deployment Guide

## 🚀 Quick Deploy (3 Steps)

### Step 1: Configure Railway Branch

Railway is currently deploying from `main` branch, but all new features are on `claude/explore-capabilities-N5xLK`.

**Fix this:**
1. Go to: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af/service/7872e156-d674-4ee0-83fa-4d7776985132
2. Click **Settings** tab
3. Scroll to **Source** section
4. Under "Branch connected to production" (currently shows `main`)
5. Click **Disconnect**
6. Reconnect and select: `claude/explore-capabilities-N5xLK`
7. Railway will auto-deploy ✅

### Step 2: Run Database Migration

After Railway finishes deploying (green checkmark):

1. In Railway, click your **PostgreSQL** database service
2. Click **Data** tab → **Query** button
3. Copy SQL from: `database/migrations/002_simplified.sql`
4. Paste into Query tab
5. Click **Run Query**
6. Should see: ✅ `Migration 002 completed successfully!`

**Migration creates:**
- `documents` table
- `buyback_offers` table
- Customer buyback stats columns

### Step 3: Verify Deployment

Once deployed and migrated:

1. **Test Backend:**
   ```
   https://slabdash-production.up.railway.app/api/health
   ```
   Should return:
   ```json
   {
     "ok": true,
     "service": "SlabDash API",
     "database": "connected",
     "message": "✅ v2.0 - Document upload, CSV import, and buyback system ready!"
   }
   ```

2. **Test Frontend:**
   - Go to: https://slabdash-8n99.vercel.app/login
   - Login should work
   - New pages: `/import`, `/buyback`

---

## 📦 What's New in v2.0

### New Features
- **Document Upload:** Camera/file upload linked to submissions
- **PSA CSV Import:** Bulk import submissions and cards
- **Buyback Offers:** Shop owners can purchase customer cards
- **Customer Portal:** View offers, respond (accept/reject)
- **Payment Tracking:** Track payment status and methods

### New API Endpoints
- `POST /api/documents` - Upload document
- `GET /api/documents` - List documents
- `POST /api/buyback` - Create buyback offer
- `GET /api/buyback` - List offers (with filters)
- `PATCH /api/buyback/:id/status` - Update offer status
- `GET /api/buyback/stats/summary` - Offer statistics
- `POST /api/import/psa-csv` - Import CSV file
- `POST /api/import/psa-csv/preview` - Preview CSV before import
- `GET /api/portal/buyback-offers` - Customer view offers
- `PATCH /api/portal/buyback-offers/:id/respond` - Customer respond to offer
- `GET /api/portal/documents` - Customer view documents

### New UI Pages
- **/import** - CSV Import with live preview
- **/buyback** - Buyback Offers management
- **DocumentUpload Component** - Reusable upload component

---

## 🔧 Troubleshooting

### Login fails with "Endpoint not found"
**Cause:** Railway is deploying old code from `main` branch
**Fix:** Follow Step 1 above to change Railway branch

### Database errors after deployment
**Cause:** New tables don't exist yet
**Fix:** Follow Step 2 above to run migration

### Vercel frontend shows 403
**Cause:** Domain restrictions or deployment issues
**Fix:** Check Vercel dashboard, ensure project is deployed from correct branch

---

## 📊 Code Changes Summary

- **Backend:** 1,088+ lines (3 new routes, 1 service, 2 migrations)
- **Frontend:** 838+ lines (2 new pages, 1 component)
- **Total:** ~2,000 lines of production code

**Files Changed:**
- 16 files modified/created
- All committed to: `claude/explore-capabilities-N5xLK` branch

---

## ⏰ Optional: Future Enhancements

### Cloud Storage (Recommended for Production)
Currently documents store locally. Upgrade to Cloudinary:
1. Sign up: https://cloudinary.com (free tier)
2. Add `CLOUDINARY_URL` to Railway environment variables
3. Update document routes to use Cloudinary SDK

### Payment Integration
Stripe integration is ready, just needs API key:
1. Sign up: https://stripe.com
2. Add `STRIPE_SECRET_KEY` to Railway environment variables
3. Buyback payments will work automatically

### Email Notifications
SendGrid integration placeholders exist:
1. Sign up: https://sendgrid.com (100 emails/day free)
2. Add `SENDGRID_API_KEY` to Railway environment variables
3. Add email templates (10 min task)

---

## 🆘 Need Help?

All code is on GitHub:
- Branch: `claude/explore-capabilities-N5xLK`
- URL: https://github.com/jranderson1604/slabdash

Migration SQL:
- File: `database/migrations/002_simplified.sql`
- Contains all new table definitions
