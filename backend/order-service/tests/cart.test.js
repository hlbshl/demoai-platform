const { getCart, addItem, clearCart } = require('../src/cartService');
const redis = require('../src/utils/redisClient');

jest.mock('../src/utils/redisClient');

// ADO #26: Cart persists after app restart
describe('CartService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('returns empty cart when no cart exists for user', async () => {
      redis.get.mockResolvedValue(null);
      const cart = await getCart('user-123');
      expect(cart).toEqual({ items: [] });
    });

    it('returns existing cart from Redis', async () => {
      const mockCart = { items: [{ productId: 'prod-1', quantity: 2, price: 9.99 }] };
      redis.get.mockResolvedValue(JSON.stringify(mockCart));
      const cart = await getCart('user-123');
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].productId).toBe('prod-1');
    });
  });

  describe('addItem', () => {
    it('adds new item to empty cart', async () => {
      redis.get.mockResolvedValue(null);
      redis.setEx.mockResolvedValue('OK');
      const newItem = { productId: 'prod-2', quantity: 1, price: 14.50 };
      const cart = await addItem('user-123', newItem);
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].productId).toBe('prod-2');
    });

    it('increments quantity when same product added twice', async () => {
      const existing = { items: [{ productId: 'prod-1', quantity: 1, price: 9.99 }] };
      redis.get.mockResolvedValue(JSON.stringify(existing));
      redis.setEx.mockResolvedValue('OK');
      const cart = await addItem('user-123', { productId: 'prod-1', quantity: 1, price: 9.99 });
      expect(cart.items[0].quantity).toBe(2);
    });
  });

  describe('clearCart', () => {
    it('deletes cart key from Redis', async () => {
      redis.del.mockResolvedValue(1);
      await clearCart('user-123');
      expect(redis.del).toHaveBeenCalledWith('cart:user-123');
    });
  });

  // ADO #48: Cart should not be cleared on token expiry — handled at middleware level
  describe('TTL', () => {
    it('sets cart with 7-day TTL', async () => {
      redis.get.mockResolvedValue(null);
      redis.setEx.mockResolvedValue('OK');
      await addItem('user-123', { productId: 'p1', quantity: 1, price: 5 });
      expect(redis.setEx).toHaveBeenCalledWith('cart:user-123', 604800, expect.any(String));
    });
  });
});
