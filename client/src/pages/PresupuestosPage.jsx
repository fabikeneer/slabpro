// pages/PresupuestosPage.jsx — Página del módulo de presupuestos
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useFetch } from '../hooks/useFetch';
import BudgetForm from '../components/BudgetForm';

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
  
  const [loadingAccion, setLoadingAccion] = useState(null); // id del presupuesto en acción
  const [toast, setToast]               = useState(null);

  const showToast = (msg, tipo = 'success') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (vista === 'lista') refetch(true);
  }, [vista]);

  /* ── Cambiar estatus ── */
  const cambiarEstatus = async (id, nuevoEstatus) => {
    setLoadingAccion(id);
    try {
      const { data } = await axios.patch(`/api/presupuestos/${id}/estatus`, { estatus: nuevoEstatus });
      if (data.success) {
        const msg = data.proyecto_creado
          ? `Aprobado. Proyecto "${data.proyecto_creado.nombre_proyecto}" creado automáticamente en Proyectos.`
          : `Estatus actualizado a "${nuevoEstatus}".`;
        showToast(msg);
        refetch(true);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al actualizar estatus', 'error');
    } finally {
      setLoadingAccion(null);
    }
  };

  const editarPresupuesto = async (id) => {
    try {
      const { data } = await axios.get(`/api/presupuestos/${id}`);
      if (data.success) {
        setPresupuestoEdit(data.data);
        setVista('nuevo');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al cargar presupuesto', 'error');
    }
  };

  const eliminarPresupuesto = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este presupuesto? Esta acción no se puede deshacer.')) return;
    try {
      const { data } = await axios.delete(`/api/presupuestos/${id}`);
      if (data.success) {
        showToast('Presupuesto eliminado correctamente.');
        refetch(true);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al eliminar', 'error');
    }
  };

  // ── Vista: Nuevo Presupuesto ────────────────────────────────────────
  if (vista === 'nuevo') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 2000,
          background: toast.tipo === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          border: `1px solid ${toast.tipo === 'error' ? 'var(--accent-red)' : 'var(--accent-green)'}`,
          color: toast.tipo === 'error' ? 'var(--accent-red)' : 'var(--accent-green)',
          padding: '12px 20px', borderRadius: 'var(--radius-md)',
          fontWeight: 600, fontSize: 14,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.2s ease',
          maxWidth: 440,
          lineHeight: 1.5,
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
            <div className="card-subtitle">{presupuestos.length} registros encontrados</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => refetch(false)} disabled={loadingLista}>
            {loadingLista ? <span className="spinner" /> : '↺'} Actualizar
          </button>
        </div>

        {loadingLista ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : presupuestos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
            </div>
            <h3>Sin presupuestos aún</h3>
            <p>Crea tu primer presupuesto con el botón de arriba.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="list-table">
              <thead>
                <tr>
                  <th>N° Presupuesto</th>
                  <th>Cliente</th>
                  <th>Proyecto</th>
                  <th>Total USD</th>
                  <th>Tasa</th>
                  <th>Estatus</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {presupuestos.map(p => (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontWeight: 600 }}>
                        {p.numero_presupuesto}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.cliente_nombre || '—'}</div>
                      {p.cliente_rif && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.cliente_rif}</div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.proyecto_descripcion || '—'}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {fmtUSD(p.total_usd)}
                    </td>
                    <td style={{ color: 'var(--accent-gold)', fontSize: 13 }}>
                      {p.tasa_cambio_usd_bs} Bs
                    </td>
                    <td>
                      <span className={`badge ${ESTATUS_BADGE[p.estatus] || 'badge-borrador'}`}>
                        {ESTATUS_LABEL[p.estatus] || p.estatus}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(p.created_at).toLocaleDateString('es-VE')}
                    </td>
                    {/* ── Acciones de Workflow ── */}
                    <td style={{ textAlign: 'center' }}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
