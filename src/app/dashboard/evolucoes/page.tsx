'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, FileText, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface EvolucaoGeral {
  id: string;
  data: string;
  tipo_registro: string;
  relatorio: string;
  alunos: { id: string; nome: string } | null;
}

export default function EvolucoesGeral() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [evolucoes, setEvolucoes] = useState<EvolucaoGeral[]>([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    async function carregarTodasEvolucoes() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data } = await supabase
        .from('evolucoes')
        .select(`id, data, tipo_registro, relatorio, alunos (id, nome)`)
        .eq('user_id', session.user.id)
        .is('deleted_at', null)
        .order('data', { ascending: false });

      if (data) setEvolucoes(data as unknown as EvolucaoGeral[]);
      setCarregando(false);
    }
    carregarTodasEvolucoes();
  }, [router]);

  const evolucoesFiltradas = evolucoes.filter((ev) => {
    const termo = busca.toLowerCase();
    const nome = ev.alunos?.nome.toLowerCase() || '';
    return nome.includes(termo) || ev.relatorio.toLowerCase().includes(termo);
  });

  if (carregando) {
    return <div className="flex items-center justify-center py-32 animate-pulse"><p className="text-[var(--color-muted-foreground)]">Carregando prontuários...</p></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Prontuários</p>
        <h1 className="text-3xl font-extrabold tracking-tight">📋 Evoluções clínicas</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Histórico completo de registros por aluno.</p>
      </header>

      <Card className="p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)]" />
          <Input
            type="text"
            placeholder="Buscar por aluno ou palavras-chave..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-xs text-[var(--color-muted-foreground)] font-medium pr-2 shrink-0">
          <span className="text-lg font-black text-[var(--color-primary)] mr-1">{evolucoesFiltradas.length}</span>
          {evolucoesFiltradas.length === 1 ? 'registro' : 'registros'}
        </div>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {evolucoesFiltradas.length === 0 ? (
          <Card className="p-16 text-center">
            <FileText className="size-12 mx-auto text-[var(--color-muted-foreground)] opacity-30 mb-3" />
            <p className="text-sm text-[var(--color-muted-foreground)] italic">
              {evolucoes.length === 0 ? 'Nenhuma evolução registrada ainda. Vá no perfil de um aluno para criar a primeira.' : 'Nenhum registro corresponde à busca.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {evolucoesFiltradas.map((ev) => {
              const [ano, mes, dia] = ev.data.split('-');
              return (
                <Card key={ev.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex">
                    <div className="gradient-primary text-white px-4 py-5 flex flex-col items-center justify-center shrink-0 w-20">
                      <span className="text-[10px] uppercase font-bold opacity-90">{['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][parseInt(mes)-1]}</span>
                      <span className="text-2xl font-black leading-none mt-0.5">{dia}</span>
                      <span className="text-[10px] opacity-75 mt-0.5">{ano}</span>
                    </div>
                    <div className="p-5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                            <User className="size-3.5" />
                          </div>
                          {ev.alunos ? (
                            <Link href={`/dashboard/alunos/${ev.alunos.id}`} className="font-extrabold text-sm text-[var(--color-foreground)] hover:text-[var(--color-primary)] hover:underline">
                              {ev.alunos.nome}
                            </Link>
                          ) : (
                            <span className="text-sm text-[var(--color-muted-foreground)] italic">Aluno removido</span>
                          )}
                        </div>
                        <Badge variant="primary">{ev.tipo_registro}</Badge>
                      </div>
                      <p className="text-sm text-[var(--color-foreground)]/85 whitespace-pre-wrap leading-relaxed">
                        {ev.relatorio}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}