# 🎯 SlabDash

**PSA Order Tracking for Card Shops**

https://slabdash.io

---

## Quick Deploy to Railway (5 minutes)

### Step 1: Push to GitHub

1. Create a new repo at github.com called `slabdash`
2. Upload all these files to it

### Step 2: Deploy on Railway

1. Go to **https://railway.app**
2. Click **Login with GitHub**
3. Click **New Project** → **Deploy from GitHub repo**
4. Select `slabdash`
5. Click **Deploy Now**

### Step 3: Add Database

1. In Railway, click **New** → **Database** → **Add PostgreSQL**
2. Wait 30 seconds

### Step 4: Run Database Schema

1. Click on **PostgreSQL** in Railway
2. Click **Data** tab → **Query**
3. Copy/paste everything from `database/schema.sql`
4. Click **Run Query**

### Step 5: Connect Backend to Database

1. Click on your **slabdash** service (not database)
2. Click **Variables** tab
3. Add these variables:

```
NODE_ENV = production
JWT_SECRET = make-up-a-long-random-string-here-at-least-32-chars
FRONTEND_URL = *
```

4. Click **Add Reference** → Select PostgreSQL → Select `DATABASE_URL`

### Step 6: Set Root Directory

1. Click **Settings** tab
2. Set **Root Directory** to: `backend`
3. Railway will redeploy

### Step 7: Get Your URL

1. Click **Settings** → **Networking** → **Generate Domain**
2. You'll get: `slabdash-production.up.railway.app`

### Step 8: Test It!

Go to: `https://YOUR-URL.up.railway.app/health`

You should see: `{"status":"ok","app":"SlabDash"}`

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Company
- `GET /api/companies/settings` - Get settings
- `POST /api/companies/psa-key` - Set PSA API key
- `GET /api/companies/stats` - Dashboard stats

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer
- `POST /api/customers/:id/send-portal-link` - Send login link

### Submissions
- `GET /api/submissions` - List submissions
- `POST /api/submissions` - Create submission
- `POST /api/submissions/:id/refresh` - Refresh from PSA
- `POST /api/submissions/refresh-all` - Refresh all
- `POST /api/submissions/:id/assign-customer` - Assign customer

### Cards
- `GET /api/cards` - List cards
- `POST /api/cards` - Create card
- `POST /api/cards/bulk` - Create multiple
- `POST /api/cards/:id/lookup-cert` - Lookup from PSA

### PSA API Proxy
- `GET /api/psa/submission/:number` - Get submission progress
- `GET /api/psa/cert/:number` - Get certificate
- `GET /api/psa/test` - Test connection

### Customer Portal
- `POST /api/portal/login` - Customer login
- `GET /api/portal/submissions` - Customer's submissions
- `GET /api/portal/stats` - Customer stats

---

## What's Next?

1. Register your account via the API
2. Add your PSA API key
3. Start adding customers and submissions
4. Build a frontend (or I can build one for you!)

---

Built for Badger Breaks 🦡
