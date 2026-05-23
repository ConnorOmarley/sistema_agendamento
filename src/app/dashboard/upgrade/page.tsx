'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Crown, CreditCard, User, MapPin, CheckCircle2, AlertCircle,
  Sparkles, Lock, Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Plano = 'PROFISSIONAL' | 'ESTUDIO';

const PLANOS = {
  PROFISSIONAL: {
    nome: 'Profissional',
    preco: 49,
    limite: '20 alunos',
    features: [
      'Agenda + evoluções + WhatsApp',
      'Recibo PDF + relatório de frequência',
      'E-mail automático ao agendar',
      'Suporte por e-mail',
    ],
  },
  ESTUDIO: {
    nome: 'Estúdio',
    preco: 89,
    limite: 'Alunos ilimitados',
    features: [
      'Tudo do Profissional',
      'Sem limite de alunos',
      'Audit log visível (LGPD)',
      'Prioridade no suporte',
      'Futuras integrações fiscais',
    ],
  },
} as const;

// Máscaras leves — só formatam visualmente, validação real é no backend/Asaas
const onlyDigits = (s: string) => s.replace(/\D/g, '');
function fmtCPF(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}
function fmtCEP(v: string) { return onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'); }
function fmtTelefone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}
function fmtCartao(v: string) {
  return onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export default function UpgradePage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [plano, setPlano] = useState<Plano>('PROFISSIONAL');
  const [statusAtual, setStatusAtual] = useState<{ status: string; diasRestantesTrial: number | null } | null>(null);

  // Titular
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');

  // Cartão
  const [ccNumero, setCcNumero] = useState('');
  const [ccNome, setCcNome] = useState('');
  const [ccMes, setCcMes] = useState('');
  const [ccAno, setCcAno] = useState('');
  const [ccCcv, setCcCcv] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      setEmail(user.email || '');

      const res = await fetch('/api/billing/status');
      const data = await res.json();
      if (data.ok && data.subscription) {
        setStatusAtual({
          status: data.subscription.status,
          diasRestantesTrial: data.subscription.diasRestantesTrial,
        });
      }
      setCarregando(false);
    }
    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const payload = {
      plan: plano,
      holder: {
        nome: nome.trim(),
        email: email.trim(),
        cpfCnpj: onlyDigits(cpf),
        telefone: onlyDigits(telefone),
        cep: onlyDigits(cep),
        numero: numero.trim(),
        complemento: complemento.trim() || undefined,
      },
      creditCard: {
        holderName: ccNome.trim(),
        number: onlyDigits(ccNumero),
        expiryMonth: ccMes,
        expiryYear: ccAno,
        ccv: ccCcv,
      },
    };

    try {
      const res = await fetch('/api/billing/criar-assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const detalhe = data.detalhes?.[0]?.description || data.error || 'Erro ao processar';
        setErro(detalhe);
        setEnviando(false);
        return;
      }

      setSucesso(true);
      setEnviando(false);
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro de conexão');
      setEnviando(false);
    }
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-32 animate-pulse"><p className="text-[var(--color-muted-foreground)]">Carregando...</p></div>;
  }

  if (sucesso) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="p-10 text-center space-y-5 animate-fade-in">
          <div className="mx-auto size-16 rounded-2xl gradient-emerald flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <CheckCircle2 className="size-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Assinatura criada!</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Sua primeira cobrança será processada no fim do período de teste. Você receberá a confirmação por e-mail.
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Redirecionando para o dashboard...</p>
        </Card>
      </div>
    );
  }

  const trialExpirou = statusAtual?.status === 'EXPIRED' || statusAtual?.status === 'BLOCKED';
  const diasRestantes = statusAtual?.diasRestantesTrial;

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Assinatura</p>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Crown className="size-7 text-amber-500" /> Escolha seu plano
        </h1>
        {trialExpirou ? (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
            <AlertCircle className="size-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-rose-900">Seu período de teste expirou</p>
              <p className="text-rose-700/90 text-xs mt-1">Assine um plano para voltar a usar o Acompanha.</p>
            </div>
          </div>
        ) : diasRestantes !== null && diasRestantes !== undefined && diasRestantes > 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Você tem <strong className="text-[var(--color-primary)]">{diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}</strong> restantes do teste gratuito. A primeira cobrança acontece no fim desse período.
          </p>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">Assine para continuar gerenciando seus alunos sem limites.</p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* PLANO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['PROFISSIONAL', 'ESTUDIO'] as const).map((p) => {
            const ativo = plano === p;
            const info = PLANOS[p];
            return (
              <Card
                key={p}
                className={ativo
                  ? 'p-6 cursor-pointer ring-2 ring-violet-500 shadow-lg shadow-purple-500/20 relative'
                  : 'p-6 cursor-pointer hover:border-violet-300 transition-colors'
                }
                onClick={() => setPlano(p)}
              >
                {ativo && (
                  <Badge variant="primary" className="absolute -top-2 -right-2">
                    <CheckCircle2 className="size-3" /> Selecionado
                  </Badge>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`size-10 rounded-xl ${p === 'ESTUDIO' ? 'gradient-emerald' : 'gradient-primary'} flex items-center justify-center shadow-md`}>
                    {p === 'ESTUDIO' ? <Sparkles className="size-5 text-white" /> : <Crown className="size-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">{info.nome}</h3>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">{info.limite}</p>
                  </div>
                </div>
                <p className="text-3xl font-black mb-1">R$ {info.preco}<span className="text-sm font-bold text-[var(--color-muted-foreground)]">/mês</span></p>
                <ul className="space-y-1 mt-4">
                  {info.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        {/* TITULAR */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/25">
              <User className="size-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight">Dados do titular</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Para emissão da nota e cobrança</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como aparece no documento" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-titular">E-mail</Label>
              <Input id="email-titular" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF ou CNPJ</Label>
              <Input id="cpf" required value={cpf} onChange={(e) => setCpf(fmtCPF(e.target.value))} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Celular</Label>
              <Input id="telefone" required value={telefone} onChange={(e) => setTelefone(fmtTelefone(e.target.value))} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-[var(--color-muted-foreground)]">
              <MapPin className="size-4" /> Endereço de cobrança
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" required value={cep} onChange={(e) => setCep(fmtCEP(e.target.value))} placeholder="00000-000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" required value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="complemento">Complemento (opcional)</Label>
                <Input id="complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, sala..." />
              </div>
            </div>
          </div>
        </Card>

        {/* CARTÃO */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
                <CreditCard className="size-5 text-white" />
              </div>
              <div>
                <h2 className="font-extrabold tracking-tight">Cartão de crédito</h2>
                <p className="text-xs text-[var(--color-muted-foreground)]">Cobrança mensal automática</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted-foreground)] font-bold">
              <Lock className="size-3" /> SSL · Asaas
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cc-numero">Número do cartão</Label>
              <Input id="cc-numero" required inputMode="numeric" value={ccNumero} onChange={(e) => setCcNumero(fmtCartao(e.target.value))} placeholder="1234 5678 9012 3456" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-nome">Nome impresso no cartão</Label>
              <Input id="cc-nome" required value={ccNome} onChange={(e) => setCcNome(e.target.value.toUpperCase())} placeholder="ANA SILVA" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cc-mes">Mês</Label>
                <Input id="cc-mes" required inputMode="numeric" maxLength={2} value={ccMes} onChange={(e) => setCcMes(onlyDigits(e.target.value).slice(0, 2))} placeholder="MM" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc-ano">Ano</Label>
                <Input id="cc-ano" required inputMode="numeric" maxLength={4} value={ccAno} onChange={(e) => setCcAno(onlyDigits(e.target.value).slice(0, 4))} placeholder="AAAA" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc-ccv">CCV</Label>
                <Input id="cc-ccv" required inputMode="numeric" maxLength={4} value={ccCcv} onChange={(e) => setCcCcv(onlyDigits(e.target.value).slice(0, 4))} placeholder="123" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--color-muted)]/40 p-3 text-[11px] text-[var(--color-muted-foreground)] flex items-start gap-2">
            <Lock className="size-3.5 mt-0.5 shrink-0" />
            <p>
              Seus dados de cartão são enviados diretamente para o Asaas via conexão criptografada (SSL).
              Nós não armazenamos número, validade ou CCV.
            </p>
          </div>
        </Card>

        {/* RESUMO */}
        <Card className="p-5 bg-violet-50 border-violet-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-violet-600" />
              <div className="text-sm">
                <p className="font-bold">
                  R$ {PLANOS[plano].preco},00/mês · Plano {PLANOS[plano].nome}
                </p>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">
                  {diasRestantes && diasRestantes > 0
                    ? `Primeira cobrança em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} (fim do trial). Cancele a qualquer momento.`
                    : 'Cobrança imediata. Cancele a qualquer momento.'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {erro && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-700 animate-fade-in flex items-start gap-2">
            <AlertCircle className="size-4 mt-0.5 shrink-0" /> {erro}
          </div>
        )}

        <Button type="submit" size="lg" disabled={enviando} className="w-full">
          {enviando ? 'Processando...' : <>Assinar agora · R$ {PLANOS[plano].preco}/mês <Lock className="size-4" /></>}
        </Button>

        <p className="text-[11px] text-center text-[var(--color-muted-foreground)]">
          Ao assinar você concorda com os termos. Cobrança recorrente mensal processada pelo Asaas. Cancele a qualquer momento.
        </p>
      </form>
    </div>
  );
}
