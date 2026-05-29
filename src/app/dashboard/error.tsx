'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import { Card } from '@/components/ui/card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error, { extra: { digest: error.digest, boundary: 'DashboardError' } });
  }, [error]);

  return (
    <div className="flex items-center justify-center py-24 px-4">
      <Card className="max-w-md w-full p-10 text-center space-y-6">
        <div className="size-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto">
          <AlertTriangle className="size-7 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight">Erro ao carregar</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Não foi possível carregar esta página. Tente novamente ou volte ao início.
          </p>
          {error.digest && (
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-mono">
              Código: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm font-bold hover:bg-[var(--color-muted)] transition-colors"
          >
            <RotateCcw className="size-3.5" />
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all"
          >
            <Home className="size-3.5" />
            Ir ao início
          </button>
        </div>
      </Card>
    </div>
  );
}