'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ConfiguacoesUsuario() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // Estados do formulário de configurações
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

  const OPCOES_PAGAMENTO = ['PIX', 'Cartão de Crédito', 'Dinheiro', 'Transferência Bancária'];

  useEffect(() => {
    async function carregarConfiguracoes() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

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
        // Valores padrão iniciais caso o utilizador nunca tenha configurado
        setFormasPagamento(['PIX', 'Dinheiro']);
      }
      setCarregando(false);
    }
    carregarConfiguracoes();
  }, [router]);

  const handleCheckboxChange = (forma: string) => {
    if (formasPagamento.includes(forma)) {
      setFormasPagamento(formasPagamento.filter(f => f !== forma));
    } else {
      setFormasPagamento([...formasPagamento, forma]);
    }
  };

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagemSucesso('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('configuracoes_usuario')
      .upsert({
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
      setMensagemSucesso('✓ Configurações salvas com sucesso no seu perfil SaaS!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMensagemSucesso(''), 4000);
    } else {
      alert('Erro ao salvar: ' + error.message);
    }
    setSalvando(false);
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium animate-pulse">Carregando painel de configurações...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      <nav className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-sm font-bold text-indigo-600 hover:underline">← Voltar para Painel</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-md font-bold text-gray-700">⚙️ Configurações da Minha Conta SaaS</h1>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        {mensagemSucesso && (
          <div className="mb-6 p-4 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
            {mensagemSucesso}
          </div>
        )}

        <form onSubmit={handleSalvar} className="space-y-8">
          
          {/* SEÇÃO 1: FINANCEIRO */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">💰 Financeiro e Faturamento</h2>
              <p className="text-xs text-gray-400 mt-0.5">Defina como os seus alunos realizam os pagamentos.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="input-pix" className="block font-bold text-gray-600 mb-1">Chave PIX Principal</label>
                <input
                  id="input-pix"
                  title="Chave PIX Principal"
                  type="text"
                  placeholder="E-mail, celular, CNPJ ou chave aleatória"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label htmlFor="input-dia" className="block font-bold text-gray-600 mb-1">Dia Padrão do Fechamento/Cobrança</label>
                <input
                  id="input-dia"
                  title="Dia Padrão do Fechamento"
                  type="number"
                  min="1"
                  max="28"
                  value={diaCobranca}
                  onChange={(e) => setDiaCobranca(parseInt(e.target.value) || 5)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="text-xs pt-2">
              <span className="block font-bold text-gray-600 mb-2">Formas de Pagamento Aceitas</span>
              <div className="flex flex-wrap gap-4 bg-gray-50 p-3 rounded-lg border">
                {OPCOES_PAGAMENTO.map((forma) => (
                  <label key={forma} className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formasPagamento.includes(forma)}
                      onChange={() => handleCheckboxChange(forma)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-gray-300"
                    />
                    {forma}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: MENSAGENS PADRÃO */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">💬 Modelos de Mensagens (WhatsApp)</h2>
              <p className="text-xs text-gray-400 mt-0.5">Customize as mensagens automáticas de aviso.</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label htmlFor="txt-lembrete" className="block font-bold text-gray-600 mb-1">Mensagem de Lembrete de Sessão</label>
                <textarea
                  id="txt-lembrete"
                  title="Mensagem de Lembrete"
                  rows={3}
                  value={msgLembrete}
                  onChange={(e) => setMsgLembrete(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <span className="text-[10px] text-gray-400 block mt-1 italic">Tags automáticas: [nome_aluno], [data], [horario]</span>
              </div>

              <div>
                <label htmlFor="txt-cobranca" className="block font-bold text-gray-600 mb-1">Mensagem de Fechamento / Cobrança Mensal</label>
                <textarea
                  id="txt-cobranca"
                  title="Mensagem de Cobrança"
                  rows={3}
                  value={msgCobranca}
                  onChange={(e) => setMsgCobranca(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <span className="text-[10px] text-gray-400 block mt-1 italic">Tags automáticas: [nome_aluno], [valor_total], [chave_pix]</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: DADOS FISCAIS */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">🏢 Dados Fiscais (Nota Fiscal)</h2>
              <p className="text-xs text-gray-400 mt-0.5">Mantenha preenchido para automatizar a emissão de notas fiscais futuramente.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="input-razao" className="block font-bold text-gray-600 mb-1">Razão Social / Nome Profissional</label>
                <input
                  id="input-razao"
                  title="Razão Social ou Nome Profissional"
                  type="text"
                  placeholder="Nome completo ou Razão Social"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="input-cnpj" className="block font-bold text-gray-600 mb-1">CNPJ / CPF</label>
                <input
                  id="input-cnpj"
                  title="CNPJ ou CPF"
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="input-im" className="block font-bold text-gray-600 mb-1">Inscrição Municipal</label>
                <input
                  id="input-im"
                  title="Inscrição Municipal"
                  type="text"
                  placeholder="Inscrição Municipal (se houver)"
                  value={inscricaoMunicipal}
                  onChange={(e) => setInscricaoMunicipal(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="select-regime" className="block font-bold text-gray-600 mb-1">Regime Tributário</label>
                  <select
                    id="select-regime"
                    title="Regime Tributário"
                    value={regimeTributario}
                    onChange={(e) => setRegimeTributario(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="MEI">MEI</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Pessoa Física">Pessoa Física</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="input-aliquota" className="block font-bold text-gray-600 mb-1">Alíquota de Imposto (%)</label>
                  <input
                    id="input-aliquota"
                    title="Alíquota de Imposto em percentual"
                    type="number"
                    step="0.01"
                    value={aliquota}
                    onChange={(e) => setAliquota(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BOTÃO SUBMIT */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className={`px-6 py-3 font-bold rounded-xl text-xs text-white shadow-md transition-all ${
                salvando ? 'bg-gray-400 cursor-not-allowed animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {salvando ? '💾 Salvando...' : '💾 Salvar Todas as Configurações'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}