# Notas de Segurança

## Dívidas técnicas conhecidas

### postcss < 8.5.10 (CVE moderate, aceito como dívida)

**Status:** aceito como dívida técnica em 2026-05-24.

**Origem:** `postcss@8.4.31` vem aninhado em `next@16.2.6` (transitive dependency).

**CVE:** [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — XSS via `</style>` em `postcss.stringify()`.

**Por que aceitamos:**
- Exploit requer `postcss.stringify(userInputCSS)` com CSS controlado por usuário
- Tailwind v4 compila CSS estaticamente em build time
- Nenhuma rota da app processa CSS dinâmico vindo de input do usuário
- O fix oficial (`npm audit fix --force`) faz downgrade pra Next 9.3.3 — quebraria tudo

**Quando resolver:** quando o Next lançar uma versão (≥16.2.7?) com postcss patched.
Comando pra verificar: `npm ls postcss` deve mostrar apenas `postcss@≥8.5.10`.

## Hábitos de segurança do projeto

- Secrets em `.env.local` (gitignored); template público em `.env.example`
- RLS em todas tabelas, filtro defensivo `.eq('user_id', ...)` no client (defense in depth)
- Soft delete + audit log em dados pessoais (LGPD)
- Rate limit server-side (tabela `login_attempts`) + client-side
- Webhook idempotente (checa `payment.id` em `subscription_events`)
- CPF validado por Mod 11
- Senha mínima 8 chars (padrão Google)
- Cartão de crédito nunca persistido nem logado (rota repassa para o Asaas via SSL, Asaas não oferece SDK client-side de tokenização)
- Service role key apenas server-side
- Consent LGPD explícito no signup com timestamp

## Quando rotacionar chaves

Rotacione (gerar nova + invalidar antiga) sempre que:
- Vazou em log/chat/screenshot
- Saiu uma pessoa do time
- Suspeitar de comprometimento
- A cada 6 meses (boas práticas)

Procedimentos por serviço:
- **Supabase**: Dashboard → Settings → API → Reset (anon e service role separados)
- **Asaas**: Dashboard → Integrações → API → revogar antiga e gerar nova
- **Resend**: Dashboard → API Keys → trash na antiga + criar nova
- **Sentry** (futuro): Settings → Auth Tokens → revoke + create
