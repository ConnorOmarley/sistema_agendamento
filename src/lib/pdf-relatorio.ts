import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SessaoRelatorio {
  data: string;
  horario: string;
  status: 'Agendado' | 'Concluído' | 'Faltou' | string;
  status_pagamento: 'Pago' | 'Pendente';
  valor_sessao: number;
}

export interface RelatorioInput {
  nomeAluno: string;
  mesAno: string; // "2026-05"
  sessoes: SessaoRelatorio[];
  nomeProfissional: string;
  formasPagamento: string[];
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatarData(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function diaSemana(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return DIAS_SEMANA[d.getDay()];
}

function formatarMesAno(mesAno: string) {
  const [a, m] = mesAno.split('-');
  return `${MESES[parseInt(m, 10) - 1]} / ${a}`;
}

export function gerarRelatorioPDF(input: RelatorioInput): void {
  const { nomeAluno, mesAno, sessoes, nomeProfissional, formasPagamento } = input;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const PURPLE = [109, 40, 217] as [number, number, number];
  const PURPLE_LIGHT = [237, 233, 254] as [number, number, number];
  const GRAY = [107, 114, 128] as [number, number, number];
  const DARK = [17, 24, 39] as [number, number, number];
  const GREEN = [16, 185, 129] as [number, number, number];
  const ROSE = [244, 63, 94] as [number, number, number];
  const AMBER = [245, 158, 11] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];

  const largura = doc.internal.pageSize.getWidth();
  const hoje = new Date();
  const dataEmissao = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

  // Cabeçalho
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, largura, 22, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE FREQUÊNCIA', 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Acompanha · Pedagogia & Psicopedagogia', largura - 14, 9, { align: 'right' });
  doc.text(`Emitido em ${dataEmissao}`, largura - 14, 15, { align: 'right' });

  // Bloco do aluno + referência
  let y = 32;
  doc.setFillColor(...PURPLE_LIGHT);
  doc.roundedRect(14, y - 5, largura - 28, 22, 3, 3, 'F');
  doc.setTextColor(...DARK);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ALUNO', 20, y + 1);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(nomeAluno, 20, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('REFERÊNCIA', largura - 90, y + 1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(formatarMesAno(mesAno), largura - 90, y + 8);

  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Profissional: ${nomeProfissional}`, 20, y + 14);

  // Estatísticas
  y += 28;

  const totalSessoes = sessoes.length;
  const presentes = sessoes.filter(s => s.status === 'Concluído').length;
  const ausencias = sessoes.filter(s => s.status === 'Faltou').length;
  const agendadas = sessoes.filter(s => s.status === 'Agendado').length;
  const taxaPresenca = totalSessoes > 0
    ? Math.round((presentes / (presentes + ausencias || 1)) * 100)
    : 0;

  const cardW = (largura - 28 - 9) / 4;
  const cards: Array<[string, string, [number, number, number]]> = [
    [String(totalSessoes), 'Sessões no mês', PURPLE],
    [String(presentes), 'Presenças', GREEN],
    [String(ausencias), 'Ausências', ROSE],
    [`${taxaPresenca}%`, 'Frequência', AMBER],
  ];

  cards.forEach(([valor, label, cor], i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(...cor);
    doc.roundedRect(x, y, cardW, 20, 3, 3, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(valor, x + cardW / 2, y + 9, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + cardW / 2, y + 15, { align: 'center' });
  });

  y += 26;

  // Tabela de sessões
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Data', 'Dia', 'Horário', 'Presença', 'Valor', 'Pagamento']],
    body: sessoes.map(s => {
      const presencaLabel = s.status === 'Concluído' ? 'Compareceu ✓'
        : s.status === 'Faltou' ? 'Faltou ✗'
        : 'Agendado';
      const valor = s.status === 'Faltou' ? '—' : `R$ ${Number(s.valor_sessao).toFixed(2)}`;
      const pgto = s.status === 'Faltou' ? '—' : s.status_pagamento;
      return [
        formatarData(s.data),
        diaSemana(s.data),
        s.horario.substring(0, 5),
        presencaLabel,
        valor,
        pgto,
      ];
    }),
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 18 },
      2: { cellWidth: 20 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 26 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = sessoes[data.row.index];
      if (data.column.index === 3) {
        if (row.status === 'Concluído') {
          data.cell.styles.textColor = GREEN;
          data.cell.styles.fontStyle = 'bold';
        } else if (row.status === 'Faltou') {
          data.cell.styles.textColor = ROSE;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = AMBER;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.column.index === 5 && row.status !== 'Faltou') {
        if (row.status_pagamento === 'Pago') {
          data.cell.styles.textColor = GREEN;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = AMBER;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    alternateRowStyles: { fillColor: [250, 250, 252] as [number, number, number] },
    tableLineColor: [229, 231, 235] as [number, number, number],
    tableLineWidth: 0.3,
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Resumo financeiro
  y = finalY + 8;
  const valorTotal = sessoes
    .filter(s => s.status !== 'Faltou')
    .reduce((acc, s) => acc + Number(s.valor_sessao || 0), 0);
  const valorPago = sessoes
    .filter(s => s.status !== 'Faltou' && s.status_pagamento === 'Pago')
    .reduce((acc, s) => acc + Number(s.valor_sessao || 0), 0);
  const valorPendente = valorTotal - valorPago;

  doc.setFillColor(...PURPLE_LIGHT);
  doc.roundedRect(14, y, largura - 28, 26, 3, 3, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('💰 Resumo financeiro do mês', 20, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total apurado:`, 20, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${valorTotal.toFixed(2)}`, 50, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREEN);
  doc.text(`Pago: R$ ${valorPago.toFixed(2)}`, 80, y + 15);

  doc.setTextColor(...AMBER);
  doc.text(`Pendente: R$ ${valorPendente.toFixed(2)}`, 130, y + 15);

  if (formasPagamento.length > 0) {
    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Formas de pagamento aceitas: ${formasPagamento.join(' · ')}`, 20, y + 22);
  }

  // Rodapé
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(
    `Relatório gerado em ${dataEmissao} · Acompanha · ${agendadas} sessão(ões) ainda agendada(s)`,
    largura / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: 'center' }
  );

  const nomeArquivo = `relatorio_${nomeAluno.replace(/\s+/g, '_').toLowerCase()}_${mesAno}.pdf`;
  doc.save(nomeArquivo);
}
