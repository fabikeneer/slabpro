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
