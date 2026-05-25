'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserInfo {
  email: string;
  displayName: string;
}

const UserContext = createContext<UserInfo | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const md = data.user.user_metadata || {};
      const displayName =
        md.display_name || md.full_name || md.name ||
        data.user.email?.split('@')[0] || 'Profissional';
      setUser({ email: data.user.email || '', displayName });
    });
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}