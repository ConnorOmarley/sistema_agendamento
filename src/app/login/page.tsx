'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Insira um e-mail válido'),
  senha: z.string().min(1, 'A senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function handleLogin(data: LoginFormData) {
    setCarregando(true);
    setErro(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.senha,
    });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setErro('E-mail ou senha incorretos.');
      } else if (error.message === 'Email not confirmed') {
        setErro('Por favor, confirme o seu e-mail antes de fazer login.');
      } else {
        setErro(error.message);
      }
      setCarregando(false);
      return;
    }

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
          {erro && (
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm font-medium text-rose-700 animate-fade-in">
              {erro}
            </div>
          )}

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
              disabled={carregando}
              className="w-full"
            >
              {carregando ? 'Entrando...' : <>Entrar <ArrowRight className="size-4" /></>}
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