'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Sincroniza o consent_at do localStorage (gravado antes do OAuth Google)
 * para o user_metadata do Supabase. Roda só uma vez, no primeiro mount
 * do dashboard pós-OAuth.
 *
 * Por que existe: o usuário marca a checkbox de termos antes de clicar em
 * "Cadastrar com Google", mas o redirect leva o estado embora. localStorage
 * sobrevive ao roundtrip do OAuth.
 */
export function ConsentSync() {
  useEffect(() => {
    const pending = localStorage.getItem('pending_consent_at');
    if (!pending) return;

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      // Já tem consent? Não sobrescreve
      if (user.user_metadata?.consent_at) {
        localStorage.removeItem('pending_consent_at');
        return;
      }

      supabase.auth.updateUser({
        data: { consent_at: pending, consent_version: '1.0' },
      }).then(() => localStorage.removeItem('pending_consent_at'));
    });
  }, []);

  return null;
}
