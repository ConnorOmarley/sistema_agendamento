'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import LembretesConsultas from '@/components/LembretesConsultas';

interface Aluno {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
}

interface Contadores {
  faturamentoPago: number;
  totalAlunos: number;
  agendados: number;
  concluidos: number;
  faltas: number;
}

export default function DashboardPrincipal() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [busca, setBusca] = useState('');
  const [nomeNovoAluno, setNomeNovoAluno] = useState('');
  const [metricas, setMetricas] = useState<Contadores>({
    faturamentoPago: 0,
    totalAlunos: 0,
    agendados: 0,
    concluidos: 0,
    faltas: 0
  });

  useEffect(() => {
    async function carregarDashboardCompleto() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserEmail(session.user.email || '');

      const { data: listaAlunos } = await supabase
        .from('alunos')
        .select('id, nome, email, telefone')
        .eq('user_id', session.user.id)
        .order('nome', { ascending: true });

      const { data: listaAgendamentos } = await supabase
        .from('agendamentos')
        .select('status, valor_sessao, status_pagamento')
        .eq('user_id', session.user.id);

      const listaAlunosValida = listaAlunos || [];
      const listaAgendamentosValida = listaAgendamentos || [];

      const faturamento = listaAgendamentosValida
        .filter(ag => ag.status_pagamento === 'Pago')
        .reduce((soma, item) => soma + (Number(item.valor_sessao) || 0), 0);

      setAlunos(listaAlunosValida as Aluno[]);
      setMetricas({
        faturamentoPago: faturamento,
        totalAlunos: listaAlunosValida.length,
        agendados: listaAgendamentosValida.filter(ag => ag.status === 'Agendado').length,
        concluidos: listaAgendamentosValida.filter(ag => ag.status === 'Concluído').length,
        faltas: listaAgendamentosValida.filter(ag => ag.status === 'Faltou').length
      });
      setCarregando(false);
    }

    carregarDashboardCompleto();
  }, [router]);

  async function handleCriarAluno(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeNovoAluno.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: novo, error } = await supabase
      .from('alunos')
      .insert([{ nome: nomeNovoAluno.trim(), user_id: session.user.id }])
      .select()
      .single();

    if (!error && novo) {
      setAlunos((atual) => [...atual, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setMetricas(prev => ({ ...prev, totalAlunos: prev.totalAlunos + 1 }));
      setNomeNovoAluno('');
    }
  }

  const alunosFiltrados = alunos.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.email && a.email.toLowerCase().includes(busca.toLowerCase()))
  );

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium animate-pulse">Carregando painel de controle...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* BARRA DE NAVEGAÇÃO SUPERIOR */}
      <nav className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <span className="text-md font-black text-indigo-700 tracking-tight">SaaS Agendamento</span>
          <div className="hidden md:flex gap-6 text-xs font-bold text-gray-500">
            <Link href="/dashboard" className="text-indigo-600 border-b-2 border-indigo-600 pb-4 -mb-4">Alunos</Link>
            <Link href="/dashboard/agendamentos" className="hover:text-gray-900 transition-colors">Agenda</Link>
            <Link href="/dashboard/evolucoes" className="hover:text-gray-900 transition-colors">Prontuários</Link>
            <Link href="/dashboard/fechamento" className="hover:text-indigo-600 transition-colors">📊 Fechamento</Link>
            <Link href="/dashboard/configuracoes" className="hover:text-indigo-600 transition-colors">⚙️ Configurações</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">{userEmail}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            className="text-xs font-bold text-red-600 hover:underline"
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Gestão Estratégica</span>
          <h2 className="text-xl font-extrabold text-gray-900 mt-0.5">Indicadores do Consultório</h2>
        </div>

        {/* MÉTRICAS DO TOPO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-emerald-600 text-white rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">💰 Faturamento Confirmado</span>
            <span className="text-2xl font-black block mt-2">R$ {metricas.faturamentoPago.toFixed(2)}</span>
          </div>
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Alunos</span>
            <span className="text-2xl font-black text-gray-800 block mt-2">{metricas.totalAlunos}</span>
          </div>
          <div className="bg-white border rounded-xl p-5 shadow-sm border-l-4 border-l-blue-500">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Agendados</span>
            <span className="text-2xl font-black text-gray-800 block mt-2">{metricas.agendados}</span>
          </div>
          <div className="bg-white border rounded-xl p-5 shadow-sm border-l-4 border-l-green-500">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Concluídos</span>
            <span className="text-2xl font-black text-gray-800 block mt-2">{metricas.concluidos}</span>
          </div>
          <div className="bg-white border rounded-xl p-5 shadow-sm border-l-4 border-l-red-500">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Faltas</span>
            <span className="text-2xl font-black text-gray-800 block mt-2">{metricas.faltas}</span>
          </div>
        </div>

        {/* GRID PRINCIPAL: FICHAS + LEMBRETES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* COLUNA PRINCIPAL — Fichas Cadastrais */}
          <div className="lg:col-span-2">
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-bold text-gray-900">Fichas Cadastrais</h3>
                <form onSubmit={handleCriarAluno} className="w-full sm:w-auto flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do novo aluno..."
                    value={nomeNovoAluno}
                    onChange={(e) => setNomeNovoAluno(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white font-bold px-4 py-1.5 rounded-lg text-xs hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
                  >
                    + Novo Aluno
                  </button>
                </form>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-b">
                <input
                  type="text"
                  placeholder="🔍 Buscar aluno cadastrado..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="max-w-md w-full rounded-lg border bg-white border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                      <th className="px-6 py-3.5">Nome do Aluno</th>
                      <th className="px-6 py-3.5">E-mail</th>
                      <th className="px-6 py-3.5">Telefone</th>
                      <th className="px-6 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-700">
                    {alunosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
                          Nenhum registro encontrado correspondente aos filtros.
                        </td>
                      </tr>
                    ) : (
                      alunosFiltrados.map((aluno) => (
                        <tr key={aluno.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-indigo-600">{aluno.nome}</td>
                          <td className="px-6 py-4 text-gray-500">{aluno.email || '—'}</td>
                          <td className="px-6 py-4 text-gray-500">{aluno.telefone || '—'}</td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/dashboard/alunos/${aluno.id}`}
                              className="bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 font-bold px-3 py-1 rounded-md border transition-all inline-block"
                            >
                              Ver Perfil
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* COLUNA LATERAL — Lembretes */}
          <div className="space-y-6">
            <LembretesConsultas />
          </div>

        </div>
      </div>
    </div>
  );
}