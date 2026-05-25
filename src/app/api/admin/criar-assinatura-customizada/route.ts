/**
 * POST /api/admin/criar-assinatura-customizada
 *
 * Cria uma assinatura no Asaas com VALOR CUSTOMIZADO (fora dos planos padrão).
 * Caso de uso primário: founder pricing (R$ 29,90 vitalício pros primeiros 10).
 *
 * Fluxo:
 * 1. Valida que o caller é admin (user_metadata.is_admin === true)
 * 2. Garante customer no Asaas (cria se não existir)
 * 3. Gera link de pagamento da assinatura no Asaas
 * 4. Retorna o link pra você mandar pra cliente
 *
 * A cliente paga via link (Asaas hospeda o checkout, sem PCI no nosso lado).
 * O webhook PAYMENT_RECEIVED dispara automático e atualiza nossa subscription.
 *
 * IMPORTANTE: este endpoint NÃO recebe dados de cartão. Asaas cuida do checkout.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as z from 'zod';
import { createAdminClient } from '@/lib/supabase-admin';
import { createCustomer } from '@/lib/asaas/customers';
import { asaas } from '@/lib/asaas/client';
import { AsaasError } from '@/lib/asaas/client';
import { isValidCpfCnpj } from '@/lib/cpf-cnpj';
import { captureException } from '@/lib/monitoring';
import type { AsaasSubscription } from '@/lib/asaas/types';

const schema = z.object({
  emailCliente: z.string().email('E-mail inválido'),
  nome: z.string().min(3),
  cpfCnpj: z.string().refine(isValidCpfCnpj, 'CPF/CNPJ inválido'),
  telefone: z.string().min(10),
  valorMensal: z.number().positive().min(1).max(999),
  descricao: z.string().min(3).max(120),
});

export async function POST(request: NextRequest) {
  // 1. Auth
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

  // 2. Gate admin — usa app_metadata (só gravável via service role).
  //    user_metadata é gravável pelo próprio usuário e NÃO deve ser usado para gates de privilégio.
  const isAdmin = (user.app_metadata as import('@/types/domain').SupabaseAppMetadata | null)?.is_admin === true;
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  // 3. Parse + validate
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Dados inválidos', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { emailCliente, nome, cpfCnpj, telefone, valorMensal, descricao } = parsed.data;

  // Declarado fora do try para ficar disponível no catch sem expor PII (emailCliente)
  let resolvedUserId: string | null = null;

  try {
    const admin = createAdminClient();

    // 4. Localiza a conta da cliente por e-mail via função SQL (SECURITY DEFINER).
    //    Evita listUsers() que retorna todos os usuários do sistema.
    const { data: clienteId, error: lookupErr } = await admin
      .rpc('get_user_id_by_email', { email_input: emailCliente.toLowerCase() });
    if (lookupErr) throw lookupErr;
    if (!clienteId) {
      return NextResponse.json(
        { ok: false, error: `Cliente ${emailCliente} ainda não tem conta no sistema. Peça pra ela criar primeiro em /register.` },
        { status: 404 }
      );
    }

    // Monta objeto mínimo compatível com o restante do fluxo
    const cliente = { id: clienteId as string, email: emailCliente };
    resolvedUserId = cliente.id; // disponível no catch sem expor emailCliente

    // 5. Garante subscription row local (trigger já cria no signup, mas defensivo)
    const { data: subExistente } = await admin
      .from('subscriptions')
      .select('asaas_customer_id, asaas_subscription_id')
      .eq('user_id', cliente.id)
      .maybeSingle();

    // 6. Cria customer no Asaas se ainda não existir
    let asaasCustomerId = subExistente?.asaas_customer_id;
    if (!asaasCustomerId) {
      const novoCustomer = await createCustomer({
        name: nome,
        email: emailCliente,
        cpfCnpj,
        mobilePhone: telefone,
        externalReference: cliente.id,
      });
      asaasCustomerId = novoCustomer.id;

      await admin
        .from('subscriptions')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('user_id', cliente.id);
    }

    // 7. Cria assinatura UNDEFINED (cliente escolhe forma de pagamento via link)
    //    nextDueDate = amanhã (Asaas envia cobrança automaticamente)
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextDueDate = amanha.toISOString().slice(0, 10);

    const novaAssinatura = await asaas.post<AsaasSubscription>('/subscriptions', {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // cliente escolhe (cartão/PIX/boleto) no checkout
      cycle: 'MONTHLY',
      value: valorMensal,
      nextDueDate,
      description: descricao,
      externalReference: cliente.id,
    });

    // 8. Atualiza subscription local
    await admin
      .from('subscriptions')
      .update({
        asaas_subscription_id: novaAssinatura.id,
        valor_mensal: valorMensal,
        plan: 'PROFISSIONAL', // founders ficam no plano profissional com valor customizado
        // Status fica TRIALING até PAYMENT_RECEIVED virar ACTIVE via webhook
      })
      .eq('user_id', cliente.id);

    // 9. Gera link de pagamento da primeira cobrança
    //    Asaas cria payment automaticamente pra cada assinatura — buscamos o link da próxima cobrança
    const proximasCobrancas = await asaas.get<{ data: Array<{ id: string; invoiceUrl: string }> }>(
      `/subscriptions/${novaAssinatura.id}/payments`
    );
    const primeiroLink = proximasCobrancas.data?.[0]?.invoiceUrl;

    return NextResponse.json({
      ok: true,
      subscription: {
        id: novaAssinatura.id,
        valor: valorMensal,
        cycle: 'MONTHLY',
        nextDueDate,
      },
      cliente: {
        userId: cliente.id,
        email: emailCliente,
        asaasCustomerId,
      },
      linkPagamento: primeiroLink || null,
      mensagem: primeiroLink
        ? `Manda esse link pra cliente: ${primeiroLink}`
        : 'Assinatura criada. Veja painel Asaas pra link de pagamento.',
    });
  } catch (err) {
    // emailCliente é PII — usamos apenas o userId para correlação nos logs
    captureException(err, { operation: 'admin_criar_assinatura_customizada', userId: resolvedUserId ?? 'unknown' });
    if (err instanceof AsaasError) {
      return NextResponse.json(
        { ok: false, error: 'Asaas rejeitou a operação', detalhes: err.errors },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
