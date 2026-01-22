# Platform Owner Dashboard Setup

## What It Does

The **Platform Owner Dashboard** gives you (SlabDash LLC) a bird's-eye view of all shops using your platform.

**Route**: `/owner`
**Access**: Only users with `role = 'owner'` can access

---

## Features You Already Have:

### 📊 Platform Statistics:
- Total shops (free vs paid)
- Total customers across all shops
- Total PSA submissions being tracked
- Total cards in system
- Buyback offers & total value

### 🏢 Shop Management:
- Table of every shop using SlabDash
- Their plan (Free, Starter, Pro, Enterprise)
- Number of employees per shop
- Number of customers per shop
- Submissions & cards being tracked
- Sign-up dates

### 📈 Activity Feed:
- New shops signing up
- Submissions being created
- Buyback offers made/accepted
- Real-time platform monitoring

### 🔧 Admin Powers:
- Manually change shop plans
- Override subscription status
- View all data across all shops

---

## How to Enable (3 Steps):

### Step 1: Set Your Role to 'owner'

```bash
# Connect to your database
psql $DATABASE_URL

# Run this SQL (replace with YOUR email)
UPDATE users SET role = 'owner' WHERE email = 'your@email.com';

# Verify it worked
SELECT id, name, email, role FROM users WHERE role = 'owner';
```

### Step 2: Log Out & Back In

The role is cached in your JWT token, so you need to refresh it:
1. Click "Logout" in SlabDash
2. Log back in with your account
3. Your token will now have `role: 'owner'`

### Step 3: Access the Dashboard

You'll now see **"Platform Control"** at the TOP of your sidebar (with a Shield icon 🛡️).

Click it to access `/owner` dashboard.

---

## Security:

✅ **Only you can access it** - Backend checks `role === 'owner'` on every request
✅ **Navigation link only shows for you** - Frontend checks `user?.role === 'owner'`
✅ **All API routes protected** - `/api/owner/*` requires `requireOwner` middleware
✅ **403 Forbidden** - Other users get 403 error if they try to access

---

## API Endpoints (Already Built):

```
GET /api/owner/stats           - Platform statistics
GET /api/owner/companies       - All shops with counts
GET /api/owner/customers       - All customers across shops
GET /api/owner/activity        - Recent platform activity
PATCH /api/owner/companies/:id/plan - Manually change shop plan
```

All require `Authorization: Bearer <token>` with `role: 'owner'`

---

## What You See vs What Shops See:

**You (Platform Owner):**
- Platform Control dashboard (all shops)
- Can see data across ALL shops
- Can manually adjust plans
- See revenue, growth, trends

**Shop Owners (Like Badger Breaks):**
- Only see THEIR shop dashboard
- Only see THEIR customers & submissions
- Cannot see other shops
- Cannot access `/owner` route

---

## Next Steps (Optional Enhancements):

1. **Revenue Dashboard** - Add MRR tracking, churn rate
2. **Stripe Integration** - Show which shops have active subscriptions
3. **Shop Impersonation** - Click a shop to "log in as them" for debugging
4. **Usage Limits** - Alert when shops approach plan limits
5. **Analytics Graphs** - Charts for growth over time

---

## Troubleshooting:

**"Platform Control" link not showing?**
- Make sure your role is set to 'owner' in database
- Log out and back in to refresh JWT token

**Getting 403 Forbidden on /owner?**
- Your JWT token doesn't have `role: 'owner'`
- Re-login after setting role

**Data not loading?**
- Check browser console for errors
- Verify backend is running
- Check `/api/owner/stats` endpoint directly

---

## SQL Script Location:

Run this file: `SET_OWNER_ROLE.sql` (replace email with yours)

