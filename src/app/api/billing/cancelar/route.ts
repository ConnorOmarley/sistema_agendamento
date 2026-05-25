/**
 * POST /api/billing/cancelar
 * Cancela a assinatura do usuário logado no Asaas e marca status local como CANCELED.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cancelUserSubscription } from '@/lib/billing';
import { AsaasError } from '@/lib/asaas/client';
import { createRequestLogger } from '@/lib/logger';
import { captureException } from '@/lib/monitoring';

export async function POST(_request: NextRequest) {
  const log = createRequestLogger(crypto.randomUUID(), { action: 'billing.cancelar' });
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
  }

  try {
    await cancelUserSubscription(user.id);
    log.info({ userId: user.id }, 'assinatura cancelada');
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AsaasError) {
      log.warn({ userId: user.id, asaasErrors: err.errors }, 'Asaas rejeitou cancelamento');
      return NextResponse.json({ ok: false, error: err.message, detalhes: err.errors }, { status: 422 });
    }
    captureException(err, { operation: 'billing.cancelar', userId: user.id });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
