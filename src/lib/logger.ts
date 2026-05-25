/**
 * Logger estruturado — Pino com redação automática de campos sensíveis.
 *
 * Uso em rotas API:
 *   const log = createRequestLogger(crypto.randomUUID(), user.id);
 *   log.info({ plan }, 'subscription criada');
 *   log.error({ err }, 'falha ao cancelar');
 *
 * Em prod a saída é JSON puro (Vercel/stdout captura).
 * Em dev, JSON também — pipe pra `npx pino-pretty` se quiser formatação visual.
 *
 * Campos NUNCA logados (redact automático + sanitize manual):
 *   password, senha, token, access_token, authorization, cookie,
 *   creditCard, cpfCnpj, cpf, cnpj, cvv, ccv, secret, apiKey
 */

import pino from 'pino';

// ── Paths redactados pelo pino em todos os objetos logados ────────────────────
// Usa fast-redact: path exato dentro do objeto que chega ao logger.
// Para campos aninhados em payloads arbitrários, use sanitize() antes de logar.
const REDACT_PATHS = [
  'password',
  'senha',
  'token',
  'access_token',
  'authorization',
  'cookie',
  'cookies',
  'creditCard',
  'creditCard.number',
  'creditCard.ccv',
  'creditCard.cvv',
  'creditCard.holderName',
  'holder.cpfCnpj',
  'cpfCnpj',
  'cpf',
  'cnpj',
  'secret',
  'apiKey',
  'api_key',
  'privateKey',
  // Supabase internals
  'supabaseKey',
  'serviceRoleKey',
];

const SENSITIVE_KEYS = new Set([
  'password', 'senha', 'token', 'access_token', 'authorization',
  'cookie', 'cookies', 'creditcard', 'cpfcnpj', 'cpf', 'cnpj',
  'cvv', 'ccv', 'secret', 'apikey', 'api_key', 'privatekey',
  'supabasekey', 'servicerolekey', 'number', // card number
]);

/**
 * Sanitiza objeto recursivamente: substitui chaves sensíveis por '[REDACTED]'.
 * Use antes de logar payloads externos (webhooks, bodies de request).
 */
export function sanitize<T>(obj: T, depth = 0): T {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item, depth + 1)) as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = sanitize(value, depth + 1);
    }
  }
  return clean as T;
}

// ── Logger raiz ───────────────────────────────────────────────────────────────

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  base: { service: 'acompanha' },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) { return { level: label }; },
    // Serializa erros nativos com stack trace
    log(obj) { return obj; },
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
});

// ── Logger de request ─────────────────────────────────────────────────────────

export type RequestLogger = pino.Logger;

/**
 * Cria um logger filho vinculado a uma requisição específica.
 * requestId garante correlação entre todos os logs de um fluxo.
 */
export function createRequestLogger(
  requestId: string,
  context?: { userId?: string; action?: string },
): RequestLogger {
  return logger.child({ requestId, ...context });
}