/**
 * Serviço de billing — orquestra Asaas + Supabase.
 *
 * Use SOMENTE em rotas server-side. Cria customer no Asaas se ainda não
 * existir, cria assinatura no cartão, e mantém a tabela `subscriptions` em sync.
 */

import { createAdminClient } from './supabase-admin';
import { createCustomer } from './asaas/customers';
import { createCreditCardSubscription, cancelSubscription as asaasCancelSub } from './asaas/subscriptions';
import type { AsaasCreditCardData, AsaasCreditCardHolderInfo } from './asaas/types';

export type SubscriptionStatus =
  | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'BLOCKED' | 'CANCELED' | 'EXPIRED';
export type SubscriptionPlan = 'FREE' | 'PROFISSIONAL' | 'ESTUDIO';

export interface SubscriptionRow {
  id: string;
  user_id: string;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  valor_mensal: number;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

const PLANO_VALOR: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PROFISSIONAL: 49.00,
  ESTUDIO: 89.00,
};

export async function getSubscriptionByUserId(userId: string): Promise<SubscriptionRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as SubscriptionRow | null;
}

export async function getSubscriptionByAsaasCustomer(asaasCustomerId: string): Promise<SubscriptionRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .eq('asaas_customer_id', asaasCustomerId)
    .maybeSingle();
  return data as SubscriptionRow | null;
}

export async function getSubscriptionByAsaasSubscription(asaasSubscriptionId: string): Promise<SubscriptionRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .eq('asaas_subscription_id', asaasSubscriptionId)
    .maybeSingle();
  return data as SubscriptionRow | null;
}

/**
 * Garante que o usuário tem um customer no Asaas, criando se necessário.
 * Idempotente: se já existe asaas_customer_id na linha, reusa.
 */
export async function ensureAsaasCustomer(
  userId: string,
  data: { nome: string; email: string; cpfCnpj: string; telefone?: string }
): Promise<string> {
  const admin = createAdminClient();
  const sub = await getSubscriptionByUserId(userId);

  if (sub?.asaas_customer_id) return sub.asaas_customer_id;

  const customer = await createCustomer({
    name: data.nome,
    email: data.email,
    cpfCnpj: data.cpfCnpj,
    mobilePhone: data.telefone,
    externalReference: userId,
  });

  await admin
    .from('subscriptions')
    .update({ asaas_customer_id: customer.id })
    .eq('user_id', userId);

  return customer.id;
}

interface SubscribeInput {
  userId: string;
  plan: 'PROFISSIONAL' | 'ESTUDIO';
  holder: {
    nome: string;
    email: string;
    cpfCnpj: string;
    telefone: string;
    cep: string;
    numero: string;
    complemento?: string;
  };
  creditCard: AsaasCreditCardData;
  remoteIp: string;
}

/**
 * Cria a assinatura recorrente. Se o trial ainda não acabou, a primeira
 * cobrança fica para o dia em que o trial expira; caso contrário, hoje.
 */
export async function subscribeWithCreditCard(input: SubscribeInput): Promise<SubscriptionRow> {
  const admin = createAdminClient();
  const sub = await getSubscriptionByUserId(input.userId);
  if (!sub) throw new Error('Subscription row não encontrada — registre o usuário primeiro');

  // 1. Garante customer no Asaas
  const customerId = await ensureAsaasCustomer(input.userId, {
    nome: input.holder.nome,
    email: input.holder.email,
    cpfCnpj: input.holder.cpfCnpj,
    telefone: input.holder.telefone,
  });

  // 2. Define primeira cobrança: trial restante ou hoje
  const hoje = new Date();
  const fimTrial = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;
  const primeiraCobranca = fimTrial && fimTrial > hoje ? fimTrial : hoje;
  const nextDueDate = primeiraCobranca.toISOString().slice(0, 10);

  // 3. Monta holder info
  const holderInfo: AsaasCreditCardHolderInfo = {
    name: input.holder.nome,
    email: input.holder.email,
    cpfCnpj: input.holder.cpfCnpj,
    postalCode: input.holder.cep,
    addressNumber: input.holder.numero,
    addressComplement: input.holder.complemento,
    phone: input.holder.telefone,
    mobilePhone: input.holder.telefone,
  };

  // 4. Cria assinatura no Asaas
  const asaasSub = await createCreditCardSubscription({
    customerId,
    value: PLANO_VALOR[input.plan],
    nextDueDate,
    description: `Acompanha — Plano ${input.plan === 'PROFISSIONAL' ? 'Profissional' : 'Estúdio'}`,
    creditCard: input.creditCard,
    creditCardHolderInfo: holderInfo,
    remoteIp: input.remoteIp,
    externalReference: input.userId,
  });

  // 5. Atualiza linha local
  const { data } = await admin
    .from('subscriptions')
    .update({
      asaas_subscription_id: asaasSub.id,
      plan: input.plan,
      valor_mensal: PLANO_VALOR[input.plan],
      // Mantém status TRIALING até o webhook PAYMENT_RECEIVED confirmar a 1ª cobrança
      status: sub.status === 'EXPIRED' ? 'ACTIVE' : sub.status,
      current_period_ends_at: nextDueDate,
    })
    .eq('user_id', input.userId)
    .select()
    .single();

  return data as SubscriptionRow;
}

export async function cancelUserSubscription(userId: string): Promise<void> {
  const admin = createAdminClient();
  const sub = await getSubscriptionByUserId(userId);
  if (!sub) throw new Error('Subscription não encontrada');

  if (sub.asaas_subscription_id) {
    await asaasCancelSub(sub.asaas_subscription_id);
  }

  await admin
    .from('subscriptions')
    .update({
      status: 'CANCELED',
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Registra evento no audit log (usado pelo webhook).
 */
export async function logSubscriptionEvent(
  subscriptionId: string | null,
  userId: string | null,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  await admin.from('subscription_events').insert({
    subscription_id: subscriptionId,
    user_id: userId,
    event_type: eventType,
    asaas_payload: payload,
  });
}

/**
 * Atualiza status da assinatura. Usado pelos handlers do webhook.
 */
export async function updateSubscriptionStatus(
  userId: string,
  patch: Partial<Pick<SubscriptionRow, 'status' | 'current_period_ends_at' | 'canceled_at' | 'asaas_subscription_id'>>
): Promise<void> {
  const admin = createAdminClient();
  await admin.from('subscriptions').update(patch).eq('user_id', userId);
}

/**
 * Helper de access control: indica se o usuário pode acessar o dashboard.
 */
export function isAccessAllowed(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  if (sub.status === 'TRIALING' && sub.trial_ends_at) {
    return new Date(sub.trial_ends_at) > new Date();
  }
  return sub.status === 'ACTIVE' || sub.status === 'PAST_DUE' || sub.status === 'CANCELED';
}
