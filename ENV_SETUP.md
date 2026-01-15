# Environment Variables Setup

## 🔧 Required for Current Features

### Backend (Railway)

These environment variables MUST be set in Railway:

```bash
# Database (Auto-set by Railway when you add PostgreSQL)
DATABASE_URL=postgresql://...

# Authentication (CRITICAL - must be set!)
JWT_SECRET=your-super-secret-jwt-key-here

# App Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://slabdash-8n99.vercel.app
```

### Frontend (Vercel)

```bash
# Backend API URL (already set in .env.production)
VITE_API_URL=https://slabdash-production.up.railway.app
```

---

## 🚀 Optional for Enhanced Features

### Document Cloud Storage (Cloudinary)

Currently documents are stored locally. For production, use Cloudinary:

```bash
# Railway Backend Environment Variables
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Or use single URL format:
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

**How to get:**
1. Sign up: https://cloudinary.com/users/register_free
2. Dashboard → Account Details
3. Copy Cloud Name, API Key, API Secret

### Payment Processing (Stripe)

For buyback offer payments:

```bash
# Railway Backend Environment Variables
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
```

**How to get:**
1. Sign up: https://dashboard.stripe.com/register
2. Developers → API Keys
3. Copy Secret Key and Publishable Key

**Frontend (Vercel):**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Email Notifications (SendGrid)

For customer notifications about buyback offers:

```bash
# Railway Backend Environment Variables
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=SlabDash
```

**How to get:**
1. Sign up: https://signup.sendgrid.com/
2. Settings → API Keys → Create API Key
3. Give it "Full Access" permissions

### PSA API Integration

For automatic PSA data fetching (per shop):

```bash
# Stored per-company in database via Settings page
# No environment variable needed - configured per shop owner
```

---

## 📝 How to Set Environment Variables

### In Railway:
1. Go to your project: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af
2. Click your **backend service**
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add name and value
6. Railway will auto-redeploy

### In Vercel:
1. Go to: https://vercel.com
2. Open your slabdash project
3. Settings → Environment Variables
4. Add variables for **Production** environment
5. Redeploy required for changes to take effect

---

## ✅ Verify Configuration

### Check Backend Env Vars are Set:
```bash
# Railway Logs will show if any are missing
# Look for errors like "JWT_SECRET is not defined"
```

### Check Frontend is Connecting:
```bash
# Open browser console on your site
# Look for API requests going to correct URL
# Should be: https://slabdash-production.up.railway.app/api/...
```

---

## 🆘 Common Issues

### "JWT_SECRET is not defined"
- Add `JWT_SECRET` environment variable in Railway
- Use a long random string (32+ characters)
- Example: `openssl rand -hex 32`

### "Cannot connect to database"
- Ensure PostgreSQL service is running in Railway
- Check `DATABASE_URL` is set correctly
- Railway should auto-set this when you add Postgres

### Frontend can't reach backend
- Check `VITE_API_URL` in Vercel environment variables
- Ensure Railway backend is deployed and running
- Check CORS settings in backend (already configured)

### 403 Forbidden on Vercel
- Check domain settings in Vercel
- Ensure deployment succeeded
- Check build logs for errors

---

## 🔒 Security Best Practices

1. **Never commit .env files to Git** (already in .gitignore)
2. **Use different secrets for dev/production**
3. **Rotate JWT_SECRET periodically**
4. **Use Stripe test keys during development**
5. **Restrict API keys to specific domains when possible**

---

## 📦 Current Status

**Set and Working:**
- ✅ DATABASE_URL (auto-set by Railway)
- ✅ VITE_API_URL (set in Vercel)
- ✅ FRONTEND_URL (should be set in Railway)

**Needs to be Set:**
- ⚠️ JWT_SECRET (CRITICAL for auth to work!)

**Optional (for future):**
- ⏳ CLOUDINARY_URL
- ⏳ STRIPE_SECRET_KEY
- ⏳ SENDGRID_API_KEY
