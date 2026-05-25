'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError boundary]', error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex items-center justify-center p-6 bg-neutral-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="size-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="size-8 text-rose-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
              Erro crítico
            </h1>
            <p className="text-sm text-neutral-500">
              A aplicação encontrou um erro grave. Por favor, recarregue a página.
            </p>
            {error.digest && (
              <p className="text-[10px] text-neutral-400 font-mono mt-2">
                Código: {error.digest}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 active:scale-95 transition-all"
          >
            <RotateCcw className="size-4" />
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}