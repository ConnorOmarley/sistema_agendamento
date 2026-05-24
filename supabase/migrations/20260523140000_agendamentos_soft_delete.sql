-- Soft delete para agendamentos
-- Permite recuperar via /dashboard/lixeira em vez de apagar definitivamente.

alter table agendamentos add column if not exists deleted_at timestamptz;

-- O índice de unicidade do slot precisa ignorar os agendamentos soft-deletados,
-- senão ao restaurar um agendamento pra slot que já foi reocupado dá conflito
-- e não conseguimos diferenciar "ativo" de "lixeira".
drop index if exists uniq_agendamentos_slot;
create unique index uniq_agendamentos_slot
  on agendamentos (user_id, data, horario)
  where status <> 'Faltou' and deleted_at is null;

-- Índice pra acelerar a lixeira (listar só deletados)
create index if not exists idx_agendamentos_deleted_at
  on agendamentos (deleted_at)
  where deleted_at is not null;
