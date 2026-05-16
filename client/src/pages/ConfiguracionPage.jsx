import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toastSuccess, toastError } from '../utils/alerts';

const PREGUNTAS = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad naciste?',
  '¿Cuál es el nombre de tu madre?',
  '¿Cuál fue el nombre de tu primera escuela?',
  '¿Cuál es tu comida favorita?',
  '¿Cuál es el nombre de tu mejor amigo de infancia?',
  'Escribir pregunta personalizada...'
];

function SectionCard({ title, subtitle, icon, children }) {
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: 'rgba(59,130,246,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)',
            flexShrink: 0,
          }}>
            {icon}
          </div>
          <div>
            <div className="card-title" style={{ margin: 0 }}>{title}</div>
            <div className="card-subtitle" style={{ margin: 0 }}>{subtitle}</div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

const EyeIcon = ({ show, onToggle }) => (
  <button type="button" onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
    {show ? (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    ) : (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    )}
  </button>
);

const PasswordInput = ({ value, onChange, placeholder, show, onToggle }) => (
  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
    <input
      type={show ? 'text' : 'password'}
      className="form-input"
      style={{ border: 'none', background: 'transparent', flex: 1 }}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required
    />
    <EyeIcon show={show} onToggle={onToggle} />
  </div>
);

export default function ConfiguracionPage() {
  const { token } = useContext(AuthContext);

  // Perfil
  const [perfil, setPerfil] = useState(null);

  // Contraseña
  const [passForm, setPassForm] = useState({ passwordActual: '', nuevaPassword: '', confirmar: '' });
  const [savingPass, setSavingPass] = useState(false);
  const [showPass, setShowPass] = useState({ actual: false, nueva: false, confirmar: false, emailSec: false, secActual: false });

  // Correo Electrónico
  const [emailForm, setEmailForm] = useState({ passwordActual: '', email: '' });
  const [savingEmail, setSavingEmail] = useState(false);

  // Preguntas de Seguridad
  const [secPassword, setSecPassword] = useState('');
  const [questions, setQuestions] = useState([ { id: Date.now(), selectValue: PREGUNTAS[0], customValue: '', respuesta: '' } ]);
  const [savingSec, setSavingSec] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const r = await axios.get('/api/auth/settings/me', { headers });
      if (r.data.success) {
        setPerfil(r.data.data);
        setEmailForm(f => ({ ...f, email: r.data.data.email || '' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.nuevaPassword !== passForm.confirmar) return toastError('Las contraseñas no coinciden.');
    if (passForm.nuevaPassword.length < 6) return toastError('Mínimo 6 caracteres.');
    setSavingPass(true);
    try {
      const { data } = await axios.put('/api/auth/settings/password', {
        passwordActual: passForm.passwordActual,
        nuevaPassword: passForm.nuevaPassword,
      }, { headers });
      if (data.success) {
        toastSuccess(data.message);
        setPassForm({ passwordActual: '', nuevaPassword: '', confirmar: '' });
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al cambiar la contraseña.');
    } finally {
      setSavingPass(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const { data } = await axios.put('/api/auth/settings/email', {
        passwordActual: emailForm.passwordActual,
        email: emailForm.email,
      }, { headers });
      if (data.success) {
        toastSuccess(data.message);
        setEmailForm(f => ({ ...f, passwordActual: '' }));
        fetchProfile();
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al actualizar correo.');
    } finally {
      setSavingEmail(false);
    }
  };

  const addQuestion = () => {
    if (questions.length >= 4) return;
    setQuestions([...questions, { id: Date.now(), selectValue: PREGUNTAS[0], customValue: '', respuesta: '' }]);
  };

  const removeQuestion = (id) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    if (questions.some(q => !q.respuesta || (q.selectValue === 'Escribir pregunta personalizada...' && !q.customValue))) {
      return toastError('Completa todas las preguntas y respuestas.');
    }
    
    setSavingSec(true);
    try {
      const qsArray = questions.map(q => ({
        pregunta: q.selectValue === 'Escribir pregunta personalizada...' ? q.customValue : q.selectValue,
        respuesta: q.respuesta
      }));

      const { data } = await axios.put('/api/auth/settings/security-questions', {
        passwordActual: secPassword,
        questions: qsArray,
      }, { headers });
      
      if (data.success) {
        toastSuccess(data.message);
        setSecPassword('');
        setQuestions([ { id: Date.now(), selectValue: PREGUNTAS[0], customValue: '', respuesta: '' } ]);
        fetchProfile();
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al actualizar preguntas.');
    } finally {
      setSavingSec(false);
    }
  };



  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Configuración
          </h2>
          <p>Administra tu seguridad y credenciales de acceso.</p>
        </div>
      </div>

      {/* Info de cuenta */}
      {perfil && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius-lg)', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', fontWeight: 800, fontSize: 20 }}>
            {perfil.usuario?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>{perfil.usuario}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Administrador · ID #{perfil.id}</div>
          </div>
        </div>
      )}

      {/* ── Cambiar Contraseña ── */}
      <SectionCard title="Cambiar Contraseña" subtitle="Actualiza tu contraseña de acceso al sistema." icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}>
        <form onSubmit={handleChangePassword} className="form-grid form-grid-2" style={{ gap: 16 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Contraseña Actual <span className="required">*</span></label>
            <PasswordInput value={passForm.passwordActual} onChange={e => setPassForm({ ...passForm, passwordActual: e.target.value })} placeholder="Ingresa tu contraseña actual" show={showPass.actual} onToggle={() => setShowPass(p => ({ ...p, actual: !p.actual }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Nueva Contraseña <span className="required">*</span></label>
            <PasswordInput value={passForm.nuevaPassword} onChange={e => setPassForm({ ...passForm, nuevaPassword: e.target.value })} placeholder="Mínimo 6 caracteres" show={showPass.nueva} onToggle={() => setShowPass(p => ({ ...p, nueva: !p.nueva }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar Nueva Contraseña <span className="required">*</span></label>
            <PasswordInput value={passForm.confirmar} onChange={e => setPassForm({ ...passForm, confirmar: e.target.value })} placeholder="Repite la nueva contraseña" show={showPass.confirmar} onToggle={() => setShowPass(p => ({ ...p, confirmar: !p.confirmar }))} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingPass}>{savingPass ? 'Guardando...' : 'Actualizar Contraseña'}</button>
          </div>
        </form>
      </SectionCard>

      {/* ── Correo Electrónico ── */}
      <SectionCard title="Correo de Recuperación" subtitle="Útil para recuperar tu contraseña si olvidas las preguntas de seguridad." icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}>
        <form onSubmit={handleUpdateEmail} className="form-grid form-grid-2" style={{ gap: 16 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Correo Electrónico (Opcional)</label>
            <input type="email" className="form-input" placeholder="ejemplo@correo.com" value={emailForm.email} onChange={e => setEmailForm({ ...emailForm, email: e.target.value })} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Contraseña Actual <span className="required">*</span></label>
            <PasswordInput value={emailForm.passwordActual} onChange={e => setEmailForm({ ...emailForm, passwordActual: e.target.value })} placeholder="Confirma tu identidad" show={showPass.emailSec} onToggle={() => setShowPass(p => ({ ...p, emailSec: !p.emailSec }))} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingEmail}>{savingEmail ? 'Guardando...' : 'Guardar Correo'}</button>
          </div>
        </form>
      </SectionCard>

      {/* ── Preguntas de Seguridad ── */}
      <SectionCard title="Preguntas de Seguridad" subtitle="Configura hasta 4 preguntas para recuperar tu cuenta." icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}>
        {perfil?.pregunta_seguridad && perfil.pregunta_seguridad.length > 0 && (
          <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>Preguntas configuradas: </span>
            {perfil.pregunta_seguridad.length} pregunta(s). (Actualizarlas las reemplazará todas).
          </div>
        )}
        
        <form onSubmit={handleUpdateSecurity} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {questions.map((q, index) => (
            <div key={q.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <strong style={{ fontSize: 14 }}>Pregunta {index + 1}</strong>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 13 }}>Eliminar</button>
                )}
              </div>
              
              <div className="form-group" style={{ marginBottom: 12 }}>
                <select className="form-select" value={q.selectValue} onChange={e => updateQuestion(q.id, 'selectValue', e.target.value)} required>
                  {PREGUNTAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {q.selectValue === 'Escribir pregunta personalizada...' && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <input type="text" className="form-input" placeholder="Escribe tu propia pregunta..." value={q.customValue} onChange={e => updateQuestion(q.id, 'customValue', e.target.value)} required />
                </div>
              )}

              <div className="form-group">
                <input type="text" className="form-input" placeholder="Tu respuesta (no distingue mayúsculas)" value={q.respuesta} onChange={e => updateQuestion(q.id, 'respuesta', e.target.value)} required />
              </div>
            </div>
          ))}

          {questions.length < 4 && (
            <button type="button" onClick={addQuestion} style={{ padding: '10px', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', border: '1px dashed var(--accent-blue)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}>
              + Añadir otra pregunta
            </button>
          )}

          <div className="form-group" style={{ marginTop: 10 }}>
            <label className="form-label">Contraseña Actual <span className="required">*</span></label>
            <PasswordInput value={secPassword} onChange={e => setSecPassword(e.target.value)} placeholder="Confirma tu identidad" show={showPass.secActual} onToggle={() => setShowPass(p => ({ ...p, secActual: !p.secActual }))} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={savingSec}>{savingSec ? 'Guardando...' : 'Guardar Preguntas'}</button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
