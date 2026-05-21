// pages/PresupuestosPage.jsx — Página del módulo de presupuestos
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toastSuccess, toastError, confirmAction } from '../utils/alerts';
import { useFetch } from '../hooks/useFetch';
import { useConfiguracion } from '../hooks/useConfiguracion';
import BudgetForm from '../components/BudgetForm';
import { generarPDF } from '../utils/pdfGenerator';

const ESTATUS_BADGE = {
  borrador:  'badge-borrador',
  enviado:   'badge-enviado',
  aprobado:  'badge-aprobado',
  rechazado: 'badge-rechazado',
  vencido:   'badge-vencido',
};

const ESTATUS_LABEL = {
  borrador:  'Borrador',
  enviado:   'Enviado',
  aprobado:  'Aprobado',
  rechazado: 'Rechazado',
  vencido:   'Vencido',
};

const fmtUSD = (n) => `$${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

export default function PresupuestosPage() {
  const [vista, setVista]               = useState('lista');  // 'lista' | 'nuevo'
  const [presupuestoEdit, setPresupuestoEdit] = useState(null);
  
  const { data: presData, loading: loadingLista, refetch } = useFetch('/api/presupuestos', {}, false);
  const presupuestos = presData?.data || [];
  
  const { configData: configEmpresa } = useConfiguracion();

  const [loadingAccion, setLoadingAccion] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const exportarPDF = async (p) => {
    toastSuccess('Generando PDF...');
    const formParams = { ...p, fecha_inicio: p.created_at };
    const totales = { lineasCalculadas: p.lineas || [], totalUSD: p.total_usd };
    try {
      await generarPDF(formParams, totales, null, configEmpresa);
    } catch (err) {
      toastError('Error generando PDF');
    }
  };


  useEffect(() => {
    if (vista === 'lista') refetch(true);
  }, [vista]);

  /* ── Cambiar estatus ── */
  const cambiarEstatus = async (id, nuevoEstatus) => {
    setLoadingAccion(id);
    try {
      const { data } = await api.patch(`/api/presupuestos/${id}/estatus`, { estatus: nuevoEstatus });
      if (data.success) {
        const msg = data.proyecto_creado
          ? `Aprobado. Proyecto "${data.proyecto_creado.nombre_proyecto}" creado automáticamente en Proyectos.`
          : `Estatus actualizado a "${nuevoEstatus}".`;
        toastSuccess(msg);
        refetch(true);
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al actualizar estatus');
    } finally {
      setLoadingAccion(null);
    }
  };

  const editarPresupuesto = async (id) => {
    try {
      const { data } = await api.get(`/api/presupuestos/${id}`);
      if (data.success) {
        setPresupuestoEdit(data.data);
        setVista('nuevo');
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al cargar presupuesto');
    }
  };

  const eliminarPresupuesto = async (id) => {
    const isConfirmed = await confirmAction('¿Eliminar presupuesto?', 'Esta acción no se puede deshacer.');
    if (!isConfirmed) return;
    try {
      const { data } = await api.delete(`/api/presupuestos/${id}`);
      if (data.success) {
        toastSuccess('Presupuesto eliminado correctamente.');
        refetch(true);
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al eliminar');
    }
  };

  // ── Vista: Nuevo Presupuesto ────────────────────────────────────────
  if (vista === 'nuevo') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setVista('lista'); setPresupuestoEdit(null); }}>
            ← Volver
          </button>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>{presupuestoEdit ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h2>
            <p>Complete los datos del cliente y las líneas del presupuesto.</p>
          </div>
        </div>
        <BudgetForm 
          presupuestoEdit={presupuestoEdit} 
          onCancel={() => { setVista('lista'); setPresupuestoEdit(null); }} 
        />
      </div>
    );
  }

  // ── Vista: Lista de Presupuestos ────────────────────────────────────
  const stats = {
    total:      presupuestos.length,
    aprobados:  presupuestos.filter(p => p.estatus === 'aprobado').length,
    pendientes: presupuestos.filter(p => ['borrador','enviado'].includes(p.estatus)).length,
  };

  const termBusq = busqueda.toLowerCase();
  const presFiltrados = busqueda
    ? presupuestos.filter(p =>
        (p.numero_presupuesto && p.numero_presupuesto.toLowerCase().includes(termBusq)) ||
        (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(termBusq)) ||
        (p.proyecto_descripcion && p.proyecto_descripcion.toLowerCase().includes(termBusq))
      )
    : presupuestos;

  return (
    <div>


      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>Presupuestos</h2>
          <p>Gestiona y genera presupuestos para tus clientes.</p>
        </div>
        <button
          id="btn-nuevo-presupuesto"
          className="btn btn-primary"
          onClick={() => { setVista('nuevo'); setPresupuestoEdit(null); }}
        >
          + Nuevo Presupuesto
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{stats.total}</div>
            <div className="stat-label">Total Presupuestos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats.aprobados}</div>
            <div className="stat-label">Aprobados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-gold)' }}>{stats.pendientes}</div>
            <div className="stat-label">Pendientes</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Historial de Presupuestos</div>
            <div className="card-subtitle">{presFiltrados.length} registros encontrados</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 32, fontSize: 13, padding: '7px 10px 7px 32px', width: 220 }}
                placeholder="Buscar por cliente, N° o proyecto..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => refetch(false)} disabled={loadingLista}>
              {loadingLista ? <span className="spinner" /> : '↺'} Actualizar
            </button>
          </div>
        </div>

        {loadingLista ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : presFiltrados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
            </div>
            <h3>{busqueda ? 'No hay resultados para tu búsqueda' : 'Sin presupuestos aún'}</h3>
            <p>{busqueda ? 'Intenta con otro término.' : 'Crea tu primer presupuesto con el botón de arriba.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="list-table">
              <thead>
                <tr>
                  <th>N° Presupuesto</th>
                  <th>Cliente</th>
                  <th className="hide-on-mobile">Proyecto</th>
                  <th>Total USD</th>
                  <th className="hide-on-mobile">Tasa</th>
                  <th className="hide-on-mobile">Estatus</th>
                  <th className="hide-on-mobile">Fecha</th>
                  <th className="hide-on-mobile" style={{ textAlign: 'center' }}>Acciones</th>
                  <th className="show-on-mobile" style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {presFiltrados.map(p => (
                  <React.Fragment key={p.id}>
                    <tr className="table-row-clickable" onClick={() => toggleExpand(p.id)}>
                      <td data-label="N° Presupuesto">
                        <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontWeight: 600 }}>
                          {p.numero_presupuesto}
                        </span>
                      </td>
                      <td data-label="Cliente">
                        <div style={{ fontWeight: 600 }}>{p.cliente_nombre || '—'}</div>
                        {p.cliente_rif && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.cliente_rif}</div>
                        )}
                      </td>
                      <td data-label="Proyecto" className="hide-on-mobile" style={{ color: 'var(--text-secondary)', maxWidth: 200 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.proyecto_descripcion || '—'}
                        </div>
                      </td>
                      <td data-label="Total USD" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {fmtUSD(p.total_usd)}
                      </td>
                      <td data-label="Tasa" className="hide-on-mobile" style={{ color: 'var(--accent-gold)', fontSize: 13 }}>
                        {p.tasa_cambio_usd_bs} Bs
                      </td>
                      <td data-label="Estatus" className="hide-on-mobile">
                        <span className={`badge ${ESTATUS_BADGE[p.estatus] || 'badge-borrador'}`}>
                          {ESTATUS_LABEL[p.estatus] || p.estatus}
                        </span>
                      </td>
                      <td data-label="Fecha" className="hide-on-mobile" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(p.created_at).toLocaleDateString('es-VE')}
                      </td>
                      {/* ── Acciones de Workflow ── */}
                      <td data-label="Acciones" className="hide-on-mobile" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => editarPresupuesto(p.id)}
                            style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px' }}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => exportarPDF(p)}
                            style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', color: 'var(--accent-cyan)' }}
                          >
                            PDF
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => eliminarPresupuesto(p.id)}
                            style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', color: 'var(--accent-red)' }}
                          >
                            Eliminar
                          </button>
                          {(p.estatus === 'borrador' || p.estatus === 'enviado') && (
                            <button
                              className="btn btn-success btn-sm"
                              title="Aprobar y crear Proyecto automáticamente"
                              disabled={loadingAccion === p.id}
                              onClick={() => cambiarEstatus(p.id, 'aprobado')}
                              style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px' }}
                            >
                              {loadingAccion === p.id
                                ? <span className="spinner" style={{ width: 14, height: 14 }} />
                                : 'Aprobar'}
                            </button>
                          )}
                          {p.estatus === 'aprobado' && (
                            <span style={{
                              fontSize: 12, color: 'var(--accent-green)', fontWeight: 600,
                              padding: '4px 8px', background: 'rgba(16,185,129,0.1)',
                              borderRadius: 'var(--radius-md)',
                            }}>
                              Proyecto creado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="show-on-mobile" style={{ textAlign: 'right' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: expandedId === p.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </td>
                    </tr>
                    
                    {/* Fila expandible (solo móvil) */}
                    <tr className={`expandable-content ${expandedId === p.id ? 'expanded' : ''}`}>
                      <td colSpan="10" style={{ padding: 0, border: 'none' }}>
                        <div className="expandable-details">
                          <div className="detail-item">
                            <span className="detail-label">Proyecto</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{p.proyecto_descripcion || '—'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Tasa</span>
                            <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{p.tasa_cambio_usd_bs} Bs</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Estatus</span>
                            <span className={`badge ${ESTATUS_BADGE[p.estatus] || 'badge-borrador'}`}>
                              {ESTATUS_LABEL[p.estatus] || p.estatus}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Fecha</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{new Date(p.created_at).toLocaleDateString('es-VE')}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => editarPresupuesto(p.id)} style={{ flex: 1, justifyContent: 'center' }}>Editar</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => exportarPDF(p)} style={{ flex: 1, justifyContent: 'center', color: 'var(--accent-cyan)' }}>PDF</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => eliminarPresupuesto(p.id)} style={{ flex: 1, justifyContent: 'center', color: 'var(--accent-red)' }}>Eliminar</button>
                            {(p.estatus === 'borrador' || p.estatus === 'enviado') && (
                              <button className="btn btn-success btn-sm" disabled={loadingAccion === p.id} onClick={() => cambiarEstatus(p.id, 'aprobado')} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                                {loadingAccion === p.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Aprobar Presupuesto'}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
