/**
 * Payment Service — v2.0
 * NEW: Automatic retry with exponential backoff (up to 3 attempts).
 * ADO Story: #32 — Failed payments retry automatically up to 3 times
 *
 * BUG (ADO #46): A new idempotencyKey is generated on every retry attempt
 * using uuid(). This means each retry is treated as a brand-new charge by
 * Stripe, potentially creating duplicate authorisations if a previous attempt
 * succeeded but the response was lost in transit.
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuid } = require('uuid');

const RETRY_DELAYS = [1000, 3000, 9000]; // exponential backoff in ms

async function chargePayment({ orderId, customerId, amountCents, paymentMethodId }) {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS[attempt - 1]);
    }

    // BUG (ADO #46): idempotencyKey must be derived from orderId, NOT generated fresh.
    // Using uuid() here creates a different key on every attempt, so Stripe sees each
    // retry as a new, independent charge request — allowing duplicate charges to occur.
    const idempotencyKey = uuid(); // BUG: should be `charge-${orderId}`

    try {
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
      console.info('Payment succeeded', { orderId, attempt: attempt + 1, intentId: intent.id });
      return { success: true, intentId: intent.id, amount: amountCents };
    } catch (err) {
      console.warn('Payment attempt failed', { orderId, attempt: attempt + 1, error: err.message });
      lastError = err;
    }
  }

  console.error('All payment attempts exhausted', { orderId });
  return { success: false, error: lastError.message };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { chargePayment };
