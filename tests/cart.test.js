/**
 * Cart unit tests — v1.0
 * ADO #26: Cart persists after app restart
 */

const { addToCart, getCart, clearCart } = require('../src/cart');

jest.mock('redis', () => {
  const store = {};
  return {
    createClient: () => ({
      connect: jest.fn(),
      get: jest.fn(async (key) => store[key] || null),
      set: jest.fn(async (key, val) => { store[key] = val; }),
      del: jest.fn(async (key) => { delete store[key]; }),
    }),
  };
});

test('returns empty cart for new user', async () => {
  const req = { params: { userId: 'user-new' } };
  const res = { json: jest.fn() };
  await getCart(req, res);
  expect(res.json).toHaveBeenCalledWith({ items: [] });
});

test('adds item to cart', async () => {
  const req = { params: { userId: 'user-1' }, body: { productId: 'p1', quantity: 2, price: 9.99 } };
  const res = { json: jest.fn() };
  await addToCart(req, res);
  expect(res.json.mock.calls[0][0].items).toHaveLength(1);
});

test('merges quantity when same product added twice', async () => {
  const req1 = { params: { userId: 'user-2' }, body: { productId: 'p2', quantity: 1, price: 5 } };
  const req2 = { params: { userId: 'user-2' }, body: { productId: 'p2', quantity: 2, price: 5 } };
  const res = { json: jest.fn() };
  await addToCart(req1, res);
  await addToCart(req2, res);
  const lastCart = res.json.mock.calls[res.json.mock.calls.length - 1][0];
  expect(lastCart.items[0].quantity).toBe(3);
});
