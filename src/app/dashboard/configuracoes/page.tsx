'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  MessageSquare,
  Building2,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const OPCOES_PAGAMENTO = ['PIX', 'Cartão de Crédito', 'Dinheiro', 'Transferência Bancária'];

export default function ConfiguracoesUsuario() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [chavePix, setChavePix] = useState('');
  const [diaCobranca, setDiaCobranca] = useState(5);
  const [formasPagamento, setFormasPagamento] = useState<string[]>([]);
  const [msgLembrete, setMsgLembrete] = useState('');
  const [msgCobranca, setMsgCobranca] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('Simples Nacional');
  const [aliquota, setAliquota] = useState('0.00');

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const { data: config } = await supabase
        .from('configuracoes_usuario')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      if (config) {
        setChavePix(config.chave_pix || '');
        setDiaCobranca(config.dia_cobranca_padrao || 5);
        setFormasPagamento(config.formas_pagamento || []);
        setMsgLembrete(config.mensagem_lembrete || '');
        setMsgCobranca(config.mensagem_cobranca || '');
        setRazaoSocial(config.razao_social || '');
        setCnpj(config.cnpj || '');
        setInscricaoMunicipal(config.inscricao_municipal || '');
        setRegimeTributario(config.regime_tributario || 'Simples Nacional');
        setAliquota(Number(config.aliquota_imposto).toFixed(2));
      } else {
        setFormasPagamento(['PIX', 'Dinheiro']);
      }
      setCarregando(false);
    }
    carregar();
  }, [router]);

  const toggleForma = (forma: string) => {
    setFormasPagamento(prev =>
      prev.includes(forma) ? prev.filter(f => f !== forma) : [...prev, forma]
    );
  };

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagemSucesso('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('configuracoes_usuario').upsert({
      user_id: session.user.id,
      chave_pix: chavePix.trim() || null,
      dia_cobranca_padrao: Number(diaCobranca),
      formas_pagamento: formasPagamento,
      mensagem_lembrete: msgLembrete.trim() || null,
      mensagem_cobranca: msgCobranca.trim() || null,
      razao_social: razaoSocial.trim() || null,
      cnpj: cnpj.trim() || null,
      inscricao_municipal: inscricaoMunicipal.trim() || null,
      regime_tributario: regimeTributario,
      aliquota_imposto: parseFloat(aliquota) || 0.00
    }, { onConflict: 'user_id' });

    if (!error) {
      setMensagemSucesso('Configurações salvas com sucesso!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMensagemSucesso(''), 4000);
    } else {
      alert('Erro ao salvar: ' + error.message);
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
              <Input id="input-pix" type="text" placeholder="E-mail, CPF, CNPJ ou chave aleatória" value={chavePix} onChange={(e) => setChavePix(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-dia">Dia padrão de fechamento</Label>
              <Input id="input-dia" type="number" min="1" max="28" value={diaCobranca} onChange={(e) => setDiaCobranca(parseInt(e.target.value) || 5)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Formas de pagamento aceitas</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OPCOES_PAGAMENTO.map((forma) => {
                const ativo = formasPagamento.includes(forma);
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
              <Textarea id="txt-lembrete" rows={3} value={msgLembrete} onChange={(e) => setMsgLembrete(e.target.value)} />
              <p className="text-[10px] text-[var(--color-muted-foreground)] italic">Tags: [nome_aluno], [data], [horario]</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-cobranca">Fechamento / Cobrança mensal</Label>
              <Textarea id="txt-cobranca" rows={3} value={msgCobranca} onChange={(e) => setMsgCobranca(e.target.value)} />
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
              <Input id="input-razao" type="text" placeholder="Nome completo ou razão social" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-cnpj">CNPJ / CPF</Label>
              <Input id="input-cnpj" type="text" placeholder="00.000.000/0001-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-im">Inscrição municipal</Label>
              <Input id="input-im" type="text" placeholder="Opcional" value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="select-regime">Regime tributário</Label>
                <Select id="select-regime" value={regimeTributario} onChange={(e) => setRegimeTributario(e.target.value)}>
                  <option value="Simples Nacional">Simples Nacional</option>
                  <option value="MEI">MEI</option>
                  <option value="Lucro Presumido">Lucro Presumido</option>
                  <option value="Pessoa Física">Pessoa Física</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="input-aliquota">Alíquota (%)</Label>
                <Input id="input-aliquota" type="number" step="0.01" value={aliquota} onChange={(e) => setAliquota(e.target.value)} />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={salvando}>
            {salvando ? 'Salvando...' : <><Save className="size-4" /> Salvar configurações</>}
          </Button>
        </div>
      </form>
    </div>
  );
}