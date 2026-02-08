# 🚨 FIX: Demos Not Running

## The Problem

Your deployed demos (Railway + Vercel) aren't working because:

1. **Railway is deploying OLD code** from `main` branch
2. **All new features are on** `claude/explore-capabilities-N5xLK` branch (where we've been working)
3. **Database migrations haven't been run** on production
4. **Portal columns are missing** (causing the `admin_notes` error)

## ✅ Quick Fix (3 Options)

### **Option 1: Merge to Main** (Recommended - 5 min)

This gets your demo working with all new features:

```bash
# 1. Switch to main branch
git checkout main

# 2. Merge our feature branch
git merge claude/explore-capabilities-N5xLK

# 3. Push to main
git push origin main
```

**What happens:**
- Railway automatically deploys from `main` (30 seconds)
- All new features go live immediately
- Then run portal migration (see Step 2 below)

---

### **Option 2: Change Railway Deploy Branch** (Alternative - 2 min)

Keep working on feature branch, have Railway deploy it:

1. Go to: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af/service/7872e156-d674-4ee0-83fa-4d7776985132
2. Click **Settings** tab
3. Scroll to **Source** section
4. Under "Branch connected to production" (shows `main`)
5. Click **Disconnect**
6. Reconnect and select: **`claude/explore-capabilities-N5xLK`**
7. Railway will auto-deploy ✅

---

### **Option 3: Create Pull Request** (For review - 10 min)

If you want to review changes first:

1. Go to: https://github.com/jranderson1604/slabdash
2. Click **Pull Requests** → **New Pull Request**
3. Base: `main` ← Compare: `claude/explore-capabilities-N5xLK`
4. Review changes
5. Click **Merge Pull Request**
6. Railway auto-deploys

---

## Step 2: Run Database Migration (REQUIRED)

After Railway deploys, you MUST run the portal migration:

### Method 1: Using Railway CLI

```bash
railway run node backend/run-portal-migration.js
```

### Method 2: Using Railway Dashboard

1. Go to your Railway project
2. Click on your backend service
3. Click **Deploy** → **New Deployment**
4. Add command: `node backend/run-portal-migration.js`
5. Click **Deploy**

### Method 3: Using Railway Shell

1. Go to your Railway project
2. Click on your backend service
3. Click **Shell** tab
4. Run: `node run-portal-migration.js`
5. Wait for green checkmarks ✅

---

## Step 3: Add Environment Variables to Railway

Don't forget to add your Anthropic API key (SAM won't work without it):

1. Go to: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af
2. Click your backend service
3. Click **Variables** tab
4. Add: `ANTHROPIC_API_KEY` = (your key from local `backend/.env`)
5. Railway auto-redeploys

---

## Step 4: Verify Everything Works

### Test Backend (Railway)

```bash
curl https://slabdash-production.up.railway.app/api/health
```

Should return:
```json
{
  "ok": true,
  "service": "SlabDash API",
  "database": "connected"
}
```

### Test Frontend (Vercel)

Go to: https://slabdash-8n99.vercel.app/login

- Login should work
- Customer portals should load
- SAM should be available (once you add API key)

---

## Why This Happened

**Before:**
- Railway: deploying `main` branch (old code, no new features)
- Your work: all on `claude/explore-capabilities-N5xLK` branch
- Result: Demos show old version, missing SAM, portal enhancements, etc.

**After Fix:**
- Railway: deploying latest code with all features
- Database: has all required columns
- SAM: AI-powered (once API key added)
- Portals: load without errors

---

## Quick Reference

| What | Where | Status |
|------|-------|--------|
| **Backend Code** | Railway (deploying `main`) | ❌ Out of date |
| **Latest Features** | `claude/explore-capabilities-N5xLK` | ✅ Ready to deploy |
| **Database** | Railway PostgreSQL | ⚠️ Needs migration |
| **Frontend** | Vercel | ⚠️ Needs backend to work |
| **SAM AI** | Backend (needs API key) | ⚠️ Needs env var |

---

## Recommended Next Steps

1. **Now:** Merge to main (Option 1 above) - 5 min
2. **Then:** Run portal migration - 2 min
3. **Then:** Add ANTHROPIC_API_KEY to Railway - 1 min
4. **Then:** Add credits to Anthropic account - 2 min
5. **Done:** Test demo at slabdash-8n99.vercel.app ✅

Total time: **~10 minutes to fully working demo**

---

## Need Help?

All the code is ready and committed. You just need to:
- Get it deployed (merge to main)
- Run the migration (fixes portal error)
- Add the API key (enables SAM AI)

Everything else is already done! 🎉
