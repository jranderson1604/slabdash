# Stripe Integration Setup

Your SlabDash platform is **production-ready** for Stripe payments. Follow these steps to enable buyback payments.

## 🔑 Step 1: Get Your Stripe API Key

1. **Sign up or log in** to Stripe:
   - Go to https://stripe.com
   - Create an account or sign in

2. **Get your Secret API Key**:
   - In Stripe Dashboard, click **Developers** (top right)
   - Click **API keys** from the left sidebar
   - Copy your **Secret key** (starts with `sk_live_` for production or `sk_test_` for testing)

## ⚙️ Step 2: Add to Railway Environment

1. **Open Railway Project**:
   - Go to: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af/service/7872e156-d674-4ee0-83fa-4d7776985132

2. **Add Environment Variable**:
   - Click the **Variables** tab
   - Click **+ New Variable**
   - Variable name: `STRIPE_SECRET_KEY`
   - Variable value: Your Stripe secret key (`sk_live_...` or `sk_test_...`)
   - Click **Add**

3. **Railway will automatically redeploy** with Stripe enabled

## ✅ Step 3: Verify It Works

### Test the Integration

1. **Create a buyback offer**:
   - Go to any graded card that has a customer assigned
   - Click **"Create Buyback Offer"** button
   - Enter offer amount and optional message
   - Click Create

2. **Customer accepts offer**:
   - Customer sees offer in their portal
   - When they click "Accept", Stripe payment intent is automatically created

3. **Process payment**:
   - Go to **Buyback Offers** dashboard
   - Click on accepted offer
   - Click **"Process Payment"** to complete via Stripe

## 🔄 How It Works

```
Admin Creates Offer → Customer Accepts → Stripe Payment Intent Created → Payment Processed
```

### What Happens Automatically

✅ **When customer accepts offer**:
- Stripe payment intent is created instantly
- Payment amount matches offer price
- Customer info attached to payment
- Offer marked as "processing"

✅ **When payment completes**:
- Offer status updated to "paid"
- `paid_at` timestamp recorded
- Payment ID stored for reference

## 💡 Graceful Fallback

If Stripe isn't configured:
- ✅ Buyback offers still work
- ✅ Accept/decline still functional
- ⚠️ Payment processing uses mock mode (for testing)
- ℹ️ Console logs show "Stripe not configured"

## 🎯 Production vs Test Mode

### Test Mode (Recommended First)
```
STRIPE_SECRET_KEY=sk_test_...
```
- Use test cards: `4242 4242 4242 4242`
- No real money charged
- Perfect for testing flow

### Production Mode
```
STRIPE_SECRET_KEY=sk_live_...
```
- Real payments processed
- Real money transferred
- Use when ready to launch

## 📊 View Payments in Stripe Dashboard

After payments process:
1. Go to https://dashboard.stripe.com
2. Click **Payments** in left sidebar
3. See all your buyback payments with customer details

## 🆘 Troubleshooting

### "Stripe not configured" in logs
**Solution**: Add `STRIPE_SECRET_KEY` to Railway environment variables

### Payment intent creation fails
**Solution**: Verify your Stripe key is valid and hasn't expired

### Customer can't accept offers
**Solution**: Check that customer portal link is valid and buyback offers are loading

## 🔗 Useful Links

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe API Keys: https://dashboard.stripe.com/apikeys
- Railway Project: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af
- Test Cards: https://stripe.com/docs/testing

---

## 🎉 You're All Set!

Once you add the `STRIPE_SECRET_KEY` to Railway:
1. Railway redeploys automatically
2. Buyback payments work instantly
3. Customers can accept offers and pay
4. You see payments in Stripe dashboard

**No code changes needed** - just add the environment variable! 🚀
