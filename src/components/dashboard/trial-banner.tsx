'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface SubscriptionStatus {
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'BLOCKED' | 'CANCELED' | 'EXPIRED';
  diasRestantesTrial: number | null;
  hasAsaasSubscription: boolean;
}

export function TrialBanner() {
  const pathname = usePathname();
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    fetch('/api/billing/status')
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.subscription) setSub(data.subscription);
      })
      .catch(() => { /* silencioso */ });
  }, []);

  // Não mostrar na própria página de upgrade
  if (!sub || pathname.startsWith('/dashboard/upgrade')) return null;

  if (sub.status === 'TRIALING') {
    const dias = sub.diasRestantesTrial ?? 0;
    if (dias > 7 && sub.hasAsaasSubscription) return null; // assinou e ainda tem tempo, não polui

    const urgente = dias <= 3;
    return (
      <div className={
        urgente
          ? 'rounded-2xl bg-rose-50 border-2 border-rose-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-fade-in'
          : 'rounded-2xl bg-violet-50 border border-violet-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'
      }>
        <div className="flex items-center gap-3">
          <div className={urgente ? 'size-10 rounded-xl bg-rose-500 flex items-center justify-center shrink-0' : 'size-10 rounded-xl gradient-primary flex items-center justify-center shrink-0'}>
            <Sparkles className="size-5 text-white" />
          </div>
          <div className="text-sm">
            <p className="font-extrabold">
              {dias === 0
                ? 'Seu teste termina hoje!'
                : dias === 1
                ? 'Seu teste termina amanhã.'
                : `Teste gratuito · ${dias} dias restantes`}
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              {sub.hasAsaasSubscription
                ? 'Cobrança automática já configurada.'
                : 'Assine antes de expirar para não perder o acesso.'}
            </p>
          </div>
        </div>
        {!sub.hasAsaasSubscription && (
          <Link
            href="/dashboard/upgrade"
            className={urgente
              ? 'px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-rose-600 transition-colors shrink-0'
              : 'px-4 py-2 rounded-xl gradient-primary text-white text-xs font-bold inline-flex items-center gap-1.5 hover:shadow-lg transition-shadow shrink-0'
            }
          >
            Assinar agora <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
    );
  }

  if (sub.status === 'PAST_DUE') {
    return (
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <AlertCircle className="size-5 text-white" />
          </div>
          <div className="text-sm">
            <p className="font-extrabold text-amber-900">Pagamento em atraso</p>
            <p className="text-[11px] text-amber-700">Atualize seu cartão para evitar bloqueio.</p>
          </div>
        </div>
        <Link href="/dashboard/upgrade" className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-amber-600 transition-colors shrink-0">
          Atualizar cartão <ArrowRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  return null;
}
