/**
 * POST /api/billing/webhook
 *
 * Recebe notificações do Asaas. Eventos tratados:
 *   - PAYMENT_RECEIVED / PAYMENT_CONFIRMED -> ACTIVE + estende current_period_ends_at
 *   - PAYMENT_OVERDUE                     -> PAST_DUE (sem bloquear ainda)
 *   - PAYMENT_CHARGEBACK_REQUESTED        -> BLOCKED (corta acesso na hora)
 *   - PAYMENT_CHARGEBACK_DISPUTE          -> BLOCKED
 *   - PAYMENT_REFUNDED                    -> CANCELED
 *   - SUBSCRIPTION_DELETED                -> CANCELED
 *
 * Segurança: o Asaas envia o header `asaas-access-token` com o valor que
 * configuramos no painel de webhooks. Validamos contra ASAAS_WEBHOOK_TOKEN.
 *
 * Idempotência: todo evento é logado em `subscription_events`. Reentregas
 * do mesmo evento não criam dano porque os updates são idempotentes
 * (status change + period extension).
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  getSubscriptionByAsaasCustomer,
  getSubscriptionByAsaasSubscription,
  logSubscriptionEvent,
  updateSubscriptionStatus,
  isEventAlreadyProcessed,
  type SubscriptionRow,
} from '@/lib/billing';
import type { AsaasWebhookPayload } from '@/lib/asaas/types';
import { captureException } from '@/lib/monitoring';

function nextDueDatePlus30(currentDueDate: string): string {
  const d = new Date(currentDueDate + 'T12:00:00');
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

async function localizar(payload: AsaasWebhookPayload): Promise<SubscriptionRow | null> {
  const subscriptionId = payload.payment?.subscription || payload.subscription?.id;
  if (subscriptionId) {
    const sub = await getSubscriptionByAsaasSubscription(subscriptionId);
    if (sub) return sub;
  }
  const customerId = payload.payment?.customer || payload.subscription?.customer;
  if (customerId) {
    return await getSubscriptionByAsaasCustomer(customerId);
  }
  return null;
}

export async function POST(request: NextRequest) {
  // 1. Valida origem
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const receivedToken = request.headers.get('asaas-access-token');

  if (!expectedToken) {
    console.error('[webhook] ASAAS_WEBHOOK_TOKEN não configurada — rejeitando');
    return NextResponse.json({ ok: false, error: 'Webhook não configurado' }, { status: 503 });
  }
  if (receivedToken !== expectedToken) {
    return NextResponse.json({ ok: false, error: 'Token inválido' }, { status: 401 });
  }

  // 2. Parse payload
  let payload: AsaasWebhookPayload;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }

  // 3. Idempotência — ignora reentregas do mesmo evento
  const jaProcessado = await isEventAlreadyProcessed(
    payload.event,
    payload.payment?.id,
    payload.subscription?.id
  );
  if (jaProcessado) {
    return NextResponse.json({ ok: true, skipped: 'evento já processado' });
  }

  // 4. Localiza assinatura local
  const sub = await localizar(payload);

  // 5. Loga evento (mesmo sem subscription encontrada — útil pra debug)
  await logSubscriptionEvent(
    sub?.id ?? null,
    sub?.user_id ?? null,
    payload.event,
    payload as unknown as Record<string, unknown>
  );

  if (!sub) {
    // Não é erro retornar 200 — o Asaas ficaria tentando entregar se não fosse.
    // Apenas registramos no log para inspeção manual.
    return NextResponse.json({ ok: true, warning: 'subscription não localizada' });
  }

  // 6. Roteia evento
  try {
    switch (payload.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        const pagamentoDueDate = payload.payment?.dueDate;
        await updateSubscriptionStatus(sub.user_id, {
          status: 'ACTIVE',
          current_period_ends_at: pagamentoDueDate
            ? nextDueDatePlus30(pagamentoDueDate)
            : new Date(Date.now() + 30 * 86_400_000).toISOString(),
          asaas_subscription_id: payload.payment?.subscription ?? sub.asaas_subscription_id,
        });
        break;
      }

      case 'PAYMENT_OVERDUE': {
        await updateSubscriptionStatus(sub.user_id, { status: 'PAST_DUE' });
        break;
      }

      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_CHARGEBACK_DISPUTE': {
        await updateSubscriptionStatus(sub.user_id, { status: 'BLOCKED' });
        break;
      }

      case 'PAYMENT_REFUNDED':
      case 'SUBSCRIPTION_DELETED': {
        await updateSubscriptionStatus(sub.user_id, {
          status: 'CANCELED',
          canceled_at: new Date().toISOString(),
        });
        break;
      }

      default:
        // Evento conhecido mas sem ação dedicada (ex.: PAYMENT_CREATED).
        // Já foi logado acima — segue 200.
        break;
    }

    return NextResponse.json({ ok: true, event: payload.event });
  } catch (err) {
    captureException(err, {
      operation: 'asaas_webhook',
      event: payload.event,
      paymentId: payload.payment?.id,
      subscriptionId: payload.subscription?.id,
    });
    // Retorna 500 pro Asaas reentregar mais tarde
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
