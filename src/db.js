/**
 * Database stub — replace with real pg/ORM in production.
 */
const orders = {};

async function createOrder(order) {
  orders[order.orderId] = order;
  return order;
}

async function getOrder(orderId) {
  return orders[orderId] || null;
}

module.exports = { createOrder, getOrder };
