-- Sistema de assinaturas (Asaas)
-- Cada usuário tem 1 linha em `subscriptions`, criada automaticamente no signup
-- com 14 dias de trial. Webhooks do Asaas atualizam o status.

-- ============================================================
-- ENUMS
-- ============================================================

create type subscription_status as enum (
  'TRIALING',     -- período de teste de 14 dias, acesso liberado
  'ACTIVE',       -- pagamento em dia, acesso liberado
  'PAST_DUE',     -- pagamento vencido, sem bloqueio imediato (grace period)
  'BLOCKED',      -- bloqueado (chargeback, falta de pagamento prolongada)
  'CANCELED',     -- cancelada pelo usuário, mantém acesso até fim do período
  'EXPIRED'       -- trial expirou sem upgrade, acesso bloqueado
);

create type subscription_plan as enum (
  'FREE',
  'PROFISSIONAL',
  'ESTUDIO'
);

-- ============================================================
-- TABELA: subscriptions
-- ============================================================

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  -- Asaas references
  asaas_customer_id text,
  asaas_subscription_id text,

  -- Plano e status
  plan subscription_plan not null default 'PROFISSIONAL',
  status subscription_status not null default 'TRIALING',
  valor_mensal numeric(10,2) not null default 49.00,

  -- Datas críticas
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  canceled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_asaas_customer on subscriptions(asaas_customer_id)
  where asaas_customer_id is not null;
create index idx_subscriptions_asaas_subscription on subscriptions(asaas_subscription_id)
  where asaas_subscription_id is not null;

-- ============================================================
-- RLS: o usuário só vê a própria assinatura. Escrita só via service role.
-- ============================================================

alter table subscriptions enable row level security;

create policy "users_select_own_subscription" on subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- TRIGGER: cria subscription com 14 dias de trial ao criar usuário
-- ============================================================

create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan, status, trial_ends_at, valor_mensal)
  values (new.id, 'PROFISSIONAL', 'TRIALING', now() + interval '14 days', 49.00)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- Cria subscriptions retroativamente para usuários existentes (idempotente)
insert into public.subscriptions (user_id, plan, status, trial_ends_at, valor_mensal)
select id, 'PROFISSIONAL', 'TRIALING', now() + interval '14 days', 49.00
from auth.users
on conflict (user_id) do nothing;

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABELA: subscription_events (audit log dos webhooks)
-- ============================================================

create table subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,

  event_type text not null,
  asaas_payload jsonb,

  created_at timestamptz not null default now()
);

create index idx_subscription_events_sub on subscription_events(subscription_id, created_at desc);
create index idx_subscription_events_user on subscription_events(user_id, created_at desc);

alter table subscription_events enable row level security;

create policy "users_select_own_subscription_events" on subscription_events
  for select to authenticated
  using (user_id = auth.uid());
