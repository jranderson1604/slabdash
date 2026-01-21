const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const stripeService = require('../services/stripe');

// Stripe Price IDs (you'll need to create these in Stripe Dashboard)
const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise'
};

// Create checkout session for subscription
router.post('/create-checkout', authenticate, async (req, res) => {
  try {
    const { company_id, user } = req.user;
    const { plan } = req.body; // 'starter', 'pro', or 'enterprise'

    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Get company details
    const companyResult = await db.query(
      'SELECT name, email FROM companies WHERE id = $1',
      [company_id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = companyResult.rows[0];

    // Create Stripe checkout session
    const session = await stripeService.createCheckoutSession(PRICE_IDS[plan], {
      company_id: company_id,
      plan: plan,
      customer_email: user.email || company.email,
      success_url: `${process.env.FRONTEND_URL}/settings?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/settings?subscription=cancelled`
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      stripe_configured: stripeService.isConfigured()
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session for subscription management
router.post('/create-portal', authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;

    // Get company's Stripe customer ID
    const companyResult = await db.query(
      'SELECT stripe_customer_id FROM companies WHERE id = $1',
      [company_id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const stripeCustomerId = companyResult.rows[0].stripe_customer_id;

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Create Stripe portal session
    const session = await stripeService.createPortalSession(
      stripeCustomerId,
      `${process.env.FRONTEND_URL}/settings`
    );

    res.json({
      url: session.url
    });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get current subscription status
router.get('/status', authenticate, async (req, res) => {
  try {
    const { company_id } = req.user;

    const companyResult = await db.query(
      'SELECT plan, plan_expires_at, stripe_customer_id, stripe_subscription_id FROM companies WHERE id = $1',
      [company_id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = companyResult.rows[0];

    let subscriptionDetails = null;

    // If has active Stripe subscription, get details
    if (company.stripe_subscription_id) {
      try {
        subscriptionDetails = await stripeService.getSubscription(company.stripe_subscription_id);
      } catch (error) {
        console.error('Failed to get subscription details:', error);
      }
    }

    res.json({
      plan: company.plan,
      plan_expires_at: company.plan_expires_at,
      has_stripe_customer: !!company.stripe_customer_id,
      has_active_subscription: !!company.stripe_subscription_id,
      subscription: subscriptionDetails
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('⚠️  Stripe webhook secret not configured');
    return res.sendStatus(200);
  }

  let event;

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const companyId = session.metadata.company_id;
        const plan = session.metadata.plan;

        // Update company with Stripe customer and subscription IDs
        await db.query(
          `UPDATE companies
           SET stripe_customer_id = $1,
               stripe_subscription_id = $2,
               plan = $3,
               plan_expires_at = NULL,
               updated_at = NOW()
           WHERE id = $4`,
          [session.customer, session.subscription, plan, companyId]
        );

        console.log(`✅ Subscription activated for company ${companyId}: ${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const companyId = subscription.metadata.company_id;

        // Update subscription status
        const status = subscription.status === 'active' ? 'active' : subscription.status;

        await db.query(
          `UPDATE companies
           SET plan = $1,
               updated_at = NOW()
           WHERE stripe_subscription_id = $2`,
          [subscription.metadata.plan || 'free', subscription.id]
        );

        console.log(`✅ Subscription updated for company ${companyId}: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        // Downgrade to free plan
        await db.query(
          `UPDATE companies
           SET plan = 'free',
               stripe_subscription_id = NULL,
               updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );

        console.log(`✅ Subscription cancelled, downgraded to free plan`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        // TODO: Send email notification to customer about failed payment
        console.warn(`⚠️  Payment failed for customer ${invoice.customer}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;
