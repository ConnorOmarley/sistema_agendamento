'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface PageDataResult<T> {
  data: T | null;
  carregando: boolean;
  reload: () => void;
}

export function usePageData<T>(
  loader: (userId: string) => Promise<T | null>,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  deps: React.DependencyList = [],
): PageDataResult<T> {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setCarregando(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const result = await loader(session.user.id);
      if (!cancelled) {
        setData(result);
        setCarregando(false);
      }
    }

    run();
    return () => { cancelled = true; };
    // deps + tick are the intended dependencies; loader is a stable callback from the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, carregando, reload };
}