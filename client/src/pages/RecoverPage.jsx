import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toastError, toastSuccess } from '../utils/alerts';
import api from '../utils/api';

export default function RecoverPage() {
  const [step, setStep] = useState(1);
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Methods
  const [methods, setMethods] = useState(null);
  
  // Method selected ('pregunta' | 'email')
  const [method, setMethod] = useState('');

  // Pregunta Flow
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');

  // Email Flow
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const navigate = useNavigate();

  // Paso 1: Ingresar cédula y obtener métodos disponibles
  const handleGetMethods = async (e) => {
    e.preventDefault();
    if (!cedula) return toastError('Ingresa tu cédula');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/recover/methods', { cedula: cedula.trim() });
      if (data.success) {
        if (!data.hasQuestions && !data.hasEmail) {
          toastError('No tienes métodos de recuperación configurados. Contacta al administrador.');
          return;
        }
        setMethods(data);
        
        // Si solo tiene un método, saltar la selección
        if (data.hasQuestions && !data.hasEmail) {
          selectMethod('pregunta');
        } else if (!data.hasQuestions && data.hasEmail) {
          selectMethod('email');
        } else {
          setStep(2); // Seleccionar método
        }
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al buscar usuario.');
    } finally {
      setLoading(false);
    }
  };

  const selectMethod = async (selectedMethod) => {
    setMethod(selectedMethod);
    if (selectedMethod === 'pregunta') {
      // Buscar la pregunta al azar
      setLoading(true);
      try {
        const { data } = await api.post('/api/auth/recover/question/random', { cedula: cedula.trim() });
        setPregunta(data.pregunta);
        setStep(3); // Mostrar pregunta
      } catch (err) {
        toastError(err.response?.data?.message || 'Error al obtener la pregunta.');
      } finally {
        setLoading(false);
      }
    } else {
      setStep(4); // Mostrar ingreso de correo para validación
    }
  };

  const handleSendEmailCode = async (e) => {
    e.preventDefault();
    if (!email) return toastError('Ingresa tu correo');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/recover/email/send-code', { cedula: cedula.trim(), email: email.trim() });
      if (data.success) {
        toastSuccess('Código enviado al correo.');
        setStep(5); // Mostrar ingreso de código
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al enviar código.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code) return toastError('Ingresa el código');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/recover/email/verify-code', { cedula: cedula.trim(), code: code.trim() });
      if (data.success) {
        setStep(6); // Mostrar nueva contraseña (flujo email)
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Código incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!nuevaPassword) return toastError('Ingresa la nueva contraseña.');
    if (method === 'pregunta' && !respuesta) return toastError('Ingresa tu respuesta secreta.');

    setLoading(true);
    try {
      const payload = method === 'pregunta' ? { pregunta, respuesta } : {};
      const { data } = await api.post('/api/auth/recover/reset', {
        cedula: cedula.trim(),
        tipoRecuperacion: method,
        payload,
        nuevaPassword
      });
      
      if (data.success) {
        toastSuccess('Contraseña actualizada correctamente.');
        navigate('/login');
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al restablecer contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Recuperar Cuenta</h1>
          <p style={styles.subtitle}>
            {step === 1 && 'Ingresa tu cédula para continuar'}
            {step === 2 && 'Elige un método de recuperación'}
            {step === 3 && 'Responde tu pregunta de seguridad'}
            {step === 4 && 'Verifica tu correo electrónico'}
            {step === 5 && 'Ingresa el código de 4 dígitos'}
            {step === 6 && 'Crea una nueva contraseña'}
          </p>
        </div>

        {/* STEP 1: Cédula */}
        {step === 1 && (
          <form onSubmit={handleGetMethods} style={styles.form}>
            <div style={styles.group}>
              <label style={styles.label}>Cédula</label>
              <input type="text" value={cedula} onChange={e => setCedula(e.target.value.replace(/\D/g, ''))} placeholder="Ej: 12345678" maxLength={10} inputMode="numeric" style={styles.input} autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={styles.button}>{loading ? 'Buscando...' : 'Continuar'}</button>
          </form>
        )}

        {/* STEP 2: Seleccionar Método */}
        {step === 2 && (
          <div style={styles.form}>
            {methods?.hasQuestions && (
              <button type="button" className="btn" style={styles.outlineButton} onClick={() => selectMethod('pregunta')}>
                Usar Pregunta de Seguridad
              </button>
            )}
            {methods?.hasEmail && (
              <button type="button" className="btn" style={styles.outlineButton} onClick={() => selectMethod('email')}>
                Enviar Código al Correo
              </button>
            )}
          </div>
        )}

        {/* STEP 3: Pregunta de Seguridad */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <div style={styles.group}>
              <label style={styles.label}>Pregunta de Seguridad</label>
              <div style={styles.questionBox}>{pregunta}</div>
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Respuesta</label>
              <input type="text" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Tu respuesta secreta" style={styles.input} autoFocus />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Nueva Contraseña</label>
              <input type="password" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={styles.input} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={styles.button}>{loading ? 'Actualizando...' : 'Restablecer Contraseña'}</button>
          </form>
        )}

        {/* STEP 4: Correo (Enviar código) */}
        {step === 4 && (
          <form onSubmit={handleSendEmailCode} style={styles.form}>
            <div style={styles.group}>
              <label style={styles.label}>Confirma tu correo registrado</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@correo.com" style={styles.input} autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={styles.button}>{loading ? 'Enviando...' : 'Enviar Código'}</button>
          </form>
        )}

        {/* STEP 5: Validar código */}
        {step === 5 && (
          <form onSubmit={handleVerifyCode} style={styles.form}>
            <div style={styles.group}>
              <label style={styles.label}>Código de Seguridad</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="1234" maxLength={4} style={{...styles.input, textAlign: 'center', fontSize: 24, letterSpacing: 4}} autoFocus />
              <span style={{fontSize: 12, color: 'var(--text-muted)', textAlign: 'center'}}>Revisa tu bandeja de entrada o spam.</span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={styles.button}>{loading ? 'Verificando...' : 'Verificar Código'}</button>
          </form>
        )}

        {/* STEP 6: Nueva contraseña (flujo email) */}
        {step === 6 && (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <div style={styles.group}>
              <label style={styles.label}>Nueva Contraseña</label>
              <input type="password" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={styles.input} autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={styles.button}>{loading ? 'Actualizando...' : 'Restablecer Contraseña'}</button>
          </form>
        )}

        <div style={styles.footer}>
          <Link to="/login" style={styles.link}>Volver al Login</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-app)', fontFamily: 'var(--font-sans)' },
  card: { backgroundColor: 'var(--bg-panel)', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px', border: '1px solid var(--border)' },
  header: { marginBottom: '24px', textAlign: 'center' },
  title: { fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px 0' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  group: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' },
  input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' },
  questionBox: { padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', color: 'var(--primary)', fontWeight: '500', fontSize: '14px', border: '1px solid rgba(255, 255, 255, 0.1)' },
  button: { marginTop: '10px', padding: '12px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', width: '100%' },
  outlineButton: { width: '100%', padding: '16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  footer: { marginTop: '24px', textAlign: 'center' },
  link: { color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }
};
