// utils/proyectoPDF.js — Generador de Ficha de Proyecto PDF (Diseño Profesional Borcelle)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const C = {
  black:       [30, 30, 30],
  gold:        [254, 183, 44],
  lightGold:   [251, 202, 91],
  textPrimary: [40, 40, 40],
  textMuted:   [100, 100, 100],
  white:       [255, 255, 255],
  line:        [220, 220, 220]
};

const fmtUSD = (n) => `$ ${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBs  = (n) => `Bs. ${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
};

export function generarFichaProyectoPDF({ proyecto, pagos, resumen, configEmpresa }) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const M    = 20;   // Margen
  let y      = M;

  // ── 1. Formas Decorativas Superiores (Inspiración Borcelle) ──
  // Triángulo negro fondo
  doc.setFillColor(...C.black);
  doc.triangle(W - 130, 0, W, 65, W, 0, 'F');
  // Triángulo dorado principal
  doc.setFillColor(...C.gold);
  doc.triangle(W - 120, 0, W, 50, W, 0, 'F');
  // Pequeño acento naranja/dorado oscuro
  doc.setFillColor(230, 150, 20);
  doc.triangle(W - 70, 0, W, 35, W, 0, 'F');

  // ── 2. Logo e Información de Empresa (Top Left) ──
  if (configEmpresa?.logo_data) {
    try {
      doc.addImage(configEmpresa.logo_data, 'PNG', M, 15, 35, 20, undefined, 'FAST');
    } catch (e) {
      console.warn('Error renderizando logo:', e);
      doc.setTextColor(...C.textPrimary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text((configEmpresa?.nombre_empresa || 'Marmolería Maracay').toUpperCase(), M, 25);
    }
  } else {
    doc.setTextColor(...C.textPrimary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text((configEmpresa?.nombre_empresa || 'Marmolería Maracay').toUpperCase(), M, 25);
  }

  // Nombre de Empresa (al lado del logo si hay espacio)
  doc.setTextColor(...C.textPrimary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const nombreEmpresa = configEmpresa?.nombre_empresa || 'Marmolería Maracay';
  doc.text(nombreEmpresa, M + 40, 22);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text(`RIF: ${configEmpresa?.rif || 'J-12345678-9'}`, M + 40, 27);
  doc.text(configEmpresa?.telefono || '0412-0000000', M + 40, 32);

  // ── 3. Título Principal ──
  y = 65;
  doc.setTextColor(...C.black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('Ficha de Proyecto', M, y);

  // ── 4. Información del Cliente y Proyecto ──
  y += 15;
  doc.setFontSize(10);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('Cliente:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textPrimary);
  doc.text(proyecto.nombre_cliente || '—', M + 18, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('Fecha:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textPrimary);
  doc.text(fmtFecha(proyecto.fecha_inicio), M + 18, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('Estatus:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textPrimary);
  doc.text(proyecto.estatus || '—', M + 18, y);

  y += 6;
  if (proyecto.descripcion_obra) {
    doc.setFont('helvetica', 'bold');
    doc.text('Obra:', M, y);
    doc.setFont('helvetica', 'normal');
    const obraLines = doc.splitTextToSize(proyecto.descripcion_obra, W - M * 2 - 18);
    doc.text(obraLines, M + 18, y);
    y += obraLines.length * 5;
  }

  y += 15;

  // ── 5. Tabla Minimalista (Estilo Borcelle) ──
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Pagos Registrados', M, y);
  doc.text('Monto', W - M - 20, y);
  
  // Línea divisoria gruesa
  y += 3;
  doc.setDrawColor(...C.black);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);

  if (pagos && pagos.length > 0) {
    const tableData = pagos.map(p => [
      {
        content: `Fecha: ${fmtFecha(p.fecha_pago)}\nConcepto: ${p.concepto || '—'}\nTrabajador: ${p.trabajador || '—'}`,
        styles: { cellPadding: { top: 6, bottom: 6 } }
      },
      {
        content: fmtUSD(p.monto_usd),
        styles: { halign: 'right', fontStyle: 'bold', fontSize: 14, valign: 'middle' }
      }
    ]);

    autoTable(doc, {
      startY: y + 2,
      body: tableData,
      margin: { left: M, right: M },
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: C.textPrimary,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40 },
      },
      didDrawCell: (data) => {
        // Dibujar línea sutil debajo de cada fila
        if (data.row.index < tableData.length - 1 && data.column.index === 0) {
          doc.setDrawColor(...C.line);
          doc.setLineWidth(0.2);
          doc.line(M, data.cell.y + data.cell.height, W - M, data.cell.y + data.cell.height);
        }
      }
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    y += 15;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...C.textMuted);
    doc.text('No hay pagos registrados para este proyecto.', W / 2, y, { align: 'center' });
    y += 15;
  }

  // ── 6. Totales ──
  // Línea divisoria gruesa
  doc.setDrawColor(...C.black);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.black);
  doc.text('Presupuestado', W - M - 60, y, { align: 'right' });
  doc.setFontSize(18);
  doc.text(fmtUSD(proyecto.monto_usd), W - M, y, { align: 'right' });

  y += 10;
  doc.setFontSize(14);
  doc.text('Costo Acumulado', W - M - 60, y, { align: 'right' });
  doc.setFontSize(18);
  doc.text(fmtUSD(resumen?.costo_mano_obra_usd || 0), W - M, y, { align: 'right' });

  // ── 7. Firma ──
  y += 35;
  // Solo dibujar firma si hay espacio en la página
  if (y > H - 60) {
    doc.addPage();
    y = M + 20;
  }
  
  // Línea de firma
  doc.setDrawColor(...C.black);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + 60, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...C.black);
  doc.text(configEmpresa?.nombre_empresa || 'Marmolería Maracay', M, y);

  // ── 8. Footer (Inspiración Borcelle) ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Formas decorativas inferiores
    const footerY = H - 35;
    
    // Franja dorada fina encima del footer
    doc.setFillColor(...C.gold);
    doc.rect(0, footerY - 2, W, 2, 'F');
    
    // Fondo oscuro del footer
    doc.setFillColor(...C.black);
    doc.rect(0, footerY, W, 35, 'F');

    // Triángulo dorado abajo derecha
    doc.setFillColor(...C.gold);
    doc.triangle(W - 80, H, W, footerY - 15, W, H, 'F');
    doc.setFillColor(230, 150, 20);
    doc.triangle(W - 40, H, W, footerY + 5, W, H, 'F');

    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Información de contacto', M, footerY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const emailInfo = configEmpresa?.email || 'contacto@empresa.com';
    const telInfo = configEmpresa?.telefono || '0412-0000000';
    const dirInfo = configEmpresa?.direccion || 'Maracay, Aragua';
    
    doc.text(`Email: ${emailInfo}`, M, footerY + 18);
    doc.text(`Teléfono: ${telInfo}`, M + 60, footerY + 18);
    doc.text(`Dirección: ${dirInfo}`, M, footerY + 24);
  }

  // ── Guardar ──
  const safe = (proyecto.nombre_proyecto || 'Proyecto').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').trim();
  doc.save(`Ficha_Proyecto_${safe}_${Date.now()}.pdf`);
}
