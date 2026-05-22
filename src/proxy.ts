import { NextRequest, NextResponse } from 'next/server';
import { createProxyClient } from '@/lib/supabase-server';

const PROTECTED_PREFIXES = ['/dashboard'];
// Páginas só acessíveis quando deslogado (logado é redirecionado para o dashboard).
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];
// /reset-password é especial: o usuário PRECISA estar com sessão temporária do link.
// Não bloqueia logado nem deslogado — deixa a página decidir.

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

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};