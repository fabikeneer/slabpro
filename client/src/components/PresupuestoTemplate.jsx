import React from 'react';

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function PresupuestoTemplate({ form, totales, guardado, configEmpresa }) {
  const numero = guardado?.numero_presupuesto || form.numero_presupuesto || 'BORRADOR';
  
  // Nombres y datos por defecto o de la configuración
  const nombreEmpresa = configEmpresa?.nombre_empresa || 'NOMBRE DE EMPRESA';
  const logo = configEmpresa?.logo_data; 
  const emailEmpresa = configEmpresa?.email || 'correo@empresa.com';
  const telefonoEmpresa = configEmpresa?.telefono || '0000-0000000';
  const direccionEmpresa = configEmpresa?.direccion || 'Dirección no configurada';
  const rifEmpresa = configEmpresa?.rif || 'J-00000000-0';
  
  const lineas = totales?.lineasCalculadas || form?.lineas || [];
  
  // Calcular vencimiento si hay fecha de inicio y validez
  let fechaVencimiento = '—';
  if (form?.fecha_inicio && form?.validez_dias) {
    const start = new Date(form.fecha_inicio);
    start.setDate(start.getDate() + Number(form.validez_dias));
    fechaVencimiento = start.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <article className="page" style={styles.page}>
      <div className="page-inner" style={styles.pageInner}>
        {/* Header */}
        <header className="header-row" style={styles.headerRow}>
          <div className="brand-block" style={styles.brandBlock}>
            {logo && (
              <img src={logo} alt="Logo" style={{ ...styles.brandIcon, objectFit: 'contain', background: 'transparent', border: 'none', borderRadius: 0 }} />
            )}
            <div className="brand-text" style={styles.brandText}>
              <strong style={styles.brandTextStrong}>{nombreEmpresa}</strong>
              <span style={styles.brandTextSpan}>RIF: {rifEmpresa}</span>
              <span style={styles.brandTextSpan}>{telefonoEmpresa}</span>
            </div>
          </div>
          <div className="doc-title-block" style={styles.docTitleBlock}>
            <h1 style={styles.h1}>PRESUPUESTO</h1>
            <div className="doc-num" style={styles.docNum}>N° {numero}</div>
          </div>
        </header>

        {/* Client & Dates */}
        <section className="client-dates" style={styles.clientDates}>
          <div>
            <div className="label-gold" style={styles.labelGold}>Cliente</div>
            <div className="client-name" style={styles.clientName}>{form?.cliente_nombre || 'Cliente Anónimo'}</div>
            <p className="client-role" style={styles.clientRole}>{form?.cliente_rif || 'Sin RIF'}</p>
          </div>
          <div className="dates-col" style={styles.datesCol}>
            <div><strong style={{ color: 'var(--ink)' }}>Fecha:</strong> {fmtFecha(form?.fecha_inicio || new Date())}</div>
            <div><strong style={{ color: 'var(--ink)' }}>Vencimiento:</strong> {fechaVencimiento}</div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="two-cols" style={styles.twoCols}>
          <div>
            <div className="label-gold" style={styles.labelGold}>Persona de contacto</div>
            <div className="detail-lines" style={styles.detailLines}>
              Teléfono: {form?.cliente_telefono || '—'}<br />
              Email: {form?.cliente_email || '—'}
            </div>
          </div>
          <div>
            <div className="label-gold" style={styles.labelGold}>Datos del Proyecto</div>
            <div className="detail-lines" style={styles.detailLines}>
              Dirección: {form?.cliente_direccion || '—'}<br />
              {form?.proyecto_descripcion || ''}
            </div>
          </div>
        </section>

        {/* Table */}
        <table className="presu-table" style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, textAlign: 'center', width: '3rem'}}>#</th>
              <th style={styles.th}>Descripción</th>
              <th style={{...styles.th, textAlign: 'right'}}>Precio</th>
              <th style={{...styles.th, textAlign: 'center', width: '4rem'}}>Cantidad</th>
              <th style={{...styles.th, textAlign: 'right'}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lineas.length > 0 ? lineas.map((l, idx) => (
              <tr key={idx} style={idx % 2 === 1 ? styles.trAlt : styles.tr}>
                <td style={{...styles.td, textAlign: 'center'}}>{idx + 1}</td>
                <td style={styles.td}>{l.descripcion || l.tipo || '—'}</td>
                <td style={{...styles.td, textAlign: 'right'}}>{fmtUSD(l.precio_unitario_usd)}</td>
                <td style={{...styles.td, textAlign: 'center'}}>
                  {l.metros_lineales > 0 
                    ? `${Number(l.metros_lineales).toFixed(2)} ${['drywall', 'porcelanato'].includes(l.tipo) ? 'm²' : 'ml'}` 
                    : l.cantidad}
                </td>
                <td style={{...styles.td, textAlign: 'right'}}>{fmtUSD(l.subtotalUSD || (l.precio_unitario_usd * (l.metros_lineales || l.cantidad)))}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" style={{...styles.td, textAlign: 'center'}}>Sin líneas</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals-wrap" style={styles.totalsWrap}>
          <div className="totals" style={styles.totals}>
            <div className="totals-row" style={styles.totalsRow}>
              <span>Subtotal</span>
              <span className="amt" style={styles.amt}>{fmtUSD(totales?.totalUSD || 0)}</span>
            </div>
            <div className="totals-divider" style={styles.totalsDivider}></div>
            <div className="tax-row" style={styles.taxRow}>
              <span>Descuentos/Impuestos</span>
              <span className="pct" style={styles.pct}>—</span>
              <span className="amt" style={styles.amt}>$0.00</span>
            </div>
            <div className="total-bar" style={styles.totalBar}>
              <span>TOTAL</span>
              <span className="amt" style={styles.amt}>{fmtUSD(totales?.totalUSD || 0)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Signature */}
        <section className="terms-block" style={styles.termsBlock}>
          {form?.descripcion_legal && (
            <>
              <div className="label-gold" style={styles.labelGold}>Condiciones de materiales y servicio</div>
              <p style={styles.p}>{form.descripcion_legal}</p>
            </>
          )}
          {form?.observaciones && (
            <>
              <div className="label-gold" style={styles.labelGold}>Observaciones</div>
              <p style={styles.p}>{form.observaciones}</p>
            </>
          )}
          
          <div className="label-gold" style={{...styles.labelGold, marginTop: '20px'}}>Firma Autorizada</div>
          <div className="signature" style={styles.signature}>
            <div className="line" style={styles.signatureLine}></div>
            <div className="name" style={styles.signatureName}>{nombreEmpresa}</div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div className="footer-strip" style={styles.footerStrip}>
          <div className="footer-main" style={styles.footerMain}>
            <div>{emailEmpresa}</div>
            <div>{telefonoEmpresa}</div>
            <div>{direccionEmpresa}</div>
          </div>
        </div>
        <div className="footer-bar" style={styles.footerBar}></div>
      </footer>
    </article>
  );
}

const vars = {
  ink: '#1a1204',
  inkSoft: '#5c4f37',
  gold: '#feb72c',
  goldBright: '#fbca5b',
  white: '#ffffff',
  rowAlt: '#fffbf0',
  border: '#ede8dc',
};

const styles = {
  page: {
    maxWidth: '820px',
    margin: '0',
    background: vars.white,
    position: 'relative',
    paddingBottom: '0',
    fontFamily: '"Montserrat", system-ui, -apple-system, sans-serif',
    color: vars.ink,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '1160px' // A4 roughly
  },
  pageInner: {
    padding: '2.25rem 2.5rem 0',
    flex: 1
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  brandBlock: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '1.2rem',
    background: 'transparent',
    color: vars.ink,
    padding: '0',
    minWidth: '0'
  },
  brandIcon: {
    width: '140px',
    height: 'auto',
    maxHeight: '85px',
    borderRadius: '0',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    fontSize: '2rem',
    fontWeight: '700',
    flexShrink: '0'
  },
  brandText: {},
  brandTextStrong: {
    display: 'block',
    fontSize: '1.15rem',
    letterSpacing: '0.01em',
    fontWeight: '800',
    marginTop: '0'
  },
  brandTextSpan: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '400',
    color: vars.inkSoft,
    marginTop: '0.2rem',
    letterSpacing: '0.01em'
  },
  docTitleBlock: {
    textAlign: 'right',
    paddingTop: '0.25rem'
  },
  h1: {
    margin: '0',
    fontSize: '1.6rem',
    fontWeight: '700',
    letterSpacing: '0.02em',
    color: vars.ink,
    lineHeight: '1'
  },
  docNum: {
    marginTop: '0.45rem',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: vars.inkSoft
  },
  labelGold: {
    fontSize: '0.65rem',
    fontWeight: '600',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: vars.gold,
    marginBottom: '0.35rem'
  },
  clientDates: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1.75rem',
    alignItems: 'flex-start'
  },
  clientName: {
    fontSize: '1.25rem',
    fontWeight: '400',
    margin: '0 0 0.25rem',
    color: vars.ink
  },
  clientRole: {
    fontSize: '0.8rem',
    color: vars.inkSoft,
    fontWeight: '500',
    margin: '0'
  },
  datesCol: {
    textAlign: 'right',
    fontSize: '0.8rem',
    lineHeight: '1.65',
    color: vars.inkSoft,
    paddingTop: '1.5rem'
  },
  twoCols: {
    display: 'flex',
    gap: '4rem',
    marginBottom: '1.75rem'
  },
  detailLines: {
    fontSize: '0.8rem',
    lineHeight: '1.75',
    color: vars.inkSoft
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.78rem',
    marginBottom: '1.25rem'
  },
  th: {
    background: vars.ink,
    color: vars.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '0.65rem 0.5rem',
    textAlign: 'left'
  },
  td: {
    padding: '0.55rem 0.5rem',
    color: vars.inkSoft,
    borderBottom: `1px solid ${vars.border}`
  },
  tr: {
    background: vars.white
  },
  trAlt: {
    background: vars.rowAlt
  },
  totalsWrap: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '2rem'
  },
  totals: {
    width: 'min(320px, 100%)',
    fontSize: '0.82rem'
  },
  totalsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.35rem 0',
    color: vars.inkSoft
  },
  amt: {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums'
  },
  totalsDivider: {
    height: '1px',
    background: vars.ink,
    margin: '0.4rem 0 0.5rem',
    opacity: '0.35'
  },
  taxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.35rem 0',
    color: vars.inkSoft,
    fontSize: '0.82rem'
  },
  pct: {
    textAlign: 'right'
  },
  totalBar: {
    marginTop: '0.65rem',
    background: vars.ink,
    color: vars.white,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.65rem 0.85rem',
    fontWeight: '700',
    fontSize: '0.88rem',
    letterSpacing: '0.04em'
  },
  termsBlock: {
    maxWidth: '62%',
    marginBottom: '2.5rem'
  },
  p: {
    margin: '0 0 1.1rem',
    fontSize: '0.72rem',
    lineHeight: '1.65',
    color: vars.inkSoft
  },
  signature: {
    marginTop: '1.25rem'
  },
  signatureLine: {
    borderBottom: `1px dotted ${vars.ink}`,
    maxWidth: '220px',
    marginBottom: '0.35rem'
  },
  signatureName: {
    fontSize: '0.7rem',
    color: vars.inkSoft
  },
  footer: {
    marginTop: 'auto'
  },
  footerStrip: {
    borderTop: `1px solid ${vars.border}`,
    padding: '1.25rem 2.5rem 1.5rem',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  footerIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: vars.ink,
    color: vars.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1rem',
    flexShrink: '0'
  },
  footerMain: {
    textAlign: 'right',
    fontSize: '0.72rem',
    lineHeight: '1.6',
    color: vars.inkSoft
  },
  footerCta: {
    display: 'inline-block',
    marginTop: '0.65rem',
    background: vars.goldBright,
    color: vars.ink,
    fontWeight: '700',
    fontSize: '0.78rem',
    padding: '0.45rem 1rem',
    letterSpacing: '0.02em'
  },
  footerBar: {
    height: '12px',
    background: vars.ink,
    width: '100%'
  }
};
