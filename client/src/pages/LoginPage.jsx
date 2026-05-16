import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toastError, toastSuccess } from '../utils/alerts';

export default function LoginPage() {
  const [cedula, setCedula]     = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!cedula || !password) {
      toastError('Por favor, ingresa tu cédula y contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim(), password })
      });

      const data = await response.json();

      if (data.success) {
        login(data.token, data.user);
        toastSuccess(`Bienvenido, ${data.user.nombre || data.user.usuario}`);
        setTimeout(() => navigate('/'), 800);
      } else {
        toastError(data.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error('Error en login:', error);
      toastError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoContainer}>
          <div className="logo-icon" style={styles.logoIcon}>
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={styles.title}>SlabPro</h1>
          <p style={styles.subtitle}>Sistema de Gestión — Acceso</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          {/* Cédula */}
          <div className="form-group">
            <label style={styles.label}>Cédula</label>
            <div style={styles.inputWrapper}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={styles.inputIcon}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                type="text"
                className="form-input"
                style={styles.inputWithIcon}
                value={cedula}
                onChange={e => setCedula(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 12345678"
                maxLength={10}
                autoFocus
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="form-group">
            <label style={styles.label}>Contraseña</label>
            <div style={styles.inputWrapper}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={styles.inputIcon}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                style={{ ...styles.inputWithIcon, paddingRight: 42 }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPass ? (
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={styles.button}>
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 8 }} /> Iniciando...</>
            ) : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={styles.footer}>
          <Link to="/recuperar" style={styles.link}>¿Olvidaste tu contraseña?</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100vh', width: '100vw',
    backgroundColor: 'var(--bg-app)', fontFamily: 'var(--font-sans)',
  },
  card: {
    backgroundColor: 'var(--bg-panel)', padding: '40px',
    borderRadius: '20px', boxShadow: '0 12px 40px rgba(0,0,0,0.10)',
    width: '100%', maxWidth: '400px', border: '1px solid var(--border)',
  },
  logoContainer: { textAlign: 'center', marginBottom: 32 },
  logoIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: 'var(--primary)', color: '#fff', marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px' },
  subtitle: { fontSize: 13, color: 'var(--text-muted)', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' },
  inputWithIcon: { paddingLeft: 38, width: '100%' },
  eyeBtn: {
    position: 'absolute', right: 10, background: 'none', border: 'none',
    cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4,
  },
  button: { marginTop: 6, padding: '13px', fontSize: 15, fontWeight: 700, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  footer: { marginTop: 24, textAlign: 'center' },
  link: { color: 'var(--primary)', fontSize: 13, textDecoration: 'none', fontWeight: 500 },
};
