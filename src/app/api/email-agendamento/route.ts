import { NextResponse, type NextRequest } from 'next/server';

interface Payload {
  emailDestino: string;
  nomeAluno: string;
  data: string;          // "2026-05-23"
  horario: string;       // "14:00:00" ou "14:00"
  valorSessao: number;
  observacoes?: string | null;
  nomeProfissional: string;
}

function formatarData(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, skipped: true, reason: 'RESEND_API_KEY não configurada' },
      { status: 200 }
    );
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const { emailDestino, nomeAluno, data, horario, valorSessao, observacoes, nomeProfissional } = body;
  if (!emailDestino || !nomeAluno || !data || !horario) {
    return NextResponse.json({ ok: false, error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  const dataLegivel = formatarData(data);
  const horaLegivel = horario.substring(0, 5);
  const obsHtml = observacoes?.trim()
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">📝 <strong>Observação do profissional:</strong></td></tr>
       <tr><td style="padding:0 0 16px 0;color:#111827;font-size:14px;line-height:1.6">${observacoes.trim().replace(/</g, '&lt;')}</td></tr>`
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
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Olá, <strong>${nomeAluno.replace(/</g, '&lt;')}</strong>!</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">
          Uma sessão foi agendada com <strong>${nomeProfissional.replace(/</g, '&lt;')}</strong>. Anote os detalhes abaixo:
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
              <td style="padding:6px 16px;color:#111827;font-size:15px;font-weight:bold;text-align:right">R$ ${Number(valorSessao).toFixed(2)}</td></tr>
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
        to: [emailDestino],
        subject: `Sessão agendada — ${dataLegivel} às ${horaLegivel}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ ok: false, error: errText }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
