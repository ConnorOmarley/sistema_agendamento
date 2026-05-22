'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowRight, ArrowLeft, MailCheck, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('Insira um e-mail válido'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setCarregando(true);
    setErro(null);

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo });

    if (error) {
      // Para evitar enumeração de contas, mostramos sucesso mesmo se o e-mail não existir.
      // Mas se for erro de rate limit, mostramos.
      if (error.message.toLowerCase().includes('rate limit')) {
        setErro('Muitas solicitações. Aguarde alguns minutos antes de tentar novamente.');
        setCarregando(false);
        return;
      }
    }

    setEnviado(true);
    setCarregando(false);
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="glass-card rounded-3xl border border-white/40 shadow-2xl shadow-emerald-900/10 p-8 text-center space-y-5">
            <div className="mx-auto size-16 rounded-2xl gradient-emerald flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <MailCheck className="size-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight">Verifique seu e-mail</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Se existir uma conta com <strong className="text-[var(--color-foreground)]">{getValues('email')}</strong>,
                enviamos um link para redefinir a senha. O link expira em 1 hora.
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 text-left">
              💡 <strong>Não recebeu?</strong> Verifique a caixa de spam. O envio pode levar até alguns minutos.
            </div>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:underline">
              <ArrowLeft className="size-4" /> Voltar para login
            </Link>
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
          <h1 className="text-2xl font-extrabold tracking-tight">Esqueceu a senha?</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] text-center max-w-xs">
            Sem problema. Vamos te enviar um link de redefinição.
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
              <Label htmlFor="email">Seu e-mail cadastrado</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted-foreground)] pointer-events-none" />
                <Input id="email" {...register('email')} type="email" placeholder="ana@exemplo.com" className="pl-10" autoFocus />
              </div>
              {errors.email && <p className="text-xs font-medium text-rose-600">{errors.email.message}</p>}
            </div>

            <Button type="submit" size="lg" disabled={carregando} className="w-full">
              {carregando ? 'Enviando...' : <>Enviar link <ArrowRight className="size-4" /></>}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:underline">
            <ArrowLeft className="size-4" /> Voltar para login
          </Link>
        </p>
      </div>
    </div>
  );
}
