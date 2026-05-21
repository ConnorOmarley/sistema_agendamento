'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface FaturaAluno {
  alunoId: string;
  nomeAluno: string;
  telefoneAluno: string | null;
  contatoResponsavel: boolean;
  totalSessoes: number;
  valorTotal: number;
  statusFinal: 'Pago' | 'Pendente' | 'Parcial';
}

export default function FechamentoMensal() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [faturas, setFaturas] = useState<FaturaAluno[]>([]);
  
  const dataAtual = new Date();
  const mesFormatado = String(dataAtual.getMonth() + 1).padStart(2, '0');
  const [mesAnoSelecionado, setMesAnoSelecionado] = useState(`${dataAtual.getFullYear()}-${mesFormatado}`);
  
  const [diaCobrançaPadrao, setDiaCobrancaPadrao] = useState(5);
  const [chavePixPadrao, setChavePixPadrao] = useState('');
  const [modeloMsgCobranca, setModeloMsgCobranca] = useState('');

  // Estados de controle da esteira semiautomática
  const [modoLoteAtivo, setModoLoteAtivo] = useState(false);
  const [alunoIdFocoAtual, setAlunoIdFocoAtual] = useState<string | null>(null);
  const [idsAlunosCobrados, setIdsAlunosCobrados] = useState<string[]>([]);

  async function calcularFechamento() {
    setCarregando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: config } = await supabase
      .from('configuracoes_usuario')
      .select('dia_cobranca_padrao, chave_pix, mensagem_cobranca')
      .eq('user_id', session.user.id)
      .single();
      
    if (config) {
      setDiaCobrancaPadrao(config.dia_cobranca_padrao || 5);
      setChavePixPadrao(config.chave_pix || 'Não configurada');
      setModeloMsgCobranca(config.mensagem_cobranca || '');
    }

    // Puxando o novo campo contato_responsavel do banco
    const { data: listaAlunos } = await supabase
      .from('alunos')
      .select('id, nome, telefone, contato_responsavel')
      .eq('user_id', session.user.id)
      .order('nome', { ascending: true });

    const { data: listaAgendamentos } = await supabase
      .from('agendamentos')
      .select('id, aluno_id, data, valor_sessao, status, status_pagamento')
      .eq('user_id', session.user.id);

    if (!listaAlunos) {
      setCarregando(false);
      return;
    }

    const agendamentosValidos = listaAgendamentos || [];

    const relatorioFaturas: FaturaAluno[] = listaAlunos.map((aluno) => {
      const sessoesDoMes = agendamentosValidos.filter((ag) => {
        const pertenceAoMes = ag.data.startsWith(mesAnoSelecionado);
        const presencaValida = ag.status !== 'Faltou';
        return ag.aluno_id === aluno.id && pertenceAoMes && presencaValida;
      });

      const totalSessoes = sessoesDoMes.length;
      const valorTotal = sessoesDoMes.reduce((soma, item) => soma + (Number(item.valor_sessao) || 0), 0);
      const pagas = sessoesDoMes.filter(s => s.status_pagamento === 'Pago').length;
      
      let statusFinal: 'Pago' | 'Pendente' | 'Parcial' = 'Pendente';
      if (totalSessoes > 0) {
        if (pagas === totalSessoes) statusFinal = 'Pago';
        else if (pagas > 0) statusFinal = 'Parcial';
      }

      return {
        alunoId: aluno.id,
        nomeAluno: aluno.nome,
        telefoneAluno: aluno.telefone || null,
        contatoResponsavel: aluno.contato_responsavel || false,
        totalSessoes,
        valorTotal,
        statusFinal,
      };
    });

    setFaturas(relatorioFaturas);
    setModoLoteAtivo(false);
    setAlunoIdFocoAtual(null);
    setIdsAlunosCobrados([]);
    setCarregando(false);
  }

  useEffect(() => {
    calcularFechamento();
  }, [mesAnoSelecionado, router]);

  const dispararWhatsApp = (fatura: FaturaAluno) => {
    if (!fatura.telefoneAluno) {
      alert(`O aluno ${fatura.nomeAluno} não possui telefone cadastrado.`);
      return;
    }

    // ALTERAÇÃO DO CONTEXTO DE SAUDAÇÃO SE FOR PAI/MÃE
    const saudacao = fatura.contatoResponsavel 
      ? `Olá! Segue o fechamento das sessões de ${fatura.nomeAluno}`
      : `Olá, ${fatura.nomeAluno}! Segue o fechamento das nossas sessões`;

    const textoPadraoFallback = `${saudacao} deste mês. Total de [valor_total]. Chave PIX para transferência: [chave_pix]. Obrigado!`;
    
    let msg = modeloMsgCobranca.trim() ? modeloMsgCobranca : textoPadraoFallback;

    // Se o usuário usa uma mensagem customizada nas configurações, filtramos dinamicamente
    if (modeloMsgCobranca.trim()) {
      if (fatura.contatoResponsavel) {
        msg = msg.replace(/Olá, \[nome_aluno\]!/g, `Olá! Segue o fechamento de ${fatura.nomeAluno}:`);
        msg = msg.replace(/Olá \[nome_aluno\]/g, `Olá, responsáveis de ${fatura.nomeAluno}`);
        msg = msg.replace(/\[nome_aluno\]/g, `responsáveis de ${fatura.nomeAluno}`);
      } else {
        msg = msg.replace(/\[nome_aluno\]/g, fatura.nomeAluno);
      }
    }

    msg = msg
      .replace(/\[valor_total\]/g, `R$ ${fatura.valorTotal.toFixed(2)}`)
      .replace(/\[chave_pix\]/g, chavePixPadrao);

    const numeroLimpo = fatura.telefoneAluno.replace(/\D/g, '');
    const numeroFormatado = numeroLimpo.length === 11 ? `55${numeroLimpo}` : numeroLimpo;
    
    window.open(`https://api.whatsapp.com/send?phone=${numeroFormatado}&text=${encodeURIComponent(msg)}`, '_blank');

    // Registra localmente que o aluno foi cobrado nesta rodada
    if (!idsAlunosCobrados.includes(fatura.alunoId)) {
      setIdsAlunosCobrados(prev => [...prev, fatura.alunoId]);
    }

    // Avança o foco da esteira automaticamente
    if (modoLoteAtivo) {
      const listaPendentes = faturas.filter(f => f.valorTotal > 0 && f.statusFinal !== 'Pago' && f.telefoneAluno);
      const indexAtual = listaPendentes.findIndex(f => f.alunoId === fatura.alunoId);
      
      if (indexAtual !== -1 && indexAtual + 1 < listaPendentes.length) {
        setAlunoIdFocoAtual(listaPendentes[indexAtual + 1].alunoId);
      } else {
        alert('🏁 Pronto! Você passou por todos os alunos inadimplentes deste mês.');
        setModoLoteAtivo(false);
        setAlunoIdFocoAtual(null);
      }
    }
  };

  const iniciarFluxoLote = () => {
    const primeiroPendente = faturas.find(f => f.valorTotal > 0 && f.statusFinal !== 'Pago' && f.telefoneAluno);
    if (!primeiroPendente) {
      alert('Não há faturas pendentes com telefone configurado para cobrar!');
      return;
    }
    setModoLoteAtivo(true);
    setAlunoIdFocoAtual(primeiroPendente.alunoId);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <nav className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-sm font-bold text-indigo-600 hover:underline">← Voltar para Painel</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-md font-bold text-gray-700">📊 Fechamento Mensal de Contas</h1>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        
        {modoLoteAtivo && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-md animate-fade-in">
            <div className="text-xs">
              <span className="font-black uppercase tracking-wider block text-emerald-200">⚡ Modo Esteira de Cobrança Ativo</span>
              <p className="mt-1 font-medium text-emerald-50">
                O sistema organizou a fila. Clique no botão piscante <strong className="bg-white text-emerald-800 px-1.5 py-0.5 rounded mx-0.5 font-bold">💬 Enviar Próximo</strong> na tabela abaixo para rodar a fila com segurança sem bloqueios do navegador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setModoLoteAtivo(false); setAlunoIdFocoAtual(null); }}
              className="bg-emerald-800/50 hover:bg-emerald-900 text-white border border-emerald-500 font-bold px-3 py-1.5 rounded-lg text-xs"
            >
              Sair do Modo Lote
            </button>
          </div>
        )}

        <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">Período de Apuração</h2>
            <p className="text-xs text-gray-400 mt-0.5">Selecione o mês desejado para consolidar os relatórios financeiros.</p>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-indigo-50 text-indigo-800 font-bold px-3 py-2 rounded-lg border border-indigo-100 mr-2">
              💡 Vencimento: <span className="font-black">{diaCobrançaPadrao}</span>
            </div>

            <label htmlFor="select-fechamento-mes" className="sr-only">Mês do Fechamento</label>
            <select
              id="select-fechamento-mes"
              title="Selecione o mês para o fechamento"
              value={mesAnoSelecionado.split('-')[1]}
              onChange={(e) => {
                const ano = mesAnoSelecionado.split('-')[0];
                setMesAnoSelecionado(`${ano}-${e.target.value}`);
              }}
              className="rounded-lg border border-gray-300 p-2 font-bold text-gray-700 bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option>
              <option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option>
              <option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option>
              <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
            </select>

            <label htmlFor="select-fechamento-ano" className="sr-only">Ano do Fechamento</label>
            <select
              id="select-fechamento-ano"
              title="Selecione o ano para o fechamento"
              value={mesAnoSelecionado.split('-')[0]}
              onChange={(e) => {
                const mes = mesAnoSelecionado.split('-')[1];
                setMesAnoSelecionado(`${e.target.value}-${mes}`);
              }}
              className="rounded-lg border border-gray-300 p-2 font-bold text-gray-700 bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
            <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">Resumo de Atendimentos por Aluno</h3>
            
            {!modoLoteAtivo && !carregando && faturas.some(f => f.valorTotal > 0 && f.statusFinal !== 'Pago') && (
              <button
                type="button"
                onClick={iniciarFluxoLote}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                📢 Iniciar Esteira de Cobrança
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Nome do Aluno</th>
                  <th className="px-6 py-3.5 text-center">Nº de Sessões no Mês</th>
                  <th className="px-6 py-3.5">Valor Total Acumulado</th>
                  <th className="px-6 py-3.5">Status de Quitação</th>
                  <th className="px-6 py-3.5 text-right">Ações de Cobrança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {carregando ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic animate-pulse">
                      Processando e calculando fechamentos de sessão...
                    </td>
                  </tr>
                ) : faturas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                      Nenhum aluno encontrado para apuração.
                    </td>
                  </tr>
                ) : (
                  faturas.map((fat) => {
                    const isAlvoLote = modoLoteAtivo && alunoIdFocoAtual === fat.alunoId;
                    const jaCobrado = idsAlunosCobrados.includes(fat.alunoId);

                    return (
                      <tr 
                        key={fat.alunoId} 
                        className={`transition-colors ${
                          isAlvoLote ? 'bg-emerald-50 font-semibold border-y-2 border-y-emerald-300' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {fat.nomeAluno}
                          {/* TAG VISUAL DO RESPONSÁVEL */}
                          {fat.contatoResponsavel && (
                            <span className="ml-2 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              👨‍👦 Resp. Financeiro
                            </span>
                          )}
                          {isAlvoLote && <span className="ml-2 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black animate-pulse uppercase tracking-wider">Foco Atual</span>}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-600">{fat.totalSessoes} sessões</td>
                        <td className="px-6 py-4 font-black text-gray-800 text-sm">R$ {fat.valorTotal.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-black border uppercase tracking-wider ${
                            fat.statusFinal === 'Pago' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            fat.statusFinal === 'Parcial' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            fat.valorTotal === 0 ? 'bg-gray-100 border-gray-200 text-gray-400' :
                            'bg-rose-50 border-rose-200 text-rose-700'
                          }`}>
                            {fat.valorTotal === 0 ? 'Sem Atendimentos' : fat.statusFinal}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-3 items-center">
                          <Link 
                            href={`/dashboard/alunos/${fat.alunoId}`} 
                            className="text-[11px] font-bold text-indigo-600 hover:underline"
                          >
                            👁️ Perfil
                          </Link>
                          
                          {fat.valorTotal > 0 && fat.statusFinal !== 'Pago' && (
                            <button
                              type="button"
                              onClick={() => dispararWhatsApp(fat)}
                              className={`font-black px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-sm uppercase tracking-wider ${
                                isAlvoLote 
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 scale-105 border-2 border-emerald-400 ring-2 ring-emerald-300 animate-bounce' 
                                  : jaCobrado
                                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-default font-normal lowercase normal-case italic'
                                    : 'bg-white hover:bg-gray-100 text-gray-700 border'
                              }`}
                            >
                              {isAlvoLote 
                                ? '💬 Enviar Próximo' 
                                : jaCobrado 
                                  ? '✓ enviado nesta sessão' 
                                  : '💬 Cobrar'
                              }
                            </button>
                          )}
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