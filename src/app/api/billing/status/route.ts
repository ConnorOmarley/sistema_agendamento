/**
 * GET /api/billing/status
 * Retorna o estado atual da assinatura do usuário logado.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSubscriptionByUserId, isAccessAllowed } from '@/lib/billing';

export async function GET(_request: NextRequest) {
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

  const sub = await getSubscriptionByUserId(user.id);
  if (!sub) {
    return NextResponse.json({ ok: true, subscription: null, accessAllowed: false });
  }

  const diasRestantesTrial = sub.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : null;

  return NextResponse.json({
    ok: true,
    subscription: {
      plan: sub.plan,
      status: sub.status,
      valor_mensal: sub.valor_mensal,
      trial_ends_at: sub.trial_ends_at,
      current_period_ends_at: sub.current_period_ends_at,
      diasRestantesTrial,
      hasAsaasSubscription: !!sub.asaas_subscription_id,
    },
    accessAllowed: isAccessAllowed(sub),
  });
}
