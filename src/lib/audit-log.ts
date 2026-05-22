import { supabase } from '@/lib/supabase';

export type AuditAction = 'view' | 'create' | 'update' | 'delete';
export type AuditEntity = 'evolucao' | 'aluno' | 'agendamento' | 'configuracao';

interface AuditOptions {
  acao: AuditAction;
  entidade: AuditEntity;
  entidadeId?: string;
  detalhes?: Record<string, unknown>;
}

/**
 * Registra uma operação no audit_log para compliance com LGPD Art. 37
 * (registro de operações de tratamento de dados pessoais).
 *
 * Falha silenciosamente: nunca quebra a UX por erro de auditoria.
 * O user_id e o IP são obtidos da sessão atual (não passa por param para evitar spoof).
 */
export async function registrarAuditoria(opts: AuditOptions): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('audit_log').insert({
      user_id: session.user.id,
      acao: opts.acao,
      entidade: opts.entidade,
      entidade_id: opts.entidadeId ?? null,
      detalhes: opts.detalhes ?? null,
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
    });
  } catch {
    // Audit log nunca deve quebrar a aplicação.
  }
}
