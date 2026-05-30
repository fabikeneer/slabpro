import { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import "react-datepicker/dist/react-datepicker.css";
import api from '../utils/api';
import { useFetch } from '../hooks/useFetch';
import { useConfiguracion } from '../hooks/useConfiguracion';
import {
    exportarReportePDFProfesional,
    descargarComprobanteProfesional,
    generarRecibosMultiplesPDF,
    pagoARecibo,
    empleadoARecibo,
    comprobanteARecibo,
} from '../utils/nominaPdf';
import { toastSuccess, toastError, confirmAction } from '../utils/alerts';

const fmtUSD = (n) => `$${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
const fmtBs  = (n) => `Bs. ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

// Extrae DD/MM/YYYY directo del string ISO sin depender de timezone del navegador
const fmtDate = (d) => {
  if (!d) return '-';
  const s = typeof d === 'string' ? d : d.toISOString?.() ?? String(d);
  const [yyyy, mm, dd] = s.slice(0, 10).split('-');
  if (!yyyy || !mm || !dd) return '-';
  return `${dd}/${mm}/${yyyy}`;
};

registerLocale('es', es);
const PERIODOS = [
  { label: 'Esta semana',  value: 'semana' },
  { label: 'Este mes',     value: 'mes' },
  { label: 'Todos',        value: 'todos' },
  { label: 'Personalizado',value: 'custom' },
];

function getRange(periodo) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  let inicio = new Date(hoy);
  let fin = new Date(hoy);
  fin.setHours(23, 59, 59, 999);
  
  if (periodo === 'semana') {
    inicio.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes
  } else if (periodo === 'mes') {
    inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  } else if (periodo === 'todos') {
    inicio = new Date(2020, 0, 1); // Fecha antigua
  } else {
    inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }
  
  inicio.setHours(0, 0, 0, 0);
  return { inicio, fin };
}

export default function NominaPage() {
    const [activeTab, setActiveTab] = useState('pagos'); // 'pagos' | 'personal'

    // ESTADOS PAGOS Y REPORTES
    const [periodo, setPeriodo] = useState('mes');
    const [startDate, setStartDate] = useState(getRange('mes').inicio);
    const [endDate, setEndDate]   = useState(getRange('mes').fin);
    const [idEmpleado, setIdEmpleado] = useState('');
    const [busqEmpleado, setBusqEmpleado] = useState('');
    const [showDropEmp, setShowDropEmp] = useState(false);
    const [reporte, setReporte] = useState(null);
    const [loading, setLoading]   = useState(false);
    
    // Estados Compartidos (SRP aplicados a través del custom hook)
    const { data: empData, refetch: refetchEmp } = useFetch('/api/nomina/empleados');
    const { data: proyData } = useFetch('/api/nomina/proyectos');
    const { configData: configEmpresa } = useConfiguracion();
    
    const empleados = empData?.data || [];
    const proyectos = proyData || [];

    // Estados Pagos
    const [loadingPago, setLoadingPago] = useState(false);
    const [nuevoPago, setNuevoPago] = useState({
        id_empleado: '',
        id_proyecto: '',
        monto_usd: '',
        tasa_dia: 36, // Valor por defecto
        concepto: '',
        fecha_pago: new Date()
    });
    const [editandoPagoId, setEditandoPagoId] = useState(null);
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
    const [selectedPagoIds, setSelectedPagoIds] = useState([]);
    const [selectedEmpIds, setSelectedEmpIds] = useState([]);

    const fetchExchangeRate = async (force = false) => {
        try {
            setSyncingRate(true);
            if (force) {
                await api.post('/api/exchange-rate/force');
            }
            const { data } = await api.get('/api/exchange-rate');
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
            let actualInicio = startDate;
            let actualFin = endDate;
            if (periodo !== 'custom') {
                const range = getRange(periodo);
                actualInicio = range.inicio;
                actualFin = range.fin;
                setStartDate(actualInicio);
                setEndDate(actualFin);
            }

            const { data } = await api.get('/api/nomina/reporte', {
                params: {
                    id: idEmpleado,
                    inicio: actualInicio.toISOString(),
                    fin: actualFin.toISOString()
                }
            });
            setReporte(data);
            setSelectedPagoIds((data.pagos || []).map(p => p.id));
        } catch (error) {
            console.error('Error obteniendo reporte:', error);
            const errMsg = error.response?.data?.error || error.message || 'Error al generar el reporte';
            toastError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    // Auto load reporte en montura
    useEffect(() => {
        obtenerReporte();
        // eslint-disable-next-line
    }, [periodo, idEmpleado]);

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
            const d = nuevoPago.fecha_pago instanceof Date ? nuevoPago.fecha_pago : new Date(nuevoPago.fecha_pago);
            const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const payload = {
                ...nuevoPago,
                fecha_pago: localDate,
                es_externo: esExterno,
                beneficiario: esExterno ? externo.beneficiario : undefined,
            };
            // Si es externo, forzar concepto a incluir descripcion del servicio si no hay concepto
            if (esExterno && externo.descripcion && !nuevoPago.concepto) {
                payload.concepto = externo.descripcion;
            }

            if (editandoPagoId) {
                await api.put(`/api/nomina/pago/${editandoPagoId}`, payload);
                toastSuccess('Pago actualizado correctamente');
            } else {
                await api.post('/api/nomina/registrar', payload);
                toastSuccess('Pago registrado correctamente');
            }
            
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
            
            setEditandoPagoId(null);
            setNuevoPago({ id_empleado: '', id_proyecto: '', monto_usd: '', tasa_dia: nuevoPago.tasa_dia, concepto: '', fecha_pago: new Date() });
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

    const editarPago = (pago) => {
        setEditandoPagoId(pago.id);
        const esExt = !pago.id_empleado;
        setEsExterno(esExt);
        setNuevoPago({
            id_empleado: pago.id_empleado || '',
            id_proyecto: pago.id_proyecto || '',
            monto_usd: pago.monto_usd,
            tasa_dia: pago.tasa_dia,
            concepto: pago.concepto,
            fecha_pago: pago.fecha_pago ? (() => { const d = new Date(pago.fecha_pago); return isNaN(d) ? new Date() : d; })() : new Date()
        });
        if (esExt) {
            setExterno({ beneficiario: pago.beneficiario || '', descripcion: pago.concepto });
        } else {
            setExterno({ beneficiario: '', descripcion: '' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicionPago = () => {
        setEditandoPagoId(null);
        setEsExterno(false);
        setNuevoPago({ id_empleado: '', id_proyecto: '', monto_usd: '', tasa_dia: nuevoPago.tasa_dia, concepto: '', fecha_pago: new Date() });
        setExterno({ beneficiario: '', descripcion: '' });
    };

    const exportarReportePDF = () => {
        exportarReportePDFProfesional(reporte, startDate, endDate, idEmpleado, empleados, configEmpresa);
    };

    const togglePagoSeleccion = (id) => {
        setSelectedPagoIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleTodosPagos = () => {
        if (!reporte?.pagos?.length) return;
        const todos = reporte.pagos.map(p => p.id);
        setSelectedPagoIds(prev => (prev.length === todos.length ? [] : todos));
    };

    const generarRecibosDesdeReporte = () => {
        if (!reporte?.pagos?.length) {
            toastError('Primero genera un reporte con pagos.');
            return;
        }
        const pagosSel = reporte.pagos.filter(p => selectedPagoIds.includes(p.id));
        if (pagosSel.length === 0) {
            toastError('Selecciona al menos un pago para generar recibos.');
            return;
        }
        const recibos = pagosSel.map(p => pagoARecibo(p, startDate, endDate));
        const ok = generarRecibosMultiplesPDF(recibos, {
            filename: `Recibos_Nomina_${startDate.toLocaleDateString('es-VE').replace(/\//g, '-')}.pdf`,
        });
        if (ok) toastSuccess(`${recibos.length} recibo(s) generados (3 por hoja).`);
    };

    const toggleEmpSeleccion = (id) => {
        setSelectedEmpIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleTodosEmpleados = () => {
        const ids = empleadosFiltrados.map(e => e.id);
        setSelectedEmpIds(prev => (prev.length === ids.length && ids.length > 0 ? [] : ids));
    };

    const generarRecibosDesdePersonal = () => {
        const lista = empleadosFiltrados.filter(e => selectedEmpIds.includes(e.id));
        if (lista.length === 0) {
            toastError('Selecciona al menos un empleado del directorio.');
            return;
        }
        const recibos = lista.map(emp => empleadoARecibo(emp, startDate, endDate));
        const ok = generarRecibosMultiplesPDF(recibos, {
            filename: `Recibos_Personal_${new Date().toLocaleDateString('es-VE').replace(/\//g, '-')}.pdf`,
        });
        if (ok) toastSuccess(`${recibos.length} recibo(s) en blanco generados (3 por hoja).`);
    };

    const generarRecibosPagoRecienGuardado = () => {
        if (!pagoGuardado) return;
        const recibo = comprobanteARecibo(pagoGuardado, startDate, endDate);
        generarRecibosMultiplesPDF([recibo], {
            filename: `Recibo_${(pagoGuardado.empleadoNombre || 'pago').replace(/\s+/g, '_')}.pdf`,
        });
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
                await api.put(`/api/nomina/empleados/${formEmp.id}`, payload);
                toastSuccess('Empleado actualizado');
            } else {
                await api.post('/api/nomina/empleados', payload);
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
            await api.delete(`/api/nomina/empleados/${id}`);
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
                        <div className="form-group" style={{ flex: '1 1 200px', position: 'relative' }}>
                            <label className="form-label">Trabajador (Reporte):</label>
                            <div style={{ position: 'relative' }}>
                                <svg style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ paddingLeft: 32 }}
                                    placeholder={idEmpleado ? (empleados.find(e => String(e.id) === String(idEmpleado))?.nombre || 'Todos los Empleados') : 'Todos los Empleados'}
                                    value={busqEmpleado}
                                    onChange={e => { setBusqEmpleado(e.target.value); setShowDropEmp(true); }}
                                    onFocus={() => setShowDropEmp(true)}
                                    onBlur={() => setTimeout(() => setShowDropEmp(false), 200)}
                                />
                            </div>
                            {showDropEmp && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', zIndex: 100, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                                    <div
                                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: idEmpleado === '' ? 'var(--primary)' : 'var(--text-primary)', background: idEmpleado === '' ? 'rgba(254,183,44,0.1)' : 'transparent' }}
                                        onMouseDown={() => { setIdEmpleado(''); setBusqEmpleado(''); setShowDropEmp(false); }}
                                    >Todos los Empleados</div>
                                    {empleados
                                        .filter(emp => !busqEmpleado || emp.nombre.toLowerCase().includes(busqEmpleado.toLowerCase()))
                                        .map(emp => (
                                            <div
                                                key={emp.id}
                                                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: String(idEmpleado) === String(emp.id) ? 'var(--primary)' : 'var(--text-primary)', background: String(idEmpleado) === String(emp.id) ? 'rgba(254,183,44,0.1)' : 'transparent' }}
                                                onMouseDown={() => { setIdEmpleado(emp.id); setBusqEmpleado(emp.nombre); setShowDropEmp(false); }}
                                            >{emp.nombre}</div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                        <div className="form-group" style={{ flex: '1 1 200px' }}>
                            <label className="form-label">Período:</label>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {PERIODOS.map(p => (
                                    <button 
                                        key={p.value} 
                                        onClick={() => setPeriodo(p.value)}
                                        style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: `1px solid ${periodo === p.value ? 'var(--accent-blue)' : 'var(--border)'}`, background: periodo === p.value ? 'rgba(59,130,246,0.12)' : 'var(--bg-input)', color: periodo === p.value ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {periodo === 'custom' && (
                            <>
                                <div className="form-group" style={{ flex: '1 1 140px' }}>
                                    <label className="form-label">Desde:</label>
                                    <DatePicker 
                                        selected={startDate} 
                                        onChange={(date) => setStartDate(date)} 
                                        className="form-input"
                                        dateFormat="dd/MM/yyyy"
                                        locale="es"
                                        popperPlacement="bottom-start"
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
                                        popperPlacement="bottom-start"
                                    />
                                </div>
                            </>
                        )}
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
                            <h3 className="card-title">{editandoPagoId ? 'Editar Pago' : 'Registrar Nuevo Pago'}</h3>
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
                                <label className="form-label">Fecha de Pago <span className="required">*</span></label>
                                <DatePicker 
                                    selected={nuevoPago.fecha_pago instanceof Date ? nuevoPago.fecha_pago : new Date()} 
                                    onChange={d => setNuevoPago({...nuevoPago, fecha_pago: d})} 
                                    className="form-input" 
                                    dateFormat="dd/MM/yyyy" 
                                    locale="es" 
                                    popperPlacement="bottom-start" 
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

                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 12 }}>
                                {editandoPagoId && (
                                    <button type="button" className="btn btn-ghost" onClick={cancelarEdicionPago} disabled={loadingPago}>
                                        Cancelar
                                    </button>
                                )}
                                <button type="submit" className="btn btn-primary" disabled={loadingPago}>
                                    {loadingPago ? <span className="spinner"></span> : (editandoPagoId ? 'Actualizar Pago' : 'Guardar Pago')}
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
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => descargarComprobante(pagoGuardado)}
                                        className="btn btn-success"
                                    >
                                        Comprobante detallado
                                    </button>
                                    <button
                                        type="button"
                                        onClick={generarRecibosPagoRecienGuardado}
                                        className="btn btn-primary"
                                    >
                                        Recibo de pago (formulario)
                                    </button>
                                </div>
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
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={generarRecibosDesdeReporte}
                                        className="btn btn-success"
                                        disabled={!selectedPagoIds.length}
                                        title="Recibos tipo formulario físico, 3 por hoja A4"
                                    >
                                        Recibos múltiples ({selectedPagoIds.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={exportarReportePDF}
                                        className="btn btn-primary"
                                        style={{ boxShadow: '0 0 10px rgba(59,130,246,0.5)' }}
                                    >
                                        Exportar reporte PDF
                                    </button>
                                </div>
                            </div>

                            {reporte.pagos && reporte.pagos.length > 0 ? (
                                <div className="card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
                                    <div className="lineas-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                                        <table className="list-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 36 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPagoIds.length === reporte.pagos.length && reporte.pagos.length > 0}
                                                            onChange={toggleTodosPagos}
                                                            title="Seleccionar todos"
                                                            style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                                                        />
                                                    </th>
                                                    <th>Fecha</th>
                                                    <th>Trabajador</th>
                                                    <th>Concepto</th>
                                                    <th>Proyecto</th>
                                                    <th>Monto ($)</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reporte.pagos.map((pago) => (
                                                    <tr key={pago.id}>
                                                        <td data-label="Seleccionar">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPagoIds.includes(pago.id)}
                                                                onChange={() => togglePagoSeleccion(pago.id)}
                                                                style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                                                            />
                                                        </td>
                                                        <td data-label="Fecha">{fmtDate(pago.fecha_pago)}</td>
                                                        <td data-label="Trabajador">{pago.trabajador || 'Desconocido'}</td>
                                                        <td data-label="Concepto">{pago.concepto}</td>
                                                        <td data-label="Proyecto">{pago.proyecto || 'Desconocido'}</td>
                                                        <td data-label="Monto USD" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            {fmtUSD(pago.monto_usd)}
                                                        </td>
                                                        <td data-label="Acciones">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => editarPago(pago)}
                                                                className="btn btn-ghost"
                                                                style={{ padding: '4px 8px', color: 'var(--accent-blue)', fontSize: 12 }}
                                                            >
                                                                Editar
                                                            </button>
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

                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="card-header">
                            <h3 className="card-title">Recibos de pago (impresión)</h3>
                            <div className="card-subtitle">Formularios en blanco para firmar — 3 recibos por hoja A4</div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: '1 1 140px' }}>
                                <label className="form-label">Semana desde:</label>
                                <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} className="form-input" dateFormat="dd/MM/yyyy" locale="es" popperPlacement="bottom-start" />
                            </div>
                            <div className="form-group" style={{ flex: '1 1 140px' }}>
                                <label className="form-label">Semana hasta:</label>
                                <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} className="form-input" dateFormat="dd/MM/yyyy" locale="es" popperPlacement="bottom-start" />
                            </div>
                            <button type="button" onClick={toggleTodosEmpleados} className="btn btn-ghost" style={{ padding: '11px 16px' }}>
                                {selectedEmpIds.length === empleadosFiltrados.length && empleadosFiltrados.length > 0 ? 'Quitar selección' : 'Seleccionar visibles'}
                            </button>
                            <button type="button" onClick={generarRecibosDesdePersonal} className="btn btn-success" disabled={!selectedEmpIds.length} style={{ padding: '11px 20px' }}>
                                Generar recibos ({selectedEmpIds.length})
                            </button>
                        </div>
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
                                        <th style={{ width: 36 }}>
                                            <input
                                                type="checkbox"
                                                checked={empleadosFiltrados.length > 0 && selectedEmpIds.length === empleadosFiltrados.length}
                                                onChange={toggleTodosEmpleados}
                                                title="Seleccionar todos"
                                                style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                                            />
                                        </th>
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
                                                <td data-label="Seleccionar">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEmpIds.includes(emp.id)}
                                                        onChange={() => toggleEmpSeleccion(emp.id)}
                                                        style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                                                    />
                                                </td>
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
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
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
