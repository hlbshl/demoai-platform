/**
 * Payment Service — v1.0
 * Simple single-attempt Stripe charge. No retry logic.
 * ADO Feature: Payment Processing Platform (#3)
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Charge a customer once. Returns success or error — no retries in v1.0.
 */
async function chargePayment({ orderId, customerId, amountCents, paymentMethodId }) {
  const idempotencyKey = `charge-${orderId}`;   // stable key tied to orderId

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      metadata: { orderId, customerId },
    },
    { idempotencyKey }
  );

  return { success: true, intentId: intent.id, amount: amountCents };
}

module.exports = { chargePayment };
