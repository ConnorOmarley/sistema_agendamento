-- Função utilitária para lookup de usuário por e-mail sem expor auth.users via REST.
--
-- Por que SECURITY DEFINER:
--   A tabela auth.users não é acessível via PostgREST (nem por service role via .from()).
--   SECURITY DEFINER executa com os privilégios do owner (postgres), que tem acesso ao
--   schema auth. O search_path fixo impede SQL injection via schema substituition.
--
-- Quem chama: apenas o endpoint /api/admin/criar-assinatura-customizada (service role).
-- Retorna: uuid do usuário ou NULL se não encontrado.

create or replace function public.get_user_id_by_email(email_input text)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id
  from auth.users
  where lower(email) = lower(email_input)
  limit 1;
$$;

-- Revoga execução pública; só service role (postgres) pode chamar.
revoke execute on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant  execute on function public.get_user_id_by_email(text) to service_role;