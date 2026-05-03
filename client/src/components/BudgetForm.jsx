// components/BudgetForm.jsx — Formulario de Presupuesto
import { useState, useEffect } from 'react';
import { useBudget, TIPOS_LINEA, TIPOS_PIEDRA } from '../hooks/useBudget';
import { generarPDF } from '../utils/pdfGenerator';

// ── Formato de moneda ─────────────────────────────────────────────────────
const fmtUSD = (n) => `$${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBs  = (n) => `Bs. ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─────────────────────────────────────────────────────────────────────────
export default function BudgetForm({ presupuestoEdit, onCancel }) {
  const {
    form, setForm, setField, setLineaField,
    agregarLinea, eliminarLinea,
    totales, guardarPresupuesto,
    resetForm, loading, guardado,
  } = useBudget();

  useEffect(() => {
    if (presupuestoEdit) {
      setForm({
        id: presupuestoEdit.id,
        cliente_id: presupuestoEdit.cliente_id,
        cliente_nombre: presupuestoEdit.cliente_nombre || '',
        cliente_rif: presupuestoEdit.cliente_rif || '',
        cliente_telefono: presupuestoEdit.cliente_telefono || '',
        cliente_email: presupuestoEdit.cliente_email || '',
        cliente_direccion: presupuestoEdit.cliente_direccion || '',
        proyecto_descripcion: presupuestoEdit.proyecto_descripcion || '',
        tasa_cambio_usd_bs: presupuestoEdit.tasa_cambio_usd_bs || 36,
        descripcion_legal: presupuestoEdit.descripcion_legal || '',
        observaciones: presupuestoEdit.observaciones || '',
        validez_dias: presupuestoEdit.validez_dias || 15,
        lineas: (presupuestoEdit.lineas || []).length > 0 
          ? presupuestoEdit.lineas.map(l => ({ ...l, _id: crypto.randomUUID() }))
          : [{ _id: crypto.randomUUID(), tipo: 'piedra', descripcion: '', metros_lineales: '', precio_unitario_usd: '', cantidad: 1, orden: 0 }]
      });
    }
  }, [presupuestoEdit, setForm]);

  const [syncingRate, setSyncingRate] = useState(false);

  const fetchExchangeRate = async (force = false) => {
    try {
      setSyncingRate(true);
      if (force) {
        await fetch('/api/exchange-rate/force', { method: 'POST' });
      }
      const res = await fetch('/api/exchange-rate');
      const data = await res.json();
      if (data.rate) {
        setField('tasa_cambio_usd_bs', data.rate);
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
    } finally {
      setSyncingRate(false);
    }
  };

  useEffect(() => {
    if (!presupuestoEdit) {
      fetchExchangeRate();
    }
  }, [presupuestoEdit]);

  const [activeTab, setActiveTab] = useState('cliente'); // 'cliente' | 'lineas' | 'legal'

  // ── Datos del cliente ─────────────────────────────────────────────────
  const tabCliente = (
    <div className="form-grid form-grid-2" style={{ gap: 16 }}>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label className="form-label">Nombre del Cliente <span className="required">*</span></label>
        <input
          id="cliente_nombre"
          className="form-input"
          placeholder="Ej: Constructora El Roble C.A."
          value={form.cliente_nombre}
          onChange={e => setField('cliente_nombre', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">RIF / C.I.</label>
        <input
          id="cliente_rif"
          className="form-input"
          placeholder="Ej: J-12345678-9"
          value={form.cliente_rif}
          onChange={e => setField('cliente_rif', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Teléfono</label>
        <input
          id="cliente_telefono"
          className="form-input"
          placeholder="Ej: 0412-1234567"
          value={form.cliente_telefono}
          onChange={e => setField('cliente_telefono', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Correo Electrónico</label>
        <input
          id="cliente_email"
          type="email"
          className="form-input"
          placeholder="cliente@email.com"
          value={form.cliente_email}
          onChange={e => setField('cliente_email', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Validez del Presupuesto</label>
        <select
          id="validez_dias"
          className="form-select"
          value={form.validez_dias}
          onChange={e => setField('validez_dias', parseInt(e.target.value))}
        >
          <option value={7}>7 días</option>
          <option value={15}>15 días</option>
          <option value={30}>30 días</option>
          <option value={60}>60 días</option>
        </select>
      </div>

      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label className="form-label">Dirección</label>
        <input
          id="cliente_direccion"
          className="form-input"
          placeholder="Dirección del cliente (opcional)"
          value={form.cliente_direccion}
          onChange={e => setField('cliente_direccion', e.target.value)}
        />
      </div>

      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label className="form-label">Descripción del Proyecto</label>
        <textarea
          id="proyecto_descripcion"
          className="form-textarea"
          placeholder="Describe el proyecto: cocina, baños, escalera..."
          value={form.proyecto_descripcion}
          onChange={e => setField('proyecto_descripcion', e.target.value)}
        />
      </div>
    </div>
  );

  // ── Líneas del presupuesto ────────────────────────────────────────────
  const tabLineas = (
    <>
      <div className="lineas-table-wrapper">
        <table className="lineas-table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Tipo</th>
              <th style={{ minWidth: 180 }}>Descripción</th>
              <th style={{ width: 100 }}>Medida</th>
              <th style={{ width: 120 }}>Precio USD</th>
              <th style={{ width: 80 }}>Cant.</th>
              <th style={{ width: 130, textAlign: 'right' }}>Subtotal USD</th>
              <th style={{ width: 130, textAlign: 'right' }}>Subtotal Bs</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {totales.lineasCalculadas.map((linea) => (
              <tr key={linea._id}>
                {/* Tipo */}
                <td>
                  <select
                    className="select-sm"
                    value={linea.tipo}
                    onChange={e => setLineaField(linea._id, 'tipo', e.target.value)}
                  >
                    {TIPOS_LINEA.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </td>

                {/* Descripción: si es piedra muestra dropdown, si no texto libre */}
                <td>
                  {linea.tipo === 'piedra' ? (
                    <select
                      id={`desc-${linea._id}`}
                      className="select-sm"
                      value={linea.descripcion}
                      onChange={e => setLineaField(linea._id, 'descripcion', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">— Selecciona —</option>
                      {TIPOS_PIEDRA.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`desc-${linea._id}`}
                      className="input-sm"
                      placeholder="Descripción..."
                      value={linea.descripcion}
                      onChange={e => setLineaField(linea._id, 'descripcion', e.target.value)}
                    />
                  )}
                </td>

                {/* Medida */}
                <td>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      className="input-sm"
                      placeholder={linea.tipo === 'flete' || linea.tipo === 'otro' ? 'N/A' : '0.00'}
                      min="0"
                      step="0.01"
                      value={linea.metros_lineales}
                      onChange={e => setLineaField(linea._id, 'metros_lineales', e.target.value)}
                      disabled={linea.tipo === 'flete' || linea.tipo === 'otro'}
                      style={{ 
                        paddingRight: (linea.tipo !== 'flete' && linea.tipo !== 'otro') ? '26px' : '8px',
                        borderColor: linea.tipo === 'drywall' ? 'var(--accent-gold)' : undefined
                      }}
                      title={linea.tipo === 'drywall' ? 'Metros Cuadrados (m²)' : 'Metros Lineales (ml)'}
                    />
                    {linea.tipo === 'drywall' && (
                      <span style={{ position: 'absolute', right: 6, fontSize: 11, color: 'var(--accent-gold)', fontWeight: 700 }}>m²</span>
                    )}
                    {(linea.tipo === 'piedra' || linea.tipo === 'carpinteria' || linea.tipo === 'instalacion') && (
                      <span style={{ position: 'absolute', right: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>ml</span>
                    )}
                  </div>
                </td>

                {/* Precio USD */}
                <td>
                  <input
                    type="number"
                    className="input-sm"
                    placeholder="$0.00"
                    min="0"
                    step="0.01"
                    value={linea.precio_unitario_usd}
                    onChange={e => setLineaField(linea._id, 'precio_unitario_usd', e.target.value)}
                  />
                </td>

                {/* Cantidad */}
                <td>
                  <input
                    type="number"
                    className="input-sm"
                    placeholder="1"
                    min="1"
                    step="1"
                    value={linea.cantidad}
                    onChange={e => setLineaField(linea._id, 'cantidad', e.target.value)}
                  />
                </td>

                {/* Subtotal USD */}
                <td className="subtotal-cell">{fmtUSD(linea.subtotalUSD)}</td>

                {/* Subtotal Bs */}
                <td className="subtotal-cell" style={{ color: 'var(--accent-gold)' }}>
                  {fmtBs(linea.subtotalBs)}
                </td>

                {/* Eliminar */}
                <td>
                  <button
                    className="btn btn-danger btn-icon"
                    onClick={() => eliminarLinea(linea._id)}
                    title="Eliminar línea"
                    disabled={form.lineas.length === 1}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botones para agregar líneas */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        {TIPOS_LINEA.map(t => (
          <button
            key={t.value}
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const newId = agregarLinea(t.value);
              // Focus automático en el campo de descripción después de renderizar
              setTimeout(() => {
                const input = document.getElementById(`desc-${newId}`);
                if (input) input.focus();
              }, 50);
            }}
          >
            + {t.label}
          </button>
        ))}
      </div>

      {/* Panel de totales */}
      <div className="totales-panel" style={{ marginTop: 20 }}>
        {totales.lineasCalculadas.map(l => l.subtotalUSD > 0 && (
          <div className="totales-row" key={l._id}>
            <span>{l.descripcion || l.tipo}</span>
            <span>
              {fmtUSD(l.subtotalUSD)}
              <span className="amount-bs" style={{ marginLeft: 12 }}>{fmtBs(l.subtotalBs)}</span>
            </span>
          </div>
        ))}

        <div className="totales-row grand-total">
          <span>TOTAL</span>
          <span style={{ textAlign: 'right' }}>
            <span className="amount-usd">{fmtUSD(totales.totalUSD)}</span>
            <br />
            <span className="amount-bs" style={{ fontSize: 16 }}>{fmtBs(totales.totalBs)}</span>
          </span>
        </div>
      </div>
    </>
  );

  // ── Texto legal y observaciones ───────────────────────────────────────
  const tabLegal = (
    <div className="form-grid" style={{ gap: 16 }}>
      <div className="form-group">
        <label className="form-label">Descripción Legal de Materiales</label>
        <textarea
          id="descripcion_legal"
          className="form-textarea"
          style={{ minHeight: 140 }}
          value={form.descripcion_legal}
          onChange={e => setField('descripcion_legal', e.target.value)}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Este texto aparecerá en el PDF como cláusula legal.
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">Observaciones Internas</label>
        <textarea
          id="observaciones"
          className="form-textarea"
          placeholder="Notas internas, condiciones especiales... (no aparece en PDF)"
          value={form.observaciones}
          onChange={e => setField('observaciones', e.target.value)}
        />
      </div>
    </div>
  );

  // ── Render Principal ──────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Tasa de Cambio — siempre visible */}
      <div className="tasa-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="tasa-info" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="tasa_cambio" style={{ margin: 0 }}>Tasa de Cambio USD / Bs</label>
            <button 
              type="button" 
              onClick={() => fetchExchangeRate(true)}
              disabled={syncingRate}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: 16 }}
              title="Refrescar tasa desde Binance P2P"
            >
              {syncingRate ? '↻...' : '↻'}
            </button>
          </div>
          <input
            id="tasa_cambio"
            type="number"
            className="tasa-input"
            min="0"
            step="0.01"
            value={form.tasa_cambio_usd_bs}
            onChange={e => setField('tasa_cambio_usd_bs', e.target.value)}
          />
          <span style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 500 }}>✓ Tasa sincronizada con USDT (Binance P2P)</span>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>
          <div>Actualizado: {new Date().toLocaleDateString('es-VE')}</div>
          <div style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: 15 }}>
            1 USD = {fmtBs(form.tasa_cambio_usd_bs || 0)}
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Tab header */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}>
          {[
            { key: 'cliente', label: 'Cliente & Proyecto' },
            { key: 'lineas',  label: 'Líneas del Presupuesto' },
            { key: 'legal',   label: 'Legal & Notas' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '14px 24px',
                border: 'none',
                background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
                color: activeTab === tab.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent-blue)' : '2px solid transparent',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: 24 }}>
          {activeTab === 'cliente' && tabCliente}
          {activeTab === 'lineas'  && tabLineas}
          {activeTab === 'legal'   && tabLegal}
        </div>
      </div>

      {/* Barra de acciones */}
      <div style={{
        display: 'flex',
        gap: 12,
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {guardado && (
          <span style={{ color: 'var(--accent-green)', fontSize: 14, fontWeight: 600 }}>
            Guardado como {guardado.numero_presupuesto || 'borrador'}
          </span>
        )}

        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}

        <button className="btn btn-ghost" onClick={resetForm} disabled={loading}>
          Limpiar
        </button>

        {guardado && (
          <button
            className="btn btn-ghost"
            onClick={() => generarPDF(form, totales)}
          >
            Exportar PDF
          </button>
        )}

        <button
          id="btn-guardar-presupuesto"
          className="btn btn-success"
          onClick={guardarPresupuesto}
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> Guardando...</> : (presupuestoEdit ? 'Actualizar Presupuesto' : 'Guardar Presupuesto')}
        </button>
      </div>

    </div>
  );
}
