import { useState, useEffect } from 'react';
import api from '../utils/api';
import { toastSuccess, toastError } from '../utils/alerts';
import { useConfiguracion } from '../hooks/useConfiguracion';

export default function AjustesEmpresa() {
  const { recargarConfig } = useConfiguracion();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre_empresa: '',
    rif: '',
    telefono: '',
    email: '',
    direccion: '',
    terminos_condiciones: '',
    tasa_cambio: '',
    logo_data: ''
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/api/config');
      if (data.success && data.data) {
        setForm({
          nombre_empresa: data.data.nombre_empresa || '',
          rif: data.data.rif || '',
          telefono: data.data.telefono || '',
          email: data.data.email || '',
          direccion: data.data.direccion || '',
          terminos_condiciones: data.data.terminos_condiciones || '',
          tasa_cambio: data.data.tasa_cambio || '',
          logo_data: data.data.logo_data || ''
        });
      }
    } catch (err) {
      console.error('Error fetching config:', err);
      toastError('No se pudo cargar la configuración de la empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toastError('La imagen no debe superar los 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, logo_data: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/api/config', form);
      if (data.success) {
        toastSuccess('Configuración guardada exitosamente.');
        recargarConfig();
      }
    } catch (err) {
      console.error('Error saving config:', err);
      toastError('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <span className="spinner" style={{ width: 30, height: 30, borderWidth: 3 }}></span>
        <div style={{ marginTop: 10, color: 'var(--text-muted)' }}>Cargando datos de la empresa...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid form-grid-2" style={{ gap: 20 }}>
      {/* ── Logo ── */}
      <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: 24, alignItems: 'center', background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
          {form.logo_data ? (
            <img src={form.logo_data} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <svg width="24" height="24" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          )}
        </div>
        <div>
          <label className="form-label" style={{ marginBottom: 4 }}>Logo de la Empresa</label>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Formato recomendado: PNG transparente, máx 2MB.</div>
          <input type="file" accept="image/*" id="logo-upload" onChange={handleFileChange} style={{ display: 'none' }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => document.getElementById('logo-upload').click()}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Subir Logo
          </button>
          {form.logo_data && (
            <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => setForm(f => ({ ...f, logo_data: '' }))} style={{ marginLeft: 8 }} title="Eliminar logo">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Nombre de la Empresa <span className="required">*</span></label>
        <input className="form-input" placeholder="Ej: SlabPro C.A." value={form.nombre_empresa} onChange={e => setForm({ ...form, nombre_empresa: e.target.value })} required />
      </div>

      <div className="form-group">
        <label className="form-label">RIF / C.I. <span className="required">*</span></label>
        <input className="form-input" placeholder="Ej: J-12345678-9" value={form.rif} onChange={e => setForm({ ...form, rif: e.target.value })} required />
      </div>

      <div className="form-group">
        <label className="form-label">Teléfono</label>
        <input className="form-input" placeholder="Ej: 0212-1234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
      </div>

      <div className="form-group">
        <label className="form-label">Correo Electrónico</label>
        <input type="email" className="form-input" placeholder="contacto@empresa.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      </div>

      <div className="form-group">
        <label className="form-label">Tasa de Cambio Manual (Bs por USD)</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>Bs.</span>
          <input type="number" step="0.01" min="0" className="form-input" style={{ paddingLeft: 36 }} placeholder="Ej: 36.50" value={form.tasa_cambio} onChange={e => setForm({ ...form, tasa_cambio: e.target.value })} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Utilizado de manera global en los presupuestos si no hay auto-sincronización.</div>
      </div>

      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label className="form-label">Dirección Fiscal</label>
        <textarea className="form-textarea" placeholder="Dirección completa de la empresa" rows={2} value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
      </div>

      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label className="form-label">Términos y Condiciones (Por defecto)</label>
        <textarea className="form-textarea" placeholder="Ej: 50% de abono para iniciar, 50% al finalizar..." rows={4} value={form.terminos_condiciones} onChange={e => setForm({ ...form, terminos_condiciones: e.target.value })} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Este texto se incluirá en la parte inferior de los presupuestos y facturas.</div>
      </div>

      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button type="submit" className="btn btn-success" disabled={saving}>
          {saving ? <><span className="spinner" style={{ marginRight: 8 }}></span> Guardando...</> : 'Guardar Configuración'}
        </button>
      </div>
    </form>
  );
}
