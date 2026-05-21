'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Aluno {
  id: string;
  nome: string;
}

interface Agendamento {
  id: string;
  data: string;
  horario: string;
  status: string;
  valor_sessao: number;
  status_pagamento: string;
  observacoes: string | null;
  alunos: {
    id: string;
    nome: string;
  } | null;
}

const HORARIOS_DISPONIVEIS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00'
];

export default function AgendaGeral() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  
  const [alunoSelecionado, setAlunoSelecionado] = useState('');
  const [dataSessao, setDataSessao] = useState('');
  const [horarioSessao, setHorarioSessao] = useState('');
  const [valorSessao, setValorSessao] = useState('150.00');
  const [obsSessao, setObsSessao] = useState('');

  const [horariosOcupadosNoDia, setHorariosOcupadosNoDia] = useState<string[]>([]);
  const [modoManual, setModoManual] = useState(false);

  async function carregarDadosAgenda() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: listaAlunos } = await supabase
      .from('alunos')
      .select('id, nome')
      .eq('user_id', session.user.id)
      .order('nome', { ascending: true });

    if (listaAlunos) setAlunos(listaAlunos);

    const { data: listaAgendamentos } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data,
        horario,
        status,
        valor_sessao,
        status_pagamento,
        observacoes,
        alunos (
          id,
          nome
        )
      `)
      .eq('user_id', session.user.id)
      .order('data', { ascending: false })
      .order('horario', { ascending: true });

    if (listaAgendamentos) {
      setAgendamentos(listaAgendamentos as unknown as Agendamento[]);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregarDadosAgenda();
  }, [router]);

  useEffect(() => {
    if (!dataSessao) {
      setHorariosOcupadosNoDia([]);
      return;
    }
    
    const ocupados = agendamentos
      .filter(ag => ag.data === dataSessao && ag.status !== 'Faltou')
      .map(ag => ag.horario.substring(0, 5));
      
    setHorariosOcupadosNoDia(ocupados);
    
    if (!modoManual && ocupados.includes(horarioSessao)) {
      setHorarioSessao('');
    }
  }, [dataSessao, agendamentos, horarioSessao, modoManual]);

  async function handleCriarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    if (!alunoSelecionado || !dataSessao || !horarioSessao) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('agendamentos')
      .insert([
        {
          user_id: session.user.id,
          aluno_id: alunoSelecionado,
          data: dataSessao,
          horario: horarioSessao,
          valor_sessao: parseFloat(valorSessao),
          status: 'Agendado',
          status_pagamento: 'Pendente',
          observacoes: obsSessao.trim() || null
        }
      ]);

    if (!error) {
      setAlunoSelecionado('');
      setDataSessao('');
      setHorarioSessao('');
      setObsSessao('');
      setModoManual(false);
      carregarDadosAgenda();
    }
  }

  async function atualizarAgendamento(id: string, campo: 'status' | 'status_pagamento', valor: string) {
    const { error } = await supabase
      .from('agendamentos')
      .update({ [campo]: valor })
      .eq('id', id);

    if (!error) {
      setAgendamentos(atual => 
        atual.map(ag => ag.id === id ? { ...ag, [campo]: valor } : ag)
      );
    }
  }

  async function handleDeletarAgendamento(id: string) {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;
    
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id);

    if (!error) {
      setAgendamentos(atual => atual.filter(ag => ag.id !== id));
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium animate-pulse">Carregando Agenda Geral...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <nav className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-sm font-bold text-indigo-600 hover:underline">← Voltar para Painel</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-md font-bold text-gray-700">Controle de Agendamentos e Sessões</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULÁRIO DE NOVO AGENDAMENTO */}
        <div className="bg-white border rounded-xl p-6 shadow-sm h-fit space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">Novo Agendamento</h2>
            <p className="text-xs text-gray-400 mt-0.5">Marque uma nova sessão para seus alunos.</p>
          </div>
          
          <form onSubmit={handleCriarAgendamento} className="space-y-4 text-xs">
            <div>
              <label htmlFor="select-aluno" className="block font-bold text-gray-600 mb-1">Selecione o Aluno *</label>
              <select 
                id="select-aluno"
                title="Escolha um aluno para o agendamento"
                required
                value={alunoSelecionado}
                onChange={(e) => setAlunoSelecionado(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:border-indigo-500 bg-white"
              >
                <option value="">Selecione...</option>
                {alunos.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <label htmlFor="input-data" className="block font-bold text-gray-600 mb-1">Data do Atendimento *</label>
              <input 
                id="input-data"
                type="date" 
                required
                value={dataSessao}
                onChange={(e) => setDataSessao(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:border-indigo-500 text-sm font-medium"
              />
            </div>

            {/* SELETOR EM GRADE OU MANUAL INTELIGENTE */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="block font-bold text-gray-600">Horário do Atendimento *</span>
                {dataSessao && (
                  <button
                    type="button"
                    onClick={() => {
                      setModoManual(!modoManual);
                      setHorarioSessao('');
                    }}
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                  >
                    {modoManual ? '📋 Ver grade de horas' : '✍️ Digitar hora específica'}
                  </button>
                )}
              </div>

              {!dataSessao ? (
                <p className="text-[11px] text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-medium">
                  ⚠️ Selecione uma data acima para liberar os horários.
                </p>
              ) : modoManual ? (
                /* INPUT MANUAL TOTALMENTE ACESSÍVEL E COMPATÍVEL */
                <div className="space-y-1">
                  <input
                    id="input-hora-manual"
                    title="Insira o horário personalizado"
                    type="time"
                    required
                    value={horarioSessao}
                    onChange={(e) => setHorarioSessao(e.target.value)}
                    className="w-full rounded-lg border border-indigo-500 p-2 focus:outline-none text-sm font-bold bg-indigo-50/50 text-indigo-900"
                  />
                  <span className="text-[10px] text-gray-400 block italic">Defina qualquer horário personalizado livremente.</span>
                </div>
              ) : (
                /* GRID PADRÃO COM BLOQUEIO DE CONFLITOS */
                <div className="grid grid-cols-4 gap-1.5">
                  {HORARIOS_DISPONIVEIS.map((hora) => {
                    const estaOcupado = horariosOcupadosNoDia.includes(hora);
                    const estaSelecionado = horarioSessao === hora;

                    return (
                      <button
                        key={hora}
                        type="button"
                        disabled={estaOcupado}
                        onClick={() => setHorarioSessao(hora)}
                        className={`p-2 rounded-lg font-bold border text-center transition-all ${
                          estaOcupado 
                            ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed line-through' 
                            : estaSelecionado
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white hover:bg-indigo-50 hover:text-indigo-600 border-gray-200 text-gray-700'
                        }`}
                      >
                        {hora}
                      </button>
                    );
                  })}
                </div>
              )}
              <input type="hidden" required value={horarioSessao} />
            </div>

            <div>
              <label htmlFor="input-valor" className="block font-bold text-gray-600 mb-1">Valor da Sessão (R$)</label>
              <input 
                id="input-valor"
                type="number" 
                step="0.01"
                value={valorSessao}
                onChange={(e) => setValorSessao(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="textarea-obs" className="block font-bold text-gray-600 mb-1">Observações (Opcional)</label>
              <textarea 
                id="textarea-obs"
                placeholder="Ex: Sala de atendimento, trazer material..."
                value={obsSessao}
                onChange={(e) => setObsSessao(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button 
              type="submit" 
              disabled={!horarioSessao}
              className={`w-full font-bold p-2.5 rounded-lg text-xs transition-colors shadow-sm text-white ${
                horarioSessao ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              🗓️ Confirmar Agendamento
            </button>
          </form>
        </div>

        {/* CRONOGRAMA GERAL DE SESSÕES */}
        <div className="lg:col-span-2 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">Histórico e Próximas Sessões</h3>
            <p className="text-xs text-gray-400 mt-0.5">Gerencie a presença, altere o financeiro ou cancele sessões aqui.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Aluno / Detalhes</th>
                  <th className="px-4 py-3">Data & Hora</th>
                  <th className="px-4 py-3">Presença</th>
                  <th className="px-4 py-3">Financeiro</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {agendamentos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                      Nenhuma sessão agendada até o momento.
                    </td>
                  </tr>
                ) : (
                  agendamentos.map((ag) => {
                    const [ano, mes, dia] = ag.data.split('-');
                    return (
                      <tr key={ag.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{ag.alunos?.nome || 'Aluno Removido'}</p>
                          {ag.observacoes && <p className="text-[10px] text-gray-400 italic max-w-xs truncate">{ag.observacoes}</p>}
                        </td>
                        
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium text-gray-700">{dia}/{mes}/{ano}</span>
                          <span className="block text-[10px] text-gray-400 font-bold">{ag.horario}</span>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            title="Alterar presença da sessão"
                            value={ag.status}
                            onChange={(e) => atualizarAgendamento(ag.id, 'status', e.target.value)}
                            className={`rounded px-2 py-1 font-semibold text-[11px] border bg-white focus:outline-none ${
                              ag.status === 'Concluído' ? 'text-green-700 border-green-200 bg-green-50' :
                              ag.status === 'Faltou' ? 'text-red-700 border-red-200 bg-red-50' :
                              'text-blue-700 border-blue-200 bg-blue-50'
                            }`}
                          >
                            <option value="Agendado">🗓️ Agendado</option>
                            <option value="Concluído">✅ Concluído</option>
                            <option value="Faltou">❌ Faltou</option>
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-800 mb-1">R$ {Number(ag.valor_sessao).toFixed(2)}</p>
                          <select
                            title="Alterar status do pagamento"
                            value={ag.status_pagamento}
                            onChange={(e) => atualizarAgendamento(ag.id, 'status_pagamento', e.target.value)}
                            className={`rounded px-2 py-0.5 text-[10px] font-bold border bg-white focus:outline-none ${
                              ag.status_pagamento === 'Pago' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-amber-700 border-amber-200 bg-amber-50'
                            }`}
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                          </select>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeletarAgendamento(ag.id)}
                            className="text-gray-400 hover:text-red-600 font-bold p-1 text-[11px]"
                            title="Remover Agendamento"
                          >
                            🗑️ Cancelar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}