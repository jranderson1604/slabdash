# SlabDash v2.0 - Quick Start Checklist

## ✅ Complete These 5 Steps (10 minutes)

### 1️⃣ Change Railway Branch (2 min)
- [ ] Go to: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af/service/7872e156-d674-4ee0-83fa-4d7776985132
- [ ] Click **Settings** → **Source**
- [ ] Under "Branch connected to production" click **Disconnect**
- [ ] Reconnect and select: `claude/explore-capabilities-N5xLK`
- [ ] Wait for green "Deployed" checkmark (~3 min)

### 2️⃣ Verify JWT_SECRET (1 min)
- [ ] In Railway backend service, click **Variables** tab
- [ ] Check if `JWT_SECRET` exists
- [ ] If missing, add it: `JWT_SECRET` = (any long random string)
- [ ] Example: use output of `openssl rand -hex 32`

### 3️⃣ Run Database Migration (3 min)
- [ ] In Railway, click **PostgreSQL** service
- [ ] Click **Data** → **Query**
- [ ] Go to: https://github.com/jranderson1604/slabdash/blob/claude/explore-capabilities-N5xLK/database/migrations/002_simplified.sql
- [ ] Copy ALL the SQL code
- [ ] Paste into Railway Query tab
- [ ] Click **Run Query**
- [ ] Should see: "Migration 002 completed successfully!"

### 4️⃣ Test Backend (1 min)
- [ ] Open: https://slabdash-production.up.railway.app/api/health
- [ ] Should see JSON with:
  ```json
  {
    "ok": true,
    "database": "connected",
    "message": "✅ v2.0 - Document upload, CSV import, and buyback system ready!"
  }
  ```

### 5️⃣ Test Login (1 min)
- [ ] Go to: https://slabdash-8n99.vercel.app/login
- [ ] Try logging in
- [ ] Should work! ✅

---

## 🎉 Once Working, Try These New Features:

### CSV Import
- [ ] Go to `/import` page
- [ ] Upload a PSA CSV file
- [ ] Preview the data
- [ ] Click "Import"
- [ ] Check `/submissions` to see imported data

### Buyback Offers
- [ ] Go to `/buyback` page
- [ ] See the offers dashboard
- [ ] Create test offer from `/cards` page (future feature)

### Document Upload
- [ ] Go to any submission detail page
- [ ] Use camera or file upload to add documents
- [ ] Documents will be linked to that submission

---

## 🆘 If Something Doesn't Work:

### Railway won't deploy
- Check Railway logs for errors
- Verify branch is correct: `claude/explore-capabilities-N5xLK`
- Check build logs for failures

### Database migration fails
- Ensure PostgreSQL service is running
- Check if tables already exist (migration is idempotent)
- Look at error message for specific issue

### Login still fails
- Verify Railway backend is responding at `/api/health`
- Check `JWT_SECRET` is set in Railway variables
- Check browser console for error messages
- Verify frontend is pointing to correct backend URL

### Need help?
- Check `DEPLOYMENT.md` for detailed troubleshooting
- Check `ENV_SETUP.md` for environment variable issues
- All code is on GitHub: `claude/explore-capabilities-N5xLK` branch

---

## 📊 What You're Getting:

✅ Document upload with camera support
✅ PSA CSV import with preview
✅ Buyback offers system
✅ Customer portal enhancements
✅ Payment tracking
✅ ~2,000 lines of production code
✅ 15+ new API endpoints
✅ Mobile-responsive UI

**Total time to deploy:** ~10 minutes
**New revenue features:** 3 (CSV import time-saver, Buyback system, Document management)
