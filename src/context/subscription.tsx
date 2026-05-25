'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export interface SubscriptionStatus {
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'BLOCKED' | 'CANCELED' | 'EXPIRED';
  diasRestantesTrial: number | null;
  hasAsaasSubscription: boolean;
}

interface SubscriptionContextValue {
  sub: SubscriptionStatus | null;
  refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  sub: null,
  refresh: () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);

  function load() {
    fetch('/api/billing/status')
      .then(r => r.json())
      .then(data => { if (data.ok && data.subscription) setSub(data.subscription); })
      .catch(() => {});
  }

  useEffect(() => { load(); }, []);

  return (
    <SubscriptionContext.Provider value={{ sub, refresh: load }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}