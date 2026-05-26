import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const C = {
  headerBg:    [26, 18, 4],       // Café oscuro casi negro (Ink)
  accentGold:  [254, 183, 44],    // Dorado vibrante primario
  accentLight: [251, 202, 91],    // Dorado suave
  textPrimary: [26, 18, 4],       // Texto principal oscuro (Ink)
  textMuted:   [92, 79, 55],      // Texto secundario (InkSoft)
  white:       [255, 255, 255],
  divider:     [237, 232, 220],   // Bordes sutiles
  rowAlt:      [255, 251, 240],   // Fila alternada crema suave
};

const fmtUSD = (n) => `$ ${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBs  = (n) => `Bs. ${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Render Header Común (Estilo Presupuesto) ──
function renderProfessionalHeader(doc, W, MARGIN, title, configEmpresa) {
  // Logo
  if (configEmpresa?.logo_data) {
    try {
      doc.addImage(configEmpresa.logo_data, 'PNG', MARGIN, 15, 35, 20, undefined, 'FAST');
    } catch (e) {
      console.warn('Error rendering logo:', e);
      doc.setTextColor(...C.textPrimary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text((configEmpresa?.nombre_empresa || 'Marmolería Maracay').toUpperCase(), MARGIN, 25);
    }
  } else {
    doc.setTextColor(...C.textPrimary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text((configEmpresa?.nombre_empresa || 'Marmolería Maracay').toUpperCase(), MARGIN, 25);
  }

  // Nombre de Empresa (debajo del logo)
  doc.setTextColor(...C.textPrimary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const nombreEmpresa = configEmpresa?.nombre_empresa || 'Marmolería Maracay';
  doc.text(nombreEmpresa.toUpperCase(), MARGIN, 42);

  // Título (Alineado a la derecha)
  doc.setTextColor(...C.textPrimary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(title.toUpperCase(), W - MARGIN, 30, { align: 'right' });

  return 55; // Posición Y de retorno
}

export function exportarReportePDFProfesional(reporte, startDate, endDate, idEmpleado, empleados, configEmpresa) {
  if (!reporte) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 14;

  let y = renderProfessionalHeader(doc, W, MARGIN, 'Reporte de Nómina', configEmpresa);

  // Información del reporte
  doc.setFontSize(10);
  doc.setTextColor(...C.textPrimary);
  const empName = idEmpleado ? empleados.find(e => String(e.id) === String(idEmpleado))?.nombre : 'Todos los Empleados';
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.accentGold);
  doc.setFontSize(8);
  doc.text('DATOS DEL REPORTE', MARGIN, y);
  
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(...C.textPrimary);
  doc.setFont('helvetica', 'bold');
  doc.text('Periodo:', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${startDate.toLocaleDateString('es-VE')} - ${endDate.toLocaleDateString('es-VE')}`, MARGIN + 18, y);
  
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Trabajador:', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(empName || 'Desconocido', MARGIN + 22, y);



  y += 10;

  // Tabla
  const tableRows = reporte.pagos.map(p => [
    new Date(p.fecha_pago).toLocaleDateString('es-VE'),
    p.trabajador || 'Desconocido',
    p.concepto,
    p.proyecto || 'Desconocido',
    fmtUSD(p.monto_usd),
    fmtBs(p.monto_bs)
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['FECHA', 'TRABAJADOR', 'CONCEPTO', 'PROYECTO', 'MONTO ($)', 'MONTO (Bs)']],
    body: tableRows,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 4,
      textColor: C.textPrimary,
      lineColor: C.divider,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: C.textPrimary, // Negro para coincidir con presupuesto
      textColor: C.white,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: C.rowAlt,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      4: { halign: 'right', fontStyle: 'bold', textColor: C.textPrimary }, // En negro
      5: { halign: 'right', textColor: C.textMuted },
    }
  });

  const finalY = doc.lastAutoTable.finalY + 12;
  
  // Total (Barra negra como en presupuesto)
  doc.setFillColor(...C.headerBg);
  doc.rect(MARGIN, finalY, W - MARGIN * 2, 12, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL NÓMINA DEL PERIODO', MARGIN + 4, finalY + 8);
  
  const totalsText = `${fmtUSD(reporte.resumen.total_usd)}  /  ${fmtBs(reporte.resumen.total_bs)}`;
  doc.text(totalsText, W - MARGIN - 4, finalY + 8, { align: 'right' });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(...C.divider);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, footerY - 5, W - MARGIN, footerY - 5);
  
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  const emailInfo = configEmpresa?.email || 'contacto@empresa.com';
  const telInfo = configEmpresa?.telefono || '0412-0000000';
  const dirInfo = configEmpresa?.direccion || 'Maracay, Aragua';
  
  doc.text(`${emailInfo}  |  ${telInfo}  |  ${dirInfo}`, W - MARGIN, footerY, { align: 'right' });
  
  doc.setFillColor(...C.textPrimary);
  doc.rect(0, footerY + 5, W, 10, 'F');

  doc.save(`Reporte_Nomina_${startDate.toLocaleDateString('es-VE').replace(/\//g, '-')}_a_${endDate.toLocaleDateString('es-VE').replace(/\//g, '-')}.pdf`);
}

const fmtFechaCorta = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

export function splitNombreCompleto(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nombre: '', apellido: '' };
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}

/** Línea punteada entre recibos para facilitar el recorte. */
function dibujarGuiaCorte(doc, x, y, w) {
  doc.setDrawColor(...C.divider);
  doc.setLineWidth(0.2);
  if (doc.setLineDash) doc.setLineDash([1.2, 1.2], 0);
  doc.line(x + 4, y, x + w - 4, y);
  if (doc.setLineDash) doc.setLineDash([]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...C.textMuted);
  doc.text('recortar aquí', x + w / 2, y + 2.2, { align: 'center' });
}

/** Recibo — contenedor pequeño centrado, texto legible (paleta SlabPro). */
function dibujarReciboPago(doc, x, y, w, h, data) {
  const pad = 2;
  const ix = x + pad;
  const iy = y + pad;
  const iw = w - pad * 2;
  const ih = h - pad * 2;

  doc.setDrawColor(...C.textPrimary);
  doc.setLineWidth(0.35);
  doc.rect(x, y, w, h);

  const headerH = 9;
  doc.setFillColor(...C.headerBg);
  doc.rect(ix, iy, iw, headerH, 'F');

  doc.setFillColor(...C.white);
  doc.rect(ix + 1.5, iy + 1.2, 28, headerH - 2.4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...C.textMuted);
  doc.text('FECHA', ix + 3, iy + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textPrimary);
  doc.text(data.fecha || '', ix + 3, iy + 7.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.accentGold);
  doc.text('RECIBO DE PAGO', ix + iw / 2 + 12, iy + 6, { align: 'center' });

  const bodyY = iy + headerH + 2.5;
  const splitX = ix + iw * 0.48;
  const leftEnd = splitX - 2;
  const rightX = splitX + 2;
  const rightW = ix + iw - rightX;
  const labelW = 20;
  const rowH = 7.5;

  const drawField = (label, value, lineY) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textPrimary);
    doc.text(label, ix + 2, lineY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (value) doc.text(String(value), ix + labelW + 2, lineY);
    doc.setDrawColor(...C.divider);
    doc.setLineWidth(0.2);
    doc.line(ix + labelW, lineY + 1, leftEnd, lineY + 1);
  };

  let ly = bodyY;
  drawField('NOMBRE', data.nombre, ly);
  ly += rowH;
  drawField('APELLIDO', data.apellido, ly);
  ly += rowH;

  drawField('CONCEPTO', data.concepto || '', ly);
  ly += rowH;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('FIRMA', ix + 2, ly);
  doc.setDrawColor(...C.textPrimary);
  doc.setLineWidth(0.25);
  doc.line(ix + 16, ly + 5, leftEnd, ly + 5);

  const weekY = y + h - pad - 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('SEMANA DEL', ix + 2, weekY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (data.semanaDel) doc.text(data.semanaDel, ix + 24, weekY);
  doc.setDrawColor(...C.divider);
  doc.line(ix + 22, weekY + 1, ix + 40, weekY + 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('AL', ix + 44, weekY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (data.semanaAl) doc.text(data.semanaAl, ix + 48, weekY);
  doc.line(ix + 46, weekY + 1, leftEnd, weekY + 1);

  let ry = bodyY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.accentGold);
  doc.text('MONTO A PAGAR', rightX, ry);

  const montoBoxTop = ry + 2.5;
  const totalBarH = 8;
  const montoBoxH = ih - headerH - totalBarH - 10;
  doc.setDrawColor(...C.divider);
  doc.setLineWidth(0.25);
  doc.rect(rightX, montoBoxTop, rightW, montoBoxH);

  const montoNum = parseFloat(data.montoUsd);
  const tieneMonto = !Number.isNaN(montoNum) && data.montoUsd !== '' && data.montoUsd != null;
  const fmtMonto = (n) => (n % 1 === 0 ? `${n.toFixed(0)}$` : `${n.toFixed(2)}$`);

  if (data.montosDetalle?.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textPrimary);
    let my = montoBoxTop + 5;
    data.montosDetalle.forEach((m) => {
      doc.text(String(m), rightX + rightW - 2, my, { align: 'right' });
      my += 5;
    });
    doc.line(rightX + 2, my, rightX + rightW - 2, my);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(fmtMonto(montoNum), rightX + rightW - 2, my + 4, { align: 'right' });
  } else if (tieneMonto) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.textPrimary);
    doc.text(fmtMonto(montoNum), rightX + rightW / 2, montoBoxTop + montoBoxH / 2 + 1.5, { align: 'center' });
  }

  const totalY = y + h - pad - totalBarH;
  doc.setFillColor(...C.headerBg);
  doc.rect(rightX, totalY, rightW, totalBarH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.white);
  doc.text('TOTAL A PAGAR', rightX + 2, totalY + 5.2);
  if (tieneMonto) {
    doc.setFontSize(11);
    doc.text(fmtMonto(montoNum), rightX + rightW - 2, totalY + 5.5, { align: 'right' });
  } else {
    doc.setDrawColor(...C.accentGold);
    doc.setLineWidth(0.25);
    doc.line(rightX + 26, totalY + 5.5, rightX + rightW - 2, totalY + 5.5);
  }
}

/**
 * Genera PDF con varios recibos (3 por hoja A4).
 * Contenedor pequeño centrado + mucho espacio alrededor para recortar.
 */
export function generarRecibosMultiplesPDF(recibos, options = {}) {
  if (!recibos?.length) return false;

  const {
    filename = 'Recibos_Pago.pdf',
    porPagina = 3,
    reciboAncho = 168,
    reciboAlto = 72,
    espacioCorte = 16,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const reciboX = (pageW - reciboAncho) / 2;
  const bloqueAlto = reciboAlto + espacioCorte;
  const alturaTotal = reciboAlto * porPagina + espacioCorte * (porPagina - 1);
  const startY = (pageH - alturaTotal) / 2;

  recibos.forEach((recibo, index) => {
    if (index > 0 && index % porPagina === 0) doc.addPage();
    const slot = index % porPagina;
    const posY = startY + slot * bloqueAlto;
    dibujarReciboPago(doc, reciboX, posY, reciboAncho, reciboAlto, recibo);

    if (slot < porPagina - 1) {
      dibujarGuiaCorte(doc, reciboX, posY + reciboAlto + espacioCorte / 2, reciboAncho);
    }
  });

  doc.save(filename);
  return true;
}

export function pagoARecibo(pago, startDate, endDate) {
  const { nombre, apellido } = splitNombreCompleto(pago.trabajador || pago.empleadoNombre || '');
  return {
    fecha: fmtFechaCorta(pago.fecha_pago || pago.fecha),
    nombre,
    apellido,
    semanaDel: fmtFechaCorta(startDate),
    semanaAl: fmtFechaCorta(endDate),
    montoUsd: pago.monto_usd,
    concepto: pago.concepto,
  };
}

export function empleadoARecibo(emp, startDate, endDate) {
  const { nombre, apellido } = splitNombreCompleto(emp.nombre || '');
  return {
    fecha: fmtFechaCorta(new Date()),
    nombre,
    apellido,
    semanaDel: fmtFechaCorta(startDate),
    semanaAl: fmtFechaCorta(endDate),
    montoUsd: '',
  };
}

export function comprobanteARecibo(pago, startDate, endDate) {
  const { nombre, apellido } = splitNombreCompleto(pago.empleadoNombre || '');
  return {
    fecha: fmtFechaCorta(pago.fecha),
    nombre,
    apellido,
    semanaDel: fmtFechaCorta(startDate),
    semanaAl: fmtFechaCorta(endDate),
    montoUsd: pago.monto_usd,
    concepto: pago.concepto,
  };
}

export function descargarComprobanteProfesional(pago, configEmpresa) {
  if (!pago) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 12;

  let y = renderProfessionalHeader(doc, W, MARGIN, 'Comprobante', configEmpresa);

  doc.setFontSize(10);
  doc.setTextColor(...C.textPrimary);
  
  // Cajas de información
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.divider);
  doc.rect(MARGIN, y, W - MARGIN * 2, 42, 'FD');

  let ty = y + 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', MARGIN + 4, ty);
  doc.setFont('helvetica', 'normal');
  doc.text(pago.fecha, MARGIN + 28, ty);

  ty += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Trabajador:', MARGIN + 4, ty);
  doc.setFont('helvetica', 'normal');
  doc.text(pago.empleadoNombre, MARGIN + 28, ty);

  ty += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Cédula/RIF:', MARGIN + 4, ty);
  doc.setFont('helvetica', 'normal');
  doc.text(pago.empleadoCedula, MARGIN + 28, ty);

  ty += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Cargo/Rol:', MARGIN + 4, ty);
  doc.setFont('helvetica', 'normal');
  doc.text(pago.empleadoRol, MARGIN + 28, ty);

  ty += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Proyecto:', MARGIN + 4, ty);
  doc.setFont('helvetica', 'normal');
  doc.text(pago.proyectoNombre, MARGIN + 28, ty);

  ty += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Concepto:', MARGIN + 4, ty);
  doc.setFont('helvetica', 'normal');
  const maxW = W - MARGIN * 2 - 32;
  const conceptoLines = doc.splitTextToSize(pago.concepto, maxW);
  doc.text(conceptoLines, MARGIN + 28, ty);

  y = ty + (conceptoLines.length * 4) + 6;

  // Montos
  doc.setFillColor(...C.headerBg);
  doc.rect(MARGIN, y, W - MARGIN * 2, 22, 'F');
  
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Tasa de Cambio Aplicada: ${pago.tasa_dia} Bs`, MARGIN + 4, y + 6);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTO PAGADO (USD):', MARGIN + 4, y + 15);
  doc.text(fmtUSD(pago.monto_usd), W / 2 + 5, y + 15);
  
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL (Bs):', MARGIN + 4, y + 20);
  doc.text(fmtBs(pago.montoBsCalculado), W / 2 + 5, y + 20);

  y += 45;

  // Línea de firma
  doc.setDrawColor(...C.textPrimary);
  doc.setLineWidth(0.3);
  const lineW = 60;
  const lineX = (W - lineW) / 2;
  doc.line(lineX, y, lineX + lineW, y);
  
  doc.setTextColor(...C.textPrimary);
  doc.setFontSize(9);
  doc.text('Firma del Trabajador', W / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text('(Recibí Conforme)', W / 2, y + 9, { align: 'center' });

  doc.save(`Comprobante_Nómina_${pago.empleadoNombre.replace(/\s+/g, '_')}_${pago.fecha.replace(/\//g, '-')}.pdf`);
}
