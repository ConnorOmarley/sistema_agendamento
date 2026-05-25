/**
 * POST /api/auth/delete-account
 *
 * Exclusão de conta conforme LGPD Art. 18-VI (direito de eliminação).
 *
 * Fluxo:
 * 1. Valida sessão + confirmação de email digitado
 * 2. Cancela assinatura no Asaas (se existir)
 * 3. Apaga dados das tabelas dependentes em ordem
 * 4. Registra audit log da exclusão (mantido por compliance)
 * 5. Apaga o user de auth.users
 * 6. Limpa cookies da sessão
 *
 * O audit log de "delete_account" é PRESERVADO mesmo após a exclusão do user
 * (audit_log.user_id é SET NULL on delete, e o registro fica de prova legal).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';
import { registrarAuditoria } from '@/lib/audit-log';
import { cancelSubscription } from '@/lib/asaas/subscriptions';
import { captureException } from '@/lib/monitoring';

interface DeletePayload {
  emailConfirmacao: string;
}

export async function POST(request: NextRequest) {
  // 1. Auth
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
  }

  // 2. Confirmação por email (anti-clique acidental)
  let body: DeletePayload;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }

  if (body.emailConfirmacao?.trim().toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { ok: false, error: 'E-mail de confirmação não confere com o e-mail da conta.' },
      { status: 400 }
    );
  }

  const userId = user.id;
  const userEmail = user.email;
  const admin = createAdminClient();

  try {
    // 3. Cancela assinatura no Asaas se existir
    const { data: sub } = await admin
      .from('subscriptions')
      .select('asaas_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (sub?.asaas_subscription_id) {
      try {
        await cancelSubscription(sub.asaas_subscription_id);
      } catch (err) {
        // Cancelar no Asaas falhou (já cancelada, key expirada, etc.) — não bloqueia exclusão
        captureException(err, { operation: 'delete_account_asaas_cancel', userId });
      }
    }

    // 4. Registra audit log ANTES de apagar (pra ter prova legal LGPD)
    await registrarAuditoria({
      acao: 'delete',
      entidade: 'aluno',
      entidadeId: userId,
      detalhes: {
        acao: 'account_deletion',
        email: userEmail,
        timestamp: new Date().toISOString(),
        lgpd_basis: 'Art. 18-VI direito de eliminação',
      },
    });

    // 5. Apaga em ordem reversa de dependência (FK constraints NO ACTION em alguns)
    await admin.from('evolucoes').delete().eq('user_id', userId);
    await admin.from('agendamentos').delete().eq('user_id', userId);
    await admin.from('alunos').delete().eq('user_id', userId);
    // subscription_events: user_id SET NULL on delete — fica de auditoria
    // audit_log: user_id SET NULL on delete — fica de auditoria
    // subscriptions: CASCADE on auth.users delete (já cuidado abaixo)
    // configuracoes_usuario: CASCADE on auth.users delete
    // profiles: CASCADE on auth.users delete

    // 6. Apaga o user de auth.users (dispara CASCADE nas outras tabelas)
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw new Error('Falha ao excluir usuário: ' + deleteError.message);
    }

    // 7. Limpa cookies da sessão
    cookieStore.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-')) cookieStore.delete(name);
    });

    return NextResponse.json({ ok: true, message: 'Conta excluída com sucesso.' });
  } catch (err) {
    captureException(err, { operation: 'delete_account', userId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro ao excluir conta' },
      { status: 500 }
    );
  }
}
