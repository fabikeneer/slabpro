// App.jsx — Raíz de la aplicación SlabPro
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import PresupuestosPage from './pages/PresupuestosPage';
import NominaPage       from './pages/NominaPage';
import ProyectosPage    from './pages/ProyectosPage';
import GastosPage       from './pages/GastosPage';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
        </div>
        <div>
          <h1>SlabPro</h1>
          <span>Sistema de Gestión</span>
        </div>
      </div>

      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        Presupuestos
      </NavLink>

      <NavLink to="/proyectos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        Proyectos
      </NavLink>

      <NavLink to="/nomina" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        Nómina
      </NavLink>

      <NavLink to="/gastos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        Gastos
      </NavLink>

      <div
        className="nav-item"
        style={{ opacity: 0.4, cursor: 'not-allowed', marginTop: 'auto', marginBottom: 12 }}
        title="Próximamente"
      >
        Configuración
      </div>

      {/* Info de versión */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SlabPro v1.2</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>© 2025 Marmolería</div>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"          element={<PresupuestosPage />} />
          <Route path="/proyectos" element={<ProyectosPage />} />
          <Route path="/nomina"    element={<NominaPage />} />
          <Route path="/gastos"    element={<GastosPage />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
