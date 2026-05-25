import { Sidebar } from '@/components/dashboard/sidebar';
import { TrialBanner } from '@/components/dashboard/trial-banner';
import { ConsentSync } from '@/components/dashboard/consent-sync';
import { ConfirmacaoBanner } from '@/components/dashboard/confirmacao-banner';
import { UserProvider } from '@/context/user';
import { SubscriptionProvider } from '@/context/subscription';
import { Suspense } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
    <SubscriptionProvider>
    <div className="flex min-h-screen flex-col lg:flex-row">
      <ConsentSync />
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <Suspense fallback={null}>
            <ConfirmacaoBanner />
          </Suspense>
          <TrialBanner />
          {children}
        </div>
      </main>
    </div>
    </SubscriptionProvider>
    </UserProvider>
  );
}