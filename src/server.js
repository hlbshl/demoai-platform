const express = require('express');
const { createOrder, getOrder } = require('./orders');
const { getCart, addToCart } = require('./cart');
const { chargePayment } = require('./payment');
const { sendNotification } = require('./notifications');

const app = express();
app.use(express.json());

app.post('/orders', createOrder);
app.get('/orders/:id', getOrder);
app.get('/cart/:userId', getCart);
app.post('/cart/:userId/items', addToCart);
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

module.exports = app;
if (require.main === module) {
  app.listen(3000, () => console.log('DemoAI Platform v1.0.0 listening on :3000'));
}
