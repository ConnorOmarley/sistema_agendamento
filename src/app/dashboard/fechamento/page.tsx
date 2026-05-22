'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  MessageCircle,
  CheckCheck,
  Eye,
  Zap,
  X,
  Receipt,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

  const [diaCobrancaPadrao, setDiaCobrancaPadrao] = useState(5);
  const [chavePixPadrao, setChavePixPadrao] = useState('');
  const [modeloMsgCobranca, setModeloMsgCobranca] = useState('');

  const [modoLoteAtivo, setModoLoteAtivo] = useState(false);
  const [alunoIdFocoAtual, setAlunoIdFocoAtual] = useState<string | null>(null);
  const [idsAlunosCobrados, setIdsAlunosCobrados] = useState<string[]>([]);

  async function calcularFechamento() {
    setCarregando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

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

    const { data: listaAlunos } = await supabase
      .from('alunos').select('id, nome, telefone, contato_responsavel')
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
      .order('nome', { ascending: true });

    const { data: listaAgendamentos } = await supabase
      .from('agendamentos').select('id, aluno_id, data, valor_sessao, status, status_pagamento')
      .eq('user_id', session.user.id);

    if (!listaAlunos) { setCarregando(false); return; }

    const validos = listaAgendamentos || [];
    const relatorio: FaturaAluno[] = listaAlunos.map((aluno) => {
      const sessoes = validos.filter((ag) => ag.aluno_id === aluno.id && ag.data.startsWith(mesAnoSelecionado) && ag.status !== 'Faltou');
      const total = sessoes.length;
      const valor = sessoes.reduce((s, i) => s + (Number(i.valor_sessao) || 0), 0);
      const pagas = sessoes.filter(s => s.status_pagamento === 'Pago').length;
      let status: 'Pago' | 'Pendente' | 'Parcial' = 'Pendente';
      if (total > 0) {
        if (pagas === total) status = 'Pago';
        else if (pagas > 0) status = 'Parcial';
      }
      return {
        alunoId: aluno.id, nomeAluno: aluno.nome,
        telefoneAluno: aluno.telefone || null,
        contatoResponsavel: aluno.contato_responsavel || false,
        totalSessoes: total, valorTotal: valor, statusFinal: status,
      };
    });

    setFaturas(relatorio);
    setModoLoteAtivo(false); setAlunoIdFocoAtual(null); setIdsAlunosCobrados([]);
    setCarregando(false);
  }

  useEffect(() => { calcularFechamento(); }, [mesAnoSelecionado, router]);

  const dispararWhatsApp = (fat: FaturaAluno) => {
    if (!fat.telefoneAluno) { alert(`${fat.nomeAluno} não tem telefone cadastrado.`); return; }

    const saudacao = fat.contatoResponsavel
      ? `Olá! Segue o fechamento das sessões de ${fat.nomeAluno}`
      : `Olá, ${fat.nomeAluno}! Segue o fechamento das nossas sessões`;
    const fallback = `${saudacao} deste mês. Total de [valor_total]. Chave PIX para transferência: [chave_pix]. Obrigado!`;
    let msg = modeloMsgCobranca.trim() || fallback;

    if (modeloMsgCobranca.trim()) {
      if (fat.contatoResponsavel) {
        msg = msg.replace(/Olá, \[nome_aluno\]!/g, `Olá! Segue o fechamento de ${fat.nomeAluno}:`);
        msg = msg.replace(/Olá \[nome_aluno\]/g, `Olá, responsáveis de ${fat.nomeAluno}`);
        msg = msg.replace(/\[nome_aluno\]/g, `responsáveis de ${fat.nomeAluno}`);
      } else {
        msg = msg.replace(/\[nome_aluno\]/g, fat.nomeAluno);
      }
    }
    msg = msg.replace(/\[valor_total\]/g, `R$ ${fat.valorTotal.toFixed(2)}`).replace(/\[chave_pix\]/g, chavePixPadrao);

    const numeroLimpo = fat.telefoneAluno.replace(/\D/g, '');
    const numeroFormatado = numeroLimpo.length === 11 ? `55${numeroLimpo}` : numeroLimpo;
    window.open(`https://api.whatsapp.com/send?phone=${numeroFormatado}&text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');

    if (!idsAlunosCobrados.includes(fat.alunoId)) setIdsAlunosCobrados(p => [...p, fat.alunoId]);

    if (modoLoteAtivo) {
      const pendentes = faturas.filter(f => f.valorTotal > 0 && f.statusFinal !== 'Pago' && f.telefoneAluno);
      const idx = pendentes.findIndex(f => f.alunoId === fat.alunoId);
      if (idx !== -1 && idx + 1 < pendentes.length) {
        setAlunoIdFocoAtual(pendentes[idx + 1].alunoId);
      } else {
        alert('🏁 Pronto! Você passou por todos os alunos inadimplentes deste mês.');
        setModoLoteAtivo(false); setAlunoIdFocoAtual(null);
      }
    }
  };

  const iniciarFluxoLote = () => {
    const primeiro = faturas.find(f => f.valorTotal > 0 && f.statusFinal !== 'Pago' && f.telefoneAluno);
    if (!primeiro) { alert('Não há faturas pendentes com telefone configurado.'); return; }
    setModoLoteAtivo(true); setAlunoIdFocoAtual(primeiro.alunoId);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Financeiro</p>
        <h1 className="text-3xl font-extrabold tracking-tight">💰 Fechamento mensal</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Calcule, envie e acompanhe pagamentos por aluno.</p>
      </header>

      {modoLoteAtivo && (
        <Card className="gradient-emerald text-white border-0 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg shadow-emerald-500/30 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Zap className="size-5" />
            </div>
            <div>
              <p className="font-black text-sm">Modo esteira ativo</p>
              <p className="text-xs opacity-90 mt-0.5">Clique no botão <strong className="font-black">Enviar próximo</strong> piscante para rodar a fila sem bloqueios do navegador.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setModoLoteAtivo(false); setAlunoIdFocoAtual(null); }}
            className="px-3 py-2 rounded-xl bg-white/20 backdrop-blur hover:bg-white/30 text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            <X className="size-4" /> Sair do modo lote
          </button>
        </Card>
      )}

      <Card className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/25">
            <Calendar className="size-5 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm">Período de apuração</h2>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">Selecione o mês desejado</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Badge variant="primary" className="text-[10px]">
            Vencimento dia {diaCobrancaPadrao}
          </Badge>
          <Select
            value={mesAnoSelecionado.split('-')[1]}
            onChange={(e) => { const ano = mesAnoSelecionado.split('-')[0]; setMesAnoSelecionado(`${ano}-${e.target.value}`); }}
            className="h-10 w-32 text-xs"
          >
            <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option>
            <option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option>
            <option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option>
            <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
          </Select>
          <Select
            value={mesAnoSelecionado.split('-')[0]}
            onChange={(e) => { const mes = mesAnoSelecionado.split('-')[1]; setMesAnoSelecionado(`${e.target.value}-${mes}`); }}
            className="h-10 w-24 text-xs"
          >
            <option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl gradient-emerald flex items-center justify-center shadow-md shadow-emerald-500/25">
              <Receipt className="size-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight text-sm">Resumo por aluno</h2>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">Atendimentos consolidados</p>
            </div>
          </div>
          {!modoLoteAtivo && !carregando && faturas.some(f => f.valorTotal > 0 && f.statusFinal !== 'Pago') && (
            <Button variant="success" size="sm" onClick={iniciarFluxoLote}>
              <Zap className="size-4" /> Iniciar esteira
            </Button>
          )}
        </div>

        {carregando ? (
          <div className="p-16 text-center animate-pulse">
            <p className="text-sm text-[var(--color-muted-foreground)]">Calculando fechamento...</p>
          </div>
        ) : faturas.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="size-10 text-[var(--color-muted-foreground)] opacity-30 mx-auto mb-3" />
            <p className="text-sm text-[var(--color-muted-foreground)] italic">Nenhum aluno cadastrado ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {faturas.map((fat) => {
              const isAlvo = modoLoteAtivo && alunoIdFocoAtual === fat.alunoId;
              const jaCobrado = idsAlunosCobrados.includes(fat.alunoId);
              const corStatus =
                fat.statusFinal === 'Pago' ? 'success' :
                fat.statusFinal === 'Parcial' ? 'warning' :
                fat.valorTotal === 0 ? 'default' : 'danger';

              return (
                <div
                  key={fat.alunoId}
                  className={isAlvo
                    ? 'p-5 bg-emerald-50/60 ring-2 ring-emerald-300 transition-all'
                    : 'p-5 hover:bg-[var(--color-muted)]/30 transition-colors'
                  }
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="size-12 rounded-xl gradient-primary text-white font-black flex items-center justify-center text-sm shadow-md shadow-purple-500/25 shrink-0">
                      {fat.nomeAluno.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{fat.nomeAluno}</p>
                        {fat.contatoResponsavel && <Badge variant="warning">👨‍👦 Resp.</Badge>}
                        {isAlvo && <Badge variant="success">Foco atual</Badge>}
                      </div>
                      <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                        {fat.totalSessoes} {fat.totalSessoes === 1 ? 'sessão' : 'sessões'} no mês
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-lg">R$ {fat.valorTotal.toFixed(2)}</p>
                      <Badge variant={corStatus} className="mt-1">
                        {fat.valorTotal === 0 ? 'Sem atendimentos' : fat.statusFinal}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/dashboard/alunos/${fat.alunoId}`}
                        className="size-9 rounded-xl border border-[var(--color-border)] bg-white hover:bg-[var(--color-muted)] flex items-center justify-center transition-colors"
                        title="Ver perfil"
                      >
                        <Eye className="size-4 text-[var(--color-muted-foreground)]" />
                      </Link>

                      {fat.valorTotal > 0 && fat.statusFinal !== 'Pago' && (
                        <button
                          type="button"
                          onClick={() => dispararWhatsApp(fat)}
                          disabled={jaCobrado}
                          className={
                            isAlvo
                              ? 'flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-emerald text-white text-xs font-black shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300 animate-pulse'
                              : jaCobrado
                              ? 'flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)] text-xs font-medium cursor-default'
                              : 'flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-emerald text-white text-xs font-black shadow-md shadow-emerald-500/25 hover:shadow-lg active:scale-95 transition-all'
                          }
                        >
                          {jaCobrado ? <><CheckCheck className="size-3.5" /> Enviado</> : isAlvo ? <><MessageCircle className="size-3.5" /> Enviar próximo</> : <><MessageCircle className="size-3.5" /> Cobrar</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}