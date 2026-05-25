'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Props {
  emailAtual: string;
}

/**
 * Zona de Perigo na página de Configurações.
 * Exclusão de conta conforme LGPD Art. 18-VI.
 *
 * Padrão de segurança: usuário precisa DIGITAR o próprio email pra confirmar.
 * Previne clique acidental e força intenção explícita.
 */
export function DeleteAccountCard({ emailAtual }: Props) {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [emailDigitado, setEmailDigitado] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const emailConfere = emailDigitado.trim().toLowerCase() === emailAtual.toLowerCase();

  async function confirmarExclusao() {
    if (!emailConfere) return;
    setProcessando(true);
    setErro(null);

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailConfirmacao: emailDigitado.trim() }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErro(json.error || 'Erro ao excluir conta');
        setProcessando(false);
        return;
      }

      // Logout local + redireciona
      await supabase.auth.signOut();
      router.push('/login?conta_excluida=1');
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro de conexão');
      setProcessando(false);
    }
  }

  function fecharModal() {
    if (processando) return;
    setModalAberto(false);
    setEmailDigitado('');
    setErro(null);
  }

  return (
    <>
      <Card className="p-6 space-y-4 border-rose-200 bg-rose-50/30">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h2 className="font-extrabold tracking-tight">⚠️ Zona de perigo</h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">Ações irreversíveis sobre sua conta</p>
          </div>
        </div>

        <div className="border border-rose-200 rounded-xl p-4 bg-white space-y-3">
          <div>
            <h3 className="font-bold text-sm text-rose-900">Excluir minha conta</h3>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
              Remove permanentemente sua conta e todos os dados associados:
              alunos, agendamentos, evoluções clínicas e configurações.
              Esta ação é <strong>irreversível</strong>.
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)] mt-2 italic">
              Direito garantido pela LGPD Art. 18-VI (direito de eliminação).
            </p>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setModalAberto(true)}
            className="w-full sm:w-auto"
          >
            <Trash2 className="size-4" /> Excluir minha conta
          </Button>
        </div>
      </Card>

      {/* Modal de confirmação */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={fecharModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="font-extrabold">Confirmar exclusão</h3>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Esta ação é irreversível</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fecharModal}
                disabled={processando}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-xl space-y-1">
              <p className="font-bold">Ao confirmar, vamos:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Cancelar sua assinatura no Asaas (se houver)</li>
                <li>Apagar todos os alunos, agendamentos e evoluções</li>
                <li>Apagar suas configurações e dados pessoais</li>
                <li>Excluir sua conta de autenticação</li>
              </ul>
              <p className="font-bold pt-1">Não há como desfazer.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-confirm">
                Digite <strong className="font-extrabold">{emailAtual}</strong> para confirmar:
              </Label>
              <Input
                id="email-confirm"
                type="email"
                value={emailDigitado}
                onChange={(e) => setEmailDigitado(e.target.value)}
                placeholder={emailAtual}
                autoComplete="off"
                disabled={processando}
              />
            </div>

            {erro && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
                {erro}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={fecharModal}
                disabled={processando}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={confirmarExclusao}
                disabled={!emailConfere || processando}
              >
                {processando ? 'Excluindo...' : 'Excluir conta permanentemente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
