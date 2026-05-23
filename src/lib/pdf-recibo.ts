import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SessaoRecibo {
  data: string;
  horario: string;
  status_pagamento: 'Pago' | 'Pendente';
  valor_sessao: number;
}

interface ConfigRecibo {
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
  sessoes: SessaoRecibo[];
  config: ConfigRecibo;
  emailProfissional: string;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarMesAno(mesAno: string): string {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [ano, mes] = mesAno.split('-');
  return `${meses[parseInt(mes, 10) - 1]} / ${ano}`;
}

function formatarHorario(horario: string): string {
  return horario.substring(0, 5); // "14:30:00" → "14:30"
}

export function gerarReciboPDF(input: ReciboInput): void {
  const { nomeAluno, mesAno, sessoes, config, emailProfissional } = input;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const PURPLE = [109, 40, 217] as [number, number, number];
  const PURPLE_LIGHT = [237, 233, 254] as [number, number, number];
  const GRAY = [107, 114, 128] as [number, number, number];
  const DARK = [17, 24, 39] as [number, number, number];
  const GREEN = [16, 185, 129] as [number, number, number];
  const ROSE = [244, 63, 94] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];

  const largura = doc.internal.pageSize.getWidth();
  const hoje = new Date();
  const dataEmissao = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
  const numeroRecibo = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Header gradiente simulado com banda roxa
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, largura, 22, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Acompanha · Pedagogia & Psicopedagogia', largura - 14, 9, { align: 'right' });
  doc.text(`Nº ${numeroRecibo}`, largura - 14, 15, { align: 'right' });

  // Dados do profissional
  let y = 32;

  doc.setFillColor(...PURPLE_LIGHT);
  doc.roundedRect(14, y - 5, largura - 28, 26, 3, 3, 'F');

  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const nomeProfissional = config.razao_social?.trim() || emailProfissional;
  doc.text(nomeProfissional, 20, y + 1);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);

  let infoLinha = '';
  if (config.cnpj?.trim()) infoLinha += `CNPJ: ${config.cnpj.trim()}`;
  if (config.inscricao_municipal?.trim()) {
    if (infoLinha) infoLinha += '  |  ';
    infoLinha += `IM: ${config.inscricao_municipal.trim()}`;
  }
  if (config.regime_tributario) {
    if (infoLinha) infoLinha += '  |  ';
    infoLinha += config.regime_tributario;
  }
  if (infoLinha) doc.text(infoLinha, 20, y + 8);

  doc.setTextColor(...GRAY);
  doc.text(`Data de emissão: ${dataEmissao}`, 20, y + 15);

  // Aluno e referência
  y += 36;
  doc.setFillColor(248, 248, 250);
  doc.roundedRect(14, y - 5, largura - 28, 20, 3, 3, 'F');

  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ALUNO', 20, y + 1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(nomeAluno, 20, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('REFERÊNCIA', largura - 90, y + 1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(formatarMesAno(mesAno), largura - 90, y + 8);

  // Tabela de sessões
  y += 26;

  const totalGeral = sessoes.reduce((s, ses) => s + (Number(ses.valor_sessao) || 0), 0);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Data', 'Horário', 'Status do pagamento', 'Valor']],
    body: sessoes.map(ses => [
      formatarData(ses.data),
      formatarHorario(ses.horario),
      ses.status_pagamento,
      `R$ ${Number(ses.valor_sessao).toFixed(2)}`,
    ]),
    foot: [['', '', 'TOTAL', `R$ ${totalGeral.toFixed(2)}`]],
    headStyles: {
      fillColor: PURPLE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK,
    },
    footStyles: {
      fillColor: PURPLE_LIGHT,
      textColor: DARK,
      fontStyle: 'bold',
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 22 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 35, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const val = data.cell.raw as string;
        if (val === 'Pago') {
          data.cell.styles.textColor = GREEN;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = ROSE;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    alternateRowStyles: { fillColor: [250, 250, 252] as [number, number, number] },
    tableLineColor: [229, 231, 235] as [number, number, number],
    tableLineWidth: 0.3,
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Chave PIX
  if (config.chave_pix?.trim()) {
    y = finalY + 10;
    doc.setFillColor(...PURPLE_LIGHT);
    doc.roundedRect(14, y - 4, largura - 28, 12, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PURPLE);
    doc.text('Chave PIX:', 20, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(config.chave_pix.trim(), 46, y + 4);
  }

  // Alíquota
  if (config.aliquota_imposto && Number(config.aliquota_imposto) > 0) {
    const baseY = config.chave_pix?.trim() ? finalY + 28 : finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `Imposto sobre serviço (${config.regime_tributario || ''}): ${Number(config.aliquota_imposto).toFixed(2)}%`,
      14, baseY
    );
  }

  // Assinaturas
  const assinaturaY = doc.internal.pageSize.getHeight() - 38;
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.4);
  doc.line(14, assinaturaY, 90, assinaturaY);
  doc.line(largura - 90, assinaturaY, largura - 14, assinaturaY);

  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('Profissional / Prestador de Serviço', 52, assinaturaY + 5, { align: 'center' });
  doc.text('Responsável / Contratante', largura - 52, assinaturaY + 5, { align: 'center' });

  // Rodapé
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(
    `Gerado em ${dataEmissao} pelo sistema Acompanha · Este documento tem valor de comprovante de pagamento.`,
    largura / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: 'center' }
  );

  const nomeArquivo = `recibo_${nomeAluno.replace(/\s+/g, '_').toLowerCase()}_${mesAno}.pdf`;
  doc.save(nomeArquivo);
}
