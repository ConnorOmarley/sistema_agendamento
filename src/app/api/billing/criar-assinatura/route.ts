/**
 * POST /api/billing/criar-assinatura
 *
 * Cria a assinatura recorrente no cartão para o usuário logado.
 * Não persiste dados do cartão — apenas repassa para o Asaas.
 *
 * Body esperado: ver schema Zod abaixo.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as z from 'zod';
import { subscribeWithCreditCard } from '@/lib/billing';
import { AsaasError } from '@/lib/asaas/client';
import { isValidCpfCnpj } from '@/lib/cpf-cnpj';
import { createRequestLogger } from '@/lib/logger';
import { captureException } from '@/lib/monitoring';

const schema = z.object({
  plan: z.enum(['PROFISSIONAL', 'ESTUDIO']),
  holder: z.object({
    nome: z.string().min(3),
    email: z.string().email(),
    cpfCnpj: z.string().refine(isValidCpfCnpj, 'CPF ou CNPJ inválido'),
    telefone: z.string().min(10),
    cep: z.string().min(8),
    numero: z.string().min(1),
    complemento: z.string().optional(),
  }),
  creditCard: z.object({
    holderName: z.string().min(3),
    number: z.string().min(13).max(19),
    expiryMonth: z.string().min(1).max(2),
    expiryYear: z.string().min(2).max(4),
    ccv: z.string().min(3).max(4),
  }),
});

export async function POST(request: NextRequest) {
  const log = createRequestLogger(crypto.randomUUID(), { action: 'billing.criar-assinatura' });

  // 1. Auth — usuário tem que estar logado
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

  // 2. Parse + valida body
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 });
  }

  // 3. Captura IP do cliente para anti-fraude do Asaas
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const remoteIp = forwardedFor.split(',')[0].trim() || request.headers.get('x-real-ip') || '127.0.0.1';

  // 4. Cria assinatura
  try {
    const sub = await subscribeWithCreditCard({
      userId: user.id,
      plan: parsed.data.plan,
      holder: parsed.data.holder,
      creditCard: parsed.data.creditCard,
      remoteIp,
    });

    log.info({ userId: user.id, plan: sub.plan, status: sub.status }, 'assinatura criada');
    return NextResponse.json({
      ok: true,
      subscription: {
        id: sub.id,
        status: sub.status,
        plan: sub.plan,
        valor_mensal: sub.valor_mensal,
        trial_ends_at: sub.trial_ends_at,
        current_period_ends_at: sub.current_period_ends_at,
      },
    });
  } catch (err) {
    if (err instanceof AsaasError) {
      log.warn({ userId: user.id, asaasErrors: err.errors }, 'Asaas rejeitou criação de assinatura');
      return NextResponse.json(
        { ok: false, error: 'Asaas rejeitou a operação', detalhes: err.errors },
        { status: 422 }
      );
    }
    captureException(err, { operation: 'billing.criar-assinatura', userId: user.id });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
