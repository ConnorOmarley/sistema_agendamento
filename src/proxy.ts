import { NextRequest, NextResponse } from 'next/server';
import { createProxyClient } from '@/lib/supabase-server';

const PROTECTED_PREFIXES = ['/dashboard'];
// Páginas só acessíveis quando deslogado (logado é redirecionado para o dashboard).
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];
// /reset-password é especial: o usuário PRECISA estar com sessão temporária do link.
// Não bloqueia logado nem deslogado — deixa a página decidir.

// Páginas do dashboard acessíveis mesmo com assinatura expirada/bloqueada.
// O usuário precisa poder cancelar ou contratar um plano para sair do bloqueio.
const ALLOWED_WHEN_BLOCKED = ['/dashboard/upgrade', '/dashboard/configuracoes'];

function isAccessAllowed(sub: { status: string; trial_ends_at: string | null; current_period_ends_at: string | null } | null): boolean {
  if (!sub) return false;
  if (sub.status === 'TRIALING' && sub.trial_ends_at) {
    return new Date(sub.trial_ends_at) > new Date();
  }
  // CANCELED: mantém acesso até fim do período pago, depois bloqueia
  if (sub.status === 'CANCELED') {
    return !!sub.current_period_ends_at && new Date(sub.current_period_ends_at) > new Date();
  }
  return sub.status === 'ACTIVE' || sub.status === 'PAST_DUE';
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createProxyClient(request, response);

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Gate de assinatura: usuário logado em rota /dashboard sem acesso → /upgrade
  if (isProtected && user) {
    const allowedWhenBlocked = ALLOWED_WHEN_BLOCKED.some(p => pathname === p || pathname.startsWith(`${p}/`));
    if (!allowedWhenBlocked) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_ends_at, current_period_ends_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isAccessAllowed(sub)) {
        return NextResponse.redirect(new URL('/dashboard/upgrade', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};