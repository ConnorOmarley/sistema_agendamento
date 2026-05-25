'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, X } from 'lucide-react';

/**
 * Banner que aparece quando o usuário acabou de confirmar o email
 * (?confirmado=1 vindo da rota /auth/confirm).
 *
 * Auto-some em 6s. Remove o query param da URL pra não reaparecer
 * em navegações subsequentes.
 */
export function ConfirmacaoBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (searchParams.get('confirmado') === '1') {
      setVisivel(true);
      // Remove o param da URL sem reload
      const url = new URL(window.location.href);
      url.searchParams.delete('confirmado');
      router.replace(url.pathname + url.search, { scroll: false });

      const timer = setTimeout(() => setVisivel(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!visivel) return null;

  return (
    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 mb-6 animate-fade-in">
      <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
        <CheckCircle2 className="size-5 text-white" />
      </div>
      <div className="flex-1 text-sm">
        <p className="font-extrabold text-emerald-900">✓ E-mail confirmado!</p>
        <p className="text-[11px] text-emerald-700 mt-0.5">Bem-vinda ao Acompanha. Comece cadastrando seu primeiro aluno.</p>
      </div>
      <button
        type="button"
        onClick={() => setVisivel(false)}
        className="text-emerald-700 hover:text-emerald-900 transition-colors"
        aria-label="Fechar"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
