/**
 * Dados do controlador (LGPD Art. 5º-VI).
 *
 * Esses dados aparecem PUBLICAMENTE nas páginas /termos e /privacidade
 * (a LGPD obriga identificar o controlador). Não são secrets, mas ficam
 * centralizados aqui para:
 *   1. Trocar em 1 lugar quando mudar (ex.: virar CNPJ no futuro)
 *   2. Documentar a intenção (esses são "dados oficiais do controlador")
 *   3. Não duplicar nas páginas legais
 *
 * Valores vêm de .env.local. Fallbacks usados em dev se a env não estiver
 * configurada — em produção, garanta que .env.production tenha os valores.
 */

export const controlador = {
  nome: process.env.CONTROLADOR_NOME || 'Carlos Alberto De Moura Chagas',
  documento: process.env.CONTROLADOR_DOCUMENTO || 'CPF 718.222.384-80',
  tipoPessoa: process.env.CONTROLADOR_TIPO_PESSOA || 'pessoa física',
  localizacao: process.env.CONTROLADOR_LOCALIZACAO || 'Recife/PE',
  email: process.env.CONTROLADOR_EMAIL || 'alberttcarlosu.u@gmail.com',
} as const;
