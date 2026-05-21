'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Aluno {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  contato_responsavel: boolean;
}

interface Evolucao {
  id: string;
  data: string;
  tipo_registro: string;
  relatorio: string;
}

interface Params {
  id: string;
}

export default function PerfilAluno({ params }: { params: Promise<Params> | Params }) {
  const router = useRouter();
  
  const resolvedParams = 'then' in params ? use(params) : params;
  const alunoId = resolvedParams.id;

  const [carregando, setCarregando] = useState(true);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  
  // Estados dos inputs do formulário cadastral
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [contatoResponsavel, setContatoResponsavel] = useState(false);

  // Estados do formulário de nova evolução clínica
  const [tipoRegistro, setTipoRegistro] = useState('Sessão Comum');
  const [relatorio, setRelatorio] = useState('');
  const [alertaSucesso, setAlertaSucesso] = useState(false);

  // Estados das métricas financeiras
  const dataAtual = new Date();
  const [mesFiltro, setMesFiltro] = useState(String(dataAtual.getMonth() + 1).padStart(2, '0'));
  const [anoFiltro, setAnoFiltro] = useState(String(dataAtual.getFullYear()));
  const [consultasPeriodo, setConsultasPeriodo] = useState(0);
  const [totalPago, setTotalPago] = useState(0);
  const [aReceber, setAReceber] = useState(0);

  async function carregarDadosAluno() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    // Busca os dados cadastrais incluindo a nova flag de responsável
    const { data: dadosAluno } = await supabase
      .from('alunos')
      .select('id, nome, email, telefone, contato_responsavel')
      .eq('id', alunoId)
      .eq('user_id', session.user.id)
      .single();

    if (!dadosAluno) {
      router.push('/dashboard');
      return;
    }

    setAluno(dadosAluno);
    setNome(dadosAluno.nome);
    setEmail(dadosAluno.email || '');
    setTelefone(dadosAluno.telefone || '');
    setContatoResponsavel(dadosAluno.contato_responsavel || false);

    const { data: listaEvolucoes } = await supabase
      .from('evolucoes')
      .select('id, data, tipo_registro, relatorio')
      .eq('aluno_id', alunoId)
      .eq('user_id', session.user.id)
      .order('data', { ascending: false });

    setEvolucoes(listaEvolucoes || []);

    // Busca faturamento do período
    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('status, valor_sessao, status_pagamento, data')
      .eq('aluno_id', alunoId)
      .eq('user_id', session.user.id);

    const agendamentosValidos = agendamentos || [];
    const prefixoMesAno = `${anoFiltro}-${mesFiltro}`;
    
    const sessoesFiltradas = agendamentosValidos.filter(ag => ag.data.startsWith(prefixoMesAno) && ag.status !== 'Faltou');
    
    const pago = sessoesFiltradas.filter(ag => ag.status_pagamento === 'Pago').reduce((sum, ag) => sum + (Number(ag.valor_sessao) || 0), 0);
    const pendente = sessoesFiltradas.filter(ag => ag.status_pagamento === 'Pendente').reduce((sum, ag) => sum + (Number(ag.valor_sessao) || 0), 0);

    setConsultasPeriodo(sessoesFiltradas.length);
    setTotalPago(pago);
    setAReceber(pendente);

    setCarregando(false);
  }

  useEffect(() => {
    carregarDadosAluno();
  }, [alunoId, mesFiltro, anoFiltro]);

  async function handleSalvarFicha(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('alunos')
      .update({
        nome: nome.trim(),
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        contato_responsavel: contatoResponsavel
      })
      .eq('id', alunoId)
      .eq('user_id', session.user.id);

    if (!error) {
      // Sincroniza o estado local imediatamente corrigindo o bug visual
      setAluno(prev => prev ? { 
        ...prev, 
        nome: nome.trim(), 
        email: email.trim() || null, 
        telefone: telefone.trim() || null,
        contato_responsavel: contatoResponsavel
      } : null);
      
      setAlertaSucesso(true);
      setTimeout(() => setAlertaSucesso(false), 4000);
    }
  }

  async function handleAdicionarEvolucoes(e: React.FormEvent) {
    e.preventDefault();
    if (!relatorio.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: novaEvolucao, error } = await supabase
      .from('evolucoes')
      .insert([{
        aluno_id: alunoId,
        user_id: session.user.id,
        tipo_registro: tipoRegistro,
        relatorio: relatorio.trim()
      }])
      .select('id, data, tipo_registro, relatorio')
      .single();

    if (!error && novaEvolucao) {
      setEvolucoes(atual => [novaEvolucao, ...atual]);
      setRelatorio('');
    }
  }

  async function handleRemoverAluno() {
    if (!confirm(`Tem certeza absoluta que deseja remover a ficha de ${aluno?.nome}? Todos os registros serão apagados.`)) return;

    const { error } = await supabase
      .from('alunos')
      .delete()
      .eq('id', alunoId);

    if (!error) {
      router.push('/dashboard');
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium animate-pulse">Carregando prontuário e histórico do aluno...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <nav className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-bold text-indigo-600 hover:underline">← Voltar para Dashboard</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-md font-black text-gray-700">👤 Prontuário: <span className="text-indigo-600">{aluno?.nome}</span></h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Faturamento do Aluno</span>
              <p className="text-[11px] text-gray-400 mt-0.5">Escolha o mês e ano para calcular a fatura específica:</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="filtro-perfil-mes" className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Mês</label>
                <select
                  id="filtro-perfil-mes"
                  title="Selecione o mês"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                  className="w-full rounded-md border p-1.5 text-xs bg-white text-gray-700 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option>
                  <option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option>
                  <option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option>
                  <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                </select>
              </div>
              <div>
                <label htmlFor="filtro-perfil-ano" className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Ano</label>
                <select
                  id="filtro-perfil-ano"
                  title="Selecione o ano"
                  value={anoFiltro}
                  onChange={(e) => setAnoFiltro(e.target.value)}
                  className="w-full rounded-md border p-1.5 text-xs bg-white text-gray-700 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>

            <div className="divide-y text-xs text-gray-600 pt-2 space-y-3">
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                <span className="font-medium text-gray-500">Consultas no Período</span>
                <span className="font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{consultasPeriodo}</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-lg pt-3">
                <span className="font-bold text-emerald-700">Total Pago</span>
                <span className="font-black text-emerald-600 text-sm">R$ {totalPago.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center bg-rose-50/50 p-2 rounded-lg pt-3">
                <span className="font-bold text-rose-700">A Receber</span>
                <span className="font-black text-rose-600 text-sm">R$ {aReceber.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSalvarFicha} className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Ficha Cadastral</h3>
              <button 
                type="button" 
                onClick={handleRemoverAluno} 
                className="text-[10px] font-bold text-red-600 hover:underline border border-transparent hover:border-red-200 px-2 py-0.5 rounded"
              >
                Remover
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="cad-nome" className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Nome do Aluno *</label>
                <input
                  id="cad-nome"
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-md border p-2 bg-white font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label htmlFor="cad-email" className="block text-[10px] font-bold uppercase text-gray-400 mb-1">E-mail</label>
                <input
                  id="cad-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border p-2 bg-white font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label htmlFor="cad-telefone" className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Telefone</label>
                <input
                  id="cad-telefone"
                  type="text"
                  placeholder="Ex: 11999999999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full rounded-md border p-2 bg-white font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* CHECKBOX DO RESPONSÁVEL FINANCEIRO */}
              <div className="flex items-center gap-2 pt-2 border-t border-dashed mt-2">
                <input
                  id="cad-responsavel"
                  type="checkbox"
                  checked={contatoResponsavel}
                  onChange={(e) => setContatoResponsavel(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="cad-responsavel" className="text-[11px] font-bold text-gray-600 uppercase cursor-pointer select-none">
                  O telefone pertence ao responsável (pai/mãe)
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Salvar Alterações
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {alertaSucesso && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs font-bold shadow-sm animate-fade-in">
              ✅ Dados cadastrais atualizados com sucesso no banco e na interface!
            </div>
          )}

          <form onSubmit={handleAdicionarEvolucoes} className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">Nova Evolução Diária (Prontuário)</h3>
            
            <div className="text-xs space-y-3">
              <div>
                <label htmlFor="evol-tipo" className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Tipo de Registro</label>
                <select
                  id="evol-tipo"
                  value={tipoRegistro}
                  onChange={(e) => setTipoRegistro(e.target.value)}
                  className="w-full rounded-md border p-2 bg-white font-medium focus:outline-none focus:border-indigo-600 text-gray-700"
                >
                  <option value="Sessão Comum">Sessão Comum</option>
                  <option value="Avaliação Física">Avaliação Física</option>
                  <option value="Alta Clínica">Alta Clínica</option>
                  <option value="Primeira Anamnese">Primeira Anamnese</option>
                </select>
              </div>

              <div>
                <label htmlFor="evol-relatorio" className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Relatório da Sessão</label>
                <textarea
                  id="evol-relatorio"
                  rows={4}
                  required
                  placeholder="Descreva o comportamento, evolução e observações da sessão de hoje..."
                  value={relatorio}
                  onChange={(e) => setRelatorio(e.target.value)}
                  className="w-full rounded-md border p-2 bg-white font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg text-xs hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Registrar na Ficha
            </button>
          </form>

          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">Linha do Tempo / Evoluções Gravadas</h3>
            
            <div className="space-y-4">
              {evolucoes.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nenhum registro clínico foi feito para este aluno ainda.</p>
              ) : (
                evolucoes.map((ev) => (
                  <div key={ev.id} className="border-l-2 border-l-indigo-500 pl-4 py-1 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-indigo-700 uppercase text-[10px] tracking-wider">{ev.tipo_registro}</span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-gray-700 font-medium whitespace-pre-line leading-relaxed">{ev.relatorio}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}