-- audit_log.user_id tinha NOT NULL mas o FK era SET NULL — contradição.
-- Permite NULL para preservar registros quando o usuário é deletado.
ALTER TABLE audit_log ALTER COLUMN user_id DROP NOT NULL;
