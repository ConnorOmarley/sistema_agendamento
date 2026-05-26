import * as Sentry from "@sentry/nextjs";
import { logger } from "./logger";

export type MonitoringLevel = "info" | "warn" | "error" | "fatal";

export function captureException(error: unknown, context?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({ err, ...context }, err.message);
  Sentry.captureException(err, { extra: context });
}

export function captureMessage(
  message: string,
  level: MonitoringLevel = "info",
  context?: Record<string, unknown>,
) {
  logger[level]({ ...context }, message);
  if (level === "error" || level === "fatal") {
    const sentryLevel = level === "fatal" ? "fatal" : "error";
    Sentry.captureMessage(message, { level: sentryLevel, extra: context });
  }
}

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
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
