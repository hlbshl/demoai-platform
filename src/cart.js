/**
 * Cart Service — v2.0
 * NEW: Cart now persists with a 7-day TTL in Redis.
 * ADO Feature: Cart Persistence (#9)
 * ADO Story: #26 — Cart persists after app restart
 *
 * BUG (ADO #48): Cart is incorrectly cleared inside the token-refresh middleware.
 * When a user's JWT expires, authMiddleware calls clearCart() before refreshing
 * the token. This silently wipes the user's cart on every session renewal.
 */

const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
client.connect().catch(console.error);

const CART_KEY = (userId) => `cart:${userId}`;
const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

async function getCart(req, res) {
  const { userId } = req.params;
  const data = await client.get(CART_KEY(userId));
  return res.json(data ? JSON.parse(data) : { items: [] });
}

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

  await client.setEx(CART_KEY(userId), CART_TTL, JSON.stringify(cart));
  return res.json(cart);
}

async function clearCart(userId) {
  await client.del(CART_KEY(userId));
}

module.exports = { getCart, addToCart, clearCart };


// ─── Auth Middleware (also in this module for convenience) ───────────

const jwt = require('jsonwebtoken');

/**
 * BUG (ADO #48): clearCart() should NOT be called here.
 * Token expiry is a session concern — cart data must survive token refresh.
 * Calling clearCart() here causes users to lose their cart on every re-login.
 */
async function authMiddleware(req, res, next) {
  try {
    jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError' && req.userId) {
      await clearCart(req.userId); // BUG: removes cart instead of just refreshing token
      const newToken = jwt.sign({ userId: req.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.setHeader('X-New-Token', newToken);
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { getCart, addToCart, clearCart, authMiddleware };
