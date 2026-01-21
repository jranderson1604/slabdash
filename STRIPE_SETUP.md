# Stripe Subscription Billing Setup Guide

## Overview

SlabDash uses **Standard Stripe Billing** (not Connect) to charge card shops monthly subscription fees. This is a simple SaaS subscription model where SlabDash receives the funds directly.

Buyback payments are handled **outside the app** via Venmo, PayPal, Zelle, etc. as preferred by most shops.

---

## Step 1: Get Your Stripe API Keys

1. **Create/Login to Stripe Account**: https://dashboard.stripe.com
2. **Get API Keys**:
   - Go to: **Developers → API keys**
   - Copy your **Secret key** (starts with `sk_test_` for testing or `sk_live_` for production)
   - Add to your `.env` file:
     ```bash
     STRIPE_SECRET_KEY=sk_test_your_secret_key_here
     ```

---

## Step 2: Create Subscription Products in Stripe

1. Go to: **Products → Create product**

2. **Create 3 pricing tiers** (suggested pricing):

   ### Starter Plan
   - **Name**: SlabDash Starter
   - **Description**: Perfect for small shops tracking basic submissions
   - **Price**: $29/month
   - **Recurring**: Monthly
   - **Features**: Up to 50 submissions/month, basic tracking
   - **Copy the Price ID**: `price_1ABC123...`

   ### Pro Plan
   - **Name**: SlabDash Pro
   - **Description**: For growing shops with higher volume
   - **Price**: $79/month
   - **Recurring**: Monthly
   - **Features**: Up to 500 submissions/month, buyback features, customer portal
   - **Copy the Price ID**: `price_1XYZ789...`

   ### Enterprise Plan
   - **Name**: SlabDash Enterprise
   - **Description**: Unlimited tracking for high-volume operations
   - **Price**: $199/month
   - **Recurring**: Monthly
   - **Features**: Unlimited submissions, priority support, custom branding
   - **Copy the Price ID**: `price_1ENT456...`

3. **Add Price IDs to Environment**:
   ```bash
   STRIPE_PRICE_STARTER=price_1ABC123...
   STRIPE_PRICE_PRO=price_1XYZ789...
   STRIPE_PRICE_ENTERPRISE=price_1ENT456...
   ```

---

## Step 3: Set Up Webhook for Subscription Events

Webhooks allow Stripe to notify your app when subscriptions are created, updated, or cancelled.

1. Go to: **Developers → Webhooks → Add endpoint**

2. **Endpoint URL**: `https://yourdomain.com/api/subscriptions/webhook`

3. **Events to listen for**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. **Get Webhook Secret** and add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

---

## Summary

✅ **Subscription billing**: For monthly SaaS fees
✅ **Buyback payments**: Handled outside app via Venmo/PayPal/Zelle/Cash
✅ **Already implemented**: Checkout, billing portal, webhooks, plan management

**Next**: Create products in Stripe Dashboard, add API keys to .env, test!
