// App.jsx — Raíz de la aplicación SlabPro
import { Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import DashboardPage    from './pages/DashboardPage';
import PresupuestosPage from './pages/PresupuestosPage';
import NominaPage       from './pages/NominaPage';
import ProyectosPage    from './pages/ProyectosPage';
import GastosPage       from './pages/GastosPage';
import LoginPage        from './pages/LoginPage';
import RecoverPage      from './pages/RecoverPage';
import EmpresaPage      from './pages/EmpresaPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import ProtectedRoute   from './components/ProtectedRoute';
import { AuthProvider, AuthContext } from './context/AuthContext';

function Sidebar() {
  const { logout, user } = useContext(AuthContext);

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
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        Inicio
      </NavLink>

      <NavLink to="/presupuestos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        Presupuestos
      </NavLink>

      <NavLink to="/proyectos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        Proyectos
      </NavLink>

      <NavLink to="/nomina" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        Nómina
      </NavLink>

      <NavLink to="/gastos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        Gastos
      </NavLink>

      <NavLink to="/empresa" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Empresa
      </NavLink>

      <NavLink to="/configuracion" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ marginTop: 'auto', marginBottom: 12 }}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Configuración
      </NavLink>

      <div style={{ padding: '0 16px', marginBottom: '16px' }}>
        <button 
          onClick={logout}
          style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--danger, #ff4d4f)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Info de versión */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>SlabPro v1.2</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Usuario: {user?.usuario || 'admin'}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
          Creado por<br/><strong>Ing. Keneer Olivo</strong>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  const { logout } = useContext(AuthContext);
  return (
    <header className="mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="logo-icon" style={{ width: 24, height: 24 }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
        </div>
        <h1 style={{ fontSize: 18, margin: 0, color: 'var(--text-primary)' }}>SlabPro</h1>
      </div>
      <button 
        onClick={logout}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    </header>
  );
}

function MobileNav() {
  return (
    <nav className="mobile-nav">
      <NavLink to="/" end className={({ isActive }) => `mob-nav-item ${isActive ? 'active' : ''}`}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span>Inicio</span>
      </NavLink>
      <NavLink to="/presupuestos" className={({ isActive }) => `mob-nav-item ${isActive ? 'active' : ''}`}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        <span>Pptos</span>
      </NavLink>
      <NavLink to="/proyectos" className={({ isActive }) => `mob-nav-item ${isActive ? 'active' : ''}`}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        <span>Proyec.</span>
      </NavLink>
      <NavLink to="/nomina" className={({ isActive }) => `mob-nav-item ${isActive ? 'active' : ''}`}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span>Nómina</span>
      </NavLink>
      <NavLink to="/gastos" className={({ isActive }) => `mob-nav-item ${isActive ? 'active' : ''}`}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        <span>Gastos</span>
      </NavLink>
      <NavLink to="/empresa" className={({ isActive }) => `mob-nav-item ${isActive ? 'active' : ''}`}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Empresa</span>
      </NavLink>
      <NavLink to="/configuracion" className={({ isActive }) => `mob-nav-item ${isActive ? 'active' : ''}`}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>Config.</span>
      </NavLink>
    </nav>
  );
}

function MainLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="mobile-layout-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <MobileHeader />
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)' }}>
          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
          <footer style={{ 
            marginTop: '3rem', 
            paddingTop: '1.5rem', 
            paddingBottom: '1rem',
            borderTop: '1px solid var(--border)', 
            textAlign: 'center', 
            color: 'var(--text-muted)', 
            fontSize: '0.8rem',
            lineHeight: '1.6'
          }}>
            <div style={{ fontWeight: 600 }}>SlabPro System v1.2 © {new Date().getFullYear()}</div>
            <div>Diseñado y desarrollado por el <strong>Ing. Keneer Olivo</strong>.<br/>Todos los derechos de autor reservados.</div>
          </footer>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}


function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar" element={<RecoverPage />} />
        
        {/* Rutas Protegidas con el Layout principal */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/"          element={<DashboardPage />} />
            <Route path="/presupuestos" element={<PresupuestosPage />} />
            <Route path="/proyectos" element={<ProyectosPage />} />
            <Route path="/nomina"    element={<NominaPage />} />
            <Route path="/gastos"          element={<GastosPage />} />
            <Route path="/empresa"         element={<EmpresaPage />} />
            <Route path="/configuracion"   element={<ConfiguracionPage />} />
            <Route path="*"                element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
