import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase com SERVICE ROLE KEY.
 * Bypassa RLS — use apenas em rotas server-side onde a autorização já foi
 * validada por outros meios (ex.: webhook do Asaas com header validado).
 *
 * NUNCA expor a service role key no client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
