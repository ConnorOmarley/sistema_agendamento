import Link from 'next/link';
import {
  Sparkles, CalendarDays, FileText, Receipt,
  CheckCircle2, ArrowRight, Crown, Users, BarChart3, Mail,
} from 'lucide-react';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Agenda inteligente',
    desc: 'Organize sessões por dia e horário. Visualize a semana toda de um jeito simples, sem conflito de horários.',
  },
  {
    icon: FileText,
    title: 'Prontuários digitais',
    desc: 'Registre evoluções de cada aluno com histórico completo. Tudo seguro, acessível de qualquer lugar.',
  },
  {
    icon: BarChart3,
    title: 'Fechamento mensal',
    desc: 'Relatório de frequência e resumo financeiro em PDF com um clique. Sem planilha, sem retrabalho.',
  },
  {
    icon: Mail,
    title: 'Lembretes automáticos',
    desc: 'E-mail de confirmação enviado ao responsável no momento do agendamento. Menos faltas, mais organização.',
  },
];

const PLANOS = [
  {
    id: 'PROFISSIONAL',
    nome: 'Profissional',
    preco: 49,
    limite: 'Até 20 alunos',
    destaque: false,
    features: [
      'Agenda + prontuários',
      'Relatório PDF de frequência',
      'E-mail automático ao agendar',
      'Fechamento mensal',
      'Suporte por e-mail',
    ],
  },
  {
    id: 'ESTUDIO',
    nome: 'Estúdio',
    preco: 89,
    limite: 'Alunos ilimitados',
    destaque: true,
    features: [
      'Tudo do Profissional',
      'Alunos ilimitados',
      'Bot de WhatsApp (em breve)',
      'Prioridade no suporte',
    ],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* NAV */}
      <nav className="sticky top-0 z-40 glass-card border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/30">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="font-extrabold tracking-tight text-lg">Acompanha</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-bold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-bold shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/30 transition-shadow"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 sm:py-28">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 border border-violet-200 text-xs font-bold text-violet-700 mb-6">
          <Sparkles className="size-3.5" />
          14 dias grátis · Sem cartão para começar
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight max-w-3xl leading-[1.1]">
          A plataforma para{' '}
          <span className="text-transparent bg-clip-text gradient-primary">
            pedagogos e psicopedagogos
          </span>{' '}
          brasileiros
        </h1>

        <p className="mt-6 text-lg text-[var(--color-muted-foreground)] max-w-xl leading-relaxed">
          Agenda, prontuários dos alunos, relatórios de frequência e cobranças — tudo em um só lugar.
          Pare de usar planilha e WhatsApp pra gerenciar seus atendimentos.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/register"
            className="px-8 py-4 rounded-2xl gradient-primary text-white text-base font-extrabold shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 transition-shadow inline-flex items-center gap-2"
          >
            Começar 14 dias grátis <ArrowRight className="size-5" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 rounded-2xl border-2 border-[var(--color-border)] bg-white text-sm font-bold text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            Já tenho conta
          </Link>
        </div>

        <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
          Sem cartão de crédito · Cancele quando quiser
        </p>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-2">Funcionalidades</p>
            <h2 className="text-3xl font-black tracking-tight">Tudo que você precisa no dia a dia</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="glass-card rounded-3xl border border-white/40 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="size-12 rounded-2xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/25 mb-4">
                    <Icon className="size-6 text-white" />
                  </div>
                  <h3 className="font-extrabold text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card rounded-3xl border border-white/40 p-8 sm:p-12 text-center shadow-lg shadow-purple-900/5">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="size-12 rounded-2xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/25">
                <Users className="size-6 text-white" />
              </div>
            </div>
            <p className="text-lg font-bold leading-relaxed max-w-xl mx-auto">
              "Finalmente uma plataforma feita para a realidade do atendimento pedagógico brasileiro.
              Simples, rápida e com tudo que preciso."
            </p>
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)] font-medium">
              Pedagoga — Recife/PE
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-2">Planos</p>
            <h2 className="text-3xl font-black tracking-tight">Preço justo, sem surpresas</h2>
            <p className="mt-3 text-[var(--color-muted-foreground)]">14 dias grátis em qualquer plano. Cancele quando quiser.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLANOS.map((p) => (
              <div
                key={p.id}
                className={
                  p.destaque
                    ? 'relative glass-card rounded-3xl border-2 border-violet-400 p-8 shadow-xl shadow-purple-500/15'
                    : 'glass-card rounded-3xl border border-white/40 p-8 shadow-sm'
                }
              >
                {p.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-white text-xs font-extrabold shadow-md">
                    Mais popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`size-10 rounded-xl flex items-center justify-center shadow-md ${p.destaque ? 'gradient-emerald' : 'gradient-primary'}`}>
                    <Crown className="size-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">{p.nome}</h3>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{p.limite}</p>
                  </div>
                </div>

                <p className="text-4xl font-black mb-1">
                  R$ {p.preco}
                  <span className="text-base font-bold text-[var(--color-muted-foreground)]">/mês</span>
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-6">Cobrado mensalmente · Cancele quando quiser</p>

                <ul className="space-y-2.5 mb-8">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`block text-center py-3 rounded-2xl text-sm font-extrabold transition-shadow ${
                    p.destaque
                      ? 'gradient-primary text-white shadow-md shadow-purple-500/25 hover:shadow-lg'
                      : 'border-2 border-[var(--color-border)] bg-white hover:bg-[var(--color-muted)] text-[var(--color-foreground)]'
                  }`}
                >
                  Começar grátis
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-[var(--color-muted-foreground)] mt-6">
            Processamento de pagamentos por{' '}
            <span className="font-bold">Asaas</span>
            {' '}· Dados protegidos pela LGPD
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card rounded-3xl border border-white/40 p-10 sm:p-14 shadow-lg shadow-purple-900/5">
            <div className="size-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-purple-500/30 mx-auto mb-6">
              <Sparkles className="size-8 text-white" />
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-3">Pronto para começar?</h2>
            <p className="text-[var(--color-muted-foreground)] mb-8 leading-relaxed">
              Crie sua conta agora e use o Acompanha gratuitamente por 14 dias.
              Nenhum cartão necessário.
            </p>
            <Link
              href="/register"
              className="px-8 py-4 rounded-2xl gradient-primary text-white font-extrabold shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 transition-shadow inline-flex items-center gap-2"
            >
              Criar conta grátis <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--color-border)] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-muted-foreground)]">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="size-3 text-white" />
            </div>
            <span className="font-bold text-[var(--color-foreground)]">Acompanha</span>
            <span>· Pedagogia & Psicopedagogia</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/termos" className="hover:text-[var(--color-foreground)] transition-colors">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-[var(--color-foreground)] transition-colors">Privacidade</Link>
            <Link href="/login" className="hover:text-[var(--color-foreground)] transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
