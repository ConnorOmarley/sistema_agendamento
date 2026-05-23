-- ============================================================
-- Snippets para gerenciar acesso manual (founders, cortesias, testes)
-- ============================================================
-- Cole no Supabase Dashboard > SQL Editor, ajuste o e-mail e o periodo,
-- e clique em Run. Cada bloco e independente.
--
-- Como o sistema interpreta os campos:
--   status = 'TRIALING' + trial_ends_at > now  ->  acesso liberado
--   status = 'ACTIVE'                          ->  acesso liberado (sem prazo)
--   status = 'EXPIRED' ou trial vencido        ->  bloqueado, vai pra /upgrade
--
-- asaas_subscription_id:
--   NULL          ->  acesso COMP (voce liberou manualmente)
--   preenchido    ->  cliente pagante via Asaas
-- ============================================================


-- ------------------------------------------------------------
-- 1. Liberar X meses de cortesia (a contagem aparece no banner)
-- ------------------------------------------------------------
UPDATE subscriptions
SET
  status = 'TRIALING',
  trial_ends_at = now() + interval '3 months',  -- ajuste aqui: '1 month', '6 months', etc.
  plan = 'PROFISSIONAL',
  valor_mensal = 49.00
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'cliente@email.com'  -- ajuste aqui
);


-- ------------------------------------------------------------
-- 2. Liberar acesso vitalicio (founder forever / conta sua)
-- ------------------------------------------------------------
UPDATE subscriptions
SET
  status = 'ACTIVE',
  trial_ends_at = NULL,
  plan = 'PROFISSIONAL',
  valor_mensal = 0.00  -- 0 deixa claro que e cortesia, nao paga
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'fundador@email.com'  -- ajuste aqui
);


-- ------------------------------------------------------------
-- 3. Upgrade pro plano Estudio com cortesia
-- ------------------------------------------------------------
UPDATE subscriptions
SET
  status = 'TRIALING',
  trial_ends_at = now() + interval '3 months',
  plan = 'ESTUDIO',
  valor_mensal = 89.00
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'cliente@email.com'  -- ajuste aqui
);


-- ------------------------------------------------------------
-- 4. Revogar acesso AGORA (forca expiracao imediata)
-- ------------------------------------------------------------
UPDATE subscriptions
SET
  status = 'EXPIRED',
  trial_ends_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'cliente@email.com'  -- ajuste aqui
);


-- ------------------------------------------------------------
-- 5. Estender o prazo de alguem que ja esta com acesso comp
--    (somar mais meses ao trial_ends_at atual, sem resetar)
-- ------------------------------------------------------------
UPDATE subscriptions
SET trial_ends_at = COALESCE(trial_ends_at, now()) + interval '1 month'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'cliente@email.com'  -- ajuste aqui
);


-- ============================================================
-- CONSULTAS UTEIS (so leem, nao alteram nada)
-- ============================================================


-- ------------------------------------------------------------
-- A. Listar todos os usuarios com status atual
-- ------------------------------------------------------------
SELECT
  u.email,
  s.status,
  s.plan,
  s.valor_mensal,
  s.trial_ends_at,
  s.current_period_ends_at,
  CASE
    WHEN s.asaas_subscription_id IS NOT NULL THEN 'Pagante'
    WHEN s.status IN ('TRIALING','ACTIVE') THEN 'Comp / Trial'
    ELSE 'Sem acesso'
  END AS tipo_acesso,
  s.created_at AS conta_criada_em
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at DESC;


-- ------------------------------------------------------------
-- B. Quem esta com cortesia (comp / founder)
-- ------------------------------------------------------------
SELECT
  u.email,
  s.plan,
  s.status,
  s.trial_ends_at,
  EXTRACT(day FROM (s.trial_ends_at - now())) AS dias_restantes
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE s.asaas_subscription_id IS NULL
  AND s.status IN ('TRIALING', 'ACTIVE')
ORDER BY s.trial_ends_at NULLS LAST;


-- ------------------------------------------------------------
-- C. Cortesias que vao expirar nos proximos 7 dias
--    (rode toda segunda pra avisar antes de cortar acesso)
-- ------------------------------------------------------------
SELECT
  u.email,
  s.plan,
  s.trial_ends_at,
  EXTRACT(day FROM (s.trial_ends_at - now())) AS dias_restantes
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE s.status = 'TRIALING'
  AND s.asaas_subscription_id IS NULL
  AND s.trial_ends_at BETWEEN now() AND now() + interval '7 days'
ORDER BY s.trial_ends_at;


-- ------------------------------------------------------------
-- D. Receita mensal recorrente (MRR) — so pagantes
-- ------------------------------------------------------------
SELECT
  count(*) AS clientes_pagantes,
  sum(valor_mensal) AS mrr_brl
FROM subscriptions
WHERE status = 'ACTIVE'
  AND asaas_subscription_id IS NOT NULL;
