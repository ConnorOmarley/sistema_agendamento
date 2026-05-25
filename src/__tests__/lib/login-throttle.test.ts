/**
 * @jest-environment jsdom
 */
import { checkThrottle, recordFailure, clearThrottle } from '@/lib/login-throttle';

const EMAIL = 'test@example.com';

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('checkThrottle — sem histórico', () => {
  it('retorna locked: false quando não há entradas', () => {
    expect(checkThrottle(EMAIL)).toEqual({ locked: false });
  });
});

describe('recordFailure — política de bloqueio', () => {
  it('não bloqueia nas primeiras 4 falhas', () => {
    for (let i = 0; i < 4; i++) {
      const result = recordFailure(EMAIL);
      expect(result.locked).toBe(false);
    }
  });

  it('bloqueia por 30s na 5ª falha', () => {
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    const check = checkThrottle(EMAIL);
    expect(check.locked).toBe(true);
    if (check.locked) {
      expect(check.remainingMs).toBeGreaterThan(29_000);
      expect(check.remainingMs).toBeLessThanOrEqual(30_000);
      expect(check.remainingLabel).toMatch(/30 segundos/i);
    }
  });

  it('bloqueia por 5 min na 10ª falha', () => {
    for (let i = 0; i < 10; i++) recordFailure(EMAIL);
    const check = checkThrottle(EMAIL);
    expect(check.locked).toBe(true);
    if (check.locked) {
      expect(check.remainingMs).toBeGreaterThan(4 * 60 * 1000);
      expect(check.remainingLabel).toMatch(/5 minutos/i);
    }
  });

  it('bloqueia por 30 min na 15ª falha', () => {
    for (let i = 0; i < 15; i++) recordFailure(EMAIL);
    const check = checkThrottle(EMAIL);
    expect(check.locked).toBe(true);
    if (check.locked) {
      expect(check.remainingMs).toBeGreaterThan(29 * 60 * 1000);
      expect(check.remainingLabel).toMatch(/30 minutos/i);
    }
  });
});

describe('clearThrottle', () => {
  it('remove o bloqueio após chamada', () => {
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    expect(checkThrottle(EMAIL).locked).toBe(true);
    clearThrottle(EMAIL);
    expect(checkThrottle(EMAIL)).toEqual({ locked: false });
  });

  it('não lança quando não há entrada', () => {
    expect(() => clearThrottle('naoexiste@example.com')).not.toThrow();
  });
});

describe('checkThrottle — bloqueio expirado', () => {
  it('retorna locked: false depois que o tempo de bloqueio passa', () => {
    for (let i = 0; i < 5; i++) recordFailure(EMAIL);
    jest.advanceTimersByTime(31_000); // avança 31s (bloqueio de 30s expirou)
    expect(checkThrottle(EMAIL)).toEqual({ locked: false });
  });
});

describe('normalização de email', () => {
  it('trata emails com casing diferente como a mesma conta', () => {
    for (let i = 0; i < 5; i++) recordFailure('TEST@EXAMPLE.COM');
    // checkThrottle com lowercase deve ver o mesmo estado
    expect(checkThrottle('test@example.com').locked).toBe(true);
  });
});

describe('expiração automática de estado stale (>1h de inatividade)', () => {
  it('retorna locked: false depois de 1h sem atividade', () => {
    recordFailure(EMAIL);
    jest.advanceTimersByTime(61 * 60 * 1000); // 61 min
    // read() remove entrada stale, checkThrottle retorna false
    expect(checkThrottle(EMAIL)).toEqual({ locked: false });
  });
});