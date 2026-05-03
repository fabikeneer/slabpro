// utils/pdfGenerator.js — Generación de PDF del presupuesto
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const RIF_EMPRESA  = 'J-12345678-9';      // ← Actualiza con el RIF real
const NOMBRE_EMPRESA = 'MarmolerÍa SlabPro';
const TELEFONO_EMPRESA = '0412-0000000';  // ← Actualiza
const EMAIL_EMPRESA    = 'info@slabpro.com';

const fmtUSD = (n) => `$${Number(n).toFixed(2)}`;
const fmtBs  = (n) => `Bs. ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

export function generarPDF(form, totales) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();  // 210 mm
  const MARGIN = 18;
  let y = MARGIN;

  // ── Encabezado ────────────────────────────────────────────────────────
  // Fondo degradado del header
  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, W, 45, 'F');

  // Nombre de empresa
  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(NOMBRE_EMPRESA, MARGIN, 18);

  // RIF — visible y obligatorio
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`RIF: ${RIF_EMPRESA}`, MARGIN, 26);
  doc.text(`Tel: ${TELEFONO_EMPRESA}  |  ${EMAIL_EMPRESA}`, MARGIN, 32);

  // Etiqueta PRESUPUESTO
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(W - MARGIN - 55, 8, 55, 28, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESUPUESTO', W - MARGIN - 27.5, 19, { align: 'center' });
  doc.setFontSize(14);
  doc.text(totales.numero || 'BORRADOR', W - MARGIN - 27.5, 28, { align: 'center' });

  y = 54;

  // ── Info del Cliente ──────────────────────────────────────────────────
  doc.setFillColor(26, 34, 54);
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 38, 3, 3, 'F');

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', MARGIN + 6, y + 8);

  doc.setTextColor(241, 245, 249);
  doc.setFontSize(13);
  doc.text(form.cliente_nombre || '—', MARGIN + 6, y + 17);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  if (form.cliente_rif)      doc.text(`RIF: ${form.cliente_rif}`,          MARGIN + 6,          y + 25);
  if (form.cliente_telefono) doc.text(`Tel: ${form.cliente_telefono}`,       MARGIN + 6,          y + 31);
  if (form.cliente_email)    doc.text(form.cliente_email,                    W / 2,               y + 25);
  if (form.cliente_direccion)doc.text(form.cliente_direccion.substring(0,60),W / 2,               y + 31);

  // Fecha y validez (columna derecha)
  const fecha = new Date().toLocaleDateString('es-VE', { day:'2-digit', month:'long', year:'numeric' });
  doc.setTextColor(241, 245, 249);
  doc.setFontSize(9);
  doc.text(`Fecha: ${fecha}`, W - MARGIN - 6, y + 17, { align: 'right' });
  doc.text(`Validez: ${form.validez_dias} días`, W - MARGIN - 6, y + 25, { align: 'right' });

  y += 46;

  // ── Descripción del proyecto ──────────────────────────────────────────
  if (form.proyecto_descripcion) {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCIÓN DEL PROYECTO', MARGIN, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 225);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(form.proyecto_descripcion, W - MARGIN * 2);
    doc.text(lines, MARGIN, y + 10);
    y += 10 + lines.length * 5;
  }

  y += 4;

  // ── Tabla de líneas ───────────────────────────────────────────────────
  const tableData = totales.lineasCalculadas
    .filter(l => l.descripcion || l.tipo)
    .map((l, idx) => [
      idx + 1,
      l.descripcion || l.tipo,
      l.metros_lineales > 0 ? Number(l.metros_lineales).toFixed(2) : '—',
      l.cantidad,
      fmtUSD(l.precio_unitario_usd),
      fmtUSD(l.subtotalUSD),
      fmtBs(l.subtotalBs),
    ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Descripción', 'Metros Lin.', 'Cant.', 'P. Unit. USD', 'Subtotal USD', 'Subtotal Bs']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 4,
      textColor: [200, 210, 230],
      fillColor: [26, 34, 54],
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right', textColor: [245, 158, 11] },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Panel de Totales ──────────────────────────────────────────────────
  const panelW = 100;
  const panelX = W - MARGIN - panelW;

  doc.setFillColor(26, 34, 54);
  doc.roundedRect(panelX, y, panelW, 28, 3, 3, 'F');

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('TASA DE CAMBIO:', panelX + 4, y + 8);
  doc.setTextColor(245, 158, 11);
  doc.text(`1 USD = ${fmtBs(form.tasa_cambio_usd_bs)}`, panelX + panelW - 4, y + 8, { align: 'right' });

  // Línea separadora
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.3);
  doc.line(panelX + 4, y + 12, panelX + panelW - 4, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(59, 130, 246);
  doc.text('TOTAL USD:', panelX + 4, y + 20);
  doc.setTextColor(241, 245, 249);
  doc.text(fmtUSD(totales.totalUSD), panelX + panelW - 4, y + 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(245, 158, 11);
  doc.text('TOTAL Bs.:', panelX + 4, y + 26);
  doc.text(fmtBs(totales.totalBs), panelX + panelW - 4, y + 26, { align: 'right' });

  y += 36;

  // ── Descripción Legal ─────────────────────────────────────────────────
  if (form.descripcion_legal) {
    doc.setFillColor(15, 23, 42);
    const legalLines = doc.splitTextToSize(form.descripcion_legal, W - MARGIN * 2 - 12);
    const legalH = legalLines.length * 4.5 + 14;

    doc.roundedRect(MARGIN, y, W - MARGIN * 2, legalH, 3, 3, 'F');
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, legalH, 3, 3, 'S');

    doc.setTextColor(59, 130, 246);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DESCRIPCIÓN LEGAL DE MATERIALES', MARGIN + 6, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(legalLines, MARGIN + 6, y + 13);

    y += legalH + 8;
  }

  // ── Firma ─────────────────────────────────────────────────────────────
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 20, MARGIN + 70, y + 20);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text('Firma y Sello Autorizado', MARGIN, y + 26);
  doc.text(NOMBRE_EMPRESA, MARGIN, y + 31);

  // ── Pie de página ─────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 287, W, 10, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7);
    doc.text(
      `${NOMBRE_EMPRESA}  |  RIF: ${RIF_EMPRESA}  |  Generado el ${new Date().toLocaleString('es-VE')}`,
      W / 2, 292, { align: 'center' }
    );
    doc.text(`Pág. ${i} / ${pageCount}`, W - MARGIN, 292, { align: 'right' });
  }

  // ── Guardar ───────────────────────────────────────────────────────────
  const filename = `Presupuesto_${form.cliente_nombre || 'Cliente'}_${Date.now()}.pdf`;
  doc.save(filename);
}
