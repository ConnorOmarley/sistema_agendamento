/**
 * Camada de monitoramento de erros.
 *
 * Mantém a API pública estável (captureException / captureMessage / safeAsync)
 * para que os call sites não precisem mudar quando o provedor mudar.
 * Internamente usa o logger estruturado (Pino) com saída JSON.
 *
 * Para ativar Sentry em produção:
 *   1. npm install @sentry/nextjs
 *   2. npx @sentry/wizard@latest -i nextjs
 *   3. Descomente os blocos Sentry abaixo
 *   4. Configure SENTRY_DSN no .env.local
 */

import { logger } from './logger';

// import * as Sentry from '@sentry/nextjs';
const sentryDsn = process.env.SENTRY_DSN || '';

export type MonitoringLevel = 'info' | 'warn' | 'error' | 'fatal';

/**
 * Captura uma exceção com contexto estruturado.
 * Nunca inclua senhas, tokens ou dados de cartão no context.
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({ err, ...context }, err.message);

  if (sentryDsn) {
    // Sentry.captureException(err, { extra: context });
  }
}

/**
 * Captura mensagem de log com nível explícito.
 */
export function captureMessage(
  message: string,
  level: MonitoringLevel = 'info',
  context?: Record<string, unknown>,
) {
  logger[level]({ ...context }, message);

  if (sentryDsn && (level === 'error' || level === 'fatal')) {
    // Sentry.captureMessage(message, { level, extra: context });
  }
}

/**
 * Wrapper para handlers async com erro padronizado.
 * Loga automaticamente sem vazar stack trace pro client.
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: { operation: string; [k: string]: unknown },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    captureException(err, context);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}