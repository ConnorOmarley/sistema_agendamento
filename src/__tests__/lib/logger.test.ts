import { sanitize } from '@/lib/logger';

describe('sanitize', () => {
  it('mascara password no nível raiz', () => {
    const result = sanitize({ user: 'alice', password: 'secret123' });
    expect(result).toEqual({ user: 'alice', password: '[REDACTED]' });
  });

  it('mascara senha no nível raiz', () => {
    const result = sanitize({ email: 'a@b.com', senha: 'minhasenha' });
    expect(result).toEqual({ email: 'a@b.com', senha: '[REDACTED]' });
  });

  it('mascara token no nível raiz', () => {
    expect(sanitize({ token: 'abc123' })).toEqual({ token: '[REDACTED]' });
  });

  it('mascara access_token no nível raiz', () => {
    expect(sanitize({ access_token: 'Bearer xyz' })).toEqual({ access_token: '[REDACTED]' });
  });

  it('mascara cpfCnpj', () => {
    expect(sanitize({ cpfCnpj: '529.982.247-25' })).toEqual({ cpfCnpj: '[REDACTED]' });
  });

  it('mascara creditCard inteiro quando passado como string-chave', () => {
    const result = sanitize({ creditCard: { number: '4111...', ccv: '123' } });
    expect(result).toEqual({ creditCard: '[REDACTED]' });
  });

  it('mascara campos sensíveis em objetos aninhados', () => {
    const result = sanitize({ holder: { nome: 'Alice', cpfCnpj: '000.000.000-00' } });
    expect((result as Record<string, Record<string, unknown>>).holder.cpfCnpj).toBe('[REDACTED]');
    expect((result as Record<string, Record<string, unknown>>).holder.nome).toBe('Alice');
  });

  it('mascara campos sensíveis em arrays', () => {
    const result = sanitize([{ token: 'abc' }, { info: 'safe' }]);
    expect((result as unknown[])[0]).toEqual({ token: '[REDACTED]' });
    expect((result as unknown[])[1]).toEqual({ info: 'safe' });
  });

  it('não mascara campos seguros', () => {
    const obj = { userId: 'u-123', plan: 'PROFISSIONAL', status: 'ACTIVE' };
    expect(sanitize(obj)).toEqual(obj);
  });

  it('é case-insensitive nas chaves sensíveis', () => {
    expect(sanitize({ Password: 'oops' })).toEqual({ Password: '[REDACTED]' });
    expect(sanitize({ TOKEN: 'oops' })).toEqual({ TOKEN: '[REDACTED]' });
  });

  it('preserva primitivos e null', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(42)).toBe(42);
    expect(sanitize('texto')).toBe('texto');
  });

  it('não processa mais de 5 níveis de profundidade', () => {
    // não deve lançar com objetos muito profundos
    const deep = { a: { b: { c: { d: { e: { f: { password: 'deep' } } } } } } };
    expect(() => sanitize(deep)).not.toThrow();
  });
});