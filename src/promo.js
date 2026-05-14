/**
 * Promo Code Engine — v2.0  (NEW in this release)
 * Validates and applies promotional discount codes at checkout.
 * ADO Feature: Promo Code Engine (#16)
 * ADO Story: #34 — Promo codes can be applied at checkout
 *
 * BUG (ADO #50): There is no guard to prevent the same promo code from being
 * applied multiple times to the same order. If the user navigates back to the
 * cart after applying a code and returns to checkout, applyPromoToOrder() is
 * called again, doubling the discount.
 */

const db = require('./db');

const PROMO_CODES = {
  'SUMMER20': { type: 'percentage', value: 20, minOrder: 10 },
  'FLAT5':    { type: 'fixed',      value: 5,  minOrder: 15 },
  'WELCOME10':{ type: 'percentage', value: 10, minOrder: 0  },
};

/**
 * Validates a promo code and returns discount amount.
 */
function validatePromo(code, subtotal) {
  const promo = PROMO_CODES[code.toUpperCase()];
  if (!promo) return { valid: false, error: 'Invalid or expired promo code' };
  if (subtotal < promo.minOrder) return { valid: false, error: `Minimum order value of $${promo.minOrder} required` };

  const discount = promo.type === 'percentage'
    ? (subtotal * promo.value) / 100
    : Math.min(promo.value, subtotal);

  return { valid: true, discount, code: code.toUpperCase() };
}

/**
 * POST /orders/:id/promo  — applies promo to an existing order.
 *
 * BUG (ADO #50): No check whether a promo has already been applied to this order.
 * `order.discount` is simply incremented each time this endpoint is called,
 * so calling it twice doubles the discount.
 */
async function applyPromo(req, res) {
  const { id: orderId } = req.params;
  const { promoCode } = req.body;

  const order = await db.getOrder(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const result = validatePromo(promoCode, order.subtotal);
  if (!result.valid) return res.status(400).json({ error: result.error });

  // BUG: should check `if (order.promoCode)` and reject if already applied
  order.discount = (order.discount || 0) + result.discount; // BUG: accumulates on repeat calls
  order.promoCode = promoCode;
  order.total = order.subtotal - order.discount;

  await db.updateOrder(order);
  return res.json({ orderId, discount: order.discount, total: order.total });
}

module.exports = { applyPromo, validatePromo };
