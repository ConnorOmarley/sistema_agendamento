/**
 * Rate limit server-side de login.
 *
 * Regras escalonadas (mesmo padrão do client-side, mas inviolável):
 *   5 falhas em 30 segundos    -> bloqueia 30 segundos
 *   10 falhas em 5 minutos     -> bloqueia 5 minutos
 *   15 falhas em 30 minutos    -> bloqueia 30 minutos
 *
 * Conta separadamente por email (anti força bruta direcionado)
 * E por IP (anti scan de emails — pega quando atacante varia o email).
 */

import { createAdminClient } from './supabase-admin';

interface ThrottleCheck {
  blocked: boolean;
  retryAfterSeconds: number;
  reason?: string;
}

const REGRAS = [
  { janelaMs: 30_000,     limite: 5,  bloqueioSeg: 30 },
  { janelaMs: 5 * 60_000, limite: 10, bloqueioSeg: 5 * 60 },
  { janelaMs: 30 * 60_000, limite: 15, bloqueioSeg: 30 * 60 },
];

async function contarFalhas(
  admin: ReturnType<typeof createAdminClient>,
  filtro: { email?: string; ip?: string },
  desde: Date
): Promise<number> {
  let q = admin
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('success', false)
    .gte('created_at', desde.toISOString());

  if (filtro.email) q = q.eq('email', filtro.email.toLowerCase());
  if (filtro.ip) q = q.eq('ip', filtro.ip);

  const { count } = await q;
  return count || 0;
}

export async function checkLoginThrottle(email: string, ip: string | null): Promise<ThrottleCheck> {
  const admin = createAdminClient();
  const agora = Date.now();

  for (const regra of REGRAS) {
    const desde = new Date(agora - regra.janelaMs);

    const [falhasEmail, falhasIp] = await Promise.all([
      contarFalhas(admin, { email }, desde),
      ip ? contarFalhas(admin, { ip }, desde) : Promise.resolve(0),
    ]);

    if (falhasEmail >= regra.limite) {
      return {
        blocked: true,
        retryAfterSeconds: regra.bloqueioSeg,
        reason: `Muitas tentativas para este e-mail. Aguarde ${Math.ceil(regra.bloqueioSeg / 60) || regra.bloqueioSeg} ${regra.bloqueioSeg >= 60 ? 'min' : 'seg'}.`,
      };
    }
    if (falhasIp >= regra.limite * 3) {
      // Triplica o limite por IP — IPs compartilhados (NAT, café, escola) batem em vários emails legítimos.
      return {
        blocked: true,
        retryAfterSeconds: regra.bloqueioSeg,
        reason: 'Muitas tentativas a partir desta rede. Aguarde um pouco.',
      };
    }
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export async function recordLoginAttempt(email: string, ip: string | null, success: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin.from('login_attempts').insert({
    email: email.toLowerCase(),
    ip,
    success,
  });

  // Best-effort cleanup (1% das chamadas) — evita acúmulo sem precisar de pg_cron
  if (Math.random() < 0.01) {
    try { await admin.rpc('cleanup_old_login_attempts'); } catch { /* ignore */ }
  }
}
