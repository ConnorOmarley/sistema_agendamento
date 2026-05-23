'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Receipt,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  X,
  Trash2,
  Crown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agendamentos', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/evolucoes', label: 'Prontuários', icon: FileText },
  { href: '/dashboard/fechamento', label: 'Fechamento', icon: Receipt },
  { href: '/dashboard/upgrade', label: 'Assinatura', icon: Crown },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/dashboard/lixeira', label: 'Lixeira', icon: Trash2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const ativo = (item: typeof NAV[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 glass-card border-b border-white/40 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="size-9 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/30">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="font-extrabold tracking-tight">Acompanha</span>
        </Link>
        <button
          onClick={() => setAberto(!aberto)}
          className="size-10 rounded-xl border border-[var(--color-border)] bg-white flex items-center justify-center"
          aria-label="Abrir menu"
        >
          {aberto ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {aberto && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fade-in"
          onClick={() => setAberto(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setAberto(false)} className="self-end size-10 rounded-xl border flex items-center justify-center">
              <X className="size-5" />
            </button>
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const a = ativo(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all',
                      a
                        ? 'gradient-primary text-white shadow-md shadow-purple-500/20'
                        : 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
                    )}
                  >
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto space-y-3 pt-4 border-t">
              <div className="px-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] font-bold">Conta</p>
                <p className="text-xs font-medium truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="size-5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-64 flex-col gap-6 px-4 py-6 border-r border-white/40 bg-white/40 backdrop-blur-md">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <div className="size-10 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles className="size-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight">Acompanha</span>
            <span className="text-[10px] text-[var(--color-muted-foreground)] font-medium -mt-0.5">Pedagogia & Psicopedagogia</span>
          </div>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const a = ativo(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group',
                  a
                    ? 'gradient-primary text-white shadow-md shadow-purple-500/25'
                    : 'text-[var(--color-foreground)]/80 hover:bg-white hover:text-[var(--color-foreground)] hover:shadow-sm'
                )}
              >
                <Icon className={cn('size-5 transition-transform', !a && 'group-hover:scale-110')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <div className="rounded-2xl bg-white/60 border border-white/60 p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] font-bold">Logada como</p>
            <p className="text-xs font-medium truncate mt-0.5">{userEmail || 'Carregando...'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="size-5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}