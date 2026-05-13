const { applyPromo } = require('../src/promoService');
const db = require('../src/utils/db');

jest.mock('../src/utils/db');

// ADO #34: Promo codes can be applied at checkout
// ADO #50: Promo code applied twice — regression test
describe('PromoService', () => {
  const mockPromo = {
    id: 'promo-1',
    code: 'SUMMER20',
    discount_type: 'PERCENTAGE',
    discount_value: 20,
    min_order_value: 10,
    active: true,
  };

  describe('applyPromo', () => {
    it('applies percentage discount to valid order', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [mockPromo] })
        .mockResolvedValueOnce({ rows: [] }); // no prior usage
      const result = await applyPromo('SUMMER20', 'user-1', 50);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(10); // 20% of 50
    });

    it('rejects expired promo code', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // no matching active promo
      const result = await applyPromo('EXPIRED10', 'user-1', 50);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid or expired/i);
    });

    // ADO #50: Regression — promo must not apply twice
    it('rejects promo code already used by same user', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [mockPromo] })
        .mockResolvedValueOnce({ rows: [{ id: 'usage-1' }] }); // prior usage found
      const result = await applyPromo('SUMMER20', 'user-1', 50);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/already been used/i);
    });

    it('rejects order below minimum value', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [mockPromo] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await applyPromo('SUMMER20', 'user-1', 5); // below min 10
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/minimum order/i);
    });
  });
});
