'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Trash2,
  Wallet,
  Clock,
  FileText,
  Plus,
  Save,
  CheckCircle2,
  User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { registrarAuditoria } from '@/lib/audit-log';
import { Card } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

interface Params { id: string }

export default function PerfilAluno({ params }: { params: Promise<Params> | Params }) {
  const router = useRouter();
  const resolvedParams = 'then' in params ? use(params) : params;
  const alunoId = resolvedParams.id;

  const [carregando, setCarregando] = useState(true);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [contatoResponsavel, setContatoResponsavel] = useState(false);

  const [tipoRegistro, setTipoRegistro] = useState('Sessão Comum');
  const [relatorio, setRelatorio] = useState('');
  const [alertaSucesso, setAlertaSucesso] = useState(false);

  const dataAtual = new Date();
  const [mesFiltro, setMesFiltro] = useState(String(dataAtual.getMonth() + 1).padStart(2, '0'));
  const [anoFiltro, setAnoFiltro] = useState(String(dataAtual.getFullYear()));
  const [consultasPeriodo, setConsultasPeriodo] = useState(0);
  const [totalPago, setTotalPago] = useState(0);
  const [aReceber, setAReceber] = useState(0);

  async function carregarDadosAluno() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: dadosAluno } = await supabase
      .from('alunos')
      .select('id, nome, email, telefone, contato_responsavel')
      .eq('id', alunoId)
      .eq('user_id', session.user.id)
      .single();

    if (!dadosAluno) { router.push('/dashboard'); return; }

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
      .is('deleted_at', null)
      .order('data', { ascending: false });

    setEvolucoes(listaEvolucoes || []);

    // LGPD: registra acesso ao prontuário do aluno (visualização de dados clínicos)
    registrarAuditoria({ acao: 'view', entidade: 'aluno', entidadeId: alunoId });

    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('status, valor_sessao, status_pagamento, data')
      .eq('aluno_id', alunoId)
      .eq('user_id', session.user.id)
      .is('deleted_at', null);

    const validos = agendamentos || [];
    const prefixo = `${anoFiltro}-${mesFiltro}`;
    const sessoes = validos.filter(ag => ag.data.startsWith(prefixo) && ag.status !== 'Faltou');
    const pago = sessoes.filter(ag => ag.status_pagamento === 'Pago').reduce((s, ag) => s + (Number(ag.valor_sessao) || 0), 0);
    const pendente = sessoes.filter(ag => ag.status_pagamento === 'Pendente').reduce((s, ag) => s + (Number(ag.valor_sessao) || 0), 0);

    setConsultasPeriodo(sessoes.length);
    setTotalPago(pago);
    setAReceber(pendente);
    setCarregando(false);
  }

  useEffect(() => { carregarDadosAluno(); }, [alunoId, mesFiltro, anoFiltro]);

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
      setAluno(prev => prev ? { ...prev, nome: nome.trim(), email: email.trim() || null, telefone: telefone.trim() || null, contato_responsavel: contatoResponsavel } : null);
      setAlertaSucesso(true);
      setTimeout(() => setAlertaSucesso(false), 4000);
    }
  }

  async function handleAdicionarEvolucoes(e: React.FormEvent) {
    e.preventDefault();
    if (!relatorio.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: nova, error } = await supabase
      .from('evolucoes')
      .insert([{ aluno_id: alunoId, user_id: session.user.id, tipo_registro: tipoRegistro, relatorio: relatorio.trim() }])
      .select('id, data, tipo_registro, relatorio')
      .single();

    if (!error && nova) {
      setEvolucoes(atual => [nova, ...atual]);
      setRelatorio('');
      // LGPD: registra criação de prontuário
      registrarAuditoria({
        acao: 'create',
        entidade: 'evolucao',
        entidadeId: nova.id,
        detalhes: { aluno_id: alunoId, tipo_registro: tipoRegistro },
      });
    }
  }

  async function handleRemoverAluno() {
    if (!confirm(`Tem certeza que deseja remover a ficha de ${aluno?.nome}? A ficha ficará arquivada (soft delete) e poderá ser recuperada por suporte se necessário.`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Soft delete: marca como apagado, mas não remove do banco (LGPD + recuperação)
    const { error } = await supabase
      .from('alunos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', alunoId)
      .eq('user_id', session.user.id);

    if (!error) {
      registrarAuditoria({
        acao: 'delete',
        entidade: 'aluno',
        entidadeId: alunoId,
        detalhes: { nome: aluno?.nome },
      });
      router.push('/dashboard');
    }
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-32 animate-pulse"><p className="text-[var(--color-muted-foreground)]">Carregando prontuário...</p></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:underline">
        <ArrowLeft className="size-4" /> Voltar para painel
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl gradient-primary text-white font-black flex items-center justify-center shadow-lg shadow-purple-500/25 text-2xl">
            {aluno?.nome?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Prontuário</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{aluno?.nome}</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">{aluno?.email || aluno?.telefone || 'Sem contato cadastrado'}</p>
          </div>
        </div>
      </header>

      {alertaSucesso && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="size-5" /> Dados atualizados com sucesso!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna lateral: faturamento + ficha */}
        <div className="space-y-6 lg:order-1">
          {/* Faturamento */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl gradient-emerald flex items-center justify-center shadow-md shadow-emerald-500/25">
                <Wallet className="size-5 text-white" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm">Faturamento</h2>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">Por período</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="h-9 text-xs">
                <option value="01">Jan</option><option value="02">Fev</option><option value="03">Mar</option>
                <option value="04">Abr</option><option value="05">Mai</option><option value="06">Jun</option>
                <option value="07">Jul</option><option value="08">Ago</option><option value="09">Set</option>
                <option value="10">Out</option><option value="11">Nov</option><option value="12">Dez</option>
              </Select>
              <Select value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} className="h-9 text-xs">
                <option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
              </Select>
            </div>

            <div className="space-y-2 pt-1">
              <div className="rounded-xl bg-sky-50 px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-sky-700">Consultas no período</span>
                <span className="font-black text-sky-900">{consultasPeriodo}</span>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700">Total pago</span>
                <span className="font-black text-emerald-900">R$ {totalPago.toFixed(2)}</span>
              </div>
              <div className="rounded-xl bg-rose-50 px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700">A receber</span>
                <span className="font-black text-rose-900">R$ {aReceber.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Ficha cadastral */}
          <Card className="p-5">
            <form onSubmit={handleSalvarFicha} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <User className="size-5" />
                  </div>
                  <h2 className="font-extrabold text-sm">Ficha cadastral</h2>
                </div>
                <button type="button" onClick={handleRemoverAluno} className="text-[10px] font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                  <Trash2 className="size-3" /> Remover
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="cad-nome">Nome</Label>
                  <Input id="cad-nome" type="text" required value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cad-email">E-mail</Label>
                  <Input id="cad-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cad-telefone">Telefone</Label>
                  <Input id="cad-telefone" type="text" placeholder="11999999999" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 pt-2 border-t cursor-pointer select-none">
                  <input
                    id="cad-responsavel"
                    type="checkbox"
                    checked={contatoResponsavel}
                    onChange={(e) => setContatoResponsavel(e.target.checked)}
                    className="size-4 rounded border-[var(--color-input)] text-[var(--color-primary)] focus:ring-[var(--color-ring)]"
                  />
                  <span className="text-xs font-bold text-[var(--color-foreground)]/80">
                    Telefone pertence ao responsável (pai/mãe)
                  </span>
                </label>
              </div>

              <Button type="submit" size="md" className="w-full">
                <Save className="size-4" /> Salvar alterações
              </Button>
            </form>
          </Card>
        </div>

        {/* Coluna principal: nova evolução + timeline */}
        <div className="lg:col-span-2 space-y-6 lg:order-2">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/25">
                <Plus className="size-5 text-white" />
              </div>
              <div>
                <h2 className="font-extrabold tracking-tight">Nova evolução diária</h2>
                <p className="text-xs text-[var(--color-muted-foreground)]">Registre comportamentos, observações ou marcos</p>
              </div>
            </div>

            <form onSubmit={handleAdicionarEvolucoes} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="evol-tipo">Tipo</Label>
                  <Select id="evol-tipo" value={tipoRegistro} onChange={(e) => setTipoRegistro(e.target.value)}>
                    <option value="Sessão Comum">Sessão Comum</option>
                    <option value="Avaliação Física">Avaliação Física</option>
                    <option value="Alta Clínica">Alta Clínica</option>
                    <option value="Primeira Anamnese">Primeira Anamnese</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="evol-relatorio">Relatório</Label>
                <Textarea
                  id="evol-relatorio"
                  rows={4}
                  required
                  placeholder="Descreva a sessão, comportamento e observações..."
                  value={relatorio}
                  onChange={(e) => setRelatorio(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit"><FileText className="size-4" /> Registrar</Button>
              </div>
            </form>
          </Card>

          {/* Timeline */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="font-extrabold tracking-tight">Linha do tempo</h2>
              <Badge variant="outline">{evolucoes.length}</Badge>
            </div>
            {evolucoes.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="size-10 mx-auto text-[var(--color-muted-foreground)] opacity-30 mb-3" />
                <p className="text-sm text-[var(--color-muted-foreground)] italic">Nenhum registro clínico ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {evolucoes.map((ev) => (
                  <div key={ev.id} className="p-5 flex gap-4 hover:bg-[var(--color-muted)]/30 transition-colors">
                    <div className="flex flex-col items-center gap-2 shrink-0 w-1">
                      <div className="size-3 rounded-full gradient-primary shadow-md shadow-purple-500/30 mt-1" />
                      <div className="flex-1 w-px bg-purple-200/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant="primary">{ev.tipo_registro}</Badge>
                        <span className="text-[11px] text-[var(--color-muted-foreground)] flex items-center gap-1 font-medium">
                          <Clock className="size-3" /> {new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-foreground)]/85 whitespace-pre-line leading-relaxed mt-2">
                        {ev.relatorio}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}