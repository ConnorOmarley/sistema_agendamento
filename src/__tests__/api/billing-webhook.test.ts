/**
 * Testes de integração para POST /api/billing/webhook
 *
 * Cobre: validação de token, roteamento de eventos, deduplicação,
 * subscription não localizada.
 */

import type { SubscriptionRow } from '@/lib/billing';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetBySubscription = jest.fn<Promise<SubscriptionRow | null>, [string]>();
const mockGetByCustomer = jest.fn<Promise<SubscriptionRow | null>, [string]>();
const mockIsAlreadyProcessed = jest.fn<Promise<boolean>, [string, string | undefined, string | undefined]>();
const mockLogEvent = jest.fn<Promise<void>, unknown[]>();
const mockUpdateStatus = jest.fn<Promise<void>, unknown[]>();
const mockCaptureException = jest.fn();

jest.mock('@/lib/billing', () => ({
  getSubscriptionByAsaasSubscription: (...args: [string]) => mockGetBySubscription(...args),
  getSubscriptionByAsaasCustomer: (...args: [string]) => mockGetByCustomer(...args),
  isEventAlreadyProcessed: (...args: [string, string | undefined, string | undefined]) => mockIsAlreadyProcessed(...args),
  logSubscriptionEvent: (...args: unknown[]) => mockLogEvent(...args),
  updateSubscriptionStatus: (...args: unknown[]) => mockUpdateStatus(...args),
}));

jest.mock('@/lib/monitoring', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const TOKEN = 'test-webhook-token';

function makeSub(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: 'sub-row-1',
    user_id: 'user-1',
    asaas_customer_id: 'cus_1',
    asaas_subscription_id: 'sub_1',
    plan: 'PROFISSIONAL',
    status: 'ACTIVE',
    valor_mensal: 49,
    trial_ends_at: null,
    current_period_ends_at: null,
    canceled_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeRequest(body: unknown, token: string = TOKEN) {
  const { NextRequest } = jest.requireActual<typeof import('next/server')>('next/server');
  return new NextRequest('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': token,
    },
    body: JSON.stringify(body),
  });
}

function paymentPayload(event: string, extra: Record<string, unknown> = {}) {
  return {
    event,
    dateCreated: '2026-05-25',
    payment: {
      id: 'pay_001',
      customer: 'cus_1',
      subscription: 'sub_1',
      dueDate: '2026-05-25',
      ...extra,
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

let handler: typeof import('@/app/api/billing/webhook/route').POST;

beforeAll(async () => {
  process.env.ASAAS_WEBHOOK_TOKEN = TOKEN;
  const mod = await import('@/app/api/billing/webhook/route');
  handler = mod.POST;
});

afterAll(() => {
  delete process.env.ASAAS_WEBHOOK_TOKEN;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAlreadyProcessed.mockResolvedValue(false);
  mockGetBySubscription.mockResolvedValue(makeSub());
  mockGetByCustomer.mockResolvedValue(null);
  mockLogEvent.mockResolvedValue(undefined);
  mockUpdateStatus.mockResolvedValue(undefined);
});

describe('POST /api/billing/webhook — autenticação', () => {
  it('retorna 401 com token inválido', async () => {
    const req = makeRequest(paymentPayload('PAYMENT_RECEIVED'), 'wrong-token');
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('retorna 503 quando ASAAS_WEBHOOK_TOKEN não está configurado', async () => {
    const savedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    delete process.env.ASAAS_WEBHOOK_TOKEN;
    const req = makeRequest(paymentPayload('PAYMENT_RECEIVED'));
    const res = await handler(req);
    expect(res.status).toBe(503);
    process.env.ASAAS_WEBHOOK_TOKEN = savedToken;
  });
});

describe('POST /api/billing/webhook — roteamento de eventos', () => {
  it('PAYMENT_RECEIVED → ACTIVE com current_period_ends_at estendido', async () => {
    const req = makeRequest(paymentPayload('PAYMENT_RECEIVED'));
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'ACTIVE' }));
    const patch = mockUpdateStatus.mock.calls[0][1] as { current_period_ends_at: string };
    expect(new Date(patch.current_period_ends_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('PAYMENT_CONFIRMED → ACTIVE', async () => {
    const req = makeRequest(paymentPayload('PAYMENT_CONFIRMED'));
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'ACTIVE' }));
  });

  it('PAYMENT_OVERDUE → PAST_DUE', async () => {
    const req = makeRequest(paymentPayload('PAYMENT_OVERDUE'));
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith('user-1', { status: 'PAST_DUE' });
  });

  it('PAYMENT_CHARGEBACK_REQUESTED → BLOCKED', async () => {
    const req = makeRequest(paymentPayload('PAYMENT_CHARGEBACK_REQUESTED'));
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith('user-1', { status: 'BLOCKED' });
  });

  it('PAYMENT_CHARGEBACK_DISPUTE → BLOCKED', async () => {
    const req = makeRequest(paymentPayload('PAYMENT_CHARGEBACK_DISPUTE'));
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith('user-1', { status: 'BLOCKED' });
  });

  it('PAYMENT_REFUNDED → CANCELED com canceled_at', async () => {
    const req = makeRequest(paymentPayload('PAYMENT_REFUNDED'));
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'CANCELED' }));
  });

  it('SUBSCRIPTION_DELETED → CANCELED com canceled_at', async () => {
    const req = makeRequest({
      event: 'SUBSCRIPTION_DELETED',
      subscription: { id: 'sub_1', customer: 'cus_1' },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'CANCELED' }));
  });

  it('evento desconhecido → 200 sem updateStatus', async () => {
    const req = makeRequest(paymentPayload('PAYMENT_CREATED'));
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });
});

describe('POST /api/billing/webhook — deduplicação e erros', () => {
  it('retorna 200 skipped quando evento já foi processado', async () => {
    mockIsAlreadyProcessed.mockResolvedValue(true);
    const req = makeRequest(paymentPayload('PAYMENT_RECEIVED'));
    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBeDefined();
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it('retorna 200 com warning quando subscription não localizada', async () => {
    mockGetBySubscription.mockResolvedValue(null);
    mockGetByCustomer.mockResolvedValue(null);
    const req = makeRequest(paymentPayload('PAYMENT_RECEIVED'));
    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.warning).toMatch(/subscription/i);
  });

  it('retorna 400 com JSON inválido', async () => {
    const { NextRequest } = jest.requireActual<typeof import('next/server')>('next/server');
    const req = new NextRequest('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: { 'asaas-access-token': TOKEN },
      body: 'not-json',
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it('retorna 500 e loga quando updateStatus lança erro', async () => {
    mockUpdateStatus.mockRejectedValue(new Error('DB error'));
    const req = makeRequest(paymentPayload('PAYMENT_RECEIVED'));
    const res = await handler(req);
    expect(res.status).toBe(500);
    expect(mockCaptureException).toHaveBeenCalled();
  });
});