import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PresupuestoTemplate from '../components/PresupuestoTemplate';

/**
 * Genera y descarga el PDF del presupuesto usando una plantilla HTML (PresupuestoTemplate).
 * @param {object} form    - Datos del formulario (hook useBudget)
 * @param {object} totales - Totales calculados (hook useBudget)
 * @param {object} guardado - Datos del presupuesto guardado (número correlativo, etc.)
 * @param {object} configEmpresa - Datos de la empresa
 */
export async function generarPDF(form, totales, guardado = null, configEmpresa = null) {
  return new Promise((resolve, reject) => {
    // 1. Crear contenedor temporal fuera de pantalla
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '820px'; // Ancho base de la plantilla A4
    document.body.appendChild(container);

    const root = createRoot(container);

    // 2. Renderizar el componente de React
    root.render(
      React.createElement(PresupuestoTemplate, {
        form,
        totales,
        guardado,
        configEmpresa
      })
    );

    // 3. Esperar un momento a que las fuentes/imágenes carguen y React se monte
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(container.firstChild, {
          scale: 4, // Escala superior para evitar texto borroso y mejor impresión
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png'); // Usar PNG en lugar de JPEG para texto y logotipos nítidos
        
        // Inicializar jsPDF (portrait A4)
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // Obtener dimensiones de la hoja A4
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calcular altura proporcional de la imagen
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Añadir la primera página
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Escalado automático: Añadir páginas si el contenido es más largo que una A4
        // (Aunque la plantilla intenta forzar un alto base, tablas grandes lo estirarán)
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        const numero = guardado?.numero_presupuesto || form.numero_presupuesto || 'BORRADOR';
        const filename = `Presupuesto_${numero}_${(form.cliente_nombre || 'Cliente').replace(/\s+/g, '_')}.pdf`;
        
        pdf.save(filename);
        resolve();
      } catch (error) {
        console.error('Error generando PDF con html2canvas:', error);
        reject(error);
      } finally {
        root.unmount();
        document.body.removeChild(container);
      }
    }, 800); // Dar suficiente tiempo de delay (800ms) para que todo re-renderice
  });
}
