/**
 * Cliente HTTP base para a API v3 do Asaas.
 *
 * Auth: header `access_token` (não é Bearer).
 * Erros: vêm como `{ errors: [{ code, description }] }`.
 *
 * Sandbox vs Produção controlado por ASAAS_BASE_URL.
 *   Sandbox:   https://api-sandbox.asaas.com/v3
 *   Produção:  https://api.asaas.com/v3
 */

export interface AsaasErrorItem {
  code: string;
  description: string;
}

export class AsaasError extends Error {
  status: number;
  errors: AsaasErrorItem[];

  constructor(status: number, errors: AsaasErrorItem[], message?: string) {
    super(message || errors.map(e => e.description).join('; ') || `HTTP ${status}`);
    this.name = 'AsaasError';
    this.status = status;
    this.errors = errors;
  }
}

function getConfig() {
  const apiKey = process.env.ASAAS_API_KEY;
  const baseUrl = process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3';
  if (!apiKey) {
    throw new Error('ASAAS_API_KEY não configurada no .env.local');
  }
  return { apiKey, baseUrl };
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const { apiKey, baseUrl } = getConfig();

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'Acompanha/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Asaas pode retornar 200 com body vazio para DELETE
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const errors: AsaasErrorItem[] = data?.errors || [
      { code: String(res.status), description: data?.message || res.statusText }
    ];
    throw new AsaasError(res.status, errors);
  }

  return data as T;
}

export const asaas = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: Record<string, unknown>) => request<T>('POST', path, body),
  put: <T>(path: string, body: Record<string, unknown>) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
