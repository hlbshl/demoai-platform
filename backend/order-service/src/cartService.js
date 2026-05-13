const redis = require('./utils/redisClient');
const logger = require('./utils/logger');

const CART_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — ADO #26: Cart persists for up to 7 days

// ADO #26: Cart persists after app restart using Redis
async function getCart(userId) {
  const key = cartKey(userId);
  const data = await redis.get(key);
  if (!data) return { items: [] };
  return JSON.parse(data);
}

async function addItem(userId, item) {
  const cart = await getCart(userId);
  const existingIndex = cart.items.findIndex(i => i.productId === item.productId);

  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += item.quantity;
  } else {
    cart.items.push({ ...item, addedAt: new Date().toISOString() });
  }

  await persistCart(userId, cart);
  logger.debug('Cart updated', { userId, itemCount: cart.items.length });
  return cart;
}

async function clearCart(userId) {
  await redis.del(cartKey(userId));
  logger.debug('Cart cleared', { userId });
}

async function persistCart(userId, cart) {
  await redis.setEx(cartKey(userId), CART_TTL_SECONDS, JSON.stringify(cart));
}

function cartKey(userId) {
  return `cart:${userId}`;
}

module.exports = { getCart, addItem, clearCart };
