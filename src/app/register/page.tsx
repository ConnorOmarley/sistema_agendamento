'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const registerSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Insira um e-mail válido'),
  senha: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'A senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caractere especial'),
  confirmarSenha: z.string()
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [verConfirmarSenha, setVerConfirmarSenha] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  async function handleRegister(data: RegisterFormData) {
    setCarregando(true);
    setErro(null);

    const { error: authError, data: authData } = await supabase.auth.signUp({
      email: data.email,
      password: data.senha,
      options: { data: { display_name: data.nome } }
    });

    if (authError) {
      setErro(authError.message);
      setCarregando(false);
      return;
    }

    if (authData.user && authData.session === null) {
      setSucesso(true);
    } else {
      router.push('/dashboard');
      router.refresh();
    }

    setCarregando(false);
  }

  if (sucesso) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="glass-card rounded-3xl border border-white/40 shadow-2xl shadow-emerald-900/10 p-8 text-center space-y-4">
            <div className="mx-auto size-16 rounded-2xl gradient-emerald flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="size-8 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Conta criada!</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Enviamos um e-mail de confirmação para você. Clique no link e faça login para começar.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full" size="lg">
              Ir para o login <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="size-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-purple-500/30">
            <Sparkles className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Crie sua conta</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] text-center max-w-xs">
            Em 1 minuto você está pronto para gerenciar seus alunos e cobranças.
          </p>
        </div>

        <div className="glass-card rounded-3xl border border-white/40 shadow-2xl shadow-purple-900/10 p-8 space-y-6">
          {erro && (
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm font-medium text-rose-700 animate-fade-in">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit(handleRegister)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)] pointer-events-none" />
                <Input id="nome" {...register('nome')} type="text" placeholder="Ana Silva" className="pl-10" />
              </div>
              {errors.nome && <p className="text-xs font-medium text-rose-600">{errors.nome.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)] pointer-events-none" />
                <Input id="email" {...register('email')} type="email" placeholder="ana@exemplo.com" className="pl-10" />
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
              <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1">
                Mín. 8 caracteres • letra • número • caractere especial
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmarSenha">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)] pointer-events-none" />
                <Input
                  id="confirmarSenha"
                  {...register('confirmarSenha')}
                  type={verConfirmarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVerConfirmarSenha(!verConfirmarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                  aria-label={verConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {verConfirmarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.confirmarSenha && <p className="text-xs font-medium text-rose-600">{errors.confirmarSenha.message}</p>}
            </div>

            <Button type="submit" size="lg" disabled={carregando} className="w-full">
              {carregando ? 'Criando conta...' : <>Cadastrar <ArrowRight className="size-4" /></>}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
          Já tem conta?{' '}
          <Link href="/login" className="font-bold text-[var(--color-primary)] hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}