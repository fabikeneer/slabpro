// utils/proyectoPDF.js — Generador de Ficha de Proyecto PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const RIF_EMPRESA     = 'J-12345678-9';
const NOMBRE_EMPRESA  = 'Marmolería SlabPro';
const TELEFONO_EMPRESA = '0412-0000000';
const EMAIL_EMPRESA   = 'info@slabpro.com';

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
const fmtBs  = (n) => `Bs. ${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
const fmtFecha = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
};

const ESTADO_COLORS = {
  'Activo':     [16, 185, 129],   // verde
  'En Proceso': [59, 130, 246],   // azul
  'Terminado':  [100, 116, 139],  // gris
};

export function generarFichaProyectoPDF({ proyecto, pagos, resumen }) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const M    = 18;   // margen
  let y      = M;

  // ── Encabezado ───────────────────────────────────────────────────────────
  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, W, 48, 'F');

  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(NOMBRE_EMPRESA, M, 18);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(`RIF: ${RIF_EMPRESA}`, M, 27);
  doc.text(`Tel: ${TELEFONO_EMPRESA}  |  ${EMAIL_EMPRESA}`, M, 33);

  // Badge estatus
  const estadoColor = ESTADO_COLORS[proyecto.estatus] || [100, 116, 139];
  doc.setFillColor(...estadoColor);
  doc.roundedRect(W - M - 60, 8, 60, 30, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHA DE PROYECTO', W - M - 30, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text(proyecto.estatus || '—', W - M - 30, 27, { align: 'center' });

  y = 56;

  // ── ID + Nombre del Proyecto ──────────────────────────────────────────────
  doc.setFillColor(26, 34, 54);
  doc.roundedRect(M, y, W - M * 2, 32, 3, 3, 'F');

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`PROYECTO #${proyecto.id_proyecto}`, M + 6, y + 8);

  doc.setTextColor(241, 245, 249);
  doc.setFontSize(14);
  doc.text(proyecto.nombre_cliente || '—', M + 6, y + 18);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  const fechaIni  = fmtFecha(proyecto.fecha_inicio);
  const fechaEmit = fmtFecha(new Date());
  doc.text(`Inicio: ${fechaIni}`, M + 6, y + 26);
  doc.text(`Generado: ${fechaEmit}`, W - M - 6, y + 26, { align: 'right' });

  y += 40;

  // ── Datos del Cliente ─────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(M, y, W - M * 2, 36, 3, 3, 'F');
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, W - M * 2, 36, 3, 3, 'S');

  doc.setTextColor(59, 130, 246);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', M + 6, y + 8);

  doc.setTextColor(241, 245, 249);
  doc.setFontSize(12);
  doc.text(proyecto.nombre_cliente || '—', M + 6, y + 17);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  if (proyecto.rif_cedula) doc.text(`RIF/Cédula: ${proyecto.rif_cedula}`, M + 6, y + 26);
  if (proyecto.tasa_bcv)   doc.text(`Tasa BCV: Bs. ${Number(proyecto.tasa_bcv).toFixed(2)}`, W - M - 6, y + 26, { align: 'right' });

  y += 44;

  // ── Descripción de la Obra ────────────────────────────────────────────────
  if (proyecto.descripcion_obra) {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCIÓN DE LA OBRA', M, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 225);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(proyecto.descripcion_obra, W - M * 2);
    doc.text(lines, M, y + 11);
    y += 11 + lines.length * 5 + 6;
  }

  // ── Monto Presupuestado ───────────────────────────────────────────────────
  const panelW = 110;
  const panelX = W - M - panelW;

  doc.setFillColor(26, 34, 54);
  doc.roundedRect(panelX, y, panelW, 22, 3, 3, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Monto Presupuestado:', panelX + 5, y + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(59, 130, 246);
  doc.text(fmtUSD(proyecto.monto_total), panelX + panelW - 5, y + 14, { align: 'right' });

  y += 30;

  // ── Tabla de Pagos de Nómina ──────────────────────────────────────────────
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE PAGOS DE NÓMINA', M, y);
  y += 6;

  if (pagos && pagos.length > 0) {
    const tableData = pagos.map(p => [
      fmtFecha(p.fecha_pago),
      p.trabajador || '—',
      p.rol        || '—',
      p.concepto   || '—',
      fmtUSD(p.monto_usd),
      fmtBs(p.monto_bs),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Trabajador', 'Rol', 'Concepto', 'Monto USD', 'Monto Bs']],
      body: tableData,
      margin: { left: M, right: M },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 3,
        textColor: [200, 210, 230],
        fillColor: [26, 34, 54],
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 26 },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'right', textColor: [245, 158, 11] },
      },
    });

    y = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(M, y, W - M * 2, 18, 3, 3, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('No hay pagos de nómina registrados para este proyecto.', W / 2, y + 11, { align: 'center' });
    y += 26;
  }

  // ── Panel de Resumen de Costos ────────────────────────────────────────────
  doc.setFillColor(10, 15, 30);
  doc.roundedRect(M, y, W - M * 2, 36, 3, 3, 'F');
  doc.setDrawColor(...estadoColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, W - M * 2, 36, 3, 3, 'S');

  const col = (W - M * 2) / 2;

  // Col 1: Total Pagos
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Pagos Registrados', M + col * 0 + col / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(241, 245, 249);
  doc.text(String(resumen?.total_pagos || 0), M + col * 0 + col / 2, y + 22, { align: 'center' });

  // Col 2: Costo MOD
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Costo Acumulado Mano de Obra', M + col * 1 + col / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(fmtUSD(resumen?.costo_mano_obra_usd || 0), M + col * 1 + col / 2, y + 22, { align: 'center' });

  y += 44;

  // ── Pie de página ─────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(10, 15, 30);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7);
    doc.text(
      `${NOMBRE_EMPRESA}  |  RIF: ${RIF_EMPRESA}  |  Generado el ${new Date().toLocaleString('es-VE')}`,
      W / 2, H - 4, { align: 'center' }
    );
    doc.text(`Pág. ${i} / ${pageCount}`, W - M, H - 4, { align: 'right' });
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  const safe = (proyecto.nombre_proyecto || 'Proyecto').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').trim();
  doc.save(`Ficha_Proyecto_${safe}_${Date.now()}.pdf`);
}
