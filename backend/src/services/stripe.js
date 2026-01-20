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

module.exports = {
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentIntent,
  createRefund,
  isConfigured: () => !!stripe
};
