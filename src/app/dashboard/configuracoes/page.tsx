'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  MessageSquare,
  Building2,
  Save,
  CheckCircle2,
  AlertTriangle,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/user';
import type { RegimeTributario } from '@/types/domain';
import { DeleteAccountCard } from '@/components/dashboard/delete-account-card';
import { Card } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const OPCOES_PAGAMENTO = ['PIX', 'Cartão de Crédito', 'Dinheiro', 'Transferência Bancária'];

type ConfigForm = {
  nomeExibicao: string;
  chavePix: string;
  diaCobranca: number;
  formasPagamento: string[];
  msgLembrete: string;
  msgCobranca: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoMunicipal: string;
  regimeTributario: RegimeTributario;
  aliquota: string;
};

const CONFIG_DEFAULTS: ConfigForm = {
  nomeExibicao: '',
  chavePix: '',
  diaCobranca: 5,
  formasPagamento: [],
  msgLembrete: '',
  msgCobranca: '',
  razaoSocial: '',
  cnpj: '',
  inscricaoMunicipal: '',
  regimeTributario: 'Simples Nacional',
  aliquota: '0.00',
};

function configJSON(c: ConfigForm) {
  return JSON.stringify({ ...c, formasPagamento: [...c.formasPagamento].sort() });
}

export default function ConfiguracoesUsuario() {
  const router = useRouter();
  const userInfo = useUser();
  const emailLogado = userInfo?.email ?? '';
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [config, setConfig] = useState<ConfigForm>(CONFIG_DEFAULTS);
  const [savedConfig, setSavedConfig] = useState<ConfigForm | null>(null);

  // useMemo: configJSON chama JSON.stringify duas vezes — executar só quando
  // config ou savedConfig mudarem, não em qualquer renderização do formulário.
  const isDirty = useMemo(
    () => savedConfig !== null && configJSON(config) !== configJSON(savedConfig),
    [config, savedConfig],
  );

  const saveButtonRef = useRef<HTMLButtonElement>(null);

  // useCallback: referência estável evita que campos do formulário re-renderizem
  // desnecessariamente quando outros campos do mesmo formulário são alterados.
  const set = useCallback(<K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) =>
    setConfig(prev => ({ ...prev, [key]: value })), []);

  // Avisa ao fechar aba/janela com alterações não salvas
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const md = session.user.user_metadata || {};
      const nomeAtual = md.display_name || md.full_name || md.name || '';

      const { data: cfg } = await supabase
        .from('configuracoes_usuario')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      const snap: ConfigForm = {
        nomeExibicao: String(nomeAtual),
        chavePix: cfg?.chave_pix || '',
        diaCobranca: cfg?.dia_cobranca_padrao || 5,
        formasPagamento: cfg?.formas_pagamento || ['PIX', 'Dinheiro'],
        msgLembrete: cfg?.mensagem_lembrete || '',
        msgCobranca: cfg?.mensagem_cobranca || '',
        razaoSocial: cfg?.razao_social || '',
        cnpj: cfg?.cnpj || '',
        inscricaoMunicipal: cfg?.inscricao_municipal || '',
        regimeTributario: cfg?.regime_tributario || 'Simples Nacional',
        aliquota: Number(cfg?.aliquota_imposto).toFixed(2),
      };

      setConfig(snap);
      setSavedConfig(snap);
      setCarregando(false);
    }
    carregar();
  }, [router]);

  const toggleForma = (forma: string) =>
    set('formasPagamento',
      config.formasPagamento.includes(forma)
        ? config.formasPagamento.filter(f => f !== forma)
        : [...config.formasPagamento, forma]
    );

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagemSucesso('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const nomeLimpo = config.nomeExibicao.trim();
    if (nomeLimpo) {
      await supabase.auth.updateUser({ data: { display_name: nomeLimpo } });
    }

    const { error } = await supabase.from('configuracoes_usuario').upsert({
      user_id: session.user.id,
      chave_pix: config.chavePix.trim() || null,
      dia_cobranca_padrao: Number(config.diaCobranca),
      formas_pagamento: config.formasPagamento,
      mensagem_lembrete: config.msgLembrete.trim() || null,
      mensagem_cobranca: config.msgCobranca.trim() || null,
      razao_social: config.razaoSocial.trim() || null,
      cnpj: config.cnpj.trim() || null,
      inscricao_municipal: config.inscricaoMunicipal.trim() || null,
      regime_tributario: config.regimeTributario,
      aliquota_imposto: parseFloat(config.aliquota) || 0.00,
    }, { onConflict: 'user_id' });

    if (!error) {
      setMensagemSucesso('Configurações salvas com sucesso!');
      setSavedConfig(config);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMensagemSucesso(''), 4000);
    } else {
      toast.error('Erro ao salvar configurações: ' + error.message);
    }
    setSalvando(false);
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-32 animate-pulse"><p className="text-[var(--color-muted-foreground)]">Carregando configurações...</p></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Conta</p>
        <h1 className="text-3xl font-extrabold tracking-tight">⚙️ Configurações</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Defina dados financeiros, mensagens e dados fiscais.</p>
      </header>

      {mensagemSucesso && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="size-5" /> {mensagemSucesso}
        </div>
      )}

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* Perfil */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/25">
              <User className="size-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight">👤 Perfil</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Como o sistema te chama</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="input-nome-exibicao">Nome de exibição</Label>
              <Input
                id="input-nome-exibicao"
                type="text"
                placeholder="Ex: Carlos, Profa. Ana, Dr. João..."
                value={config.nomeExibicao}
                onChange={(e) => set('nomeExibicao', e.target.value)}
              />
              <p className="text-[10px] text-[var(--color-muted-foreground)]">
                Aparece no banner do dashboard. Usa só o primeiro nome se você puser o nome completo.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>E-mail da conta</Label>
              <Input type="email" value={emailLogado} disabled className="opacity-60 cursor-not-allowed" />
              <p className="text-[10px] text-[var(--color-muted-foreground)]">
                Identificação da conta. Não pode ser alterado por aqui.
              </p>
            </div>
          </div>
        </Card>

        {/* Financeiro */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl gradient-emerald flex items-center justify-center shadow-md shadow-emerald-500/25">
              <Wallet className="size-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight">💰 Financeiro</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Como seus alunos pagam você</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="input-pix">Chave PIX principal</Label>
              <Input
                id="input-pix"
                type="text"
                placeholder="E-mail, CPF, CNPJ ou chave aleatória"
                value={config.chavePix}
                onChange={(e) => set('chavePix', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-dia">Dia padrão de fechamento</Label>
              <Input
                id="input-dia"
                type="number"
                min="1"
                max="28"
                value={config.diaCobranca}
                onChange={(e) => set('diaCobranca', parseInt(e.target.value) || 5)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Formas de pagamento aceitas</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OPCOES_PAGAMENTO.map((forma) => {
                const ativo = config.formasPagamento.includes(forma);
                return (
                  <label
                    key={forma}
                    className={
                      ativo
                        ? 'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl gradient-primary text-white text-xs font-bold cursor-pointer shadow-md shadow-purple-500/25 transition-all'
                        : 'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-[var(--color-border)] bg-white text-[var(--color-foreground)]/70 text-xs font-bold cursor-pointer hover:border-[var(--color-primary)] transition-all'
                    }
                  >
                    <input type="checkbox" checked={ativo} onChange={() => toggleForma(forma)} className="sr-only" />
                    {forma}
                  </label>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Mensagens */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl gradient-rose flex items-center justify-center shadow-md shadow-rose-500/25">
              <MessageSquare className="size-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight">💬 Modelos de mensagem</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Usadas no WhatsApp automático</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="txt-lembrete">Lembrete de sessão</Label>
              <Textarea
                id="txt-lembrete"
                rows={3}
                value={config.msgLembrete}
                onChange={(e) => set('msgLembrete', e.target.value)}
              />
              <p className="text-[10px] text-[var(--color-muted-foreground)] italic">Tags: [nome_aluno], [data], [horario]</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-cobranca">Fechamento / Cobrança mensal</Label>
              <Textarea
                id="txt-cobranca"
                rows={3}
                value={config.msgCobranca}
                onChange={(e) => set('msgCobranca', e.target.value)}
              />
              <p className="text-[10px] text-[var(--color-muted-foreground)] italic">Tags: [nome_aluno], [valor_total], [chave_pix]</p>
            </div>
          </div>
        </Card>

        {/* Dados fiscais */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight">🏢 Dados fiscais</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Preparado para emissão de NF futura</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="input-razao">Razão social / nome profissional</Label>
              <Input
                id="input-razao"
                type="text"
                placeholder="Nome completo ou razão social"
                value={config.razaoSocial}
                onChange={(e) => set('razaoSocial', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-cnpj">CNPJ / CPF</Label>
              <Input
                id="input-cnpj"
                type="text"
                placeholder="00.000.000/0001-00"
                value={config.cnpj}
                onChange={(e) => set('cnpj', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-im">Inscrição municipal</Label>
              <Input
                id="input-im"
                type="text"
                placeholder="Opcional"
                value={config.inscricaoMunicipal}
                onChange={(e) => set('inscricaoMunicipal', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="select-regime">Regime tributário</Label>
                <Select
                  id="select-regime"
                  value={config.regimeTributario}
                  onChange={(e) => set('regimeTributario', e.target.value as RegimeTributario)}
                >
                  <option value="Simples Nacional">Simples Nacional</option>
                  <option value="MEI">MEI</option>
                  <option value="Lucro Presumido">Lucro Presumido</option>
                  <option value="Pessoa Física">Pessoa Física</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="input-aliquota">Alíquota (%)</Label>
                <Input
                  id="input-aliquota"
                  type="number"
                  step="0.01"
                  value={config.aliquota}
                  onChange={(e) => set('aliquota', e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-center sm:justify-end">
          <Button ref={saveButtonRef} type="submit" size="lg" disabled={salvando || !isDirty} className="w-full sm:w-auto">
            {salvando ? 'Salvando...' : <><Save className="size-4" /> Salvar configurações</>}
          </Button>
        </div>
      </form>

      {/* Zona de perigo — FORA do form pra não conflitar com o submit de salvar */}
      <div className="pb-20">
        <DeleteAccountCard emailAtual={emailLogado} />
      </div>

      {/* Sticky banner — alterações não salvas */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:left-64 bg-amber-50 border-t-2 border-amber-300 shadow-2xl shadow-amber-900/20 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-amber-900 text-sm">
            <AlertTriangle className="size-4 shrink-0" />
            <p className="font-bold">Você tem alterações não salvas nas configurações.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => {
              saveButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              saveButtonRef.current?.focus({ preventScroll: true });
            }}
          >
            Ir para salvar <Save className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}