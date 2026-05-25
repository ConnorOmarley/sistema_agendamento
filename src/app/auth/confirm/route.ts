/**
 * GET /auth/confirm
 *
 * Endpoint que finaliza a confirmação de email do Supabase E já loga o usuário.
 *
 * O Supabase manda email com link tipo:
 *   {{SITE_URL}}/auth/confirm?token_hash={{TOKEN_HASH}}&type=signup
 *
 * Aqui chamamos verifyOtp() no server-side com @supabase/ssr, o que:
 *   1. Confirma o email
 *   2. Cria sessão via cookies httpOnly (logado de verdade)
 *   3. Redireciona pro dashboard
 *
 * Esse handler tambem cobre os tipos:
 *   - signup        (confirmação inicial)
 *   - email_change  (troca de email)
 *   - magiclink     (login sem senha — se ativarmos no futuro)
 *   - recovery      (reset de senha — fluxo diferente, redirecionamos pra /reset-password)
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=confirm_invalido`);
  }

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

  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    // Token expirado, já usado, ou inválido
    return NextResponse.redirect(`${origin}/login?error=confirm_expirado`);
  }

  // Recovery (reset de senha) tem fluxo próprio
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  // Sucesso: email confirmado + sessão criada via cookies. Vai direto pro dashboard.
  return NextResponse.redirect(`${origin}${next}?confirmado=1`);
}
