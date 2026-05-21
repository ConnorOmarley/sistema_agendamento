'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AgendamentoAmanha {
  id: string;
  hora: string;
  alunoId: string;
  nomeAluno: string;
  telefoneAluno: string | null;
  contatoResponsavel: boolean;
}

export default function LembretesConsultas() {
  const [carregando, setCarregando] = useState(true);
  const [agendamentos, setAgendamentos] = useState<AgendamentoAmanha[]>([]);
  const [idsEnviados, setIdsEnviados] = useState<string[]>([]);

  async function carregarLembretes() {
    setCarregando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Calcular a data de amanhã no formato YYYY-MM-DD
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanhaFormatada = amanha.toISOString().split('T')[0];

    // Busca agendamentos de amanhã que não foram cancelados ou marcados como falta
    const { data: listaAgendamentos } = await supabase
      .from('agendamentos')
      .select(`
        id,
        hora,
        aluno_id,
        alunos (
          nome,
          telefone,
          contato_responsavel
        )
      `)
      .eq('user_id', session.user.id)
      .eq('data', dataAmanhaFormatada)
      .not('status', 'eq', 'Faltou');

    if (listaAgendamentos) {
      // Mapeia e tipa os dados retornados do JOIN do Supabase
      const mapeados: AgendamentoAmanha[] = listaAgendamentos.map((ag: any) => ({
        id: ag.id,
        hora: ag.hora ? ag.hora.substring(0, 5) : '--:--',
        alunoId: ag.aluno_id,
        nomeAluno: ag.alunos?.nome || 'Aluno Removido',
        telefoneAluno: ag.alunos?.telefone || null,
        contatoResponsavel: ag.alunos?.contato_responsavel || false,
      }));

      // Ordena por horário da sessão
      mapeados.sort((a, b) => a.hora.localeCompare(b.hora));
      setAgendamentos(mapeados);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregarLembretes();
  }, []);

  const dispararLembrete = (ag: AgendamentoAmanha) => {
    if (!ag.telefoneAluno) {
      alert(`O aluno ${ag.nomeAluno} não possui telefone cadastrado.`);
      return;
    }

    // Lógica de saudação contextualizada (Aluno vs Responsável)
    const msg = ag.contatoResponsavel
      ? `Olá! Passando para lembrar da sessão de *${ag.nomeAluno}* amanhã, às *${ag.hora}*. Confirmado?`
      : `Olá, *${ag.nomeAluno}*! Passando para lembrar da nossa sessão amanhã, às *${ag.hora}*. Confirmado?`;

    const numeroLimpo = ag.telefoneAluno.replace(/\D/g, '');
    const numeroFormatado = numeroLimpo.length === 11 ? `55${numeroLimpo}` : numeroLimpo;

    window.open(`https://api.whatsapp.com/send?phone=${numeroFormatado}&text=${encodeURIComponent(msg)}`, '_blank');

    // Marca como enviado localmente
    if (!idsEnviados.includes(ag.id)) {
      setIdsEnviados(prev => [...prev, ag.id]);
    }
  };

  if (carregando) {
    return <div className="text-xs text-gray-400 p-4 animate-pulse">Buscando sessões de amanhã...</div>;
  }

  if (agendamentos.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-5 shadow-sm text-center">
        <p className="text-xs text-gray-400 italic">✨ Nenhuma sessão agendada para amanhã.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            ⏰ Lembretes de Amanhã
          </h3>
          <p className="text-[10px] text-gray-400">Envie o aviso das próximas 24h para reduzir faltas.</p>
        </div>
        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full">
          {agendamentos.length} {agendamentos.length === 1 ? 'Sessão' : 'Sessões'}
        </span>
      </div>

      <div className="divide-y max-h-[290px] overflow-y-auto">
        {agendamentos.map((ag) => {
          const enviado = idsEnviados.includes(ag.id);

          return (
            <div key={ag.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
              <div className="text-xs space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                    {ag.hora}
                  </span>
                  <p className="font-bold text-gray-900 truncate">{ag.nomeAluno}</p>
                </div>
                {ag.contatoResponsavel && (
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.1 rounded font-bold uppercase tracking-wider block w-max">
                    👨‍👦 Enviar para Responsável
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => dispararLembrete(ag)}
                className={`text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-wider transition-all shrink-0 ${
                  enviado
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-default normal-case italic font-normal'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {enviado ? '✓ Avisado' : '💬 Lembrar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}