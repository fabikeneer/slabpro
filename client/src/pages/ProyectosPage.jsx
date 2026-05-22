// pages/ProyectosPage.jsx — Con pestañas: Proyectos + Presupuestos
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useFetch } from '../hooks/useFetch';
import Pagination from '../components/Pagination';
import { useConfiguracion } from '../hooks/useConfiguracion';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale/es';
import { generarFichaProyectoPDF } from '../utils/proyectoPDF';
import { toastSuccess, toastError, confirmAction } from '../utils/alerts';

registerLocale('es', es);

const fmtUSD = (n) => `$${Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2})}`;
const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-VE') : '—';

const ESTATUS_LIST  = ['Activo', 'En Proceso', 'Finalizado'];
const ESTATUS_BADGE = { 'Activo':'badge-borrador','En Proceso':'badge-enviado','Finalizado':'badge-vencido' };

const PRES_BADGE = { borrador:'badge-borrador',enviado:'badge-enviado',aprobado:'badge-aprobado',rechazado:'badge-rechazado',vencido:'badge-vencido' };
const PRES_LABEL = { borrador:'Borrador',enviado:'Enviado',aprobado:'Aprobado',rechazado:'Rechazado',vencido:'Vencido' };

const FORM_INIT = { nombre_proyecto:'', nombre_cliente:'',rif_cedula:'',descripcion_obra:'',estatus:'Activo',fecha_inicio:new Date().toISOString().split('T')[0],monto_usd:'' };

function Modal({ titulo, onClose, children }) {
  useEffect(()=>{ const f=(e)=>{ if(e.key==='Escape') onClose(); }; window.addEventListener('keydown',f); return ()=>window.removeEventListener('keydown',f); },[onClose]);
  return (
    <div className="modal-overlay" onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{titulo}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormProyecto({ form, setForm, onSubmit, loading, modoEdicion }) {
  return (
    <form onSubmit={onSubmit}>
      <div style={{marginBottom:20,padding:'10px 14px',background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:'var(--radius-md)'}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--accent-blue)',textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>Datos Básicos</div>
        <div className="form-grid form-grid-2" style={{gap:14}}>
          <div className="form-group" style={{gridColumn:'1 / -1'}}>
            <label className="form-label">Nombre del Proyecto <span className="required">*</span></label>
            <input type="text" className="form-input" placeholder="Ej: Cocina Granito Italo" value={form.nombre_proyecto} onChange={(e)=>setForm({...form,nombre_proyecto:e.target.value})} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre del Cliente <span className="required">*</span></label>
            <input type="text" className="form-input" placeholder="Ej: Familia García" value={form.nombre_cliente} onChange={(e)=>setForm({...form,nombre_cliente:e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">RIF / Cédula</label>
            <input type="text" className="form-input" placeholder="J-12345678-9" value={form.rif_cedula} onChange={(e)=>setForm({...form,rif_cedula:e.target.value})} />
          </div>
        </div>
      </div>
      <div style={{marginBottom:20,padding:'10px 14px',background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:'var(--radius-md)'}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--accent-green)',textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>Datos del Proyecto</div>
        <div className="form-grid form-grid-2" style={{gap:14}}>
          <div className="form-group">
            <label className="form-label">Estatus</label>
            <select className="form-select" value={form.estatus} onChange={(e)=>setForm({...form,estatus:e.target.value})}>
              {ESTATUS_LIST.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha de Inicio</label>
            <DatePicker 
              selected={form.fecha_inicio ? new Date(form.fecha_inicio + 'T12:00:00Z') : null}
              onChange={(date) => {
                 if(date) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    setForm({...form, fecha_inicio: `${y}-${m}-${d}`});
                 } else {
                    setForm({...form, fecha_inicio: ''});
                 }
              }}
              className="form-input"
              dateFormat="dd/MM/yyyy"
              locale="es"
              placeholderText="DD/MM/YYYY"
            />
          </div>
          <div className="form-group" style={{gridColumn:'1 / -1'}}>
            <label className="form-label">Monto USD</label>
            <input type="number" step="0.01" className="form-input" placeholder="Ej: 1500.00" value={form.monto_usd} onChange={(e)=>setForm({...form,monto_usd:e.target.value})} />
          </div>
          <div className="form-group" style={{gridColumn:'1 / -1'}}>
            <label className="form-label">Descripción de la Obra</label>
            <textarea className="form-textarea" rows={3} placeholder="Tipo de piedra, área, alcance..." value={form.descripcion_obra} onChange={(e)=>setForm({...form,descripcion_obra:e.target.value})} />
          </div>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <span className="spinner"/> : modoEdicion ? 'Guardar Cambios' : 'Crear Proyecto'}
        </button>
      </div>
    </form>
  );
}

export default function ProyectosPage() {
  const [activeTab,    setActiveTab]    = useState('proyectos');
  
  const [pageProy, setPageProy] = useState(1);
  const [pagePres, setPagePres] = useState(1);
  const limit = 20;

  // Custom Hook para peticiones en segundo plano (SRP)
  const { data: proyData, loading: loadingProy, refetch: refetchProy } = useFetch('/api/proyectos', { page: pageProy, limit }, false);
  const { data: presData, loading: loadingPres, refetch: refetchPres } = useFetch('/api/presupuestos', { page: pagePres, limit }, false);
  const { configData: configEmpresa } = useConfiguracion();
  
  const proyectos = proyData?.data || [];
  const paginationProy = proyData?.pagination;
  const presupuestos = presData?.data || [];
  const paginationPres = presData?.pagination;
  
  useEffect(() => {
    if (activeTab === 'proyectos') refetchProy(true);
  }, [activeTab, pageProy]);

  useEffect(() => {
    if (activeTab === 'presupuestos') refetchPres(true);
  }, [activeTab, pagePres]);

  const [loadingForm,  setLoadingForm]  = useState(false);
  const [loadingPDF,   setLoadingPDF]   = useState(null);
  const [filtroEstatus,setFiltroEstatus]= useState('Todos');
  const [filtroPres,   setFiltroPres]   = useState('Todos');
  const [selectedId,   setSelectedId]   = useState(null);
  const [modalNuevo,   setModalNuevo]   = useState(false);
  const [modalEditar,  setModalEditar]  = useState(null);
  const [form,         setForm]         = useState(FORM_INIT);
  const [expandedProyId, setExpandedProyId] = useState(null);
  const [expandedPresId, setExpandedPresId] = useState(null);
  const [busquedaProy, setBusquedaProy] = useState('');
  const [busquedaPres, setBusquedaPres] = useState('');

  const toggleProyExpand = (id) => setExpandedProyId(expandedProyId === id ? null : id);
  const togglePresExpand = (id) => setExpandedPresId(expandedPresId === id ? null : id);


  const termProy = busquedaProy.toLowerCase();
  const proyectosFiltrados = proyectos.filter(p => {
    if (filtroEstatus !== 'Todos' && p.estatus !== filtroEstatus) return false;
    if (termProy) return (p.nombre_proyecto && p.nombre_proyecto.toLowerCase().includes(termProy)) || (p.nombre_cliente && p.nombre_cliente.toLowerCase().includes(termProy));
    return true;
  });

  const termPres = busquedaPres.toLowerCase();
  const presFiltrados = presupuestos.filter(p => {
    if (filtroPres !== 'Todos' && p.estatus !== filtroPres) return false;
    if (termPres) return (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(termPres)) || (p.proyecto_descripcion && p.proyecto_descripcion.toLowerCase().includes(termPres)) || (p.numero_presupuesto && p.numero_presupuesto.toLowerCase().includes(termPres));
    return true;
  });

  const stats = {
    total:      proyectos.length,
    activos:    proyectos.filter(p=>p.estatus==='Activo').length,
    enProceso:  proyectos.filter(p=>p.estatus==='En Proceso').length,
    finalizados:proyectos.filter(p=>p.estatus==='Finalizado').length,
  };

  const handleCrear = async(e)=>{ e.preventDefault(); setLoadingForm(true); try{ const {data}=await api.post('/api/proyectos',form); if(data.success){toastSuccess(data.message);setModalNuevo(false);setForm(FORM_INIT);refetchProy(true);} }catch(err){toastError(err.response?.data?.message||'Error');} finally{setLoadingForm(false);} };

  const abrirEditar = (p)=>{ setForm({nombre_proyecto:p.nombre_proyecto||'',nombre_cliente:p.nombre_cliente||'',rif_cedula:p.rif_cedula||'',descripcion_obra:p.descripcion_obra||'',estatus:p.estatus||'Activo',fecha_inicio:p.fecha_inicio?new Date(p.fecha_inicio).toISOString().split('T')[0]:new Date().toISOString().split('T')[0],monto_usd:p.monto_usd||''}); setModalEditar(p); };

  const handleEditar = async(e)=>{ e.preventDefault(); setLoadingForm(true); try{ const {data}=await api.put(`/api/proyectos/${modalEditar.id_proyecto}`,form); if(data.success){toastSuccess('Proyecto actualizado');setModalEditar(null);setForm(FORM_INIT);refetchProy(true);} }catch(err){toastError(err.response?.data?.message||'Error');} finally{setLoadingForm(false);} };

  const cambiarEstatus = async(id,nuevoEstatus)=>{ try{ await api.patch(`/api/proyectos/${id}/estado`,{estado:nuevoEstatus}); toastSuccess(`Estado: "${nuevoEstatus}"`); refetchProy(true); }catch(err){ toastError('Error al cambiar estado'); } };

  const eliminarProyecto = async(p)=>{ const isConfirmed = await confirmAction('¿Eliminar proyecto?', `¿Estás seguro de eliminar el proyecto "${p.nombre_proyecto||p.nombre_cliente}"?`); if(!isConfirmed) return; try{ const {data}=await api.delete(`/api/proyectos/${p.id_proyecto}`); if(data.success){toastSuccess('Eliminado');if(selectedId===p.id_proyecto)setSelectedId(null);refetchProy(true);} }catch(err){toastError(err.response?.data?.message||'Error');} };

  const exportarPDF = async (proyectoId) => {
    if (!proyectoId) return;
    setLoadingPDF(proyectoId);
    try {
      const { data } = await api.get(`/api/proyectos/${proyectoId}/ficha`);
      if (data.success) {
        generarFichaProyectoPDF({ ...data.data, configEmpresa });
        toastSuccess('Ficha PDF generada correctamente');
      }
    } catch (error) {
      toastError('Error al generar el PDF. Verifica la conexión.');
    } finally {
      setLoadingPDF(null);
    }
  };

  return (
    <div>
      <style>{`
        .prow{cursor:pointer;transition:background .15s;}
        .fpill{padding:5px 13px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:all .18s;background:transparent;color:var(--text-secondary);}
        .fpill:hover{background:rgba(254,183,44,0.08);color:var(--text-primary);}
        .fpill.act{background:rgba(254,183,44,0.14);color:var(--primary-dark);border-color:rgba(254,183,44,0.35);}
        .estsel{background:transparent;border:none;color:inherit;font-size:11px;font-weight:700;cursor:pointer;outline:none;font-family:inherit;}
        @keyframes tIn{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
        .btn-pdf{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid rgba(254,183,44,0.35);background:rgba(254,183,44,0.10);color:var(--primary-dark);transition:all .18s;white-space:nowrap;}
        .btn-pdf:hover:not(:disabled){background:rgba(254,183,44,0.22);border-color:var(--primary);}
        .btn-pdf:disabled{opacity:0.5;cursor:not-allowed;}
      `}</style>


      {/* Header */}
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start', flexWrap:'wrap', gap:16}}>
        <div><h2>Proyectos</h2><p>Gestiona proyectos de marmolería y consulta el historial de presupuestos.</p></div>
        <div style={{display:'flex',gap:10}}>
          <button id="btn-nuevo-proyecto" className="btn btn-primary" onClick={()=>{setForm(FORM_INIT);setModalNuevo(true);}}>Nuevo Proyecto</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card"><div><div className="stat-value" style={{color:'var(--accent-blue)'}}>{stats.total}</div><div className="stat-label">Total Proyectos</div></div></div>
        <div className="stat-card"><div><div className="stat-value" style={{color:'var(--text-secondary)'}}>{stats.activos}</div><div className="stat-label">Activos</div></div></div>
        <div className="stat-card"><div><div className="stat-value" style={{color:'var(--accent-blue)'}}>{stats.enProceso}</div><div className="stat-label">En Proceso</div></div></div>
        <div className="stat-card"><div><div className="stat-value" style={{color:'var(--accent-green)'}}>{stats.finalizados}</div><div className="stat-label">Finalizados</div></div></div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'var(--bg-card)',padding:6,borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',marginBottom:24,width:'fit-content'}}>
        {[['proyectos','Proyectos'],['presupuestos','Presupuestos']].map(([k,l])=>(
          <button key={k} onClick={()=>setActiveTab(k)} style={{padding:'8px 18px',borderRadius:'var(--radius-md)',border:'none',background:activeTab===k?'rgba(59,130,246,0.15)':'transparent',color:activeTab===k?'var(--accent-blue)':'var(--text-secondary)',fontWeight:600,cursor:'pointer',transition:'all .2s',fontSize:14}}>{l}</button>
        ))}
      </div>

      {/* ── TAB: PROYECTOS ── */}
      {activeTab==='proyectos'&&(
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Lista de Proyectos</div><div className="card-subtitle">{proyectosFiltrados.length} registros</div></div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              <div style={{ position: 'relative', marginRight: '8px' }}>
                <svg style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" className="form-input" style={{ paddingLeft: 30, minHeight: 34, padding: '6px 10px 6px 30px', fontSize: 13, width: 200 }} placeholder="Buscar proyecto..." value={busquedaProy} onChange={e => setBusquedaProy(e.target.value)} />
              </div>
              {['Todos',...ESTATUS_LIST].map(s=><button key={s} className={`fpill${filtroEstatus===s?' act':''}`} onClick={()=>setFiltroEstatus(s)}>{s}</button>)}
              <button className="btn btn-ghost btn-sm" onClick={()=>refetchProy(false)} disabled={loadingProy}>{loadingProy?<span className="spinner"/>:'Actualizar'}</button>
            </div>
          </div>

          {selectedId&&<div style={{marginBottom:16,padding:'10px 16px',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'var(--radius-md)',fontSize:13,color:'var(--accent-blue)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span><strong>{proyectos.find(p=>p.id_proyecto===selectedId)?.nombre_proyecto||proyectos.find(p=>p.id_proyecto===selectedId)?.nombre_cliente}</strong> — haz clic en "Exportar Ficha PDF" para descargar</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSelectedId(null)} style={{ padding: '6px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>}

          {loadingProy?<div style={{textAlign:'center',padding:48}}><span className="spinner" style={{width:36,height:36,borderWidth:3}}/></div>
          :proyectosFiltrados.length===0?<div className="empty-state"><h3>{busquedaProy ? 'No hay resultados' : `Sin proyectos ${filtroEstatus!=='Todos'?`en "${filtroEstatus}"`:''}`}</h3><p>Crea uno con el botón de arriba o aprueba un presupuesto.</p></div>
          :<>
          <div style={{overflowX:'auto'}}><table className="list-table">
            <thead><tr><th style={{width:36}}></th><th>Proyecto / Cliente</th><th className="hide-on-mobile">RIF/Cédula</th><th className="hide-on-mobile">Descripción</th><th>Estatus</th><th>Monto USD</th><th className="hide-on-mobile">Inicio</th><th className="hide-on-mobile" style={{textAlign:'right'}}>Acciones</th><th className="show-on-mobile" style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {proyectosFiltrados.map(p=>(
                <React.Fragment key={p.id_proyecto}>
                  <tr className={`prow table-row-clickable ${selectedId===p.id_proyecto?' sel':''} ${expandedProyId === p.id_proyecto ? 'is-expanded' : ''}`} onClick={()=>{ setSelectedId(selectedId===p.id_proyecto?null:p.id_proyecto); toggleProyExpand(p.id_proyecto); }}>
                    <td data-label="Selección"><div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${selectedId===p.id_proyecto?'var(--accent-blue)':'var(--border)'}`,background:selectedId===p.id_proyecto?'var(--accent-blue)':'transparent',transition:'all .15s'}}/></td>
                    <td data-label="Proyecto/Cliente"><div style={{fontWeight:700,color:'var(--text-primary)'}}>{p.nombre_proyecto || p.nombre_cliente} <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:'normal'}}>#{p.id_proyecto}</span></div></td>
                    <td className="hide-on-mobile" data-label="RIF/Cédula" style={{fontSize:13,color:'var(--text-secondary)',fontFamily:'monospace'}}>{p.rif_cedula||'—'}</td>
                    <td className="hide-on-mobile" data-label="Descripción" style={{maxWidth:220}}><div style={{fontSize:13,color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.descripcion_obra||<span style={{color:'var(--text-muted)'}}>Sin descripción</span>}</div></td>
                    <td data-label="Estatus" onClick={e=>e.stopPropagation()}>
                      <span className={`badge ${ESTATUS_BADGE[p.estatus]||'badge-borrador'}`}>
                        <select className="estsel" value={p.estatus} onChange={e=>cambiarEstatus(p.id_proyecto,e.target.value)}>
                          {ESTATUS_LIST.map(s=><option key={s} value={s} style={{background:'var(--bg-secondary)',color:'var(--text-primary)'}}>{s}</option>)}
                        </select>
                      </span>
                    </td>
                    <td data-label="Monto USD" style={{color:'var(--accent-green)',fontSize:13,whiteSpace:'nowrap',fontWeight:600}}>{p.monto_usd?`$${Number(p.monto_usd).toFixed(2)}`:'—'}</td>
                    <td className="hide-on-mobile" data-label="Inicio" style={{color:'var(--text-muted)',fontSize:13,whiteSpace:'nowrap'}}>{fmtFecha(p.fecha_inicio)}</td>
                    <td className="hide-on-mobile" data-label="Acciones" style={{textAlign:'right'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:6,justifyContent:'flex-end',alignItems:'center'}}>
                        <button
                          className="btn-pdf"
                          disabled={loadingPDF === p.id_proyecto}
                          onClick={() => exportarPDF(p.id_proyecto)}
                          title="Exportar Ficha PDF"
                        >
                          {loadingPDF === p.id_proyecto
                            ? <span className="spinner" style={{width:12,height:12,borderWidth:2}}/>
                            : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          }
                          PDF
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>abrirEditar(p)} style={{fontSize:12,padding:'4px 8px'}}>Editar</button>
                        <button className="btn btn-ghost btn-sm" style={{color:'var(--accent-red)',fontSize:12,padding:'4px 8px'}} onClick={()=>eliminarProyecto(p)}>Eliminar</button>
                      </div>
                    </td>
                    <td className="show-on-mobile" style={{ textAlign: 'right' }}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: expandedProyId === p.id_proyecto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </td>
                  </tr>
                  <tr className={`expandable-content ${expandedProyId === p.id_proyecto ? 'expanded' : ''}`}>
                    <td colSpan="9" style={{ padding: 0, border: 'none' }}>
                      <div className="expandable-details">
                        <div className="detail-item">
                          <span className="detail-label">RIF / Cédula</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{p.rif_cedula || '—'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Descripción</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{p.descripcion_obra || '—'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Inicio</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{fmtFecha(p.fecha_inicio)}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                           <button
                            className="btn btn-ghost btn-sm"
                            disabled={loadingPDF === p.id_proyecto}
                            onClick={() => exportarPDF(p.id_proyecto)}
                            style={{ flex: 1, justifyContent: 'center', color: 'var(--accent-gold)', borderColor: 'rgba(254,183,44,0.35)', borderWidth: 1, borderStyle: 'solid' }}
                          >
                            {loadingPDF === p.id_proyecto ? <span className="spinner" style={{width:12,height:12,borderWidth:2}}/> : 'Exportar PDF'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)} style={{ flex: 1, justifyContent: 'center' }}>Editar</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => eliminarProyecto(p)} style={{ flex: 1, justifyContent: 'center', color: 'var(--accent-red)' }}>Eliminar</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table></div>
          <Pagination pagination={paginationProy} onPageChange={setPageProy} />
          </>}
        </div>
      )}

      {/* ── TAB: PRESUPUESTOS ── */}
      {activeTab==='presupuestos'&&(
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Historial de Presupuestos</div><div className="card-subtitle">{presFiltrados.length} registros</div></div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              <div style={{ position: 'relative', marginRight: '8px' }}>
                <svg style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" className="form-input" style={{ paddingLeft: 30, minHeight: 34, padding: '6px 10px 6px 30px', fontSize: 13, width: 200 }} placeholder="Buscar presupuesto..." value={busquedaPres} onChange={e => setBusquedaPres(e.target.value)} />
              </div>
              {['Todos','borrador','aprobado','vencido'].map(s=>(
                <button key={s} className={`fpill${filtroPres===s?' act':''}`} onClick={()=>setFiltroPres(s)}>{s==='Todos'?'Todos':PRES_LABEL[s]||s}</button>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={()=>refetchPres(false)} disabled={loadingPres}>{loadingPres?<span className="spinner"/>:'Actualizar'}</button>
            </div>
          </div>

          {loadingPres?<div style={{textAlign:'center',padding:48}}><span className="spinner" style={{width:36,height:36,borderWidth:3}}/></div>
          :presFiltrados.length===0?<div className="empty-state"><h3>{busquedaPres ? 'No hay resultados' : `Sin presupuestos ${filtroPres!=='Todos'?`con estatus "${filtroPres}"`:''}`}</h3></div>
          :<>
          <div style={{overflowX:'auto'}}><table className="list-table">
            <thead><tr><th>N° Presupuesto</th><th>Cliente</th><th className="hide-on-mobile">Descripción</th><th>Total USD</th><th className="hide-on-mobile">Tasa</th><th>Estatus</th><th className="hide-on-mobile">Fecha</th><th className="show-on-mobile" style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {presFiltrados.map(p=>(
                <React.Fragment key={p.id}>
                  <tr className={`table-row-clickable ${expandedPresId === p.id ? 'is-expanded' : ''}`} onClick={() => togglePresExpand(p.id)}>
                    <td data-label="N° Presupuesto"><span style={{fontFamily:'monospace',color:'var(--accent-purple)',fontWeight:600}}>{p.numero_presupuesto}</span></td>
                    <td data-label="Cliente"><div style={{fontWeight:600}}>{p.cliente_nombre||'—'}</div>{p.cliente_rif&&<div style={{fontSize:11,color:'var(--text-muted)'}}>{p.cliente_rif}</div>}</td>
                    <td className="hide-on-mobile" data-label="Proyecto" style={{maxWidth:200,color:'var(--text-secondary)'}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.proyecto_descripcion||'—'}</div></td>
                    <td data-label="Total USD" style={{fontWeight:700,color:'var(--accent-purple)'}}>{fmtUSD(p.total_usd)}</td>
                    <td className="hide-on-mobile" data-label="Tasa" style={{color:'var(--accent-gold)',fontSize:13}}>{p.tasa_cambio_usd_bs} Bs</td>
                    <td data-label="Estatus"><span className={`badge ${PRES_BADGE[p.estatus]||'badge-borrador'}`}>{PRES_LABEL[p.estatus]||p.estatus}</span></td>
                    <td className="hide-on-mobile" data-label="Fecha" style={{color:'var(--text-muted)',fontSize:13}}>{fmtFecha(p.created_at)}</td>
                    <td className="show-on-mobile" style={{ textAlign: 'right' }}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: expandedPresId === p.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </td>
                  </tr>
                  <tr className={`expandable-content ${expandedPresId === p.id ? 'expanded' : ''}`}>
                    <td colSpan="8" style={{ padding: 0, border: 'none' }}>
                      <div className="expandable-details">
                        <div className="detail-item">
                          <span className="detail-label">Descripción</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{p.proyecto_descripcion || '—'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Tasa</span>
                          <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{p.tasa_cambio_usd_bs} Bs</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Fecha</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{fmtFecha(p.created_at)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table></div>
          <Pagination pagination={paginationPres} onPageChange={setPagePres} />
          </>}
        </div>
      )}

      {modalNuevo&&<Modal titulo="Nuevo Proyecto" onClose={()=>setModalNuevo(false)}><FormProyecto form={form} setForm={setForm} onSubmit={handleCrear} loading={loadingForm} modoEdicion={false}/></Modal>}
      {modalEditar&&<Modal titulo="Editar Proyecto" onClose={()=>setModalEditar(null)}><FormProyecto form={form} setForm={setForm} onSubmit={handleEditar} loading={loadingForm} modoEdicion={true}/></Modal>}
    </div>
  );
}
