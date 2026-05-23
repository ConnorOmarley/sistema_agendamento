'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, RotateCcw, AlertTriangle, Archive, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { registrarAuditoria } from '@/lib/audit-log';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AlunoArquivado {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  deleted_at: string;
}

interface EvolucaoArquivada {
  id: string;
  aluno_id: string;
  nomeAluno: string;
  data: string;
  tipo_registro: string;
  relatorio: string;
  deleted_at: string;
}

interface ConfirmacaoState {
  tipo: 'restaurar' | 'deletar';
  entidade: 'aluno' | 'evolucao';
  id: string;
  nome: string;
}

export default function Lixeira() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [alunos, setAlunos] = useState<AlunoArquivado[]>([]);
  const [evolucoes, setEvolucoes] = useState<EvolucaoArquivada[]>([]);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState | null>(null);
  const [processando, setProcessando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const [{ data: alunosData }, { data: evolucoesData }] = await Promise.all([
      supabase
        .from('alunos')
        .select('id, nome, email, telefone, deleted_at')
        .eq('user_id', session.user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),

      supabase
        .from('evolucoes')
        .select('id, aluno_id, data, tipo_registro, relatorio, deleted_at, alunos(nome)')
        .eq('user_id', session.user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
    ]);

    setAlunos((alunosData || []) as AlunoArquivado[]);
    setEvolucoes(
      (evolucoesData || []).map((e) => ({
        id: e.id,
        aluno_id: e.aluno_id,
        nomeAluno: (Array.isArray(e.alunos) ? e.alunos[0]?.nome : (e.alunos as { nome: string } | null)?.nome) || 'Aluno removido',
        data: e.data,
        tipo_registro: e.tipo_registro,
        relatorio: e.relatorio,
        deleted_at: e.deleted_at,
      }))
    );
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, [router]);

  async function confirmarAcao() {
    if (!confirmacao) return;
    setProcessando(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { tipo, entidade, id, nome } = confirmacao;
    const tabela = entidade === 'aluno' ? 'alunos' : 'evolucoes';

    if (tipo === 'restaurar') {
      await supabase.from(tabela).update({ deleted_at: null }).eq('id', id);
      await registrarAuditoria({ acao: 'update', entidade, entidadeId: id, detalhes: { acao: 'restaurar', nome } });
    } else {
      await supabase.from(tabela).delete().eq('id', id);
      await registrarAuditoria({ acao: 'delete', entidade, entidadeId: id, detalhes: { acao: 'exclusao_permanente', nome } });
    }

    setConfirmacao(null);
    setProcessando(false);
    carregar();
  }

  function formatarData(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const totalItens = alunos.length + evolucoes.length;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Arquivados</p>
        <h1 className="text-3xl font-extrabold tracking-tight">🗑️ Lixeira</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Registros removidos por soft delete. Restaure ou exclua permanentemente.
        </p>
      </header>

      {/* Modal de confirmação */}
      {confirmacao && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setConfirmacao(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center ${confirmacao.tipo === 'deletar' ? 'bg-rose-100' : 'bg-violet-100'}`}>
                {confirmacao.tipo === 'deletar'
                  ? <AlertTriangle className="size-5 text-rose-600" />
                  : <RotateCcw className="size-5 text-violet-600" />
                }
              </div>
              <div>
                <h3 className="font-extrabold text-sm">
                  {confirmacao.tipo === 'deletar' ? 'Excluir permanentemente?' : 'Restaurar registro?'}
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)]">{confirmacao.nome}</p>
              </div>
            </div>
            {confirmacao.tipo === 'deletar' && (
              <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl">
                Esta ação é irreversível. O registro será apagado definitivamente do sistema.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmacao(null)} disabled={processando}>
                Cancelar
              </Button>
              <Button
                variant={confirmacao.tipo === 'deletar' ? 'destructive' : 'primary'}
                size="sm"
                className="flex-1"
                onClick={confirmarAcao}
                disabled={processando}
              >
                {processando ? 'Aguarde...' : confirmacao.tipo === 'deletar' ? 'Excluir' : 'Restaurar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {carregando ? (
        <div className="p-16 text-center animate-pulse">
          <p className="text-sm text-[var(--color-muted-foreground)]">Carregando lixeira...</p>
        </div>
      ) : totalItens === 0 ? (
        <Card className="p-16 text-center">
          <Trash2 className="size-12 text-[var(--color-muted-foreground)] opacity-20 mx-auto mb-3" />
          <p className="font-bold text-sm">Lixeira vazia</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Nenhum registro arquivado.</p>
        </Card>
      ) : (
        <div className="space-y-6">

          {/* Alunos arquivados */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)] flex items-center gap-3">
              <div className="size-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/25">
                <Archive className="size-5 text-white" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm">Alunos arquivados</h2>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">
                  {alunos.length === 0 ? 'Nenhum' : `${alunos.length} ${alunos.length === 1 ? 'aluno' : 'alunos'}`}
                </p>
              </div>
            </div>

            {alunos.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-[var(--color-muted-foreground)] italic">Nenhum aluno arquivado.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {alunos.map((aluno) => (
                  <div key={aluno.id} className="p-5 flex flex-wrap items-center gap-4 hover:bg-[var(--color-muted)]/20 transition-colors">
                    <div className="size-10 rounded-xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)] font-black flex items-center justify-center text-sm shrink-0">
                      {aluno.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{aluno.nome}</p>
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">
                        {aluno.email || aluno.telefone || 'Sem contato'}
                      </p>
                    </div>
                    <Badge variant="warning" className="text-[10px]">
                      Arquivado em {formatarData(aluno.deleted_at)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title="Restaurar aluno"
                        onClick={() => setConfirmacao({ tipo: 'restaurar', entidade: 'aluno', id: aluno.id, nome: aluno.nome })}
                        className="size-9 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 flex items-center justify-center transition-colors"
                      >
                        <RotateCcw className="size-4 text-violet-600" />
                      </button>
                      <button
                        type="button"
                        title="Excluir permanentemente"
                        onClick={() => setConfirmacao({ tipo: 'deletar', entidade: 'aluno', id: aluno.id, nome: aluno.nome })}
                        className="size-9 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="size-4 text-rose-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Evoluções arquivadas */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)] flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-md shadow-rose-500/25">
                <FileText className="size-5 text-white" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm">Evoluções arquivadas</h2>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">
                  {evolucoes.length === 0 ? 'Nenhuma' : `${evolucoes.length} ${evolucoes.length === 1 ? 'evolução' : 'evoluções'}`}
                </p>
              </div>
            </div>

            {evolucoes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-[var(--color-muted-foreground)] italic">Nenhuma evolução arquivada.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {evolucoes.map((ev) => (
                  <div key={ev.id} className="p-5 flex flex-wrap items-start gap-4 hover:bg-[var(--color-muted)]/20 transition-colors">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{ev.nomeAluno}</p>
                        <Badge variant="default" className="text-[10px]">{ev.tipo_registro}</Badge>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">
                        Sessão de {new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-[var(--color-foreground)]/70 line-clamp-2">{ev.relatorio}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant="warning" className="text-[10px]">
                        Arquivada em {formatarData(ev.deleted_at)}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Restaurar evolução"
                          onClick={() => setConfirmacao({ tipo: 'restaurar', entidade: 'evolucao', id: ev.id, nome: `Evolução de ${ev.nomeAluno} (${new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR')})` })}
                          className="size-9 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 flex items-center justify-center transition-colors"
                        >
                          <RotateCcw className="size-4 text-violet-600" />
                        </button>
                        <button
                          type="button"
                          title="Excluir permanentemente"
                          onClick={() => setConfirmacao({ tipo: 'deletar', entidade: 'evolucao', id: ev.id, nome: `Evolução de ${ev.nomeAluno} (${new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR')})` })}
                          className="size-9 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="size-4 text-rose-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      )}
    </div>
  );
}
