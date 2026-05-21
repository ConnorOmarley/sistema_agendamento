'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface EvolucaoGeral {
  id: string;
  data: string;
  tipo_registro: string;
  relatorio: string;
  alunos: {
    id: string;
    nome: string;
  } | null;
}

export default function EvolucoesGeral() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [evolucoes, setEvolucoes] = useState<EvolucaoGeral[]>([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    async function carregarTodasEvolucoes() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('evolucoes')
        .select(`
          id,
          data,
          tipo_registro,
          relatorio,
          alunos (
            id,
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) setEvolucoes(data as unknown as EvolucaoGeral[]);
      setCarregando(false);
    }

    carregarTodasEvolucoes();
  }, [router]);

  const evolucoesFiltradas = evolucoes.filter((ev) => {
    const termo = busca.toLowerCase();
    const nomeAluno = ev.alunos?.nome.toLowerCase() || '';
    const textoRelatorio = ev.relatorio.toLowerCase() || '';
    return nomeAluno.includes(termo) || textoRelatorio.includes(termo);
  });

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium animate-pulse">Carregando histórico clínico...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <nav className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center">
        <div className="flex gap-8 items-center">
          <Link href="/dashboard" className="text-sm font-bold text-indigo-600 hover:underline">← Voltar para Painel</Link>
          <span className="text-gray-300">|</span>
          <div className="flex gap-4 text-xs font-bold text-gray-500">
            <Link href="/dashboard/agendamentos" className="hover:text-gray-900">Agenda</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pt-8 space-y-6">
        <div className="bg-white border rounded-xl p-4 shadow-sm flex justify-between items-center">
          <input type="text" placeholder="🔍 Buscar por aluno ou palavras-chave..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          <p className="text-xs text-gray-500">Total: <span className="font-bold text-indigo-600">{evolucoesFiltradas.length}</span></p>
        </div>

        <div className="space-y-4">
          {evolucoesFiltradas.map((ev) => {
            const [ano, mes, dia] = ev.data.split('-');
            return (
              <div key={ev.id} className="bg-white border rounded-xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between border-b pb-2 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold uppercase">Aluno:</span>{' '}
                    {ev.alunos ? <Link href={`/dashboard/alunos/${ev.alunos.id}`} className="font-extrabold text-indigo-600 hover:underline">{ev.alunos.nome}</Link> : '—'}
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700">{ev.tipo_registro}</span>
                    <span className="text-gray-400">{dia}/{mes}/{ano}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap">{ev.relatorio}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}