-- Fix: alunos, evolucoes e agendamentos bloqueavam deleção de usuário.
-- Troca NO ACTION por CASCADE para que os dados do usuário sejam removidos junto.

ALTER TABLE alunos DROP CONSTRAINT alunos_user_id_fkey;
ALTER TABLE alunos ADD CONSTRAINT alunos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE evolucoes DROP CONSTRAINT evolucoes_user_id_fkey;
ALTER TABLE evolucoes ADD CONSTRAINT evolucoes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE agendamentos DROP CONSTRAINT agendamentos_user_id_fkey;
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
