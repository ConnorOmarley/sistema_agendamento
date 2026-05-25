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
  nome: process.env.CONTROLADOR_NOME || '[CONTROLADOR_NOME não configurado]',
  documento: process.env.CONTROLADOR_DOCUMENTO || '[CONTROLADOR_DOCUMENTO não configurado]',
  tipoPessoa: process.env.CONTROLADOR_TIPO_PESSOA || 'pessoa física',
  localizacao: process.env.CONTROLADOR_LOCALIZACAO || '[CONTROLADOR_LOCALIZACAO não configurada]',
  email: process.env.CONTROLADOR_EMAIL || '[CONTROLADOR_EMAIL não configurado]',
} as const;
