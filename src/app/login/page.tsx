'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Sparkles, Mail, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkThrottle, recordFailure, clearThrottle } from '@/lib/login-throttle';

const loginSchema = z.object({
  email: z.string().email('Insira um e-mail válido'),
  senha: z.string().min(1, 'A senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const [bloqueio, setBloqueio] = useState<{ remainingMs: number; remainingLabel: string } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const oauthErro = searchParams.get('error') === 'oauth';

  async function handleGoogle() {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  const emailDigitado = watch('email');

  // Verifica bloqueio enquanto o usuário digita o e-mail.
  useEffect(() => {
    if (!emailDigitado || !emailDigitado.includes('@')) {
      setBloqueio(null);
      return;
    }
    const check = checkThrottle(emailDigitado);
    setBloqueio(check.locked ? { remainingMs: check.remainingMs, remainingLabel: check.remainingLabel } : null);
  }, [emailDigitado]);

  // Countdown visual enquanto bloqueado.
  useEffect(() => {
    if (!bloqueio) return;
    const t = setInterval(() => {
      const check = checkThrottle(emailDigitado);
      if (!check.locked) {
        setBloqueio(null);
        clearInterval(t);
      } else {
        setBloqueio({ remainingMs: check.remainingMs, remainingLabel: check.remainingLabel });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [bloqueio, emailDigitado]);

  async function handleLogin(data: LoginFormData) {
    setErro(null);

    const pre = checkThrottle(data.email);
    if (pre.locked) {
      setBloqueio({ remainingMs: pre.remainingMs, remainingLabel: pre.remainingLabel });
      setErro(`Muitas tentativas falhadas. Aguarde ${pre.remainingLabel} antes de tentar de novo.`);
      return;
    }

    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.senha,
    });

    if (error) {
      const apos = recordFailure(data.email);
      if (error.message === 'Invalid login credentials') {
        setErro('E-mail ou senha incorretos.');
      } else if (error.message === 'Email not confirmed') {
        setErro('Por favor, confirme o seu e-mail antes de fazer login.');
      } else {
        setErro(error.message);
      }
      if (apos.locked) {
        setBloqueio({ remainingMs: apos.remainingMs, remainingLabel: apos.remainingLabel });
        setErro(`Muitas tentativas falhadas. Aguarde ${apos.remainingLabel} para tentar de novo.`);
      }
      setCarregando(false);
      return;
    }

    clearThrottle(data.email);
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="size-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-purple-500/30">
            <Sparkles className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-foreground)]">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] text-center max-w-xs">
            Acesse sua conta para gerenciar atendimentos, alunos e cobranças.
          </p>
        </div>

        <div className="glass-card rounded-3xl border border-white/40 shadow-2xl shadow-purple-900/10 p-8 space-y-6">
          {bloqueio && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm font-medium text-amber-800 animate-fade-in flex items-start gap-3">
              <ShieldAlert className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acesso temporariamente bloqueado</p>
                <p className="text-xs mt-0.5 opacity-90">
                  Detectamos várias tentativas falhadas. Aguarde <strong>{bloqueio.remainingLabel}</strong> antes de tentar novamente.
                </p>
              </div>
            </div>
          )}

          {oauthErro && (
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm font-medium text-rose-700 animate-fade-in">
              Não foi possível entrar com o Google. Tente novamente.
            </div>
          )}

          {erro && !bloqueio && (
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm font-medium text-rose-700 animate-fade-in">
              {erro}
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || !!bloqueio}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border-2 border-[var(--color-border)] bg-white hover:bg-[var(--color-muted)] font-bold text-sm transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="size-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Redirecionando...' : 'Continuar com Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)] pointer-events-none" />
                <Input
                  id="email"
                  {...register('email')}
                  type="email"
                  placeholder="ana@exemplo.com"
                  className="pl-10"
                />
              </div>
              {errors.email && <p className="text-xs font-medium text-rose-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)] pointer-events-none" />
                <Input
                  id="senha"
                  {...register('senha')}
                  type={verSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVerSenha(!verSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.senha && <p className="text-xs font-medium text-rose-600">{errors.senha.message}</p>}
            </div>

            <div className="flex justify-end text-sm">
              <Link href="/forgot-password" className="font-bold text-[var(--color-primary)] hover:underline">
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={carregando || !!bloqueio}
              className="w-full"
            >
              {bloqueio
                ? `Aguarde ${bloqueio.remainingLabel}`
                : carregando
                ? 'Entrando...'
                : <>Entrar <ArrowRight className="size-4" /></>}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
          Não tem uma conta?{' '}
          <Link href="/register" className="font-bold text-[var(--color-primary)] hover:underline">
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  );
}