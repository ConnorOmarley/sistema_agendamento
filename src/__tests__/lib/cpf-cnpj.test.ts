import { isValidCPF, isValidCNPJ, isValidCpfCnpj } from '@/lib/cpf-cnpj';

describe('isValidCPF', () => {
  it('aceita CPF válido sem formatação', () => {
    expect(isValidCPF('52998224725')).toBe(true);
  });

  it('aceita CPF válido com pontuação', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
  });

  it('rejeita CPF com dígito verificador errado', () => {
    expect(isValidCPF('52998224726')).toBe(false);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    for (let d = 0; d <= 9; d++) {
      expect(isValidCPF(String(d).repeat(11))).toBe(false);
    }
  });

  it('rejeita CPF curto demais', () => {
    expect(isValidCPF('1234567890')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(isValidCPF('')).toBe(false);
  });

  it('rejeita CPF com 12 dígitos', () => {
    expect(isValidCPF('529982247251')).toBe(false);
  });
});

describe('isValidCNPJ', () => {
  it('aceita CNPJ válido sem formatação', () => {
    expect(isValidCNPJ('11222333000181')).toBe(true);
  });

  it('aceita CNPJ válido com pontuação', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita CNPJ com dígito verificador errado', () => {
    expect(isValidCNPJ('11222333000182')).toBe(false);
  });

  it('rejeita CNPJ com todos os dígitos iguais', () => {
    expect(isValidCNPJ('11111111111111')).toBe(false);
    expect(isValidCNPJ('00000000000000')).toBe(false);
  });

  it('rejeita CNPJ curto demais', () => {
    expect(isValidCNPJ('1122233300018')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(isValidCNPJ('')).toBe(false);
  });
});

describe('isValidCpfCnpj', () => {
  it('delega pra CPF quando tem 11 dígitos', () => {
    expect(isValidCpfCnpj('529.982.247-25')).toBe(true);
    expect(isValidCpfCnpj('529.982.247-26')).toBe(false);
  });

  it('delega pra CNPJ quando tem 14 dígitos', () => {
    expect(isValidCpfCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCpfCnpj('11.222.333/0001-82')).toBe(false);
  });

  it('rejeita comprimentos inválidos', () => {
    expect(isValidCpfCnpj('123456789012')).toBe(false); // 12 dígitos
    expect(isValidCpfCnpj('')).toBe(false);
  });
});