const { v4: uuidv4 } = require('uuid');
const orderService = require('./orderService');
const cartService = require('./cartService');
const promoService = require('./promoService');
const logger = require('./utils/logger');

// ADO #27: Guest users can complete checkout without registration
async function createOrder(req, res) {
  const { userId, guestEmail, items, addressId, promoCode, paymentMethodId } = req.body;

  try {
    // Validate that either userId or guestEmail is provided
    if (!userId && !guestEmail) {
      return res.status(400).json({ error: 'Either userId or guestEmail is required' });
    }

    // Calculate totals
    let subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;

    // ADO #34: Apply promo code if provided
    if (promoCode) {
      const promoResult = await promoService.applyPromo(promoCode, userId, subtotal);
      if (promoResult.valid) {
        discount = promoResult.discount;
      } else {
        return res.status(400).json({ error: promoResult.error });
      }
    }

    const total = subtotal - discount;
    const orderId = uuidv4();

    const order = await orderService.create({
      orderId,
      userId: userId || null,
      guestEmail: guestEmail || null,
      items,
      addressId,
      subtotal,
      discount,
      total,
      promoCode: promoCode || null,
      paymentMethodId,
      status: 'PENDING_PAYMENT',
    });

    // Clear cart after successful order creation
    if (userId) {
      await cartService.clearCart(userId);
    }

    logger.info('Order created', { orderId, userId, total });
    return res.status(201).json({ orderId: order.orderId, status: order.status, total });

  } catch (err) {
    logger.error('Failed to create order', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getOrder(req, res) {
  const { orderId } = req.params;
  try {
    const order = await orderService.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json(order);
  } catch (err) {
    logger.error('Failed to fetch order', { orderId, error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { createOrder, getOrder };
