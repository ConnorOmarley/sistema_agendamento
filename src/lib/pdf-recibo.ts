import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Relatório mensal unificado: combina recibo de pagamento + relatório de
 * frequência. Um único PDF que serve tanto para enviar pra responsável
 * quanto pra comprovante fiscal/IR.
 *
 * Layout: cabeçalho com gradiente roxo, cards de profissional e aluno,
 * 4 KPIs em cards coloridos, tabela detalhada com presença e pagamento,
 * resumo financeiro, área de assinaturas.
 */

interface SessaoInput {
  data: string;          // YYYY-MM-DD
  horario: string;       // HH:MM ou HH:MM:SS
  status: 'Agendado' | 'Concluído' | 'Faltou' | string;
  status_pagamento: 'Pago' | 'Pendente';
  valor_sessao: number;
}

interface ConfigInput {
  razao_social?: string | null;
  cnpj?: string | null;
  inscricao_municipal?: string | null;
  regime_tributario?: string | null;
  chave_pix?: string | null;
  aliquota_imposto?: number | null;
}

export interface ReciboInput {
  nomeAluno: string;
  mesAno: string; // "2026-05"
  sessoes: SessaoInput[];
  config: ConfigInput;
  emailProfissional: string;
}

// ============================================================
// Paleta — alinhada com o design system do app
// ============================================================
const C = {
  purple:        [109,  40, 217] as [number, number, number],
  purpleDark:    [ 91,  33, 182] as [number, number, number],
  purpleLight:   [237, 233, 254] as [number, number, number],
  purpleSubtle:  [250, 245, 255] as [number, number, number],
  emerald:       [ 16, 185, 129] as [number, number, number],
  emeraldLight:  [209, 250, 229] as [number, number, number],
  rose:          [244,  63,  94] as [number, number, number],
  roseLight:     [255, 228, 230] as [number, number, number],
  amber:         [245, 158,  11] as [number, number, number],
  amberLight:    [254, 243, 199] as [number, number, number],
  slate900:      [ 15,  23,  42] as [number, number, number],
  slate700:      [ 51,  65,  85] as [number, number, number],
  slate500:      [100, 116, 139] as [number, number, number],
  slate300:      [203, 213, 225] as [number, number, number],
  slate100:      [241, 245, 249] as [number, number, number],
  slate50:       [248, 250, 252] as [number, number, number],
  white:         [255, 255, 255] as [number, number, number],
};

// ============================================================
// Helpers de formatação
// ============================================================
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatarData(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
function diaSemana(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return DIAS[d.getDay()];
}
function formatarMesAnoExtenso(mesAno: string) {
  const [a, m] = mesAno.split('-');
  return `${MESES[parseInt(m, 10) - 1]} de ${a}`;
}
function formatarHoje() {
  const h = new Date();
  return `${String(h.getDate()).padStart(2, '0')}/${String(h.getMonth() + 1).padStart(2, '0')}/${h.getFullYear()}`;
}
function formatarReal(n: number) {
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

// ============================================================
// Função principal
// ============================================================
export function gerarReciboPDF(input: ReciboInput): void {
  const { nomeAluno, mesAno, sessoes, config, emailProfissional } = input;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14; // margem lateral
  const inner = W - M * 2;

  const dataEmissao = formatarHoje();
  const numero = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // ============================================================
  // 1. CABEÇALHO — banda roxa com título e mês de referência
  // ============================================================
  doc.setFillColor(...C.purple);
  doc.rect(0, 0, W, 36, 'F');

  // overlay sutil mais escuro pra dar profundidade
  doc.setFillColor(...C.purpleDark);
  doc.rect(0, 32, W, 4, 'F');

  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Relatório Mensal', M, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Acompanha · Pedagogia & Psicopedagogia', M, 24);

  // Bloco direito — mês e número
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(formatarMesAnoExtenso(mesAno), W - M, 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Nº ${numero}  ·  Emitido em ${dataEmissao}`, W - M, 24, { align: 'right' });

  // ============================================================
  // 2. CARD DO PROFISSIONAL
  // ============================================================
  let y = 46;
  doc.setFillColor(...C.purpleSubtle);
  doc.setDrawColor(...C.purpleLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, inner, 18, 3, 3, 'FD');

  doc.setTextColor(...C.slate500);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PROFISSIONAL', M + 5, y + 6);

  doc.setTextColor(...C.slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const nomeProf = config.razao_social?.trim() || emailProfissional;
  doc.text(nomeProf, M + 5, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.slate500);
  const detalhesProf: string[] = [];
  if (config.cnpj?.trim()) detalhesProf.push(`CNPJ ${config.cnpj.trim()}`);
  if (config.inscricao_municipal?.trim()) detalhesProf.push(`IM ${config.inscricao_municipal.trim()}`);
  if (config.regime_tributario) detalhesProf.push(config.regime_tributario);
  if (detalhesProf.length > 0) {
    doc.text(detalhesProf.join('  ·  '), M + 5, y + 16.5);
  }

  // ============================================================
  // 3. CARD DO ALUNO
  // ============================================================
  y += 22;
  doc.setFillColor(...C.slate50);
  doc.setDrawColor(...C.slate300);
  doc.roundedRect(M, y, inner, 18, 3, 3, 'FD');

  doc.setTextColor(...C.slate500);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ALUNO', M + 5, y + 6);

  doc.setTextColor(...C.slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(nomeAluno.toUpperCase(), M + 5, y + 13);

  // ============================================================
  // 4. KPIs — 4 cards coloridos
  // ============================================================
  y += 24;
  const totalSessoes = sessoes.length;
  const presencas = sessoes.filter(s => s.status === 'Concluído').length;
  const faltas = sessoes.filter(s => s.status === 'Faltou').length;
  const agendadas = sessoes.filter(s => s.status === 'Agendado').length;
  const baseFreq = presencas + faltas;
  const frequencia = baseFreq > 0 ? Math.round((presencas / baseFreq) * 100) : 0;

  const gap = 3;
  const cardW = (inner - gap * 3) / 4;
  const cardH = 22;

  const kpis: Array<{ valor: string; label: string; bg: typeof C.purple; fg: typeof C.purple }> = [
    { valor: String(totalSessoes), label: 'sessões',  bg: C.purpleLight,  fg: C.purple },
    { valor: String(presencas),    label: 'presenças', bg: C.emeraldLight, fg: C.emerald },
    { valor: String(faltas),       label: 'faltas',    bg: C.roseLight,    fg: C.rose },
    { valor: `${frequencia}%`,     label: 'frequência', bg: C.amberLight,  fg: C.amber },
  ];

  kpis.forEach((k, i) => {
    const x = M + i * (cardW + gap);
    doc.setFillColor(...k.bg);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'F');

    doc.setTextColor(...k.fg);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(k.valor, x + cardW / 2, y + 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.slate700);
    doc.text(k.label.toUpperCase(), x + cardW / 2, y + 17.5, { align: 'center' });
  });

  // ============================================================
  // 5. TABELA DETALHADA
  // ============================================================
  y += cardH + 8;

  // Título da seção
  doc.setTextColor(...C.slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Detalhamento das sessões', M, y);

  doc.setTextColor(...C.slate500);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${totalSessoes} ${totalSessoes === 1 ? 'sessão registrada' : 'sessões registradas'}${agendadas > 0 ? ` · ${agendadas} ainda agendada${agendadas === 1 ? '' : 's'}` : ''}`, M, y + 4);

  y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Data', 'Dia', 'Horário', 'Presença', 'Valor', 'Pagamento']],
    body: sessoes.map(s => {
      const presencaTxt = s.status === 'Concluído' ? 'Compareceu'
        : s.status === 'Faltou' ? 'Faltou'
        : 'Agendado';
      const valorTxt = s.status === 'Faltou' ? '—' : formatarReal(Number(s.valor_sessao));
      const pgtoTxt = s.status === 'Faltou' ? '—' : s.status_pagamento;
      return [
        formatarData(s.data),
        diaSemana(s.data),
        s.horario.substring(0, 5),
        presencaTxt,
        valorTxt,
        pgtoTxt,
      ];
    }),
    headStyles: {
      fillColor: C.purple,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: C.slate900,
      cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
    },
    alternateRowStyles: { fillColor: C.slate50 },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 14, textColor: C.slate500 },
      2: { cellWidth: 20 },
      3: { cellWidth: 'auto', fontStyle: 'bold' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 28, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const s = sessoes[data.row.index];
      if (!s) return;

      if (data.column.index === 3) {
        if (s.status === 'Concluído') data.cell.styles.textColor = C.emerald;
        else if (s.status === 'Faltou') data.cell.styles.textColor = C.rose;
        else data.cell.styles.textColor = C.amber;
      }
      if (data.column.index === 5 && s.status !== 'Faltou') {
        if (s.status_pagamento === 'Pago') data.cell.styles.textColor = C.emerald;
        else data.cell.styles.textColor = C.amber;
      }
    },
    tableLineColor: C.slate300,
    tableLineWidth: 0.15,
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  y = finalY + 8;

  // ============================================================
  // 6. RESUMO FINANCEIRO
  // ============================================================
  const totalGeral = sessoes.filter(s => s.status !== 'Faltou').reduce((acc, s) => acc + Number(s.valor_sessao || 0), 0);
  const totalPago = sessoes.filter(s => s.status !== 'Faltou' && s.status_pagamento === 'Pago').reduce((acc, s) => acc + Number(s.valor_sessao || 0), 0);
  const totalPendente = totalGeral - totalPago;

  const resumoH = config.chave_pix?.trim() ? 36 : 26;
  doc.setFillColor(...C.purpleSubtle);
  doc.setDrawColor(...C.purpleLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, inner, resumoH, 3, 3, 'FD');

  // Faixa colorida lateral (acento visual)
  doc.setFillColor(...C.purple);
  doc.rect(M, y, 2, resumoH, 'F');

  doc.setTextColor(...C.slate500);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('RESUMO FINANCEIRO', M + 7, y + 6);

  // 3 colunas: Total | Pago | Pendente
  const col1x = M + 7;
  const col2x = M + inner / 3 + 2;
  const col3x = M + (inner * 2) / 3 + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slate500);
  doc.text('Total apurado', col1x, y + 12);
  doc.text('Pago', col2x, y + 12);
  doc.text('Pendente', col3x, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.slate900);
  doc.text(formatarReal(totalGeral), col1x, y + 19);
  doc.setTextColor(...C.emerald);
  doc.text(formatarReal(totalPago), col2x, y + 19);
  doc.setTextColor(totalPendente > 0 ? C.amber[0] : C.slate500[0], totalPendente > 0 ? C.amber[1] : C.slate500[1], totalPendente > 0 ? C.amber[2] : C.slate500[2]);
  doc.text(formatarReal(totalPendente), col3x, y + 19);

  // Chave PIX (se houver)
  if (config.chave_pix?.trim()) {
    doc.setDrawColor(...C.purpleLight);
    doc.setLineWidth(0.3);
    doc.line(M + 7, y + 24, M + inner - 5, y + 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.purple);
    doc.text('CHAVE PIX', M + 7, y + 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.slate900);
    doc.text(config.chave_pix.trim(), M + 28, y + 30);
  }

  y += resumoH + 12;

  // ============================================================
  // 7. ASSINATURAS — no rodapé
  // ============================================================
  const assY = Math.max(y, H - 38);
  const assW = (inner - 20) / 2;

  doc.setDrawColor(...C.slate500);
  doc.setLineWidth(0.4);
  doc.line(M, assY, M + assW, assY);
  doc.line(W - M - assW, assY, W - M, assY);

  doc.setTextColor(...C.slate500);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Profissional / Prestador de serviço', M + assW / 2, assY + 4.5, { align: 'center' });
  doc.text('Responsável / Contratante', W - M - assW / 2, assY + 4.5, { align: 'center' });

  // ============================================================
  // 8. RODAPÉ
  // ============================================================
  doc.setFontSize(7);
  doc.setTextColor(...C.slate500);
  doc.text(
    `Relatório gerado em ${dataEmissao} pelo sistema Acompanha · Documento com valor de comprovante de prestação de serviços.`,
    W / 2,
    H - 8,
    { align: 'center' }
  );

  // ============================================================
  // Salva
  // ============================================================
  const nomeArquivo = `relatorio_${nomeAluno.replace(/\s+/g, '_').toLowerCase()}_${mesAno}.pdf`;
  doc.save(nomeArquivo);
}
