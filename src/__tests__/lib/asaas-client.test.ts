import { AsaasError, asaas } from '@/lib/asaas/client';

const FAKE_KEY = 'test-api-key';
const BASE_URL = 'https://api-sandbox.asaas.com/v3';

function mockFetch(status: number, body: unknown) {
  const text = JSON.stringify(body);
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(text),
  }) as jest.Mock;
}

beforeEach(() => {
  process.env.ASAAS_API_KEY = FAKE_KEY;
  process.env.ASAAS_BASE_URL = BASE_URL;
});

afterEach(() => {
  jest.resetAllMocks();
  delete process.env.ASAAS_API_KEY;
  delete process.env.ASAAS_BASE_URL;
});

describe('AsaasError', () => {
  it('constrói mensagem a partir dos errors', () => {
    const err = new AsaasError(400, [{ code: 'invalid', description: 'Campo inválido' }]);
    expect(err.message).toBe('Campo inválido');
    expect(err.status).toBe(400);
    expect(err.name).toBe('AsaasError');
  });

  it('usa fallback HTTP status quando errors está vazio', () => {
    const err = new AsaasError(500, []);
    expect(err.message).toBe('HTTP 500');
  });

  it('concatena múltiplos errors com ;', () => {
    const err = new AsaasError(422, [
      { code: 'e1', description: 'Erro 1' },
      { code: 'e2', description: 'Erro 2' },
    ]);
    expect(err.message).toBe('Erro 1; Erro 2');
  });
});

describe('asaas.get', () => {
  it('retorna dados em resposta 200', async () => {
    mockFetch(200, { id: 'cus_123', name: 'Test' });
    const data = await asaas.get<{ id: string }>('/customers/cus_123');
    expect(data).toEqual({ id: 'cus_123', name: 'Test' });
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/customers/cus_123`,
      expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ access_token: FAKE_KEY }) })
    );
  });

  it('lança AsaasError em resposta não-ok', async () => {
    mockFetch(404, { errors: [{ code: 'not_found', description: 'Não encontrado' }] });
    await expect(asaas.get('/customers/bad')).rejects.toBeInstanceOf(AsaasError);
  });

  it('lança erro quando ASAAS_API_KEY não está configurada', async () => {
    delete process.env.ASAAS_API_KEY;
    await expect(asaas.get('/customers')).rejects.toThrow('ASAAS_API_KEY');
  });
});

describe('asaas.post', () => {
  it('envia body como JSON e retorna dados', async () => {
    mockFetch(200, { id: 'sub_abc', status: 'ACTIVE' });
    const result = await asaas.post<{ id: string }>('/subscriptions', { customer: 'cus_1', value: 49 });
    expect(result).toEqual({ id: 'sub_abc', status: 'ACTIVE' });
    const call = (global.fetch as jest.Mock).mock.calls[0];
    const options = call[1] as RequestInit;
    expect(JSON.parse(options.body as string)).toEqual({ customer: 'cus_1', value: 49 });
  });

  it('lança AsaasError com detalhes do erro 422', async () => {
    mockFetch(422, { errors: [{ code: 'invalid_cpfCnpj', description: 'CPF inválido' }] });
    const err = await asaas.post('/customers', { cpfCnpj: '000' }).catch(e => e) as AsaasError;
    expect(err).toBeInstanceOf(AsaasError);
    expect(err.status).toBe(422);
    expect(err.errors[0].code).toBe('invalid_cpfCnpj');
  });
});

describe('asaas.delete', () => {
  it('aceita resposta 200 com body vazio', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(''),
    }) as jest.Mock;
    const result = await asaas.delete('/subscriptions/sub_1');
    expect(result).toBeNull();
  });
});