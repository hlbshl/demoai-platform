/**
 * Payment unit tests — v1.0
 * ADO #31: Apple Pay / payment integration
 */

const { chargePayment } = require('../src/payment');

jest.mock('stripe', () => () => ({
  paymentIntents: {
    create: jest.fn(async (params, opts) => ({
      id: 'pi_test_' + params.metadata.orderId,
      status: 'succeeded',
    })),
  },
}));

test('charges correct amount', async () => {
  const result = await chargePayment({
    orderId: 'order-1',
    customerId: 'cust-1',
    amountCents: 2500,
    paymentMethodId: 'pm_test',
  });
  expect(result.success).toBe(true);
  expect(result.amount).toBe(2500);
});

test('uses orderId-based idempotency key', async () => {
  const stripe = require('stripe')();
  await chargePayment({ orderId: 'order-42', customerId: 'c', amountCents: 100, paymentMethodId: 'pm' });
  expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ idempotencyKey: 'charge-order-42' })
  );
});
