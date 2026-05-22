/**
 * Bloqueio temporário client-side após tentativas de login falhadas.
 *
 * Defesa-em-profundidade: o Supabase já aplica rate-limit no servidor (~30 req/5min
 * por IP). Esta camada adiciona UX (mensagem clara para o usuário) e desestimula
 * abuso casual no mesmo navegador. Não substitui WAF/rate-limit server-side.
 *
 * Política:
 *   5 falhas  →  30 s bloqueado
 *   10 falhas →   5 min
 *   15 falhas →  30 min
 * Contador zera após 1h de inatividade ou após login bem-sucedido.
 */

const STORAGE_PREFIX = 'login-throttle:';
const STALE_AFTER_MS = 60 * 60 * 1000; // 1 hora

type ThrottleState = {
  failures: number;
  lockedUntil: number | null;
  lastFailureAt: number;
};

function storageKey(email: string): string {
  return STORAGE_PREFIX + email.trim().toLowerCase();
}

function read(email: string): ThrottleState | null {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ThrottleState;
    if (Date.now() - parsed.lastFailureAt > STALE_AFTER_MS) {
      localStorage.removeItem(storageKey(email));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function write(email: string, state: ThrottleState): void {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(state));
  } catch {
    // ignore quota / privacy modes
  }
}

function durationForFailures(failures: number): number {
  if (failures >= 15) return 30 * 60 * 1000;
  if (failures >= 10) return 5 * 60 * 1000;
  if (failures >= 5) return 30 * 1000;
  return 0;
}

export type ThrottleCheck =
  | { locked: false }
  | { locked: true; remainingMs: number; remainingLabel: string };

export function checkThrottle(email: string): ThrottleCheck {
  const state = read(email);
  if (!state || !state.lockedUntil) return { locked: false };
  const remaining = state.lockedUntil - Date.now();
  if (remaining <= 0) return { locked: false };
  return { locked: true, remainingMs: remaining, remainingLabel: formatRemaining(remaining) };
}

export function recordFailure(email: string): ThrottleCheck {
  const prev = read(email) ?? { failures: 0, lockedUntil: null, lastFailureAt: Date.now() };
  const failures = prev.failures + 1;
  const lockMs = durationForFailures(failures);
  const next: ThrottleState = {
    failures,
    lockedUntil: lockMs > 0 ? Date.now() + lockMs : null,
    lastFailureAt: Date.now(),
  };
  write(email, next);
  if (next.lockedUntil) {
    const remaining = next.lockedUntil - Date.now();
    return { locked: true, remainingMs: remaining, remainingLabel: formatRemaining(remaining) };
  }
  return { locked: false };
}

export function clearThrottle(email: string): void {
  try {
    localStorage.removeItem(storageKey(email));
  } catch {
    // ignore
  }
}

function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec} segundo${totalSec === 1 ? '' : 's'}`;
  const min = Math.ceil(totalSec / 60);
  return `${min} minuto${min === 1 ? '' : 's'}`;
}
