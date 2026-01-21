# Stripe Monthly Subscriptions Setup

Your SlabDash platform is **production-ready** for monthly recurring payments via Stripe subscriptions. Follow this guide to enable plan upgrades and collect monthly payments from your customers.

## 🎯 What This Enables

Once configured, SlabDash will:
- ✅ Allow shops to upgrade from Free to Starter/Pro/Enterprise plans
- ✅ Collect monthly recurring payments automatically via Stripe
- ✅ Manage subscriptions (upgrades, cancellations, payment failures)
- ✅ Provide a customer portal for shops to manage their billing
- ✅ Automatically downgrade shops to Free if subscription cancelled

---

## 🔑 Step 1: Create Stripe Products & Prices

### 1.1 Sign in to Stripe Dashboard

Go to https://dashboard.stripe.com and sign in to your account.

### 1.2 Create Products (One-Time Setup)

Navigate to **Products** → **Add product**

Create three products:

**Product 1: Starter Plan**
- Name: `SlabDash Starter`
- Description: `Perfect for small card shops just getting started`
- Pricing model: Recurring
- Price: `$29.00 USD`
- Billing period: Monthly
- Click **Save product**
- Copy the **Price ID** (starts with `price_...`)

**Product 2: Professional Plan**
- Name: `SlabDash Professional`
- Description: `For growing shops with regular submissions`
- Pricing model: Recurring
- Price: `$79.00 USD`
- Billing period: Monthly
- Click **Save product**
- Copy the **Price ID** (starts with `price_...`)

**Product 3: Enterprise Plan**
- Name: `SlabDash Enterprise`
- Description: `For large operations and bulk submitters`
- Pricing model: Recurring
- Price: `$199.00 USD`
- Billing period: Monthly
- Click **Save product**
- Copy the **Price ID** (starts with `price_...`)

---

## ⚙️ Step 2: Configure Railway Environment

### 2.1 Add Stripe API Key (if not already added)

1. Open Railway Project:
   - Go to: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af/service/7872e156-d674-4ee0-83fa-4d7776985132

2. Click **Variables** tab

3. Add `STRIPE_SECRET_KEY` (if not already present):
   ```
   STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
   ```

### 2.2 Add Stripe Price IDs

Add these three new environment variables with the Price IDs you copied from Step 1:

```
STRIPE_PRICE_STARTER=price_1abc123...
STRIPE_PRICE_PRO=price_1def456...
STRIPE_PRICE_ENTERPRISE=price_1ghi789...
```

### 2.3 Add Webhook Secret (Optional but Recommended)

We'll set this up in Step 3.

### 2.4 Add Frontend URL (if not already set)

```
FRONTEND_URL=https://slabdash-8n99.vercel.app
```

(or your custom domain)

---

## 🔗 Step 3: Set Up Stripe Webhook (Important!)

Webhooks allow Stripe to notify SlabDash when subscriptions are created, updated, or cancelled.

### 3.1 Create Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://slabdash-production.up.railway.app/api/subscriptions/webhook`
4. Description: `SlabDash Subscription Events`
5. Events to send:
   - Select these specific events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
6. Click **Add endpoint**

### 3.2 Get Webhook Secret

1. After creating the endpoint, click on it
2. Click **Reveal** next to "Signing secret"
3. Copy the webhook secret (starts with `whsec_...`)

### 3.3 Add Webhook Secret to Railway

Go back to Railway Variables and add:

```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3.4 Test Webhook

1. In Stripe Dashboard, go to your webhook
2. Click **Send test webhook**
3. Select `checkout.session.completed`
4. Click **Send test webhook**
5. Check Railway logs to confirm it was received

---

## 🗄️ Step 4: Update Database Schema (if needed)

Your database should already have these columns in the `companies` table. If not, run this SQL:

```sql
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
```

You can run this in your Railway database console or via a migration.

---

## ✅ Step 5: Test the Subscription Flow

### Test Mode First

Use Stripe test mode (API keys starting with `sk_test_`) for initial testing.

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Requires Authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

### Testing Steps:

1. **Create a Test Shop Account**
   - Register a new account on SlabDash
   - Should start on Free plan

2. **Upgrade to Professional**
   - Go to Settings → Subscription & Billing
   - Click "Upgrade" on Professional plan
   - You'll be redirected to Stripe Checkout
   - Enter test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - Complete checkout

3. **Verify Upgrade**
   - You should be redirected back to Settings
   - Current Plan should now show "Professional"
   - Check Railway logs for: `✅ Subscription activated for company...`

4. **Test Subscription Management**
   - In Settings, click "Manage Subscription"
   - You'll be redirected to Stripe Customer Portal
   - Try updating payment method
   - Try canceling subscription
   - Verify subscription is cancelled and plan downgrades to Free

---

## 🚀 Step 6: Go Live with Production Keys

Once testing is complete, switch to production:

### 6.1 Update Railway Environment Variables

Replace test keys with live keys:

```
STRIPE_SECRET_KEY=sk_live_your_production_key
STRIPE_PRICE_STARTER=price_live_starter_id
STRIPE_PRICE_PRO=price_live_pro_id
STRIPE_PRICE_ENTERPRISE=price_live_enterprise_id
```

### 6.2 Update Webhook

1. Create a new webhook endpoint for production (same URL)
2. Use production events
3. Update `STRIPE_WEBHOOK_SECRET` with production secret

### 6.3 Verify Production Webhook

Test the production webhook using Stripe Dashboard test events.

---

## 🎨 Customization Options

### Change Pricing

To update your monthly prices:

1. Go to Stripe Dashboard → Products
2. Edit each product
3. Update the price
4. Copy new Price ID
5. Update Railway environment variables with new Price IDs

### Add Annual Billing

Create new yearly prices in Stripe:

1. Add a new price to each product
2. Set billing period to "Yearly"
3. Add new environment variables:
   ```
   STRIPE_PRICE_STARTER_YEARLY=price_1xyz...
   STRIPE_PRICE_PRO_YEARLY=price_1xyz...
   STRIPE_PRICE_ENTERPRISE_YEARLY=price_1xyz...
   ```
4. Update frontend Settings.jsx to show yearly options

### Custom Trial Periods

In Stripe Product settings:

1. Edit product
2. Add trial period (e.g., "14 days")
3. Customers automatically get free trial

---

## 💡 How It Works

### Subscription Flow

```
Customer clicks "Upgrade" → Stripe Checkout → Payment → Webhook → Database Updated
```

**Detailed Steps:**

1. **Customer clicks "Upgrade"**
   - Frontend calls `/api/subscriptions/create-checkout`
   - Backend creates Stripe Checkout Session
   - Customer redirected to Stripe hosted page

2. **Customer completes payment**
   - Stripe processes payment
   - Creates Subscription
   - Sends webhook to SlabDash

3. **Webhook received**
   - `checkout.session.completed` event
   - Backend updates `companies` table:
     - Sets `plan` to selected tier
     - Stores `stripe_customer_id`
     - Stores `stripe_subscription_id`

4. **Customer returned to app**
   - Redirected to `/settings?subscription=success`
   - Plan upgraded, features unlocked

### Subscription Management

```
Customer clicks "Manage Subscription" → Stripe Portal → Update/Cancel → Webhook → Database Updated
```

**What Customers Can Do:**

- Update payment method
- View invoices
- Download receipts
- Cancel subscription

### Automatic Renewal

Stripe handles renewals automatically:

1. On renewal date, Stripe charges card
2. If successful, subscription continues
3. If payment fails:
   - Stripe sends `invoice.payment_failed` webhook
   - Retries payment according to Stripe settings
   - If all retries fail, subscription cancelled
   - Webhook triggers downgrade to Free plan

---

## 📊 Monitoring & Analytics

### View Subscriptions in Stripe Dashboard

https://dashboard.stripe.com/subscriptions

**See:**
- Active subscriptions
- MRR (Monthly Recurring Revenue)
- Churn rate
- Customer lifetime value

### View Payments

https://dashboard.stripe.com/payments

**Track:**
- Successful charges
- Failed payments
- Refunds

### Revenue Reports

https://dashboard.stripe.com/reports

**Generate:**
- Monthly revenue reports
- Growth trends
- Customer acquisition

---

## 🛠️ Troubleshooting

### "Failed to create checkout session"

**Cause:** Invalid Price ID or Stripe key not set

**Fix:**
1. Verify `STRIPE_SECRET_KEY` is set in Railway
2. Check Price IDs match exactly from Stripe Dashboard
3. Ensure Price IDs start with `price_` not `prod_`

### Subscription created but plan not updated

**Cause:** Webhook not received or failed

**Fix:**
1. Check Railway logs for webhook errors
2. Verify webhook URL is correct: `https://slabdash-production.up.railway.app/api/subscriptions/webhook`
3. Check Stripe webhook logs for delivery failures
4. Verify `STRIPE_WEBHOOK_SECRET` is set correctly

### Customer portal shows "No active subscription"

**Cause:** `stripe_customer_id` not set in database

**Fix:**
1. Check database: `SELECT stripe_customer_id FROM companies WHERE id = X`
2. If null, subscription wasn't created properly
3. Have customer subscribe again
4. Check webhook logs

### Payment failed but subscription still active

**Cause:** Stripe retry logic in progress

**Fix:**
- Wait for Stripe to complete retries (usually 7 days)
- Customer will receive email from Stripe to update payment method
- After final retry fails, subscription auto-cancels via webhook

---

## 🔐 Security Best Practices

### Protect Webhook Endpoint

✅ **Already Implemented:**
- Webhook signature verification using `STRIPE_WEBHOOK_SECRET`
- Prevents unauthorized webhook calls

### Use Environment Variables

✅ **Already Implemented:**
- Never commit API keys to code
- Store in Railway environment variables

### Validate Price IDs

✅ **Already Implemented:**
- Backend validates plan selection
- Only accepts: `starter`, `pro`, `enterprise`

---

## 📞 Support & Resources

### Stripe Documentation

- Subscriptions: https://stripe.com/docs/billing/subscriptions/overview
- Checkout: https://stripe.com/docs/payments/checkout
- Webhooks: https://stripe.com/docs/webhooks
- Customer Portal: https://stripe.com/docs/billing/subscriptions/customer-portal

### Stripe Dashboard

- Main Dashboard: https://dashboard.stripe.com
- Subscriptions: https://dashboard.stripe.com/subscriptions
- Customers: https://dashboard.stripe.com/customers
- Webhooks: https://dashboard.stripe.com/webhooks

### Test Cards

https://stripe.com/docs/testing

---

## 🎉 You're All Set!

Once you complete the setup:

1. ✅ Railway has all required environment variables
2. ✅ Stripe products and prices created
3. ✅ Webhook endpoint configured
4. ✅ Shops can upgrade and pay monthly
5. ✅ Subscriptions managed automatically
6. ✅ Revenue tracked in Stripe Dashboard

**No additional code changes needed** - the subscription system is fully built and ready to go! 🚀

---

## 💰 Expected Revenue Flow

### Example Business Model

**Shops on Platform:**
- 10 Free shops: $0/mo
- 5 Starter shops: $145/mo ($29 × 5)
- 8 Pro shops: $632/mo ($79 × 8)
- 2 Enterprise shops: $398/mo ($199 × 2)

**Total MRR: $1,175/month**

As you acquire more customers, Stripe automatically handles:
- Payment collection
- Failed payment retries
- Subscription renewals
- Invoicing
- Tax calculations (if enabled)

All revenue flows directly to your Stripe account and can be transferred to your bank account on your schedule!
