// pages/ProyectosPage.jsx — Con pestañas: Proyectos + Presupuestos
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useFetch } from '../hooks/useFetch';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale/es';
import { generarFichaProyectoPDF } from '../utils/proyectoPDF';

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
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)',padding:32,width:'100%',maxWidth:560,boxShadow:'0 25px 60px rgba(0,0,0,0.6)',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <h3 style={{fontSize:20,fontWeight:800}}>{titulo}</h3>
          <button onClick={onClose} style={{background:'rgba(148,163,184,0.1)',border:'none',color:'var(--text-muted)',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
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
  
  // Custom Hook para peticiones en segundo plano (SRP)
  const { data: proyData, loading: loadingProy, refetch: refetchProy } = useFetch('/api/proyectos');
  const { data: presData, loading: loadingPres, refetch: refetchPres } = useFetch('/api/presupuestos');
  
  const proyectos = proyData?.data || [];
  const presupuestos = presData?.data || [];

  const [loadingForm,  setLoadingForm]  = useState(false);
  const [loadingPDF,   setLoadingPDF]   = useState(false);
  const [filtroEstatus,setFiltroEstatus]= useState('Todos');
  const [filtroPres,   setFiltroPres]   = useState('Todos');
  const [selectedId,   setSelectedId]   = useState(null);
  const [modalNuevo,   setModalNuevo]   = useState(false);
  const [modalEditar,  setModalEditar]  = useState(null);
  const [form,         setForm]         = useState(FORM_INIT);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg,tipo='success') => { setToast({msg,tipo}); setTimeout(()=>setToast(null),3500); };

  const proyectosFiltrados = filtroEstatus==='Todos' ? proyectos : proyectos.filter(p=>p.estatus===filtroEstatus);
  const presFiltrados = filtroPres==='Todos' ? presupuestos : presupuestos.filter(p=>p.estatus===filtroPres);

  const stats = {
    total:      proyectos.length,
    activos:    proyectos.filter(p=>p.estatus==='Activo').length,
    enProceso:  proyectos.filter(p=>p.estatus==='En Proceso').length,
    finalizados:proyectos.filter(p=>p.estatus==='Finalizado').length,
  };

  const handleCrear = async(e)=>{ e.preventDefault(); setLoadingForm(true); try{ const {data}=await axios.post('/api/proyectos',form); if(data.success){showToast(data.message);setModalNuevo(false);setForm(FORM_INIT);refetchProy(true);} }catch(err){showToast(err.response?.data?.message||'Error','error');} finally{setLoadingForm(false);} };

  const abrirEditar = (p)=>{ setForm({nombre_proyecto:p.nombre_proyecto||'',nombre_cliente:p.nombre_cliente||'',rif_cedula:p.rif_cedula||'',descripcion_obra:p.descripcion_obra||'',estatus:p.estatus||'Activo',fecha_inicio:p.fecha_inicio?new Date(p.fecha_inicio).toISOString().split('T')[0]:new Date().toISOString().split('T')[0],monto_usd:p.monto_usd||''}); setModalEditar(p); };

  const handleEditar = async(e)=>{ e.preventDefault(); setLoadingForm(true); try{ const {data}=await axios.put(`/api/proyectos/${modalEditar.id_proyecto}`,form); if(data.success){showToast('Proyecto actualizado');setModalEditar(null);setForm(FORM_INIT);refetchProy(true);} }catch(err){showToast(err.response?.data?.message||'Error','error');} finally{setLoadingForm(false);} };

  const cambiarEstatus = async(id,nuevoEstatus)=>{ try{ await axios.patch(`/api/proyectos/${id}/estado`,{estado:nuevoEstatus}); showToast(`Estado: "${nuevoEstatus}"`); refetchProy(true); }catch{ showToast('Error al cambiar estado','error'); } };

  const eliminarProyecto = async(p)=>{ if(!window.confirm(`¿Eliminar proyecto "${p.nombre_proyecto||p.nombre_cliente}"?`)) return; try{ const {data}=await axios.delete(`/api/proyectos/${p.id_proyecto}`); if(data.success){showToast('Eliminado');if(selectedId===p.id_proyecto)setSelectedId(null);refetchProy(true);} }catch(err){showToast(err.response?.data?.message||'Error','error');} };

  const exportarPDF = async()=>{ if(!selectedId) return; setLoadingPDF(true); try{ const {data}=await axios.get(`/api/proyectos/${selectedId}/ficha`); if(data.success){generarFichaProyectoPDF(data.data);showToast('PDF generado');} }catch{showToast('Error PDF','error');} finally{setLoadingPDF(false);} };

  return (
    <div>
      <style>{`
        .prow{cursor:pointer;transition:background .15s;} .prow.sel td{background:rgba(59,130,246,0.08)!important;} .prow:hover td{background:rgba(59,130,246,0.04);}
        .fpill{padding:5px 13px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:all .18s;background:transparent;color:var(--text-secondary);}
        .fpill:hover{background:rgba(148,163,184,0.08);color:var(--text-primary);} .fpill.act{background:rgba(59,130,246,0.15);color:var(--accent-blue);border-color:rgba(59,130,246,0.3);}
        .estsel{background:transparent;border:none;color:inherit;font-size:11px;font-weight:700;cursor:pointer;outline:none;font-family:inherit;}
        @keyframes tIn{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
      `}</style>

      {toast&&<div style={{position:'fixed',top:20,right:20,zIndex:9999,background:toast.tipo==='error'?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)',border:`1px solid ${toast.tipo==='error'?'var(--accent-red)':'var(--accent-green)'}`,color:toast.tipo==='error'?'var(--accent-red)':'var(--accent-green)',padding:'12px 20px',borderRadius:'var(--radius-md)',fontWeight:600,fontSize:14,maxWidth:440,boxShadow:'0 8px 30px rgba(0,0,0,0.4)',animation:'tIn .2s ease'}}>{toast.msg}</div>}

      {/* Header */}
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><h2>Proyectos</h2><p>Gestiona proyectos de marmolería y consulta el historial de presupuestos.</p></div>
        <div style={{display:'flex',gap:10}}>
          {selectedId&&<button id="btn-exportar-ficha-pdf" className="btn btn-success" onClick={exportarPDF} disabled={loadingPDF}>{loadingPDF?<span className="spinner"/>:null} Exportar Ficha PDF</button>}
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
              {['Todos',...ESTATUS_LIST].map(s=><button key={s} className={`fpill${filtroEstatus===s?' act':''}`} onClick={()=>setFiltroEstatus(s)}>{s}</button>)}
              <button className="btn btn-ghost btn-sm" onClick={()=>refetchProy(false)} disabled={loadingProy}>{loadingProy?<span className="spinner"/>:'Actualizar'}</button>
            </div>
          </div>

          {selectedId&&<div style={{marginBottom:16,padding:'10px 16px',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'var(--radius-md)',fontSize:13,color:'var(--accent-blue)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span><strong>{proyectos.find(p=>p.id_proyecto===selectedId)?.nombre_proyecto||proyectos.find(p=>p.id_proyecto===selectedId)?.nombre_cliente}</strong> — haz clic en "Exportar Ficha PDF" para descargar</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSelectedId(null)}>✕</button>
          </div>}

          {loadingProy?<div style={{textAlign:'center',padding:48}}><span className="spinner" style={{width:36,height:36,borderWidth:3}}/></div>
          :proyectosFiltrados.length===0?<div className="empty-state"><h3>Sin proyectos {filtroEstatus!=='Todos'?`en "${filtroEstatus}"`:''}</h3><p>Crea uno con el botón de arriba o aprueba un presupuesto.</p></div>
          :<div style={{overflowX:'auto'}}><table className="list-table">
            <thead><tr><th style={{width:36}}></th><th>Proyecto / Cliente</th><th>RIF/Cédula</th><th>Descripción</th><th>Estatus</th><th>Monto USD</th><th>Inicio</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
            <tbody>
              {proyectosFiltrados.map(p=>(
                <tr key={p.id_proyecto} className={`prow${selectedId===p.id_proyecto?' sel':''}`} onClick={()=>setSelectedId(selectedId===p.id_proyecto?null:p.id_proyecto)}>
                  <td><div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${selectedId===p.id_proyecto?'var(--accent-blue)':'var(--border)'}`,background:selectedId===p.id_proyecto?'var(--accent-blue)':'transparent',transition:'all .15s'}}/></td>
                  <td><div style={{fontWeight:700,color:'var(--text-primary)'}}>{p.nombre_proyecto || p.nombre_cliente}</div><div style={{fontSize:12,color:'var(--text-secondary)'}}>{p.nombre_cliente} <span style={{fontSize:11,color:'var(--text-muted)'}}>#{p.id_proyecto}</span></div></td>
                  <td style={{fontSize:13,color:'var(--text-secondary)',fontFamily:'monospace'}}>{p.rif_cedula||'—'}</td>
                  <td style={{maxWidth:220}}><div style={{fontSize:13,color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.descripcion_obra||<span style={{color:'var(--text-muted)'}}>Sin descripción</span>}</div></td>
                  <td onClick={e=>e.stopPropagation()}>
                    <span className={`badge ${ESTATUS_BADGE[p.estatus]||'badge-borrador'}`}>
                      <select className="estsel" value={p.estatus} onChange={e=>cambiarEstatus(p.id_proyecto,e.target.value)}>
                        {ESTATUS_LIST.map(s=><option key={s} value={s} style={{background:'var(--bg-secondary)',color:'var(--text-primary)'}}>{s}</option>)}
                      </select>
                    </span>
                  </td>
                  <td style={{color:'var(--accent-green)',fontSize:13,whiteSpace:'nowrap',fontWeight:600}}>{p.monto_usd?`$${Number(p.monto_usd).toFixed(2)}`:'—'}</td>
                  <td style={{color:'var(--text-muted)',fontSize:13,whiteSpace:'nowrap'}}>{fmtFecha(p.fecha_inicio)}</td>
                  <td style={{textAlign:'right'}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>abrirEditar(p)} style={{fontSize: 12, padding: '4px 8px'}}>Editar</button>
                      <button className="btn btn-ghost btn-sm" style={{color:'var(--accent-red)',fontSize: 12, padding: '4px 8px'}} onClick={()=>eliminarProyecto(p)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>}
        </div>
      )}

      {/* ── TAB: PRESUPUESTOS ── */}
      {activeTab==='presupuestos'&&(
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Historial de Presupuestos</div><div className="card-subtitle">{presFiltrados.length} registros</div></div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              {['Todos','borrador','enviado','aprobado','rechazado','vencido'].map(s=>(
                <button key={s} className={`fpill${filtroPres===s?' act':''}`} onClick={()=>setFiltroPres(s)}>{s==='Todos'?'Todos':PRES_LABEL[s]||s}</button>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={()=>refetchPres(false)} disabled={loadingPres}>{loadingPres?<span className="spinner"/>:'Actualizar'}</button>
            </div>
          </div>

          {loadingPres?<div style={{textAlign:'center',padding:48}}><span className="spinner" style={{width:36,height:36,borderWidth:3}}/></div>
          :presFiltrados.length===0?<div className="empty-state"><h3>Sin presupuestos {filtroPres!=='Todos'?`con estatus "${filtroPres}"`:''}</h3></div>
          :<div style={{overflowX:'auto'}}><table className="list-table">
            <thead><tr><th>N° Presupuesto</th><th>Cliente</th><th>Descripción</th><th>Total USD</th><th>Tasa</th><th>Estatus</th><th>Fecha</th></tr></thead>
            <tbody>
              {presFiltrados.map(p=>(
                <tr key={p.id}>
                  <td><span style={{fontFamily:'monospace',color:'var(--accent-blue)',fontWeight:600}}>{p.numero_presupuesto}</span></td>
                  <td><div style={{fontWeight:600}}>{p.cliente_nombre||'—'}</div>{p.cliente_rif&&<div style={{fontSize:11,color:'var(--text-muted)'}}>{p.cliente_rif}</div>}</td>
                  <td style={{maxWidth:200,color:'var(--text-secondary)'}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.proyecto_descripcion||'—'}</div></td>
                  <td style={{fontWeight:700,color:'var(--accent-cyan)'}}>{fmtUSD(p.total_usd)}</td>
                  <td style={{color:'var(--accent-gold)',fontSize:13}}>{p.tasa_cambio_usd_bs} Bs</td>
                  <td><span className={`badge ${PRES_BADGE[p.estatus]||'badge-borrador'}`}>{PRES_LABEL[p.estatus]||p.estatus}</span></td>
                  <td style={{color:'var(--text-muted)',fontSize:13}}>{fmtFecha(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>}
        </div>
      )}

      {modalNuevo&&<Modal titulo="Nuevo Proyecto" onClose={()=>setModalNuevo(false)}><FormProyecto form={form} setForm={setForm} onSubmit={handleCrear} loading={loadingForm} modoEdicion={false}/></Modal>}
      {modalEditar&&<Modal titulo="Editar Proyecto" onClose={()=>setModalEditar(null)}><FormProyecto form={form} setForm={setForm} onSubmit={handleEditar} loading={loadingForm} modoEdicion={true}/></Modal>}
    </div>
  );
}
