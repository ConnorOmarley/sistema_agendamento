-- Rate limit server-side de login.
-- Cada tentativa de login (sucesso ou falha) é registrada com email + IP + timestamp.
-- O endpoint /api/auth/login consulta a janela recente antes de chamar o Supabase.

create table login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip text,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index idx_login_attempts_email_time
  on login_attempts (lower(email), created_at desc);

create index idx_login_attempts_ip_time
  on login_attempts (ip, created_at desc) where ip is not null;

-- Sem RLS — tabela manipulada exclusivamente pelo service role no endpoint.
-- Não habilitamos RLS pra evitar leak de tentativas via anon role.
alter table login_attempts enable row level security;
-- Nenhuma política criada de propósito = acesso negado pra qualquer role autenticada/anon.

-- Limpeza automática: tentativas > 24h podem ser apagadas (gera espaço, não precisamos do histórico).
-- Cria função e agenda via pg_cron se disponível (opcional — o endpoint também filtra por tempo).
create or replace function public.cleanup_old_login_attempts()
returns void
language sql
security definer
as $$
  delete from login_attempts where created_at < now() - interval '24 hours';
$$;
