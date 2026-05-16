import { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';
import { useFetch } from '../hooks/useFetch';
import { exportarReportePDFProfesional, descargarComprobanteProfesional } from '../utils/nominaPdf';
import { toastSuccess, toastError, confirmAction } from '../utils/alerts';

const fmtUSD = (n) => `$${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
const fmtBs  = (n) => `Bs. ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

registerLocale('es', es);

export default function NominaPage() {
    const [activeTab, setActiveTab] = useState('pagos'); // 'pagos' | 'personal'

    // ESTADOS PAGOS Y REPORTES
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate]   = useState(new Date());
    const [idEmpleado, setIdEmpleado] = useState('');
    const [reporte, setReporte]   = useState(null);
    const [loading, setLoading]   = useState(false);
    
    // Estados Compartidos (SRP aplicados a través del custom hook)
    const { data: empData, refetch: refetchEmp } = useFetch('/api/nomina/empleados');
    const { data: proyData } = useFetch('/api/nomina/proyectos');
    const { data: configData } = useFetch('/api/config');
    const configEmpresa = configData?.data || null;
    
    const empleados = empData || [];
    const proyectos = proyData || [];

    // Estados Pagos
    const [loadingPago, setLoadingPago] = useState(false);
    const [nuevoPago, setNuevoPago] = useState({
        id_empleado: '',
        id_proyecto: '',
        monto_usd: '',
        tasa_dia: 36, // Valor por defecto
        concepto: ''
    });
    const [pagoGuardado, setPagoGuardado] = useState(null);
    const [esExterno, setEsExterno] = useState(false);
    const [externo, setExterno] = useState({ beneficiario: '', descripcion: '' });

    // CSS animación fade-in para campos externos
    const fadeInStyle = {
        animation: 'fadeInDown 0.3s ease',
    };

    const ROLES = ['Ayudante', 'Instalador', 'Encargado'];
    const [searchEmp, setSearchEmp] = useState('');
    const [formEmp, setFormEmp] = useState({
        id: null,
        nombre: '',
        cedula_rif: '',
        telefono: '',
        rol: []
    });
    const [loadingEmp, setLoadingEmp] = useState(false);

    const [syncingRate, setSyncingRate] = useState(false);

    const fetchExchangeRate = async (force = false) => {
        try {
            setSyncingRate(true);
            if (force) {
                await axios.post('/api/exchange-rate/force');
            }
            const { data } = await axios.get('/api/exchange-rate');
            if (data.rate) {
                setNuevoPago(prev => ({ ...prev, tasa_dia: data.rate }));
            }
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
        } finally {
            setSyncingRate(false);
        }
    };

    useEffect(() => {
        fetchExchangeRate();
    }, []);

    // -------- LÓGICA PAGOS --------
    const obtenerReporte = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/nomina/reporte', {
                params: {
                    id: idEmpleado,
                    inicio: startDate.toISOString(),
                    fin: endDate.toISOString()
                }
            });
            setReporte(data);
        } catch (error) {
            console.error('Error obteniendo reporte:', error);
            const errMsg = error.response?.data?.error || error.message || 'Error al generar el reporte';
            toastError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const registrarPago = async (e) => {
        e.preventDefault();
        if (esExterno) {
            if (!externo.beneficiario || !nuevoPago.monto_usd || !nuevoPago.concepto) {
                toastError('Para pagos externos: Nombre del Beneficiario, Monto y Concepto son obligatorios');
                return;
            }
        } else {
            if (!nuevoPago.id_empleado || !nuevoPago.monto_usd || !nuevoPago.concepto) {
                toastError('Por favor complete todos los campos requeridos');
                return;
            }
        }

        setLoadingPago(true);
        try {
            const payload = {
                ...nuevoPago,
                fecha_pago: new Date().toISOString().split('T')[0],
                es_externo: esExterno,
                beneficiario: esExterno ? externo.beneficiario : undefined,
            };
            // Si es externo, forzar concepto a incluir descripcion del servicio si no hay concepto
            if (esExterno && externo.descripcion && !nuevoPago.concepto) {
                payload.concepto = externo.descripcion;
            }
            await axios.post('/api/nomina/registrar', payload);
            
            // Preparar datos para el comprobante
            const empleadoInfo = empleados.find(e => String(e.id) === String(nuevoPago.id_empleado));
            const proyectoInfo = proyectos.find(p => String(p.id) === String(nuevoPago.id_proyecto));
            
            const datosComprobante = {
                fecha: new Date().toLocaleDateString('es-VE'),
                empleadoNombre: esExterno ? externo.beneficiario : (empleadoInfo?.nombre || 'Desconocido'),
                empleadoCedula: esExterno ? 'Externo' : (empleadoInfo?.cedula_rif || 'N/A'),
                empleadoRol: esExterno ? 'Servicio Externo' : (empleadoInfo?.rol || 'N/A'),
                proyectoNombre: proyectoInfo ? proyectoInfo.nombre : 'Sin proyecto asignado',
                concepto: nuevoPago.concepto,
                monto_usd: nuevoPago.monto_usd,
                tasa_dia: nuevoPago.tasa_dia,
                montoBsCalculado: (parseFloat(nuevoPago.monto_usd) || 0) * (parseFloat(nuevoPago.tasa_dia) || 0)
            };

            setPagoGuardado(datosComprobante);
            
            setNuevoPago({ id_empleado: '', id_proyecto: '', monto_usd: '', tasa_dia: nuevoPago.tasa_dia, concepto: '' });
            setExterno({ beneficiario: '', descripcion: '' });
            setEsExterno(false);
            if (reporte) obtenerReporte();
        } catch (error) {
            console.error('Error registrando pago:', error);
            const errMsg = error.response?.data?.error || error.message || 'Error al registrar el pago';
            toastError(errMsg);
        } finally {
            setLoadingPago(false);
        }
    };

    const descargarComprobante = (pago) => {
        descargarComprobanteProfesional(pago, configEmpresa);
    };

    const exportarReportePDF = () => {
        exportarReportePDFProfesional(reporte, startDate, endDate, idEmpleado, empleados, configEmpresa);
    };

    const montoBsCalculado = (parseFloat(nuevoPago.monto_usd) || 0) * (parseFloat(nuevoPago.tasa_dia) || 0);
    const selectedEmp = empleados.find(e => String(e.id) === String(nuevoPago.id_empleado));

    // -------- LÓGICA PERSONAL --------
    const toggleRole = (r) => {
        setFormEmp(prev => ({
            ...prev,
            rol: prev.rol.includes(r) ? prev.rol.filter(x => x !== r) : [...prev.rol, r]
        }));
    };

    const guardarEmpleado = async (e) => {
        e.preventDefault();
        if (!formEmp.nombre) {
            toastError('El nombre es obligatorio');
            return;
        }
        setLoadingEmp(true);
        try {
            const payload = {
                ...formEmp,
                rol: formEmp.rol.join(', ')
            };

            if (formEmp.id) {
                await axios.put(`/api/nomina/empleados/${formEmp.id}`, payload);
                toastSuccess('Empleado actualizado');
            } else {
                await axios.post('/api/nomina/empleados', payload);
                toastSuccess('Empleado registrado');
            }
            setFormEmp({ id: null, nombre: '', cedula_rif: '', telefono: '', rol: [] });
            refetchEmp(true); // Recargar en segundo plano
        } catch (error) {
            console.error('Error guardando empleado:', error);
            toastError('Error al guardar el empleado');
        } finally {
            setLoadingEmp(false);
        }
    };

    const editarEmpleado = (emp) => {
        setFormEmp({
            id: emp.id,
            nombre: emp.nombre || '',
            cedula_rif: emp.cedula_rif || '',
            telefono: emp.telefono || '',
            rol: emp.rol ? emp.rol.split(',').map(s => s.trim()) : []
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminarEmpleado = async (id) => {
        const isConfirmed = await confirmAction('¿Eliminar empleado?', 'Esta acción no se puede deshacer.');
        if (!isConfirmed) return;
        try {
            await axios.delete(`/api/nomina/empleados/${id}`);
            toastSuccess('Empleado eliminado');
            refetchEmp(true); // Recargar en segundo plano sin spinner
        } catch (error) {
            console.error('Error eliminando empleado:', error);
            toastError(error.response?.data?.error || 'Error al eliminar el empleado');
        }
    };

    const empleadosFiltrados = empleados.filter(emp => {
        const term = searchEmp.toLowerCase();
        return (emp.nombre?.toLowerCase().includes(term) || emp.rol?.toLowerCase().includes(term));
    });

    return (
        <div>
            {/* Keyframe animation inyectada como style global */}
            <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2>Nómina y Personal</h2>
                    <p>Gestiona el personal y registra los pagos de nómina de proyectos.</p>
                </div>
                
                <div style={{ display: 'flex', gap: 8, background: 'var(--bg-card)', padding: 6, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                    <button 
                        onClick={() => setActiveTab('pagos')}
                        style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: activeTab === 'pagos' ? 'rgba(59,130,246,0.15)' : 'transparent', color: activeTab === 'pagos' ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        Pagos y Reportes
                    </button>
                    <button 
                        onClick={() => setActiveTab('personal')}
                        style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: activeTab === 'personal' ? 'rgba(59,130,246,0.15)' : 'transparent', color: activeTab === 'personal' ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        Gestión de Personal
                    </button>
                </div>
            </div>

            {activeTab === 'pagos' && (
                <>
                    {/* Buscador / Filtros Reporte */}
                    <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1 1 200px' }}>
                            <label className="form-label">Trabajador (Reporte):</label>
                            <select 
                                className="form-select"
                                value={idEmpleado}
                                onChange={(e) => setIdEmpleado(e.target.value)}
                            >
                                <option value="">Todos los Empleados</option>
                                {empleados.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: '1 1 140px' }}>
                            <label className="form-label">Desde:</label>
                            <DatePicker 
                                selected={startDate} 
                                onChange={(date) => setStartDate(date)} 
                                className="form-input"
                                dateFormat="dd/MM/yyyy"
                                locale="es"
                            />
                        </div>
                        <div className="form-group" style={{ flex: '1 1 140px' }}>
                            <label className="form-label">Hasta:</label>
                            <DatePicker 
                                selected={endDate} 
                                onChange={(date) => setEndDate(date)} 
                                className="form-input"
                                dateFormat="dd/MM/yyyy"
                                locale="es"
                            />
                        </div>
                        <button 
                            onClick={obtenerReporte}
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ padding: '11px 20px', flex: '1 1 150px', justifyContent: 'center' }}
                        >
                            {loading ? <span className="spinner"></span> : 'Generar Reporte'}
                        </button>
                    </div>

                    {/* Registro de Nuevo Pago */}
                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="card-header">
                            <h3 className="card-title">Registrar Nuevo Pago</h3>
                            <div className="card-subtitle">Asigna pagos de nómina directamente al trabajador y proyecto</div>
                        </div>
                        
                        <form onSubmit={registrarPago} className="form-grid form-grid-3">
                            <div className="form-group" style={{ gridColumn: esExterno ? '1 / -1' : 'auto' }}>
                                <label className="form-label">Trabajador <span className="required">*</span></label>
                                <select 
                                    className="form-select"
                                    value={esExterno ? '__externo__' : nuevoPago.id_empleado}
                                    onChange={(e) => {
                                        if (e.target.value === '__externo__') {
                                            setEsExterno(true);
                                            setNuevoPago({...nuevoPago, id_empleado: ''});
                                        } else {
                                            setEsExterno(false);
                                            setNuevoPago({...nuevoPago, id_empleado: e.target.value});
                                        }
                                    }}
                                >
                                    <option value="">Seleccione trabajador</option>
                                    <option value="__externo__" style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>PAGO EXTERNO</option>
                                    {empleados.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                                    ))}
                                </select>
                                {selectedEmp && !esExterno && (
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Rol: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedEmp.rol || 'Sin Rol'}</strong>
                                    </span>
                                )}
                            </div>

                            {/* Campos para Pago Externo con animación */}
                            {esExterno && (
                                <>
                                    <div className="form-group" style={{ ...fadeInStyle }}>
                                        <label className="form-label">Nombre del Beneficiario <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Nombre de la persona o empresa..."
                                            value={externo.beneficiario}
                                            onChange={(e) => setExterno({...externo, beneficiario: e.target.value})}
                                            style={{ borderColor: 'rgba(251,191,36,0.4)' }}
                                        />
                                        <span style={{ fontSize: 11, color: 'var(--accent-gold)', marginTop: 4 }}>Pago Externo — no registrado en Personal</span>
                                    </div>
                                    <div className="form-group" style={{ ...fadeInStyle }}>
                                        <label className="form-label">Descripción del Servicio</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="¿Qué trabajo realizó?..."
                                            value={externo.descripcion}
                                            onChange={(e) => setExterno({...externo, descripcion: e.target.value})}
                                            style={{ borderColor: 'rgba(251,191,36,0.4)' }}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label className="form-label">Proyecto (Opcional)</label>
                                <select 
                                    className="form-select"
                                    value={nuevoPago.id_proyecto}
                                    onChange={(e) => setNuevoPago({...nuevoPago, id_proyecto: e.target.value})}
                                >
                                    <option value="">Seleccione proyecto</option>
                                    {proyectos.map(proy => (
                                        <option key={proy.id} value={proy.id}>{proy.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Concepto <span className="required">*</span></label>
                                <input 
                                    type="text"
                                    className="form-input"
                                    placeholder="Ej: Quincena, Bono..."
                                    value={nuevoPago.concepto}
                                    onChange={(e) => setNuevoPago({...nuevoPago, concepto: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <label className="form-label" style={{ margin: 0 }}>Tasa del Día (Bs) <span className="required">*</span></label>
                                    <button 
                                        type="button" 
                                        onClick={() => fetchExchangeRate(true)}
                                        disabled={syncingRate}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: 16, padding: 0 }}
                                        title="Refrescar tasa desde Binance P2P"
                                    >
                                        {syncingRate ? '↻...' : '↻'}
                                    </button>
                                </div>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={nuevoPago.tasa_dia}
                                    onChange={(e) => setNuevoPago({...nuevoPago, tasa_dia: e.target.value})}
                                />
                                <span style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 500, marginTop: 4, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg> Tasa sincronizada con USDT (Binance P2P)
                                </span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Monto (USD) <span className="required">*</span></label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    placeholder="0.00"
                                    value={nuevoPago.monto_usd}
                                    onChange={(e) => setNuevoPago({...nuevoPago, monto_usd: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ justifyContent: 'center' }}>
                                <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Monto a pagar (Bs)</span>
                                    <span style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--accent-green)' }}>
                                        {fmtBs(montoBsCalculado)}
                                    </span>
                                </div>
                            </div>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="submit" className="btn btn-primary" disabled={loadingPago}>
                                    {loadingPago ? <span className="spinner"></span> : 'Guardar Pago'}
                                </button>
                            </div>
                        </form>

                        {pagoGuardado && (
                            <div style={{ marginTop: 24, padding: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                                <div>
                                    <h4 style={{ margin: 0, color: 'var(--accent-green)' }}>Pago registrado con éxito</h4>
                                    <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                                        Se guardó el pago de {fmtUSD(pagoGuardado.monto_usd)} para {pagoGuardado.empleadoNombre}.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => descargarComprobante(pagoGuardado)}
                                    className="btn btn-success"
                                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                    Exportar Comprobante PDF
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Resultados del Reporte */}
                    {reporte && (
                        <>
                            <div className="card" style={{ marginTop: 24, borderLeft: '4px solid var(--accent-green)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                                <div>
                                    <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>
                                        Total Nómina del Periodo: {fmtUSD(reporte.resumen.total_usd)} / {fmtBs(reporte.resumen.total_bs)}
                                    </h3>
                                </div>
                                <button 
                                    onClick={exportarReportePDF}
                                    className="btn btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 10px rgba(59,130,246,0.5)' }}
                                >
                                    Exportar PDF
                                </button>
                            </div>

                            {reporte.pagos && reporte.pagos.length > 0 ? (
                                <div className="card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
                                    <div className="lineas-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                                        <table className="list-table">
                                            <thead>
                                                <tr>
                                                    <th>Fecha</th>
                                                    <th>Trabajador</th>
                                                    <th>Concepto</th>
                                                    <th>Proyecto</th>
                                                    <th>Monto ($)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reporte.pagos.map((pago) => (
                                                    <tr key={pago.id}>
                                                        <td data-label="Fecha">{new Date(pago.fecha_pago).toLocaleDateString('es-VE')}</td>
                                                        <td data-label="Trabajador">{pago.trabajador || 'Desconocido'}</td>
                                                        <td data-label="Concepto">{pago.concepto}</td>
                                                        <td data-label="Proyecto">{pago.proyecto || 'Desconocido'}</td>
                                                        <td data-label="Monto USD" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            {fmtUSD(pago.monto_usd)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="card" style={{ marginTop: 24 }}>
                                    <div className="empty-state">
                                        <h3>No se encontraron pagos</h3>
                                        <p>No hay registros de nómina para los filtros seleccionados.</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {activeTab === 'personal' && (
                <>
                    {/* Formulario de Empleados */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">{formEmp.id ? 'Editar Empleado' : 'Agregar Nuevo Empleado'}</h3>
                            <div className="card-subtitle">Registra el personal y sus roles (Ayudante, Instalador, Encargado)</div>
                        </div>
                        
                        <form onSubmit={guardarEmpleado} className="form-grid form-grid-2" style={{ gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Nombre Completo <span className="required">*</span></label>
                                <input 
                                    type="text" 
                                    className="form-input"
                                    value={formEmp.nombre}
                                    onChange={(e) => setFormEmp({...formEmp, nombre: e.target.value})}
                                    required
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cédula <span className="required">*</span></label>
                                <input 
                                    type="text" 
                                    className="form-input"
                                    value={formEmp.cedula_rif}
                                    onChange={(e) => setFormEmp({...formEmp, cedula_rif: e.target.value.replace(/\D/g, '')})}
                                    required
                                    maxLength={10}
                                    placeholder="Ej: 12345678"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Teléfono <span className="required">*</span></label>
                                <input 
                                    type="tel" 
                                    className="form-input"
                                    value={formEmp.telefono}
                                    onChange={(e) => setFormEmp({...formEmp, telefono: e.target.value.replace(/\D/g, '')})}
                                    required
                                    maxLength={15}
                                    placeholder="Ej: 04141234567"
                                />
                            </div>
                            
                            {/* Multiselect de Roles */}
                            <div className="form-group">
                                <label className="form-label">Rol(es)</label>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                                    {ROLES.map(r => (
                                        <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: formEmp.rol.includes(r) ? '1px solid var(--accent-blue)' : '1px solid var(--border)' }}>
                                            <input 
                                                type="checkbox"
                                                checked={formEmp.rol.includes(r)}
                                                onChange={() => toggleRole(r)}
                                                style={{ accentColor: 'var(--accent-blue)' }}
                                            />
                                            <span style={{ fontSize: 13, color: formEmp.rol.includes(r) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{r}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                                {formEmp.id && (
                                    <button 
                                        type="button" 
                                        className="btn btn-ghost"
                                        onClick={() => setFormEmp({ id: null, nombre: '', cedula_rif: '', telefono: '', rol: [] })}
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button type="submit" className="btn btn-success" disabled={loadingEmp}>
                                    {loadingEmp ? <span className="spinner"></span> : (formEmp.id ? 'Actualizar Empleado' : 'Guardar Empleado')}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Buscador y Lista de Personal */}
                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="card-header" style={{ marginBottom: 0, borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <h3 className="card-title" style={{ margin: 0 }}>Directorio de Personal</h3>
                            <input 
                                type="text"
                                className="form-input"
                                style={{ flex: '1 1 250px', maxWidth: '100%' }}
                                placeholder="Buscar por nombre o rol..."
                                value={searchEmp}
                                onChange={(e) => setSearchEmp(e.target.value)}
                            />
                        </div>
                        
                        <div className="lineas-table-wrapper" style={{ marginTop: 16 }}>
                            <table className="list-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre Completo</th>
                                        <th>Cédula/RIF</th>
                                        <th>Teléfono</th>
                                        <th>Rol</th>
                                        <th style={{ textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {empleadosFiltrados.length > 0 ? (
                                        empleadosFiltrados.map(emp => (
                                            <tr key={emp.id}>
                                                <td data-label="ID">#{emp.id}</td>
                                                <td data-label="Nombre" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.nombre}</td>
                                                <td data-label="Cédula/RIF">{emp.cedula_rif || '-'}</td>
                                                <td data-label="Teléfono">{emp.telefono || '-'}</td>
                                                <td data-label="Rol">
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        {emp.rol ? emp.rol.split(',').map(r => r.trim()).filter(Boolean).map(r => (
                                                            <span key={r} className="badge badge-enviado">{r}</span>
                                                        )) : <span className="badge badge-borrador">Sin rol</span>}
                                                    </div>
                                                </td>
                                                <td data-label="Acciones" style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                        <button 
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => editarEmpleado(emp)}
                                                            title="Editar"
                                                            style={{ fontSize: 12, padding: '4px 8px' }}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button 
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => eliminarEmpleado(emp.id)}
                                                            title="Eliminar"
                                                            style={{ color: 'var(--accent-red)', fontSize: 12, padding: '4px 8px' }}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                                                No se encontraron empleados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
