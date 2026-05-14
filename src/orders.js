/**
 * Order Service — v1.0
 * Creates and retrieves orders. Guest and authenticated checkout supported.
 * ADO Feature: Guest Checkout (#7), Cart Persistence (#9)
 */

const { v4: uuidv4 } = require('uuid');
const { chargePayment } = require('./payment');
const { clearCart } = require('./cart');
const { sendNotification } = require('./notifications');
const db = require('./db');

async function createOrder(req, res) {
  const { userId, guestEmail, items, addressId, paymentMethodId } = req.body;

  if (!userId && !guestEmail) {
    return res.status(400).json({ error: 'userId or guestEmail required' });
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const orderId = uuidv4();

  try {
    await chargePayment({ orderId, customerId: userId, amountCents: Math.round(subtotal * 100), paymentMethodId });

    const order = await db.createOrder({ orderId, userId, guestEmail, items, addressId, subtotal, status: 'CONFIRMED' });

    if (userId) await clearCart(userId);

    await sendNotification(userId || guestEmail, {
      title: 'Order Confirmed',
      body: `Your order #${orderId.slice(0, 8)} has been placed.`,
      data: { orderId, status: 'CONFIRMED' },
    });

    return res.status(201).json({ orderId, status: 'CONFIRMED', total: subtotal });
  } catch (err) {
    console.error('Order creation failed', { orderId, error: err.message });
    return res.status(500).json({ error: 'Order creation failed' });
  }
}

async function getOrder(req, res) {
  const order = await db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  return res.json(order);
}

module.exports = { createOrder, getOrder };
