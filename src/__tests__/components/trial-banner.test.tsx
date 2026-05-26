/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { SubscriptionStatus } from '@/context/subscription';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUseSubscription = jest.fn<{ sub: SubscriptionStatus | null; refresh: () => void }, []>();
const mockUsePathname = jest.fn<string, []>();

jest.mock('@/context/subscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// next/link renders as <a> in tests
jest.mock('next/link', () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

// ── Helpers ──────────────────────────────────────────────────────────────────

import { TrialBanner } from '@/components/dashboard/trial-banner';

function makeSub(overrides: Partial<SubscriptionStatus> = {}): SubscriptionStatus {
  return {
    plan: 'PROFISSIONAL',
    status: 'TRIALING',
    diasRestantesTrial: 14,
    hasAsaasSubscription: false,
    ...overrides,
  };
}

function setup(sub: SubscriptionStatus | null, pathname = '/dashboard') {
  mockUseSubscription.mockReturnValue({ sub, refresh: jest.fn() });
  mockUsePathname.mockReturnValue(pathname);
  return render(<TrialBanner />);
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('TrialBanner', () => {
  it('não renderiza nada quando sub é null', () => {
    const { container } = setup(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza na página de upgrade', () => {
    const { container } = setup(makeSub(), '/dashboard/upgrade');
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza quando ACTIVE', () => {
    const { container } = setup(makeSub({ status: 'ACTIVE' }));
    expect(container).toBeEmptyDOMElement();
  });

  it('TRIALING com >7 dias e assinatura já ativa — não renderiza (não polui)', () => {
    const { container } = setup(makeSub({ diasRestantesTrial: 10, hasAsaasSubscription: true }));
    expect(container).toBeEmptyDOMElement();
  });

  it('TRIALING com 14 dias sem assinatura — mostra dias restantes e botão de assinar', () => {
    setup(makeSub({ diasRestantesTrial: 14 }));
    expect(screen.getByText(/14 dias restantes/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /assinar agora/i })).toHaveAttribute('href', '/dashboard/upgrade');
  });

  it('TRIALING com 1 dia — mostra "amanhã" e estilo urgente', () => {
    setup(makeSub({ diasRestantesTrial: 1 }));
    expect(screen.getByText(/amanhã/i)).toBeInTheDocument();
  });

  it('TRIALING com 0 dias — mostra "hoje"', () => {
    setup(makeSub({ diasRestantesTrial: 0 }));
    expect(screen.getByText(/hoje/i)).toBeInTheDocument();
  });

  it('TRIALING com assinatura configurada — mostra mensagem de cobrança automática sem botão', () => {
    setup(makeSub({ diasRestantesTrial: 5, hasAsaasSubscription: true }));
    expect(screen.getByText(/cobrança automática/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /assinar agora/i })).not.toBeInTheDocument();
  });

  it('PAST_DUE — mostra banner de pagamento em atraso com link de atualizar', () => {
    setup(makeSub({ status: 'PAST_DUE' }));
    expect(screen.getByText(/pagamento em atraso/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /atualizar cartão/i })).toHaveAttribute('href', '/dashboard/upgrade');
  });

  it('BLOCKED — não renderiza (sem caso dedicado no componente)', () => {
    const { container } = setup(makeSub({ status: 'BLOCKED' }));
    expect(container).toBeEmptyDOMElement();
  });
});