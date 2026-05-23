'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Aluno {
  id: string;
  nome: string;
  email: string | null;
}

interface Agendamento {
  id: string;
  data: string;
  horario: string;
  status: string;
  valor_sessao: number;
  status_pagamento: string;
  observacoes: string | null;
  alunos: { id: string; nome: string } | null;
}

const HORARIOS_DISPONIVEIS = [
  '07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00',
  '19:00','20:00',
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
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [nomeProfissional, setNomeProfissional] = useState('');
  const [enviarEmail, setEnviarEmail] = useState(true);

  async function carregarDadosAgenda() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: listaAlunos } = await supabase
      .from('alunos')
      .select('id, nome, email')
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
      .order('nome', { ascending: true });

    if (listaAlunos) setAlunos(listaAlunos);

    const { data: config } = await supabase
      .from('configuracoes_usuario')
      .select('razao_social')
      .eq('user_id', session.user.id)
      .single();
    setNomeProfissional(config?.razao_social?.trim() || session.user.email || 'Profissional');

    const { data: listaAgendamentos } = await supabase
      .from('agendamentos')
      .select(`id, data, horario, status, valor_sessao, status_pagamento, observacoes, alunos (id, nome)`)
      .eq('user_id', session.user.id)
      .order('data', { ascending: false })
      .order('horario', { ascending: true });

    if (listaAgendamentos) setAgendamentos(listaAgendamentos as unknown as Agendamento[]);
    setCarregando(false);
  }

  useEffect(() => { carregarDadosAgenda(); }, [router]);

  useEffect(() => {
    if (!dataSessao) { setHorariosOcupadosNoDia([]); return; }
    const ocupados = agendamentos
      .filter(ag => ag.data === dataSessao && ag.status !== 'Faltou')
      .map(ag => ag.horario.substring(0, 5));
    setHorariosOcupadosNoDia(ocupados);
    if (!modoManual && ocupados.includes(horarioSessao)) setHorarioSessao('');
  }, [dataSessao, agendamentos, horarioSessao, modoManual]);

  async function handleCriarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    if (!alunoSelecionado || !dataSessao || !horarioSessao) return;
    setErroForm(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('agendamentos').insert([{
      user_id: session.user.id,
      aluno_id: alunoSelecionado,
      data: dataSessao,
      horario: horarioSessao,
      valor_sessao: parseFloat(valorSessao),
      status: 'Agendado',
      status_pagamento: 'Pendente',
      observacoes: obsSessao.trim() || null
    }]);

    if (error) {
      // Postgres 23505 = unique_violation (UNIQUE INDEX uniq_agendamentos_slot)
      if (error.code === '23505') {
        setErroForm('Já existe outro agendamento ativo neste mesmo dia e horário. Cancele o anterior ou escolha outro horário.');
      } else {
        setErroForm('Não foi possível criar o agendamento. Tente novamente.');
      }
      return;
    }

    // Notifica o aluno por e-mail (não bloqueia em caso de falha)
    const alunoAlvo = alunos.find(a => a.id === alunoSelecionado);
    if (enviarEmail && alunoAlvo?.email) {
      fetch('/api/email-agendamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailDestino: alunoAlvo.email,
          nomeAluno: alunoAlvo.nome,
          data: dataSessao,
          horario: horarioSessao,
          valorSessao: parseFloat(valorSessao),
          observacoes: obsSessao.trim() || null,
          nomeProfissional,
        }),
      }).catch(() => { /* email é best-effort, não bloqueia */ });
    }

    setAlunoSelecionado(''); setDataSessao(''); setHorarioSessao(''); setObsSessao(''); setModoManual(false);
    carregarDadosAgenda();
  }

  async function atualizarAgendamento(id: string, campo: 'status' | 'status_pagamento', valor: string) {
    const { error } = await supabase.from('agendamentos').update({ [campo]: valor }).eq('id', id);
    if (!error) setAgendamentos(atual => atual.map(ag => ag.id === id ? { ...ag, [campo]: valor } : ag));
  }

  async function handleDeletarAgendamento(id: string) {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;
    const { error } = await supabase.from('agendamentos').delete().eq('id', id);
    if (!error) setAgendamentos(atual => atual.filter(ag => ag.id !== id));
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-32 animate-pulse"><p className="text-[var(--color-muted-foreground)]">Carregando agenda...</p></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Agenda</p>
        <h1 className="text-3xl font-extrabold tracking-tight">📅 Agendamentos</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Marque sessões, controle presença e pagamentos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM NOVO AGENDAMENTO */}
        <Card className="p-6 space-y-5 h-fit">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/25">
              <Plus className="size-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight">Nova sessão</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Marque um atendimento</p>
            </div>
          </div>

          <form onSubmit={handleCriarAgendamento} className="space-y-4">
            {erroForm && (
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-medium text-rose-700 animate-fade-in">
                {erroForm}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="select-aluno">Aluno *</Label>
              <Select id="select-aluno" required value={alunoSelecionado} onChange={(e) => setAlunoSelecionado(e.target.value)}>
                <option value="">Selecione...</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-data">Data *</Label>
              <Input id="input-data" type="date" required value={dataSessao} onChange={(e) => setDataSessao(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label>Horário *</Label>
                {dataSessao && (
                  <button type="button" onClick={() => { setModoManual(!modoManual); setHorarioSessao(''); }} className="text-[10px] font-bold text-[var(--color-primary)] hover:underline">
                    {modoManual ? 'Ver grade' : 'Digitar manual'}
                  </button>
                )}
              </div>

              {!dataSessao ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-start gap-2">
                  <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-800 font-medium">Selecione uma data para liberar os horários.</p>
                </div>
              ) : modoManual ? (
                <Input id="input-hora-manual" type="time" required value={horarioSessao} onChange={(e) => setHorarioSessao(e.target.value)} />
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {HORARIOS_DISPONIVEIS.map((hora) => {
                    const ocupado = horariosOcupadosNoDia.includes(hora);
                    const selecionado = horarioSessao === hora;
                    return (
                      <button
                        key={hora} type="button" disabled={ocupado} onClick={() => setHorarioSessao(hora)}
                        className={
                          ocupado
                            ? 'p-2 rounded-lg text-xs font-bold border bg-[var(--color-muted)] text-[var(--color-muted-foreground)] line-through cursor-not-allowed'
                            : selecionado
                            ? 'p-2 rounded-lg text-xs font-bold gradient-primary text-white shadow-md shadow-purple-500/25'
                            : 'p-2 rounded-lg text-xs font-bold border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors'
                        }
                      >
                        {hora}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-valor">Valor da sessão (R$)</Label>
              <Input id="input-valor" type="number" step="0.01" value={valorSessao} onChange={(e) => setValorSessao(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="textarea-obs">Observações</Label>
              <Textarea id="textarea-obs" placeholder="Ex: sala 2, trazer material…" value={obsSessao} onChange={(e) => setObsSessao(e.target.value)} rows={2} />
              <p className="text-[10px] text-[var(--color-muted-foreground)] italic">Será incluída no e-mail enviado ao aluno (se houver e-mail cadastrado).</p>
            </div>

            {alunoSelecionado && (() => {
              const a = alunos.find(x => x.id === alunoSelecionado);
              if (!a?.email) return null;
              return (
                <label className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 border border-violet-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enviarEmail}
                    onChange={(e) => setEnviarEmail(e.target.checked)}
                    className="mt-0.5 accent-violet-600"
                  />
                  <div className="text-[11px]">
                    <p className="font-bold text-violet-900">Enviar e-mail de confirmação</p>
                    <p className="text-violet-700/80">Para <strong>{a.email}</strong></p>
                  </div>
                </label>
              );
            })()}

            <Button type="submit" size="lg" disabled={!horarioSessao} className="w-full">
              <CalendarDays className="size-4" />
              Confirmar agendamento
            </Button>
          </form>
        </Card>

        {/* CRONOGRAMA */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-extrabold tracking-tight">Histórico e próximas sessões</h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">Gerencie presença, pagamento ou cancelamento</p>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {agendamentos.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="size-10 mx-auto text-[var(--color-muted-foreground)] opacity-40 mb-3" />
                <p className="text-sm text-[var(--color-muted-foreground)] italic">Nenhuma sessão agendada ainda.</p>
              </div>
            ) : (
              agendamentos.map((ag) => {
                const [ano, mes, dia] = ag.data.split('-');
                return (
                  <div key={ag.id} className="p-4 sm:p-6 hover:bg-[var(--color-muted)]/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 sm:w-48 shrink-0">
                      <div className="flex flex-col items-center justify-center size-14 rounded-xl gradient-primary text-white shadow-md shadow-purple-500/25 shrink-0">
                        <span className="text-[9px] uppercase font-bold opacity-90">{['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][parseInt(mes)-1]}</span>
                        <span className="text-base font-black leading-none">{dia}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{ag.alunos?.nome || 'Aluno removido'}</p>
                        <p className="text-[11px] text-[var(--color-muted-foreground)] flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" /> {ag.horario.substring(0,5)} · {dia}/{mes}/{ano}
                        </p>
                      </div>
                    </div>

                    {ag.observacoes && (
                      <div className="hidden sm:flex items-start gap-1.5 flex-1 min-w-0 text-[11px] text-[var(--color-muted-foreground)] italic">
                        <FileText className="size-3 mt-0.5 shrink-0" />
                        <p className="truncate">{ag.observacoes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Status da sessão */}
                      <div className="flex rounded-xl border border-[var(--color-border)] overflow-hidden text-[10px] font-bold">
                        {(['Agendado', 'Concluído', 'Faltou'] as const).map((s, i) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => atualizarAgendamento(ag.id, 'status', s)}
                            className={[
                              'px-2.5 py-1.5 transition-colors',
                              i > 0 ? 'border-l border-[var(--color-border)]' : '',
                              ag.status === s
                                ? s === 'Concluído' ? 'bg-emerald-500 text-white'
                                  : s === 'Faltou' ? 'bg-rose-500 text-white'
                                  : 'bg-violet-500 text-white'
                                : 'bg-white text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]',
                            ].join(' ')}
                          >
                            {s === 'Agendado' ? '🗓️' : s === 'Concluído' ? '✅' : '❌'} {s}
                          </button>
                        ))}
                      </div>

                      {/* Valor + status de pagamento */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold">R$ {Number(ag.valor_sessao).toFixed(2)}</span>
                        <div className="flex rounded-xl border border-[var(--color-border)] overflow-hidden text-[10px] font-bold">
                          {(['Pendente', 'Pago'] as const).map((p, i) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => atualizarAgendamento(ag.id, 'status_pagamento', p)}
                              className={[
                                'px-2.5 py-1.5 transition-colors',
                                i > 0 ? 'border-l border-[var(--color-border)]' : '',
                                ag.status_pagamento === p
                                  ? p === 'Pago' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
                                  : 'bg-white text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]',
                              ].join(' ')}
                            >
                              {p === 'Pendente' ? '⏳' : '💰'} {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletarAgendamento(ag.id)}
                        className="size-9 rounded-xl text-[var(--color-muted-foreground)] hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors"
                        title="Cancelar agendamento"
                        aria-label="Cancelar agendamento"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}