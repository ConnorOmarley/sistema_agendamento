'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, MessageCircle, CheckCheck, Clock, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AgendamentoStatus } from '@/types/domain';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type AgRaw = {
  id: string;
  horario: string | null;
  aluno_id: string;
  status: AgendamentoStatus;
  alunos: { nome: string; telefone: string | null; contato_responsavel: boolean } | null;
};

interface AgendamentoAmanha {
  id: string;
  horario: string;
  alunoId: string;
  nomeAluno: string;
  telefoneAluno: string | null;
  contatoResponsavel: boolean;
}

// Retorna a data YYYY-MM-DD em America/Sao_Paulo, evitando o bug
// de toISOString() que usa UTC e troca o dia entre 21h-00h horário BR.
function dataBrasilPlusDias(dias: number): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const base = new Date();
  base.setDate(base.getDate() + dias);
  return fmt.format(base);
}

export default function LembretesConsultas() {
  const [carregando, setCarregando] = useState(true);
  const [agendamentos, setAgendamentos] = useState<AgendamentoAmanha[]>([]);
  const [idsEnviados, setIdsEnviados] = useState<string[]>([]);
  // Set derivado: O(1) no .has() vs O(n) no .includes() dentro do map de lembretes
  const idsEnviadosSet = useMemo(() => new Set(idsEnviados), [idsEnviados]);

  async function carregarLembretes() {
    setCarregando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const dataAmanhaFormatada = dataBrasilPlusDias(1);

    const { data: listaAgendamentos } = await supabase
      .from('agendamentos')
      .select(`
        id,
        horario,
        aluno_id,
        alunos (
          nome,
          telefone,
          contato_responsavel
        )
      `)
      .eq('user_id', session.user.id)
      .eq('data', dataAmanhaFormatada)
      .is('deleted_at', null)
      .not('status', 'eq', 'Faltou');

    if (listaAgendamentos) {
      const mapeados: AgendamentoAmanha[] = (listaAgendamentos as unknown as AgRaw[]).map((ag) => ({
        id: ag.id,
        horario: ag.horario ? ag.horario.substring(0, 5) : '--:--',
        alunoId: ag.aluno_id,
        nomeAluno: ag.alunos?.nome || 'Aluno Removido',
        telefoneAluno: ag.alunos?.telefone || null,
        contatoResponsavel: ag.alunos?.contato_responsavel || false,
      }));
      mapeados.sort((a, b) => a.horario.localeCompare(b.horario));
      setAgendamentos(mapeados);
    }
    setCarregando(false);
  }

  useEffect(() => { carregarLembretes(); }, []);

  const dispararLembrete = (ag: AgendamentoAmanha) => {
    if (!ag.telefoneAluno) {
      alert(`O aluno ${ag.nomeAluno} não possui telefone cadastrado.`);
      return;
    }
    const msg = ag.contatoResponsavel
      ? `Olá! Passando para lembrar da sessão de *${ag.nomeAluno}* amanhã, às *${ag.horario}*. Confirmado?`
      : `Olá, *${ag.nomeAluno}*! Passando para lembrar da nossa sessão amanhã, às *${ag.horario}*. Confirmado?`;

    const numeroLimpo = ag.telefoneAluno.replace(/\D/g, '');
    const numeroFormatado = numeroLimpo.length === 11 ? `55${numeroLimpo}` : numeroLimpo;
    window.open(`https://api.whatsapp.com/send?phone=${numeroFormatado}&text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');

    if (!idsEnviadosSet.has(ag.id)) {
      setIdsEnviados(prev => [...prev, ag.id]);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl gradient-rose flex items-center justify-center shadow-md shadow-rose-500/25 shrink-0">
            <Bell className="size-5 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold tracking-tight text-sm">Lembretes de amanhã</h3>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">Para reduzir faltas</p>
          </div>
        </div>
        {!carregando && agendamentos.length > 0 && (
          <Badge variant="primary">{agendamentos.length}</Badge>
        )}
      </div>

      {carregando ? (
        <div className="p-8 text-center text-xs text-[var(--color-muted-foreground)] animate-pulse">
          Buscando sessões…
        </div>
      ) : agendamentos.length === 0 ? (
        <div className="p-8 text-center">
          <Sparkles className="size-8 text-[var(--color-muted-foreground)] mx-auto mb-2 opacity-40" />
          <p className="text-xs text-[var(--color-muted-foreground)] italic">
            Nenhuma sessão agendada para amanhã.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)] max-h-[400px] overflow-y-auto">
          {agendamentos.map((ag) => {
            const enviado = idsEnviadosSet.has(ag.id);
            return (
              <div key={ag.id} className="p-4 flex items-center gap-3 hover:bg-[var(--color-muted)]/40 transition-colors">
                <div className="flex flex-col items-center justify-center size-12 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                  <Clock className="size-3" />
                  <span className="text-[11px] font-black mt-0.5">{ag.horario}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{ag.nomeAluno}</p>
                  {ag.contatoResponsavel && (
                    <Badge variant="warning" className="mt-0.5">
                      Resp. Financeiro
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dispararLembrete(ag)}
                  disabled={enviado}
                  className={
                    enviado
                      ? 'flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)] text-[11px] font-bold cursor-default'
                      : 'flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-emerald text-white text-[11px] font-bold shadow-md shadow-emerald-500/25 hover:shadow-lg active:scale-95 transition-all'
                  }
                >
                  {enviado ? <><CheckCheck className="size-3.5" /> Avisado</> : <><MessageCircle className="size-3.5" /> Lembrar</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}