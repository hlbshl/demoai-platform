const db = require('./utils/db');
const logger = require('./utils/logger');

// ADO #34: Promo code validation with single-use enforcement
// ADO #50: Fix — promo cannot be applied twice on same order
async function applyPromo(code, userId, subtotal) {
  const promo = await db.query(
    'SELECT * FROM promo_codes WHERE code = $1 AND active = true AND expires_at > NOW()',
    [code]
  );

  if (!promo.rows.length) {
    return { valid: false, error: 'Invalid or expired promo code' };
  }

  const promoRecord = promo.rows[0];

  // Check if this user has already used this promo
  const usageCheck = await db.query(
    'SELECT id FROM promo_usage WHERE promo_id = $1 AND user_id = $2',
    [promoRecord.id, userId]
  );

  if (usageCheck.rows.length > 0) {
    return { valid: false, error: 'Promo code has already been used' };
  }

  // Check minimum order value
  if (subtotal < promoRecord.min_order_value) {
    return { valid: false, error: `Minimum order value of ${promoRecord.min_order_value} required` };
  }

  let discount = 0;
  if (promoRecord.discount_type === 'PERCENTAGE') {
    discount = (subtotal * promoRecord.discount_value) / 100;
  } else {
    discount = Math.min(promoRecord.discount_value, subtotal);
  }

  logger.info('Promo applied', { code, userId, discount });
  return { valid: true, discount, promoId: promoRecord.id };
}

// Record promo usage after successful order placement
async function recordUsage(promoId, userId, orderId) {
  await db.query(
    'INSERT INTO promo_usage (promo_id, user_id, order_id, used_at) VALUES ($1, $2, $3, NOW())',
    [promoId, userId, orderId]
  );
}

module.exports = { applyPromo, recordUsage };
