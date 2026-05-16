import AjustesEmpresa from '../components/AjustesEmpresa';

export default function EmpresaPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Empresa
          </h2>
          <p>Configura los datos globales y la identidad de la empresa.</p>
        </div>
      </div>
      <AjustesEmpresa />
    </div>
  );
}
