/**
 * POST /api/email-agendamento
 *
 * Envia e-mail de confirmação ao aluno após um agendamento ser criado.
 *
 * Segurança:
 * - Exige sessão autenticada (getUser).
 * - Recebe apenas o agendamentoId — todos os dados de exibição vêm do banco,
 *   nunca do corpo da requisição. Isso elimina injeção de conteúdo e garante
 *   que o usuário autenticado seja dono do agendamento (user_id = auth.uid()).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createRequestLogger } from '@/lib/logger';
import { captureException } from '@/lib/monitoring';

function formatarData(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger(crypto.randomUUID(), { action: 'email.agendamento' });

  // 1. Autenticação — sessão obrigatória
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
  }

  // 2. Parse — aceita apenas o ID do agendamento
  let body: { agendamentoId?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }

  const { agendamentoId } = body;
  if (!agendamentoId) {
    return NextResponse.json({ ok: false, error: 'agendamentoId obrigatório' }, { status: 400 });
  }

  // 3. Busca agendamento + aluno do banco, verificando propriedade via user_id.
  //    RLS garante que o anon client só retorna linhas onde user_id = auth.uid().
  //    O filtro explícito .eq('user_id', user.id) é uma segunda camada de defesa.
  const { data: ag, error: agErr } = await supabase
    .from('agendamentos')
    .select(`
      data,
      horario,
      valor_sessao,
      observacoes,
      alunos ( nome, email )
    `)
    .eq('id', agendamentoId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (agErr || !ag) {
    log.warn({ userId: user.id, agendamentoId }, 'agendamento não encontrado para envio de e-mail');
    return NextResponse.json({ ok: false, error: 'Agendamento não encontrado' }, { status: 404 });
  }

  // Supabase infere o join como array, mas agendamentos.aluno_id é FK many-to-one → objeto único
  const aluno = ag.alunos as unknown as { nome: string; email: string | null } | null;
  if (!aluno?.email) {
    log.info({ userId: user.id, agendamentoId }, 'e-mail ignorado: aluno sem e-mail cadastrado');
    return NextResponse.json({ ok: false, skipped: true, reason: 'Aluno sem e-mail cadastrado' }, { status: 200 });
  }

  // 4. Configuração Resend
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey) {
    log.warn({ userId: user.id }, 'e-mail ignorado: RESEND_API_KEY não configurada');
    return NextResponse.json({ ok: false, skipped: true, reason: 'RESEND_API_KEY não configurada' }, { status: 200 });
  }

  // 5. Busca nome do profissional (display_name ou prefixo do e-mail)
  const md = user.user_metadata as Record<string, string> | null;
  const nomeProfissional = md?.display_name || md?.full_name || md?.name || user.email?.split('@')[0] || 'Profissional';

  // 6. Monta e-mail com dados exclusivamente do banco
  const dataLegivel = formatarData(ag.data);
  const horaLegivel = (ag.horario as string).substring(0, 5);
  const nomeAluno = esc(aluno.nome);
  const nomeProf = esc(nomeProfissional);
  const obsHtml = (ag.observacoes as string | null)?.trim()
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">📝 <strong>Observação do profissional:</strong></td></tr>
       <tr><td style="padding:0 0 16px 0;color:#111827;font-size:14px;line-height:1.6">${esc((ag.observacoes as string).trim())}</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Sessão agendada</title></head>
<body style="margin:0;padding:24px;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(109,40,217,.1)">
    <tr>
      <td style="background:linear-gradient(135deg,#6d28d9,#db2777);padding:32px 32px 28px;color:white">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.85;font-weight:bold">Acompanha</p>
        <h1 style="margin:0;font-size:22px;font-weight:800;line-height:1.2">✅ Sessão confirmada</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px 8px">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Olá, <strong>${nomeAluno}</strong>!</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">
          Uma sessão foi agendada com <strong>${nomeProf}</strong>. Anote os detalhes abaixo:
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#ede9fe;border-radius:16px;padding:20px">
          <tr><td style="padding:6px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;font-weight:bold">📅 Data</td>
              <td style="padding:6px 16px;color:#111827;font-size:15px;font-weight:bold;text-align:right">${dataLegivel}</td></tr>
          <tr><td style="padding:6px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;font-weight:bold">🕐 Horário</td>
              <td style="padding:6px 16px;color:#111827;font-size:15px;font-weight:bold;text-align:right">${horaLegivel}</td></tr>
          <tr><td style="padding:6px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;font-weight:bold">💰 Valor</td>
              <td style="padding:6px 16px;color:#111827;font-size:15px;font-weight:bold;text-align:right">R$ ${Number(ag.valor_sessao).toFixed(2)}</td></tr>
        </table>
      </td>
    </tr>
    <tr><td style="padding:24px 32px 8px"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${obsHtml}</table></td></tr>
    <tr>
      <td style="padding:16px 32px 32px;color:#6b7280;font-size:12px;line-height:1.6;border-top:1px solid #f3f4f6;margin-top:16px">
        Em caso de imprevisto, entre em contato com o profissional o quanto antes para reagendar.
      </td>
    </tr>
  </table>
  <p style="text-align:center;margin:16px auto;color:#9ca3af;font-size:11px;max-width:560px">
    Este e-mail foi gerado automaticamente pelo sistema Acompanha.
  </p>
</body>
</html>`;

  try {
    const resendUrl = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
    const res = await fetch(resendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Acompanha <${fromEmail}>`,
        to: [aluno.email],
        subject: `Sessão agendada — ${dataLegivel} às ${horaLegivel}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      log.error({ userId: user.id, agendamentoId, resendStatus: res.status }, 'Resend rejeitou o envio');
      return NextResponse.json({ ok: false, error: errText }, { status: res.status });
    }

    log.info({ userId: user.id, agendamentoId }, 'e-mail de agendamento enviado');
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureException(err, { operation: 'email.agendamento', userId: user.id, agendamentoId });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}