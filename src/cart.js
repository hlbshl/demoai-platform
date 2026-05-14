/**
 * Cart Service — v1.0
 * Simple in-memory cart. Items stored in Redis with no TTL expiry logic.
 * ADO Feature: Cart Persistence (#9)
 */

const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
client.connect().catch(console.error);

const CART_KEY = (userId) => `cart:${userId}`;

/**
 * Retrieve cart for a user. Returns empty cart if none exists.
 */
async function getCart(req, res) {
  const { userId } = req.params;
  const data = await client.get(CART_KEY(userId));
  return res.json(data ? JSON.parse(data) : { items: [] });
}

/**
 * Add an item to the cart, merging quantity if product already present.
 */
async function addToCart(req, res) {
  const { userId } = req.params;
  const item = req.body;

  const data = await client.get(CART_KEY(userId));
  const cart = data ? JSON.parse(data) : { items: [] };

  const existing = cart.items.find(i => i.productId === item.productId);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.items.push(item);
  }

  await client.set(CART_KEY(userId), JSON.stringify(cart));
  return res.json(cart);
}

/**
 * Clear entire cart for a user.
 */
async function clearCart(userId) {
  await client.del(CART_KEY(userId));
}

module.exports = { getCart, addToCart, clearCart };
