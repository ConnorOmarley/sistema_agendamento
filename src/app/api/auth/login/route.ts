/**
 * POST /api/auth/login
 *
 * Envelope server-side do supabase.auth.signInWithPassword com rate limit
 * por email + IP. Substitui a chamada direta do client-side, que era
 * bypassável via curl.
 *
 * Setup de cookies via @supabase/ssr — quando o login dá certo, a sessão
 * fica disponível em todas as próximas requisições (proxy, server components).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkLoginThrottle, recordLoginAttempt } from '@/lib/login-throttle-server';

function captureIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || null;
  return ip;
}

export async function POST(request: NextRequest) {
  let body: { email?: string; senha?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }

  const email = (body.email || '').trim().toLowerCase();
  const senha = body.senha || '';

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!email || !senha || !emailValido) {
    return NextResponse.json({ ok: false, error: 'E-mail e senha obrigatórios' }, { status: 400 });
  }

  const ip = captureIp(request);

  // 1. Pre-check rate limit
  const pre = await checkLoginThrottle(email, ip);
  if (pre.blocked) {
    return NextResponse.json(
      { ok: false, error: pre.reason, retryAfterSeconds: pre.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(pre.retryAfterSeconds) } }
    );
  }

  // 2. Tenta login via Supabase. createServerClient + cookies ajustam a sessão.
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  // 3. Registra tentativa (sucesso ou falha)
  await recordLoginAttempt(email, ip, !error);

  if (error) {
    // Re-check após falha — o usuário pode ter cruzado o threshold com essa tentativa
    const pos = await checkLoginThrottle(email, ip);
    if (pos.blocked) {
      return NextResponse.json(
        { ok: false, error: pos.reason, retryAfterSeconds: pos.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(pos.retryAfterSeconds) } }
      );
    }

    // Mensagem genérica — evita enumeration (atacante saber se email existe ou não)
    const msg = error.message === 'Email not confirmed'
      ? 'Por favor, confirme o seu e-mail antes de fazer login.'
      : 'E-mail ou senha incorretos.';
    return NextResponse.json({ ok: false, error: msg }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: { id: data.user?.id, email: data.user?.email } });
}
