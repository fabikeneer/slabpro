import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { toastError } from '../utils/alerts';
import { AuthContext } from '../context/AuthContext';

export default function DashboardPage() {
  const { token, user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/resumen', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        toastError('Error al cargar datos del dashboard');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toastError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const {
    proyectosActivos,
    presupuestosPendientes,
    totalGastos,
    totalNomina,
    ultimosPresupuestos
  } = data || {};

  // Formateador de moneda
  const formatUSD = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  return (
    <div className="fade-in">
      <div className="page-header hide-on-mobile">
        <h2>Hola, {user?.usuario || 'Admin'}</h2>
        <p>Este es el resumen general del sistema SlabPro.</p>
      </div>

      <div className="stats-grid hide-on-mobile">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{proyectosActivos?.cantidad || 0}</div>
            <div className="stat-label">Proyectos Activos ({formatUSD(proyectosActivos?.total_usd)})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-gold)' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-gold)' }}>{presupuestosPendientes?.cantidad || 0}</div>
            <div className="stat-label">Presup. Pendientes ({formatUSD(presupuestosPendientes?.total_usd)})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{formatUSD(totalGastos)}</div>
            <div className="stat-label">Total Gastos Histórico</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{formatUSD(totalNomina)}</div>
            <div className="stat-label">Total Nómina Histórica</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div className="card hide-on-mobile" style={{ flex: 2, minWidth: '300px' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Presupuestos Recientes</h3>
              <p className="card-subtitle">Últimos 5 presupuestos creados</p>
            </div>
            <Link to="/presupuestos" className="btn btn-ghost btn-sm">Ver todos</Link>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="list-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Total USD</th>
                  <th>Estatus</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ultimosPresupuestos?.length > 0 ? (
                  ultimosPresupuestos.map(p => (
                    <tr key={p.id_presupuesto}>
                      <td data-label="Número" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.numero_presupuesto}</td>
                      <td data-label="Cliente">{p.cliente || 'Desconocido'}</td>
                      <td data-label="Total USD" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{formatUSD(p.total_usd)}</td>
                      <td data-label="Estatus">
                        <span className={`badge badge-${p.estatus.toLowerCase()}`}>{p.estatus}</span>
                      </td>
                      <td data-label="Fecha" style={{ color: 'var(--text-muted)' }}>
                        {new Date(p.created_at).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No hay presupuestos recientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: '250px' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Acciones Rápidas</h3>
              <p className="card-subtitle">Atajos del sistema</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to="/presupuestos" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Nuevo Presupuesto
            </Link>
            <Link to="/gastos" className="btn btn-danger" style={{ justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Registrar Gasto
            </Link>
            <Link to="/nomina" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Gestión de Nómina
            </Link>
            <Link to="/proyectos" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              Ver Proyectos Activos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
