'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Lock, ArrowRight, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  senha: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'A senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caractere especial'),
  confirmarSenha: z.string(),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type FormData = z.infer<typeof schema>;

type LinkState = 'verificando' | 'valido' | 'invalido';

export default function ResetPassword() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>('verificando');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [verConfirmarSenha, setVerConfirmarSenha] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Supabase entrega o link com hash (#access_token=...&type=recovery) que o
  // browser client converte numa sessão automaticamente. Esperamos a sessão.
  useEffect(() => {
    let cancelado = false;
    async function aguardarSessao() {
      // Pequeno delay para o cliente browser processar o hash.
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (cancelado) return;
        if (data.session) {
          setLinkState('valido');
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!cancelado) setLinkState('invalido');
    }
    aguardarSessao();
    return () => { cancelado = true; };
  }, []);

  async function onSubmit(data: FormData) {
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.updateUser({ password: data.senha });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    setSucesso(true);
    setCarregando(false);

    // Após trocar a senha, faz logout e manda pro login para entrar com a nova.
    setTimeout(async () => {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    }, 2500);
  }

  if (linkState === 'verificando') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-[var(--color-muted-foreground)] animate-pulse">Validando link...</p>
      </div>
    );
  }

  if (linkState === 'invalido') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="glass-card rounded-3xl border border-white/40 shadow-2xl shadow-rose-900/10 p-8 text-center space-y-5">
            <div className="mx-auto size-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <KeyRound className="size-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight">Link inválido ou expirado</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                O link de redefinição expirou ou já foi usado. Solicite um novo abaixo.
              </p>
            </div>
            <Button onClick={() => router.push('/forgot-password')} className="w-full" size="lg">
              Solicitar novo link <ArrowRight className="size-4" />
            </Button>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:underline">
              <ArrowLeft className="size-4" /> Voltar para login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="glass-card rounded-3xl border border-white/40 shadow-2xl shadow-emerald-900/10 p-8 text-center space-y-5">
            <div className="mx-auto size-16 rounded-2xl gradient-emerald flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="size-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight">Senha redefinida!</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Sua senha foi atualizada com sucesso. Redirecionando para o login...
              </p>
            </div>
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
            <KeyRound className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Defina sua nova senha</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] text-center max-w-xs">
            Escolha uma senha forte que você consiga lembrar.
          </p>
        </div>

        <div className="glass-card rounded-3xl border border-white/40 shadow-2xl shadow-purple-900/10 p-8 space-y-6">
          {erro && (
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm font-medium text-rose-700 animate-fade-in">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="senha">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)] pointer-events-none" />
                <Input
                  id="senha"
                  {...register('senha')}
                  type={verSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  autoFocus
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
              <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
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
              {carregando ? 'Salvando...' : <>Definir nova senha <ArrowRight className="size-4" /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
