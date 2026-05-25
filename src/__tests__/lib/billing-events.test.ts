/**
 * @jest-environment node
 */

// Must mock before importing billing
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

jest.mock('@/lib/supabase-admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}));

import { isEventAlreadyProcessed } from '@/lib/billing';

function buildChain(rows: unknown[] | null) {
  const chain = {
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
  };
  mockSelect.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockOrder.mockReturnValue(chain);
  mockLimit.mockResolvedValue({ data: rows });
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isEventAlreadyProcessed', () => {
  it('retorna false quando paymentId e subscriptionId são undefined', async () => {
    const result = await isEventAlreadyProcessed('PAYMENT_RECEIVED', undefined, undefined);
    expect(result).toBe(false);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('retorna false quando não há eventos anteriores', async () => {
    buildChain([]);
    const result = await isEventAlreadyProcessed('PAYMENT_RECEIVED', 'pay_001', undefined);
    expect(result).toBe(false);
  });

  it('retorna true quando encontra evento com mesmo payment.id', async () => {
    buildChain([
      { id: 'evt-1', asaas_payload: { payment: { id: 'pay_001' } } },
    ]);
    const result = await isEventAlreadyProcessed('PAYMENT_RECEIVED', 'pay_001', undefined);
    expect(result).toBe(true);
  });

  it('retorna true quando encontra evento com mesmo subscription.id', async () => {
    buildChain([
      { id: 'evt-1', asaas_payload: { subscription: { id: 'sub_001' } } },
    ]);
    const result = await isEventAlreadyProcessed('SUBSCRIPTION_DELETED', undefined, 'sub_001');
    expect(result).toBe(true);
  });

  it('retorna false quando evento tem id diferente', async () => {
    buildChain([
      { id: 'evt-1', asaas_payload: { payment: { id: 'pay_999' } } },
    ]);
    const result = await isEventAlreadyProcessed('PAYMENT_RECEIVED', 'pay_001', undefined);
    expect(result).toBe(false);
  });

  it('retorna false quando data é null (Supabase error)', async () => {
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
    });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit });
    mockOrder.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit });
    mockLimit.mockResolvedValue({ data: null });

    const result = await isEventAlreadyProcessed('PAYMENT_RECEIVED', 'pay_001', undefined);
    expect(result).toBe(false);
  });
});