/**
 * Validação de CPF e CNPJ pelo algoritmo do Módulo 11 (regra oficial da Receita).
 * Rejeita:
 *  - Tamanhos inválidos
 *  - Sequências repetidas (11111111111, 00000000000, etc.)
 *  - Dígitos verificadores incorretos
 */

const onlyDigits = (s: string) => s.replace(/\D/g, '');

function todosIguais(d: string): boolean {
  return /^(\d)\1+$/.test(d);
}

export function isValidCPF(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11 || todosIguais(cpf)) return false;

  // 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let dv1 = (soma * 10) % 11;
  if (dv1 === 10) dv1 = 0;
  if (dv1 !== Number(cpf[9])) return false;

  // 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  let dv2 = (soma * 10) % 11;
  if (dv2 === 10) dv2 = 0;
  return dv2 === Number(cpf[10]);
}

export function isValidCNPJ(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14 || todosIguais(cnpj)) return false;

  // 1º dígito verificador (pesos 5,4,3,2,9,8,7,6,5,4,3,2)
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += Number(cnpj[i]) * pesos1[i];
  let dv1 = soma % 11;
  dv1 = dv1 < 2 ? 0 : 11 - dv1;
  if (dv1 !== Number(cnpj[12])) return false;

  // 2º dígito verificador (pesos 6,5,4,3,2,9,8,7,6,5,4,3,2)
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) soma += Number(cnpj[i]) * pesos2[i];
  let dv2 = soma % 11;
  dv2 = dv2 < 2 ? 0 : 11 - dv2;
  return dv2 === Number(cnpj[13]);
}

/**
 * Aceita CPF (11 dígitos) ou CNPJ (14 dígitos). Útil pra forms que aceitam ambos.
 */
export function isValidCpfCnpj(input: string): boolean {
  const d = onlyDigits(input);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}
