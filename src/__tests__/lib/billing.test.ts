import { isAccessAllowed } from '@/lib/billing';
import type { SubscriptionRow } from '@/lib/billing';

function makeSub(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: 'sub-1',
    user_id: 'user-1',
    asaas_customer_id: null,
    asaas_subscription_id: null,
    plan: 'FREE',
    status: 'TRIALING',
    valor_mensal: 0,
    trial_ends_at: null,
    current_period_ends_at: null,
    canceled_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function futureDate(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}

function pastDate(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

describe('isAccessAllowed', () => {
  it('bloqueia quando sub é null', () => {
    expect(isAccessAllowed(null)).toBe(false);
  });

  it('permite TRIALING com trial futuro', () => {
    const sub = makeSub({ status: 'TRIALING', trial_ends_at: futureDate(7) });
    expect(isAccessAllowed(sub)).toBe(true);
  });

  it('bloqueia TRIALING com trial expirado', () => {
    const sub = makeSub({ status: 'TRIALING', trial_ends_at: pastDate(1) });
    expect(isAccessAllowed(sub)).toBe(false);
  });

  it('bloqueia TRIALING sem trial_ends_at', () => {
    const sub = makeSub({ status: 'TRIALING', trial_ends_at: null });
    expect(isAccessAllowed(sub)).toBe(false);
  });

  it('permite ACTIVE', () => {
    expect(isAccessAllowed(makeSub({ status: 'ACTIVE' }))).toBe(true);
  });

  it('permite PAST_DUE (grace period)', () => {
    expect(isAccessAllowed(makeSub({ status: 'PAST_DUE' }))).toBe(true);
  });

  it('permite CANCELED (acesso residual até fim do período)', () => {
    expect(isAccessAllowed(makeSub({ status: 'CANCELED' }))).toBe(true);
  });

  it('bloqueia BLOCKED', () => {
    expect(isAccessAllowed(makeSub({ status: 'BLOCKED' }))).toBe(false);
  });

  it('bloqueia EXPIRED', () => {
    expect(isAccessAllowed(makeSub({ status: 'EXPIRED' }))).toBe(false);
  });
});