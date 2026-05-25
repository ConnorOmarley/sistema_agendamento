-- Exportação das políticas RLS das tabelas principais.
-- Estas policies foram criadas via Supabase Dashboard e estão sendo versionadas aqui.
-- Se aplicar em banco novo, execute DEPOIS das migrations que criam as tabelas.
-- Em banco existente, os CREATE POLICY vão falhar (já existem) — use IF NOT EXISTS via DO block abaixo.

-- ============================================================
-- alunos
-- ============================================================
alter table alunos enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='alunos' and policyname='Usuários veem próprios alunos') then
    create policy "Usuários veem próprios alunos" on alunos
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='alunos' and policyname='Usuários criam próprios alunos') then
    create policy "Usuários criam próprios alunos" on alunos
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='alunos' and policyname='Usuários atualizam próprios alunos') then
    create policy "Usuários atualizam próprios alunos" on alunos
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='alunos' and policyname='Usuários apagam próprios alunos') then
    create policy "Usuários apagam próprios alunos" on alunos
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- agendamentos
-- ============================================================
alter table agendamentos enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='agendamentos' and policyname='Usuários veem próprios agendamentos') then
    create policy "Usuários veem próprios agendamentos" on agendamentos
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='agendamentos' and policyname='Usuários criam próprios agendamentos') then
    create policy "Usuários criam próprios agendamentos" on agendamentos
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='agendamentos' and policyname='Usuários atualizam próprios agendamentos') then
    create policy "Usuários atualizam próprios agendamentos" on agendamentos
      for update to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='agendamentos' and policyname='Usuários apagam próprios agendamentos') then
    create policy "Usuários apagam próprios agendamentos" on agendamentos
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- evolucoes
-- ============================================================
alter table evolucoes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='evolucoes' and policyname='Usuários veem próprias evolucoes') then
    create policy "Usuários veem próprias evolucoes" on evolucoes
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='evolucoes' and policyname='Usuários criam próprias evolucoes') then
    create policy "Usuários criam próprias evolucoes" on evolucoes
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='evolucoes' and policyname='Usuários atualizam próprias evolucoes') then
    create policy "Usuários atualizam próprias evolucoes" on evolucoes
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='evolucoes' and policyname='Usuários apagam próprias evolucoes') then
    create policy "Usuários apagam próprias evolucoes" on evolucoes
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- audit_log
-- ============================================================
alter table audit_log enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='audit_log' and policyname='Usuários veem próprio audit log') then
    create policy "Usuários veem próprio audit log" on audit_log
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='audit_log' and policyname='Usuários inserem próprio audit log') then
    create policy "Usuários inserem próprio audit log" on audit_log
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- configuracoes_usuario
-- ============================================================
alter table configuracoes_usuario enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='configuracoes_usuario' and policyname='Usuários podem ver suas próprias configurações') then
    create policy "Usuários podem ver suas próprias configurações" on configuracoes_usuario
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='configuracoes_usuario' and policyname='Usuários podem inserir suas próprias configurações') then
    create policy "Usuários podem inserir suas próprias configurações" on configuracoes_usuario
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='configuracoes_usuario' and policyname='Usuários podem atualizar suas próprias configurações') then
    create policy "Usuários podem atualizar suas próprias configurações" on configuracoes_usuario
      for update to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='configuracoes_usuario' and policyname='Usuários apagam próprias configurações') then
    create policy "Usuários apagam próprias configurações" on configuracoes_usuario
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- profiles
-- ============================================================
alter table profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Usuários podem ver seu próprio perfil') then
    create policy "Usuários podem ver seu próprio perfil" on profiles
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Usuários podem atualizar seu próprio perfil') then
    create policy "Usuários podem atualizar seu próprio perfil" on profiles
      for update to authenticated using (auth.uid() = user_id);
  end if;
end $$;