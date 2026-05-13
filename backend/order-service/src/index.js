const express = require('express');
const { createOrder, getOrder } = require('./orderController');
const { addToCart, getCart, clearCart } = require('./cartController');
const { authenticate } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();
app.use(express.json());

// Order routes
app.post('/orders', authenticate, createOrder);
app.get('/orders/:orderId', authenticate, getOrder);

// Cart routes — ADO #26: Cart persists after app restart
app.get('/cart', authenticate, getCart);
app.post('/cart/items', authenticate, addToCart);
app.delete('/cart', authenticate, clearCart);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service', version: '1.4.2' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => logger.info(`order-service listening on port ${PORT}`));

module.exports = app;
