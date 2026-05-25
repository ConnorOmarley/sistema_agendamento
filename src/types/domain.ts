/**
 * Tipos de domínio compartilhados entre páginas e lib.
 * Centralizar aqui evita strings literais duplicadas em 6+ arquivos.
 */

export type AgendamentoStatus = 'Agendado' | 'Concluído' | 'Faltou';

export type StatusPagamento = 'Pago' | 'Pendente';

export type TipoRegistro =
  | 'Sessão Comum'
  | 'Avaliação Física'
  | 'Alta Clínica'
  | 'Primeira Anamnese';

export type RegimeTributario = 'Simples Nacional' | 'MEI' | 'Lucro Presumido' | 'Pessoa Física';

/** Shape do app_metadata do Supabase (só gravável via service role). */
export interface SupabaseAppMetadata {
  is_admin?: boolean;
}