'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Wallet,
  CalendarCheck2,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/user';
import LembretesConsultas from '@/components/LembretesConsultas';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  const userInfo = useUser();
  const [carregando, setCarregando] = useState(true);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [busca, setBusca] = useState('');
  const [nomeNovoAluno, setNomeNovoAluno] = useState('');
  const [metricas, setMetricas] = useState<Contadores>({
    faturamentoPago: 0, totalAlunos: 0, agendados: 0, concluidos: 0, faltas: 0,
  });

  const nomeUsuario = userInfo ? String(userInfo.displayName).split(/\s+/)[0] : '';

  useEffect(() => {
    async function carregarDashboardCompleto() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: listaAlunos } = await supabase
        .from('alunos')
        .select('id, nome, email, telefone')
        .eq('user_id', session.user.id)
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      const { data: listaAgendamentos } = await supabase
        .from('agendamentos')
        .select('status, valor_sessao, status_pagamento')
        .eq('user_id', session.user.id)
        .is('deleted_at', null);

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
      <div className="flex items-center justify-center py-32 animate-pulse">
        <p className="text-[var(--color-muted-foreground)] font-medium">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Painel de controle</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Olá, {nomeUsuario}! 👋</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Aqui está o resumo do seu consultório hoje.
        </p>
      </header>

      {/* Métricas */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricaCard
          gradient="gradient-emerald"
          icon={<Wallet className="size-5" />}
          label="Faturamento Pago"
          valor={`R$ ${metricas.faturamentoPago.toFixed(2)}`}
          highlight
        />
        <MetricaCard
          icon={<Users className="size-5 text-purple-600" />}
          label="Alunos"
          valor={metricas.totalAlunos}
        />
        <MetricaCard
          icon={<CalendarCheck2 className="size-5 text-sky-600" />}
          label="Agendados"
          valor={metricas.agendados}
        />
        <MetricaCard
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
          label="Concluídos"
          valor={metricas.concluidos}
        />
        <MetricaCard
          icon={<XCircle className="size-5 text-rose-600" />}
          label="Faltas"
          valor={metricas.faltas}
        />
      </section>

      {/* Grid principal */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-[var(--color-border)] flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">📚 Meus alunos</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Fichas cadastrais e perfis</p>
            </div>
            <form onSubmit={handleCriarAluno} className="flex gap-2 w-full sm:w-auto">
              <Input
                type="text"
                placeholder="Nome do novo aluno..."
                value={nomeNovoAluno}
                onChange={(e) => setNomeNovoAluno(e.target.value)}
                className="sm:w-56"
                required
              />
              <Button type="submit" size="md">
                <Plus className="size-4" />
                Novo
              </Button>
            </form>
          </div>

          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)]" />
              <Input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {alunosFiltrados.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Users className="size-10 text-[var(--color-muted-foreground)] mx-auto mb-3 opacity-40" />
                <p className="text-sm text-[var(--color-muted-foreground)] italic">
                  {alunos.length === 0
                    ? 'Nenhum aluno cadastrado ainda. Adicione o primeiro acima!'
                    : 'Nenhum aluno corresponde à busca.'}
                </p>
              </div>
            ) : (
              alunosFiltrados.map((aluno) => (
                <Link
                  key={aluno.id}
                  href={`/dashboard/alunos/${aluno.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--color-muted)]/50 transition-colors group"
                >
                  <div className="size-10 rounded-xl gradient-primary text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-purple-500/20 shrink-0">
                    {aluno.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--color-foreground)] truncate">{aluno.nome}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                      {aluno.email || aluno.telefone || 'Sem contato cadastrado'}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all" />
                </Link>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <LembretesConsultas />
        </div>
      </section>
    </div>
  );
}

function MetricaCard({
  icon, label, valor, gradient, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string | number;
  gradient?: string;
  highlight?: boolean;
}) {
  if (highlight && gradient) {
    return (
      <div className={`${gradient} col-span-2 lg:col-span-1 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20 flex flex-col gap-2`}>
        <div className="flex items-center justify-between">
          <div className="size-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">{label}</p>
          <p className="text-2xl font-black mt-1">{valor}</p>
        </div>
      </div>
    );
  }
  return (
    <Card className="p-5 flex flex-col gap-2">
      <div className="size-9 rounded-xl bg-[var(--color-muted)] flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</p>
        <p className="text-2xl font-black mt-1">{valor}</p>
      </div>
    </Card>
  );
}