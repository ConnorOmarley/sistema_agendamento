/**
 * Camada de monitoramento de erros.
 *
 * Por padrão é um stub que loga no console em dev. Quando o produto for pra
 * produção com cliente real, ative o Sentry:
 *
 *   1. npm install @sentry/nextjs
 *   2. Rode o wizard: npx @sentry/wizard@latest -i nextjs
 *   3. Substitua as implementações abaixo por:
 *        import * as Sentry from '@sentry/nextjs';
 *        Sentry.captureException(err, { extra: context });
 *        Sentry.captureMessage(message, level);
 *   4. Configure SENTRY_DSN no .env.local
 *
 * Usar essa camada (em vez de chamar Sentry direto) facilita a troca futura
 * pra outro provedor (Bugsnag, Datadog, Highlight, etc.) sem precisar mexer
 * nos call sites.
 */

const isDev = process.env.NODE_ENV === 'development';
const sentryDsn = process.env.SENTRY_DSN || '';

type Level = 'info' | 'warning' | 'error';

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (isDev) {
    console.error('[monitoring]', error, context);
    return;
  }
  if (sentryDsn) {
    // TODO: descomente após instalar @sentry/nextjs
    // Sentry.captureException(error, { extra: context });
  }
  // Em prod sem DSN, ainda escrevemos no log do servidor (Vercel captura)
  console.error('[monitoring]', error, context);
}

export function captureMessage(message: string, level: Level = 'info', context?: Record<string, unknown>) {
  if (isDev) {
    console.log(`[monitoring:${level}]`, message, context || '');
    return;
  }
  if (sentryDsn) {
    // TODO: Sentry.captureMessage(message, { level, extra: context });
  }
  if (level === 'error' || level === 'warning') {
    console[level === 'error' ? 'error' : 'warn']('[monitoring]', message, context);
  }
}

/**
 * Wraps async handler com tratamento de erro padronizado.
 * Útil pra rotas API onde queremos logar mas não vazar stack pro client.
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: { operation: string; [k: string]: unknown }
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
