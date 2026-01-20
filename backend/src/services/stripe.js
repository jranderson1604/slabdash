// Stripe Payment Service
// This service handles Stripe payment intents for buyback offers

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Create a payment intent for a buyback offer
 * @param {number} amount - Amount in dollars
 * @param {object} metadata - Additional metadata (customer, offer details)
 * @returns {Promise<object>} Payment intent object with client_secret
 */
async function createPaymentIntent(amount, metadata = {}) {
  if (!stripe) {
    console.warn('⚠️  Stripe not configured. Set STRIPE_SECRET_KEY environment variable.');
    // Return mock payment intent for development
    return {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_${Date.now()}_secret`,
      amount: Math.round(amount * 100),
      currency: 'usd',
      status: 'requires_payment_method',
      mock: true
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ...metadata,
        type: 'buyback_offer',
        timestamp: new Date().toISOString()
      },
      description: metadata.description || 'Buyback Offer Payment'
    });

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    };
  } catch (error) {
    console.error('Stripe payment intent creation error:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Confirm a payment intent
 * @param {string} paymentIntentId - The payment intent ID
 * @returns {Promise<object>} Updated payment intent
 */
async function confirmPaymentIntent(paymentIntentId) {
  if (!stripe) {
    console.warn('⚠️  Stripe not configured. Returning mock confirmation.');
    return {
      id: paymentIntentId,
      status: 'succeeded',
      mock: true
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    };
  } catch (error) {
    console.error('Stripe payment confirmation error:', error);
    throw new Error('Failed to confirm payment');
  }
}

/**
 * Retrieve a payment intent
 * @param {string} paymentIntentId - The payment intent ID
 * @returns {Promise<object>} Payment intent object
 */
async function getPaymentIntent(paymentIntentId) {
  if (!stripe) {
    return {
      id: paymentIntentId,
      status: 'requires_payment_method',
      mock: true
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    };
  } catch (error) {
    console.error('Stripe payment retrieval error:', error);
    throw new Error('Failed to retrieve payment intent');
  }
}

/**
 * Create a refund for a payment
 * @param {string} paymentIntentId - The payment intent ID to refund
 * @param {number} amount - Amount to refund in dollars (optional, defaults to full refund)
 * @returns {Promise<object>} Refund object
 */
async function createRefund(paymentIntentId, amount = null) {
  if (!stripe) {
    console.warn('⚠️  Stripe not configured. Returning mock refund.');
    return {
      id: `re_mock_${Date.now()}`,
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : null,
      status: 'succeeded',
      mock: true
    };
  }

  try {
    const refundData = {
      payment_intent: paymentIntentId
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundData);
    return {
      id: refund.id,
      payment_intent: refund.payment_intent,
      amount: refund.amount,
      status: refund.status
    };
  } catch (error) {
    console.error('Stripe refund creation error:', error);
    throw new Error('Failed to create refund');
  }
}

/**
 * Create a Stripe checkout session for subscription
 * @param {string} priceId - Stripe price ID for the plan
 * @param {object} options - Company details and success/cancel URLs
 * @returns {Promise<object>} Checkout session object
 */
async function createCheckoutSession(priceId, options = {}) {
  if (!stripe) {
    console.warn('⚠️  Stripe not configured. Returning mock checkout session.');
    return {
      id: `cs_mock_${Date.now()}`,
      url: options.success_url || 'http://localhost:3000/settings?subscription=success',
      mock: true
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: options.success_url || 'http://localhost:3000/settings?subscription=success',
      cancel_url: options.cancel_url || 'http://localhost:3000/settings?subscription=cancelled',
      customer_email: options.customer_email,
      client_reference_id: options.company_id,
      metadata: {
        company_id: options.company_id,
        plan: options.plan
      },
      subscription_data: {
        metadata: {
          company_id: options.company_id,
          plan: options.plan
        }
      }
    });

    return {
      id: session.id,
      url: session.url,
      customer: session.customer
    };
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create customer portal session for subscription management
 * @param {string} customerId - Stripe customer ID
 * @param {string} return_url - URL to return to after managing subscription
 * @returns {Promise<object>} Portal session object
 */
async function createPortalSession(customerId, return_url) {
  if (!stripe) {
    console.warn('⚠️  Stripe not configured. Returning mock portal session.');
    return {
      url: return_url || 'http://localhost:3000/settings',
      mock: true
    };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: return_url || 'http://localhost:3000/settings',
    });

    return {
      url: session.url
    };
  } catch (error) {
    console.error('Stripe portal session creation error:', error);
    throw new Error('Failed to create portal session');
  }
}

/**
 * Cancel a subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<object>} Cancelled subscription object
 */
async function cancelSubscription(subscriptionId) {
  if (!stripe) {
    console.warn('⚠️  Stripe not configured. Returning mock cancellation.');
    return {
      id: subscriptionId,
      status: 'canceled',
      mock: true
    };
  }

  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return {
      id: subscription.id,
      status: subscription.status,
      canceled_at: subscription.canceled_at
    };
  } catch (error) {
    console.error('Stripe subscription cancellation error:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Get subscription details
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<object>} Subscription object
 */
async function getSubscription(subscriptionId) {
  if (!stripe) {
    return {
      id: subscriptionId,
      status: 'active',
      mock: true
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      plan: subscription.items.data[0]?.price?.id
    };
  } catch (error) {
    console.error('Stripe subscription retrieval error:', error);
    throw new Error('Failed to retrieve subscription');
  }
}

module.exports = {
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentIntent,
  createRefund,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  getSubscription,
  isConfigured: () => !!stripe
};
