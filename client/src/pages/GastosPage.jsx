import { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toastSuccess, toastError, confirmAction } from '../utils/alerts';
import { useFetch } from '../hooks/useFetch';
import { useConfiguracion } from '../hooks/useConfiguracion';

registerLocale('es', es);

const CATEGORIAS = ['Insumos', 'Fletes', 'Pagos Externos', 'Nomina', 'Otros'];
const CAT_LABELS  = { 'Nomina': 'Nómina' }; // display override
const catLabel = (c) => CAT_LABELS[c] || c;
const CAT_COLORS = {
  'Insumos': '#06b6d4',
  'Fletes': '#f59e0b',
  'Pagos Externos': '#8b5cf6',
  'Nomina': '#10b981',
  'Otros': '#94a3b8',
};

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
const fmtBs  = (n) => `Bs. ${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
// Extrae DD/MM/YYYY directo del string ISO sin depender de timezone del navegador
// Funciona con '2026-05-03' y con '2026-05-03T04:00:00.000Z'
const fmtDate = (d) => {
  if (!d) return '-';
  const s = typeof d === 'string' ? d : d.toISOString?.() ?? String(d);
  // Tomar los primeros 10 caracteres: YYYY-MM-DD
  const [yyyy, mm, dd] = s.slice(0, 10).split('-');
  if (!yyyy || !mm || !dd) return '-';
  return `${dd}/${mm}/${yyyy}`;
};

const PERIODOS = [
  { label: 'Esta semana',  value: 'semana' },
  { label: 'Este mes',     value: 'mes' },
  { label: 'Este año',     value: 'anio' },
  { label: 'Personalizado',value: 'custom' },
];

function getRange(periodo) {
  const hoy = new Date();
  // Estabilizar el tiempo para que la caché no cambie en cada render por los milisegundos
  hoy.setHours(0, 0, 0, 0);
  
  let inicio = new Date(hoy);
  let fin = new Date(hoy);
  fin.setHours(23, 59, 59, 999);
  
  if (periodo === 'semana') {
    inicio.setDate(hoy.getDate() - hoy.getDay());
  } else if (periodo === 'mes') {
    inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  } else if (periodo === 'anio') {
    inicio = new Date(hoy.getFullYear(), 0, 1);
  } else {
    inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }
  
  inicio.setHours(0, 0, 0, 0);
  return { inicio, fin };
}

export default function GastosPage() {
  const { configData: configEmpresa } = useConfiguracion();

  const [tab, setTab] = useState('historial');
  const [gastos, setGastos] = useState([]);
  const [totalesCat, setTotalesCat] = useState([]);
  const [totalGeneral, setTotalGeneral] = useState({ total_usd: 0, total_bs: 0 });
  const [proyectos, setProyectos] = useState([]);
  const [tasa, setTasa] = useState(0);
  const [busqueda, setBusqueda] = useState('');

  // Filtros
  const [filtroCat, setFiltroCat] = useState('Todos');
  const [periodo, setPeriodo] = useState('mes');
  const [customInicio, setCustomInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [customFin, setCustomFin] = useState(new Date());

  // Formulario
  const FORM_INIT = { categoria: 'Insumos', descripcion: '', monto_usd: '', tasa_usdt: '', id_proyecto: '', fecha_gasto: new Date() };
  const [form, setForm] = useState(FORM_INIT);
  const [editId, setEditId] = useState(null);
  const [savingForm, setSavingForm] = useState(false);

  const rangeActual = periodo === 'custom'
    ? { 
        inicio: new Date(new Date(customInicio).setHours(0, 0, 0, 0)), 
        fin: new Date(new Date(customFin).setHours(23, 59, 59, 999)) 
      }
    : getRange(periodo);

  const { data: gastosData, loading, refetch: refetchGastos } = useFetch('/api/gastos', {
    categoria: filtroCat !== 'Todos' ? filtroCat : undefined,
    inicio: rangeActual.inicio.toISOString(),
    fin:    rangeActual.fin.toISOString(),
    limit: 100,
  });

  useEffect(() => {
    if (gastosData) {
      setGastos(gastosData.gastos || []);
      setTotalesCat(gastosData.totales_por_categoria || []);
      setTotalGeneral(gastosData.total_general || { total_usd: 0, total_bs: 0 });
    }
  }, [gastosData]);

  const gastosFiltrados = gastos.filter(g => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (
      (g.descripcion && g.descripcion.toLowerCase().includes(term)) ||
      (g.proyecto_nombre && g.proyecto_nombre.toLowerCase().includes(term))
    );
  });
  const fetchTasa = async () => {
    try {
      const { data } = await api.get('/api/exchange-rate');
      if (data.rate) {
        setTasa(data.rate);
        setForm(f => ({ ...f, tasa_usdt: data.rate }));
      }
    } catch (e) {}
  };

  useEffect(() => {
    api.get('/api/nomina/proyectos').then(r => setProyectos(r.data)).catch(() => {});
    fetchTasa();
  }, []);

  // Ya no necesitamos useEffect para fetchGastos porque useFetch se actualiza al cambiar los params

  const guardarGasto = async (e) => {
    e.preventDefault();
    if (!form.descripcion || !form.monto_usd || !form.categoria) {
      toastError('Categoría, descripción y monto son obligatorios');
      return;
    }
    setSavingForm(true);
    try {
      const payload = {
        ...form,
        fecha_gasto: form.fecha_gasto instanceof Date
          ? form.fecha_gasto.toISOString().split('T')[0]
          : form.fecha_gasto,
      };
      if (editId) {
        await api.put(`/api/gastos/${editId}`, payload);
      } else {
        await api.post('/api/gastos', payload);
      }
      setForm({ ...FORM_INIT, tasa_usdt: tasa });
      setEditId(null);
      setTab('historial');
      toastSuccess(editId ? 'Gasto actualizado' : 'Gasto registrado');
      // Actualización en segundo plano sin spinner para mantener la fluidez de la UI
      refetchGastos(true);
    } catch (er) {
      toastError(er.response?.data?.error || er.message || 'Error al guardar el gasto');
    } finally {
      setSavingForm(false);
    }
  };

  const editarGasto = (g) => {
    setForm({
      categoria: g.categoria,
      descripcion: g.descripcion,
      monto_usd: g.monto_usd,
      tasa_usdt: g.tasa_usdt,
      id_proyecto: g.id_proyecto || '',
      fecha_gasto: (() => { const p = new Date(g.fecha_gasto); return isNaN(p.getTime()) ? new Date() : p; })(),
    });
    setEditId(g.id_gasto);
    setTab('registrar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarGasto = async (id) => {
    const isConfirmed = await confirmAction('¿Eliminar este gasto?', 'Esta acción no se puede deshacer.');
    if (!isConfirmed) return;
    try {
      await api.delete(`/api/gastos/${id}`);
      toastSuccess('Gasto eliminado');
      // Actualización en segundo plano sin spinner
      refetchGastos(true);
    } catch (er) {
      toastError(er.response?.data?.error || er.message || 'Error al eliminar el gasto');
    }
  };

  const exportarPDF = async () => {
    try {
      const { data } = await api.get('/api/gastos/reporte', {
        params: {
          inicio: rangeActual.inicio.toISOString(),
          fin:    rangeActual.fin.toISOString(),
          categoria: filtroCat !== 'Todos' ? filtroCat : undefined,
        }
      });

      // ── Paleta idéntica al diseño de Nómina / Presupuesto ─────────────────
      const C = {
        headerBg:   [26, 18, 4],
        accentGold: [254, 183, 44],
        textPrimary:[26, 18, 4],
        textMuted:  [92, 79, 55],
        white:      [255, 255, 255],
        divider:    [237, 232, 220],
        rowAlt:     [255, 251, 240],
      };

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const MARGIN = 14;

      // ── ENCABEZADO ────────────────────────────────────────────────────────
      const nombreEmpresa = configEmpresa?.nombre_empresa || 'Marmolería Maracay';
      const logoX = MARGIN;
      const logoY = 12;
      const logoW = 38;
      const logoH = 22;
      const textX = logoX + logoW + 6; // texto a la derecha del logo

      if (configEmpresa?.logo_data) {
        try {
          doc.addImage(configEmpresa.logo_data, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
        } catch {
          doc.setTextColor(...C.textPrimary);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.text(nombreEmpresa.toUpperCase(), logoX, logoY + 12);
        }
      } else {
        doc.setTextColor(...C.textPrimary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(nombreEmpresa.toUpperCase(), logoX, logoY + 12);
      }

      // Nombre, RIF y teléfono a la derecha del logo
      doc.setTextColor(...C.textPrimary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(nombreEmpresa, textX, logoY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.textMuted);
      doc.text(`RIF: ${configEmpresa?.rif || 'J-12345678-9'}`, textX, logoY + 13);
      doc.text(configEmpresa?.telefono || '0412-0000000', textX, logoY + 19);

      // Título alineado a la derecha
      doc.setTextColor(...C.textPrimary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('REPORTE DE GASTOS', W - MARGIN, 26, { align: 'right' });

      let y = 44;

      // ── INFO DEL REPORTE ──────────────────────────────────────────────────
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
      doc.text(
        `${rangeActual.inicio.toLocaleDateString('es-VE')} → ${rangeActual.fin.toLocaleDateString('es-VE')}`,
        MARGIN + 18, y
      );

      if (filtroCat !== 'Todos') {
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Categoría:', MARGIN, y);
        doc.setFont('helvetica', 'normal');
        doc.text(filtroCat, MARGIN + 22, y);
      }

      y += 10;

      // ── TABLA DE GASTOS ───────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.accentGold);
      doc.setFontSize(8);
      doc.text('DETALLE DE GASTOS', MARGIN, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['FECHA', 'CATEGORÍA', 'DESCRIPCIÓN', 'MONTO (USD)', 'MONTO (Bs)']],
        body: data.gastos.map(g => [
          fmtDate(g.fecha_gasto),
          g.categoria,
          g.descripcion.length > 52 ? g.descripcion.slice(0, 49) + '…' : g.descripcion,
          fmtUSD(g.monto_usd),
          fmtBs(g.monto_bs),
        ]),
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 4,
          textColor: C.textPrimary,
          lineColor: C.divider,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: C.headerBg,
          textColor: C.white,
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 28 },
          3: { halign: 'right', fontStyle: 'bold' },
          4: { halign: 'right', textColor: C.textMuted },
        },
      });

      y = doc.lastAutoTable.finalY + 10;

      // ── RESUMEN POR CATEGORÍA ─────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.accentGold);
      doc.setFontSize(8);
      doc.text('RESUMEN POR CATEGORÍA', MARGIN, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['CATEGORÍA', 'CANTIDAD', 'TOTAL (USD)', 'TOTAL (Bs)']],
        body: data.subtotales.map(s => [
          s.categoria, s.cantidad, fmtUSD(s.total_usd), fmtBs(s.total_bs)
        ]),
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 4,
          textColor: C.textPrimary,
          lineColor: C.divider,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: C.headerBg,
          textColor: C.white,
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right', fontStyle: 'bold' },
          3: { halign: 'right', textColor: C.textMuted },
        },
      });

      y = doc.lastAutoTable.finalY + 12;

      // ── TOTAL GENERAL (barra negra idéntica al presupuesto) ───────────────
      doc.setFillColor(...C.headerBg);
      doc.rect(MARGIN, y, W - MARGIN * 2, 14, 'F');

      doc.setFontSize(11);
      doc.setTextColor(...C.white);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL GENERAL DE GASTOS', MARGIN + 4, y + 9);
      doc.text(
        `${fmtUSD(data.total_general.total_usd)}  /  ${fmtBs(data.total_general.total_bs)}`,
        W - MARGIN - 4, y + 9, { align: 'right' }
      );

      // ── FOOTER en todas las páginas ───────────────────────────────────────
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerY = H - 15;

        doc.setDrawColor(...C.divider);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, footerY - 5, W - MARGIN, footerY - 5);

        doc.setFontSize(8);
        doc.setTextColor(...C.textMuted);
        const emailInfo = configEmpresa?.email    || 'contacto@empresa.com';
        const telInfo   = configEmpresa?.telefono || '0412-0000000';
        const dirInfo   = configEmpresa?.direccion|| 'Maracay, Aragua';
        doc.text(`${emailInfo}  |  ${telInfo}  |  ${dirInfo}`, W - MARGIN, footerY, { align: 'right' });

        doc.setFillColor(...C.textPrimary);
        doc.rect(0, footerY + 5, W, 10, 'F');

        doc.setFontSize(7.5);
        doc.setTextColor(...C.white);
        doc.text(`Página ${i} de ${pageCount}`, MARGIN, footerY + 11);
        doc.text(`SlabPro © ${new Date().getFullYear()}`, W - MARGIN, footerY + 11, { align: 'right' });
      }

      const per = PERIODOS.find(p => p.value === periodo)?.label || 'Personalizado';
      doc.save(`Reporte_Gastos_${per.replace(/\s/g, '_')}_${new Date().toLocaleDateString('es-VE').replace(/\//g, '-')}.pdf`);
      toastSuccess('PDF generado con éxito');
    } catch (er) {
      console.error(er);
      toastError('Error al generar el PDF de gastos.');
    }
  };

  const montoBsPreview = (parseFloat(form.monto_usd) || 0) * (parseFloat(form.tasa_usdt) || 0);

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .gasto-row { animation: fadeUp 0.2s ease; }
        .cat-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; }
      `}</style>

      {/* Page Header */}
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Gastos
          </h2>
          <p>Control centralizado de todos los egresos de la empresa.</p>
        </div>
        <div style={{ display:'flex', gap:8, background:'var(--bg-card)', padding:6, borderRadius:'var(--radius-lg)', border:'1px solid var(--border)' }}>
          {['historial','registrar'].map(t => (
            <button key={t} onClick={() => { setTab(t); if (t==='registrar' && !editId) { setForm({...FORM_INIT, tasa_usdt:tasa}); } }}
              style={{ padding:'8px 18px', borderRadius:'var(--radius-md)', border:'none', fontWeight:600, cursor:'pointer', transition:'all 0.2s',
                background: tab===t ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: tab===t ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
              {t === 'historial' ? (
                <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight: 6}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Historial</>
              ) : (
                <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight: 6}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Añadir Gasto</>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid" style={{ marginBottom:24 }}>
        <div className="stat-card" style={{ borderLeft:'3px solid var(--accent-blue)' }}>
          <div className="stat-icon" style={{ background:'rgba(59,130,246,0.1)' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{color: 'var(--accent-blue)'}}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div>
            <div className="stat-value" style={{ color:'var(--accent-blue)', fontSize:20 }}>{fmtUSD(totalGeneral.total_usd)}</div>
            <div className="stat-label">Total del Período (USD)</div>
          </div>
        </div>
        {totalesCat.slice(0,3).map(t => (
          <div key={t.categoria} className="stat-card" style={{ borderLeft:`3px solid ${CAT_COLORS[t.categoria]||'#94a3b8'}` }}>
            <div className="stat-icon" style={{ background:`${CAT_COLORS[t.categoria]||'#94a3b8'}22` }}>
              {t.categoria === 'Nomina' ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              ) : t.categoria === 'Insumos' ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              ) : t.categoria === 'Fletes' ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
              ) : t.categoria === 'Pagos Externos' ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              )}
            </div>
            <div>
              <div className="stat-value" style={{ color: CAT_COLORS[t.categoria]||'#94a3b8', fontSize:18 }}>{fmtUSD(t.total_usd)}</div>
              <div className="stat-label">{t.categoria} ({t.cantidad} reg.)</div>
            </div>
          </div>
        ))}
      </div>

      {/* TAB: REGISTRAR */}
      {tab === 'registrar' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editId ? (
                  <><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Editar Gasto</>
                ) : (
                  <><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Registrar Nuevo Gasto</>
                )}
              </h3>
              <div className="card-subtitle">Los gastos de nómina se sincronizan automáticamente desde el módulo de Nómina.</div>
            </div>
            {editId && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(null); setForm({...FORM_INIT, tasa_usdt:tasa}); }}>
                Cancelar edición
              </button>
            )}
          </div>
          <form onSubmit={guardarGasto} className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Categoría <span className="required">*</span></label>
              <select className="form-select" value={form.categoria} onChange={e => setForm({...form, categoria:e.target.value})}>
                {CATEGORIAS.filter(c => c !== 'Nomina').map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Proyecto (Opcional)</label>
              <select className="form-select" value={form.id_proyecto} onChange={e => setForm({...form, id_proyecto:e.target.value})}>
                <option value="">Sin proyecto</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label">Descripción <span className="required">*</span></label>
              <input className="form-input" placeholder="Ej: Compra de silicón y sellador, Flete Caracas-Valencia..." value={form.descripcion} onChange={e => setForm({...form, descripcion:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Monto (USD) <span className="required">*</span></label>
              <input type="number" step="0.01" className="form-input" placeholder="0.00" value={form.monto_usd} onChange={e => setForm({...form, monto_usd:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Tasa USDT (Bs/USD)</label>
              <input type="number" step="0.01" className="form-input" value={form.tasa_usdt} onChange={e => setForm({...form, tasa_usdt:e.target.value})} />
              <span style={{ fontSize:11, color:'var(--accent-green)', marginTop:2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg> Auto-sincronizada con Binance P2P
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha del Gasto</label>
              <DatePicker selected={form.fecha_gasto instanceof Date ? form.fecha_gasto : new Date()} onChange={d => setForm({...form, fecha_gasto:d})} className="form-input" dateFormat="dd/MM/yyyy" locale="es" />
            </div>
            <div className="form-group" style={{ justifyContent:'center' }}>
              <div style={{ padding:'12px 16px', background:'rgba(16,185,129,0.1)', borderRadius:8, border:'1px solid rgba(16,185,129,0.2)' }}>
                <span style={{ display:'block', fontSize:12, color:'var(--text-secondary)' }}>Equivalente en Bs</span>
                <span style={{ fontSize:22, fontWeight:800, color:'var(--accent-green)' }}>{fmtBs(montoBsPreview)}</span>
              </div>
            </div>
            <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end', marginTop:8 }}>
              <button type="submit" className="btn btn-primary" disabled={savingForm}>
                {savingForm ? <span className="spinner" /> : (editId ? 'Actualizar Gasto' : 'Guardar Gasto')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: HISTORIAL */}
      {tab === 'historial' && (
        <>
          {/* Filtros */}
          <div className="card" style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div className="form-group">
              <label className="form-label">Período</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {PERIODOS.map(p => (
                  <button key={p.value} onClick={() => setPeriodo(p.value)}
                    style={{ padding:'7px 14px', borderRadius:'var(--radius-sm)', border:`1px solid ${periodo===p.value?'var(--accent-blue)':'var(--border)'}`,
                      background: periodo===p.value ? 'rgba(59,130,246,0.12)' : 'var(--bg-input)',
                      color: periodo===p.value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.2s' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {periodo === 'custom' && (
              <>
                <div className="form-group">
                  <label className="form-label">Desde</label>
                  <DatePicker selected={customInicio} onChange={setCustomInicio} className="form-input" dateFormat="dd/MM/yyyy" locale="es" />
                </div>
                <div className="form-group">
                  <label className="form-label">Hasta</label>
                  <DatePicker selected={customFin} onChange={setCustomFin} className="form-input" dateFormat="dd/MM/yyyy" locale="es" />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-select" value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
                <option value="Todos">Todos</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Buscar Gasto</label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" className="form-input" style={{ paddingLeft: 34 }} placeholder="Descripción o proyecto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
            </div>
            <button onClick={exportarPDF} className="btn btn-primary" style={{ padding:'11px 20px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Exportar PDF
            </button>
          </div>

          {/* Resumen por categoría */}
          {totalesCat.length > 0 && (
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', margin:'16px 0' }}>
              {totalesCat.map(t => (
                <div key={t.categoria} style={{ padding:'10px 16px', background:'var(--bg-card)', border:`1px solid ${CAT_COLORS[t.categoria]||'#94a3b8'}44`, borderRadius:'var(--radius-md)', minWidth:150 }}>
                  <span style={{ display:'block', fontSize:11, color: CAT_COLORS[t.categoria]||'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{catLabel(t.categoria)}</span>
                  <span style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>{fmtUSD(t.total_usd)}</span>
                  <span style={{ display:'block', fontSize:11, color:'var(--text-muted)' }}>{t.cantidad} registros</span>
                </div>
              ))}
              <div style={{ padding:'10px 16px', background:'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(6,182,212,0.08))', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'var(--radius-md)', minWidth:150 }}>
                <span style={{ display:'block', fontSize:11, color:'var(--accent-blue)', fontWeight:700, textTransform:'uppercase' }}>TOTAL GENERAL</span>
                <span style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>{fmtUSD(totalGeneral.total_usd)}</span>
                {/* Si total_bs es 0 (registros históricos sin tasa), usar tasa actual de Binance */}
                <span style={{ display:'block', fontSize:11, color:'var(--accent-gold)' }}>
                  {fmtBs(parseFloat(totalGeneral.total_bs) > 0
                    ? totalGeneral.total_bs
                    : parseFloat(totalGeneral.total_usd) * tasa)}
                </span>
              </div>
            </div>
          )}

          {/* Tabla historial */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding:40, textAlign:'center' }}><span className="spinner" /></div>
            ) : gastosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <h3>{busqueda ? 'No hay resultados para tu búsqueda' : 'No hay gastos registrados'}</h3>
                <p>Los gastos aparecerán aquí automáticamente, o añade uno manual.</p>
              </div>
            ) : (
              <div className="lineas-table-wrapper" style={{ border:'none', borderRadius:0 }}>
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Categoría</th>
                      <th>Descripción</th>
                      <th>Proyecto</th>
                      <th style={{ textAlign:'right' }}>Monto USD</th>
                      <th style={{ textAlign:'right' }}>Monto Bs</th>
                      <th style={{ textAlign:'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosFiltrados.map(g => (
                      <tr key={g.id_gasto} className="gasto-row">
                        <td data-label="Fecha" style={{ whiteSpace:'nowrap', color:'var(--text-muted)', fontSize:13 }}>{fmtDate(g.fecha_gasto)}</td>
                        <td data-label="Categoría">
                          <span className="cat-badge" style={{ background:`${CAT_COLORS[g.categoria]||'#94a3b8'}22`, color: CAT_COLORS[g.categoria]||'#94a3b8' }}>
                            {catLabel(g.categoria)}
                          </span>
                        </td>
                        <td data-label="Descripción" style={{ maxWidth:280 }}>
                          <span style={{ color:'var(--text-primary)', fontSize:13 }}>{g.descripcion}</span>
                        </td>
                        <td data-label="Proyecto" style={{ color:'var(--text-muted)', fontSize:12 }}>{g.proyecto_nombre || '—'}</td>
                        <td data-label="Monto USD" style={{ textAlign:'right', fontWeight:700, color:'var(--text-primary)' }}>{fmtUSD(g.monto_usd)}</td>
                        {/* Si monto_bs es 0 (registro histórico), calcular con tasa actual */}
                        <td data-label="Monto Bs" style={{ textAlign:'right', color:'var(--accent-gold)', fontSize:12 }}>
                          {fmtBs(parseFloat(g.monto_bs) > 0 ? g.monto_bs : parseFloat(g.monto_usd) * tasa)}
                        </td>
                        <td data-label="Acciones" style={{ textAlign:'right' }}>
                          <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => editarGasto(g)} style={{ fontSize:12, padding:'4px 8px' }}>Editar</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => eliminarGasto(g.id_gasto)} style={{ color:'var(--accent-red)', fontSize:12, padding:'4px 8px' }}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
