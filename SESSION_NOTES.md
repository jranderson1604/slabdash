# Session Notes - SlabDash Development

**Date**: 2026-01-20
**Branch**: `claude/fix-logos-portal-buyback-N5xLK`
**Status**: ⚠️ IN PROGRESS - Buyback button not showing

---

## 🎯 What We Accomplished Today

### ✅ Completed Features

1. **Customer Portal Fixes**
   - Fixed API endpoint mismatch (`generatePortalLink` → `sendPortalLink`)
   - Fixed portal URL routing (`/portal/login` → `/portal`)
   - Added buyback offers to portal access response
   - Added token-based buyback offer response endpoint
   - Implemented accept/decline buttons in portal UI
   - Reduced portal logo size (h-40 → h-16)

2. **Landing Page Improvements**
   - Added customer quick access tabs (Features, Pricing, Track My Cards, Contact)
   - Expanded features from 6 to 9 items
   - Increased all logo sizes (h-16 → h-32/h-40)
   - Reduced white space (py-20 → py-16/py-12)
   - Made top nav say "Admin Sign In" instead of just "Sign In"

3. **Admin Dashboard**
   - Reduced sidebar logo from w-32 h-32 to w-16 h-16 ✅

4. **Stripe Monthly Subscriptions**
   - Created backend subscription routes (`/api/subscriptions/*`)
   - Added subscription management to Settings page
   - Support for Starter ($29), Pro ($79), Enterprise ($199) plans
   - Automatic webhook handling
   - Customer portal integration for subscription management

5. **Documentation**
   - Created `EMAIL_SETUP.md` - Email notifications guide
   - Created `STRIPE_SUBSCRIPTIONS.md` - Monthly subscription setup guide

### ⚠️ OUTSTANDING ISSUE

**Buyback button not visible on card detail pages**

**Expected behavior:**
- When viewing a card that has BOTH:
  - A grade assigned (e.g., PSA 10)
  - A customer assigned
- Should see a green "Create Buyback Offer" button with dollar sign icon

**Current status:**
- User reports: "still no buyback option"

**Button location:** `frontend/src/pages/CardDetail.jsx:207` (approximately)

**Condition for button to show:**
```javascript
{card.grade && card.customer_id && (
  <button onClick={() => navigate(`/buyback/new?card_id=${card.id}`)}>
    <DollarSign className="w-4 h-4" />
    Create Buyback Offer
  </button>
)}
```

---

## 🔍 Investigation Needed Tomorrow

### Possible Causes:

1. **Cards don't have customer_id assigned**
   - Cards imported from CSV might not have customer linked
   - Need to check: Do cards in database have `customer_id` populated?

2. **Cards don't have grade**
   - Only graded cards should show buyback button
   - Need to check: Are cards being tested actually graded?

3. **Frontend routing issue**
   - Navigate path might be wrong
   - Need to verify `/buyback/new` route exists

4. **Import issue**
   - DollarSign icon might not be imported
   - Need to check imports at top of CardDetail.jsx

### Debug Steps for Tomorrow:

1. **Check the Card Detail page imports:**
   ```bash
   grep -n "import.*DollarSign" frontend/src/pages/CardDetail.jsx
   ```

2. **Check if card has required data:**
   - Open a card detail page
   - Open browser console
   - Check: `card.grade` and `card.customer_id`

3. **Check database directly:**
   ```sql
   SELECT id, description, grade, customer_id
   FROM cards
   LIMIT 10;
   ```

4. **Verify buyback route exists:**
   ```bash
   grep -n "buyback/new" frontend/src/App.jsx
   ```

---

## 📁 Files Modified This Session

### Backend
- `backend/src/routes/subscriptions.js` (NEW) - Subscription endpoints
- `backend/src/routes/portal.js` - Added buyback to /access, respond endpoint
- `backend/src/routes/customers.js` - Fixed portal link generation
- `backend/src/services/stripe.js` - Added subscription functions
- `backend/src/index.js` - Registered subscription routes

### Frontend
- `frontend/src/pages/Landing.jsx` - Improved features, logos, navigation
- `frontend/src/pages/Settings.jsx` - Added subscription management UI
- `frontend/src/pages/CardDetail.jsx` - Added buyback button (NOT SHOWING!)
- `frontend/src/pages/Portal.jsx` - Fixed buyback fetching, added handlers
- `frontend/src/components/Layout.jsx` - Reduced sidebar logo size
- `frontend/src/api/client.js` - Fixed API function name

### Documentation
- `EMAIL_SETUP.md` (NEW)
- `STRIPE_SUBSCRIPTIONS.md` (NEW)

---

## 🚀 Git Status

**Current Branch:** `claude/fix-logos-portal-buyback-N5xLK`

**Latest Commits:**
- `66657a0` - Add Stripe subscription payments and improve landing page
- `0ba7f56` - Fix customer portal and add email integration guide
- `b036746` - CRITICAL: Fix CORS blocking login and remove SlabDash text from sidebar

**Pushed to remote:** ✅ Yes

**Railway deployment status:**
- Need to check if Railway is deploying from `main` or feature branch
- User asked: "do I need to change railway source from main?"
- **Answer:** Either merge to main OR change Railway to deploy from `claude/fix-logos-portal-buyback-N5xLK`

---

## 📋 Quick Reference

### Stripe Guides Location
- Buyback payments: `/home/user/slabdash/STRIPE_SETUP.md`
- Subscription payments: `/home/user/slabdash/STRIPE_SUBSCRIPTIONS.md`

### Railway URLs
- Project: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af/service/7872e156-d674-4ee0-83fa-4d7776985132
- Backend: https://slabdash-production.up.railway.app

### Vercel URLs
- Frontend: https://slabdash-8n99.vercel.app

### Database
- Railway PostgreSQL (connection in Railway dashboard)

---

## 🔧 Environment Variables Needed

### For Buyback Payments (Already in Railway)
```
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
```

### For Monthly Subscriptions (Need to Add)
```
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### For Email Notifications (Need to Add)
```
SENDGRID_API_KEY=SG.xxx... (or Mailgun/SMTP credentials)
EMAIL_FROM=support@yourdomain.com
EMAIL_FROM_NAME=Your Shop Name
```

---

## 🎯 Tomorrow's Priority

**CRITICAL:** Fix buyback button not showing on card detail pages

**Steps:**
1. Investigate why button condition isn't met
2. Check if cards have `grade` and `customer_id`
3. Verify DollarSign import in CardDetail.jsx
4. Test on a card that definitely has both grade and customer
5. Consider adding console.log to debug condition

**After fix:**
1. Test full buyback flow end-to-end
2. Decide whether to merge to main or deploy feature branch
3. Set up Stripe subscription environment variables
4. Test subscription upgrade flow

---

## 💡 Key Technical Context

### Buyback Button Code (CardDetail.jsx)
Located around line 207:
```javascript
{card.grade && card.customer_id && (
  <button
    onClick={() => navigate(`/buyback/new?card_id=${card.id}`)}
    className="btn btn-primary bg-green-600 hover:bg-green-700"
  >
    <DollarSign className="w-4 h-4" />
    Create Buyback Offer
  </button>
)}
```

### Customer Portal Access Flow
1. Admin generates portal link in CustomerDetail page
2. Portal link: `https://slabdash-8n99.vercel.app/portal?token=xxx`
3. Portal fetches data from `/api/portal/access?token=xxx`
4. Response includes submissions, cards, AND buyback offers
5. Buyback offers display in green gradient banner
6. Customer can accept/decline offers

### Subscription Flow
1. User clicks "Upgrade" in Settings → Subscription & Billing
2. Frontend calls `/api/subscriptions/create-checkout`
3. User redirected to Stripe Checkout
4. After payment, Stripe webhook updates database
5. User can manage subscription via "Manage Subscription" button

---

## 🐛 Known Issues

1. ⚠️ **Buyback button not showing** - NEEDS INVESTIGATION
2. ⚠️ **Railway deployment source** - Unclear if deploying from main or feature branch
3. ✅ **Customer portal** - FIXED (was 404, now working)
4. ✅ **CORS issues** - FIXED (login was blocked, now working)
5. ✅ **Logo sizes** - FIXED (admin sidebar, landing page)

---

## 📞 User Requests Summary

1. ✅ Make admin dashboard S logo half the size
2. ✅ Add customer quick access tabs on landing page
3. ✅ Expand features section and increase logo sizes
4. ✅ Reduce white space on landing page
5. ✅ Add Stripe monthly subscription payments for clients
6. ⚠️ **Buyback button should be visible (NOT WORKING)**

---

## 🔄 Next Session Checklist

- [ ] Investigate why buyback button isn't showing
- [ ] Fix buyback button visibility issue
- [ ] Test buyback flow end-to-end
- [ ] Decide on Railway deployment strategy (merge to main vs feature branch)
- [ ] Set up Stripe subscription environment variables (if ready)
- [ ] Test subscription upgrade flow
- [ ] Consider setting up email notifications

---

**Session End Time:** User said "continue this tomorrow morning remember all this"

**Resume Command:** `cd /home/user/slabdash && git status && git branch`

**First Debug Command:** `grep -A 20 "Create Buyback Offer" frontend/src/pages/CardDetail.jsx`
