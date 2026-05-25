'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-app-gradient">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="size-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto">
          <AlertTriangle className="size-8 text-rose-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Algo deu errado</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Ocorreu um erro inesperado. Você pode tentar novamente ou recarregar a página.
          </p>
          {error.digest && (
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-mono mt-2">
              Código: {error.digest}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all"
        >
          <RotateCcw className="size-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}