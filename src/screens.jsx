import React, {useState} from 'react'
import {advance, capacity, dateLabel, DAY, expiry, id, labels, money, monthLabel, months, ranges, reasons, RULES, status, timeline, totals, types} from './model.js'

const proposalFor = (db,s) => db.presupuestos.find(p => p.solicitudId === s.id)
const brandFor = (db,s) => db.marcas.find(m => m.id === s.marcaId)
const monthOptions = values => values.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)
const monthSet = (month,now) => [...new Set([month,...months(now)])].sort()
function Heading({over,title,children}) {
  return <div className="page-head"><div><p className="eyebrow">{over}</p><h1>{title}<span>.</span></h1></div>{children}</div>
}
function Tabs({tab,select,items}) {
  return <nav className="tabs" aria-label="Secciones">{items.map(x=><button key={x} aria-current={tab===x?'page':undefined} onClick={()=>select(x)}>{x}</button>)}</nav>
}
function Badge({state}) { return <span className={'badge '+state}>{labels[state]}</span> }
function Alert({p,state,now}) {
  if (state === 'vencido') return <p className="warning">La propuesta venció el {dateLabel(expiry(p))}.</p>
  if (!['enviado','cambios'].includes(state)) return null
  const days = Math.ceil((expiry(p)-now)/DAY)
  return <p className={days<=3?'warning':'muted'}>{days<=3?'Por vencer · ':''}{days===1?'Queda 1 día':'Quedan '+days+' días'} · Vigente hasta el {dateLabel(expiry(p))} (hora de México).</p>
}
function List({db,requests,open,now}) {
  return <div className="list">{requests.length ? requests.map(s=>{
    const p = proposalFor(db,s), state = status(s,p,now)
    return <article className="list-row" key={s.id}>
      <div><p className="eyebrow">{s.folio} / {s.tipoProyecto}</p><h3>{brandFor(db,s).nombre}</h3><p className="muted capitalize">{monthLabel(s.mesInicio)}</p></div>
      <div><Badge state={state}/><Alert {...{p,state,now}}/></div>
      <button className="secondary" onClick={()=>open(s.id)} aria-label={'Abrir '+s.folio}>Ver detalle ↗</button>
    </article>
  }) : <p className="panel">No hay solicitudes para esta selección.</p>}</div>
}
function Summary({s,brand,p,state,now}) {
  return <section className="panel brief">
    <div className="flex flex-wrap items-center gap-3"><Badge state={state}/><span className="muted">{s.tipoProyecto}</span></div>
    <p>{s.descripcion}</p>
    <dl className="facts grid gap-3 sm:grid-cols-2">
      <div><dt>Rubro</dt><dd>{s.rubro}</dd></div>
      {brand.ciudad && <div><dt>Ciudad</dt><dd>{brand.ciudad}</dd></div>}
      <div><dt>Contacto</dt><dd>{brand.contacto || 'Sin contacto cargado'}</dd></div>
      <div><dt>Inversión estimada</dt><dd>{s.rangoInversion} MXN</dd></div>
      <div><dt>Inicio</dt><dd className="capitalize">{monthLabel(s.mesInicio)}</dd></div>
    </dl>
    <Alert {...{p,state,now}}/>
  </section>
}
function Totals({value}) {
  return <dl className="totals">
    <div><dt>Subtotal</dt><dd>{money(value.subtotal)}</dd></div>
    <div><dt>IVA ({RULES.iva} %)</dt><dd>{money(value.iva)}</dd></div>
    <div className="grand"><dt>Total</dt><dd>{money(value.total)} MXN</dd></div>
    <div><dt>Anticipo informativo ({RULES.anticipo} %)</dt><dd>{money(advance(value.total),0)}</dd></div>
  </dl>
}
function History({s,p,now,client=false}) {
  const versions = (p?.versiones ?? []).map((v,i)=>({v,i})).filter(({v})=>!client || v.fechaEnvio!==null).reverse()
  const events = timeline(s,p,now)
  if (!versions.length && !events.length) return null
  return <section className="panel history">
    <h2>{versions.length ? 'Historial de versiones' : 'Actividad'}</h2>
    {versions.map(({v,i},index)=><details key={i} open={index===0}>
      <summary>Versión {i+1} · {v.fechaEnvio===null?'Guardada':'Enviada'} el {dateLabel(v.fechaEnvio ?? v.fechaCreacion)}{p.versionAceptada===i ? ' · Aceptación registrada' : ''}</summary>
      <ul className="version-lines">{v.partidas.map((r,j)=><li key={j}><div><strong>{r.nombre}</strong>{r.descripcion && <p className="muted">{r.descripcion} · {r.plazo} {r.plazo===1?'día':'días'}{r.unidad ? ' · por '+r.unidad : ''}</p>}</div><span>{r.cantidad} × {money(r.precioUnitario)}</span></li>)}</ul>
      <Totals value={v}/>
    </details>)}
    {!!events.length && <div className="activity">{!!versions.length && <h3>Actividad</h3>}<ul>{events.map((event,i)=><li key={i}>{event.texto}<small>{dateLabel(event.fecha)}</small></li>)}</ul></div>}
  </section>
}
function NewRequest({brand,now,submit}) {
  const [step,setStep] = useState(0)
  const [error,setError] = useState('')
  const [form,setForm] = useState({tipoProyecto:'',nombre:brand?.nombre ?? '',rubro:'',contacto:brand?.contacto ?? '',descripcion:'',rangoInversion:'',mesInicio:months(now)[0]})
  const field = name => ({value:form[name],onChange:e=>setForm({...form,[name]:e.target.value})})
  async function next(e) {
    e.preventDefault()
    if (step===1 && (!form.nombre.trim() || !form.rubro.trim() || form.descripcion.trim().length<40)) return setError('Completá la marca, el rubro y una descripción de al menos 40 caracteres.')
    setError('')
    if (step<2) setStep(step+1)
    else await submit(form)
  }
  return <form className="panel wizard" onSubmit={next}>
    <ol className="steps" aria-label="Pasos">{['Proyecto','Marca','Inversión'].map((x,i)=><li key={x} aria-current={i===step?'step':undefined}><span>{i+1}</span> {x}</li>)}</ol>
    {step===0 && <fieldset><legend>¿Qué tipo de proyecto tenés en mente?</legend>{types.map(x=><label className="radio-card" key={x}><input required type="radio" name="tipo" value={x} checked={form.tipoProyecto===x} onChange={field('tipoProyecto').onChange}/>{x}</label>)}</fieldset>}
    {step===1 && <><h2>Contanos sobre tu marca</h2><div className="grid gap-3 sm:grid-cols-2"><label>Nombre de marca<input required maxLength={100} {...field('nombre')}/></label><label>Rubro<input required maxLength={100} {...field('rubro')}/></label></div>
      <label>Correo de contacto (opcional)<input type="email" {...field('contacto')}/></label>
      <label>Descripción del proyecto<textarea required minLength={40} maxLength={600} rows={5} {...field('descripcion')}/></label><small aria-live="polite">{form.descripcion.length}/600 caracteres · mínimo 40</small></>}
    {step===2 && <><h2>Inversión y fecha de inicio</h2><label>Rango de inversión (MXN)<select required {...field('rangoInversion')}><option value="">Elegí un rango</option>{ranges.map(r=><option key={r}>{r}</option>)}</select></label><label>Mes de inicio<select required {...field('mesInicio')}>{monthOptions(months(now))}</select></label></>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions">{step>0 && <button type="button" className="secondary" onClick={()=>{setStep(step-1);setError('')}}>Atrás</button>}<button className="primary">{step===2?'Enviar solicitud':'Continuar ↗'}</button></div>
  </form>
}
function Response({db,s,p,state,now,mutate}) {
  const [mode,setMode] = useState('')
  const [confirmed,setConfirmed] = useState(false)
  const [month,setMonth] = useState(s.mesInicio)
  const [reason,setReason] = useState('')
  const [comment,setComment] = useState('')
  const base = {sid:s.id,brand:s.marcaId,version:p?.versionEnviada}
  if (!p || p.versionEnviada===null) return <p className="panel">Cuando el estudio envíe una propuesta, vas a poder consultarla acá.</p>
  const exhausted = p.rondasCambios>=RULES.rondas
  const full = capacity(db,month).libres<=0
  const act = async (action,message) => { if (await mutate({...base,...action},message)) setMode('') }
  return <section className="panel response">
    <h2>Tu respuesta</h2>
    <p>Rondas de cambios usadas: {p.rondasCambios} de {RULES.rondas}.</p>
    {exhausted && <p className="warning">Ya usaste las dos rondas de cambios disponibles para esta solicitud. Si necesitás otra modificación, acordala con el estudio en una conversación aparte.</p>}
    {state==='enviado' && <>
      <form onSubmit={e=>{e.preventDefault();act({kind:'aceptar',confirmed,month},'Aceptaste la propuesta. Tu plaza quedó reservada.')}}>
        <label>Mes para reservar<select value={month} onChange={e=>{setMonth(e.target.value);setConfirmed(false)}}>{monthOptions(monthSet(s.mesInicio,now))}</select></label>
        {full && <p className="warning" role="status">El cupo de este mes está completo. Elegí otro mes en la lista.</p>}
        <label className="check"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Confirmo la aceptación</label>
        <button className="primary" disabled={!confirmed || full}>Aceptar</button>
      </form>
      <div className="actions"><button className="secondary" onClick={()=>setMode(mode==='reject'?'':'reject')}>Rechazar</button>{!exhausted && <button className="secondary" onClick={()=>setMode(mode==='changes'?'':'changes')}>Pedir cambios</button>}</div>
      {mode==='reject' && <form onSubmit={e=>{e.preventDefault();act({kind:'rechazar',reason},'Registramos el rechazo.')}}><label>Motivo de rechazo<select required value={reason} onChange={e=>setReason(e.target.value)}><option value="">Seleccioná un motivo</option>{reasons.map(r=><option key={r}>{r}</option>)}</select></label><button className="primary">Confirmar rechazo</button></form>}
      {mode==='changes' && !exhausted && <form onSubmit={e=>{e.preventDefault();act({kind:'cambios',comment},'Enviamos tu pedido de cambios.')}}><label>¿Qué querés cambiar?<textarea required minLength={20} maxLength={1000} rows={3} value={comment} onChange={e=>setComment(e.target.value)}/></label><small>{comment.trim().length} caracteres · mínimo 20</small><button className="primary" disabled={comment.trim().length<20}>Enviar pedido</button></form>}
    </>}
    {state==='vencido' && <p>El estudio puede reenviar la propuesta para habilitar una nueva respuesta.</p>}
    {state==='cambios' && <p>El estudio está revisando tu pedido de cambios.</p>}
    {state==='aceptado' && <p>Tu plaza está reservada para {monthLabel(s.mesInicio)}.</p>}
    {state==='rechazado' && <p>{s.notaCierre ? s.notaCierre+' · plaza liberada.' : 'El rechazo quedó registrado.'}</p>}
  </section>
}
export function Client({db,now,mutate}) {
  const [brandId,setBrand] = useState(db.marcas[0]?.id ?? '')
  const [tab,setTab] = useState('Mis solicitudes')
  const [selected,open] = useState('')
  const brand = db.marcas.find(m=>m.id===brandId) ?? db.marcas[0]
  const requests = db.solicitudes.filter(s=>s.marcaId===brand?.id)
  const s = requests.find(x=>x.id===selected)
  const p = s && proposalFor(db,s)
  const state = s && status(s,p,now)
  return <>
    <Heading over="PORTAL DE CLIENTE" title={s ? brand.nombre : tab}>{brand && <label className="brand-select">Marca seleccionada<select value={brand.id} onChange={e=>{setBrand(e.target.value);open('')}}>{db.marcas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>}</Heading>
    <Tabs {...{tab}} items={['Mis solicitudes','Nueva solicitud']} select={x=>{setTab(x);open('')}}/>
    {tab==='Nueva solicitud' ? <NewRequest key={brand?.id ?? "sin-marca"} {...{brand,now}} submit={async form=>{
      const newBrand = form.nombre.trim()===brand?.nombre ? null : id()
      if (await mutate({kind:'solicitar',form,brand:brand?.id,newBrand},'Enviamos tu solicitud al estudio.')) {
        setTab('Mis solicitudes')
        if (newBrand) setBrand(newBrand)
      }
    }}/> : s ? <>
      <button className="quiet back" onClick={()=>open('')}>← Mis solicitudes · {s.folio}</button>
      <Summary {...{s,brand,p,state,now}}/>
      <History {...{s,p,now}} client/>
      <Response key={s.id+':'+p?.versionEnviada} {...{db,s,p,state,now,mutate}}/>
    </> : <List {...{db,requests,open,now}}/>}
  </>
}

function Editor({db,s,p,state,now,mutate}) {
  const [rows,setRows] = useState(()=>structuredClone(p?.versiones.at(-1)?.partidas ?? []).map(r=>({...r,line:id()})))
  const [choice,setChoice] = useState('')
  const [cancel,setCancel] = useState(false)
  const readonly = ['aceptado','rechazado','vencido'].includes(state)
  const visibleRows = readonly ? p?.versiones[p.versionEnviada]?.partidas ?? [] : rows
  const value = totals(visibleRows)
  const valid = rows.length>0 && rows.every(r=>Number.isSafeInteger(Number(r.cantidad)) && Number(r.cantidad)>0 && r.precioUnitario!=='' && Number.isFinite(Number(r.precioUnitario)) && Number(r.precioUnitario)>=0)
  const change = (line,key,value) => setRows(rows.map(r=>r.line===line?{...r,[key]:value}:r))
  function add() {
    const item = db.partidas.find(x=>x.id===choice)
    if (item) setRows([...rows,{...item,cantidad:1,line:id()}])
    setChoice('')
  }
  return <>
    <Summary {...{s,p,state,now}} brand={brandFor(db,s)}/>
    <section className="panel editor">
      <div className="section-head"><h2>Editor de presupuesto</h2><span className="muted">MXN</span></div>
      {!readonly && <div className="add-line"><label>Partida del catálogo<select value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Seleccioná una partida</option>{db.partidas.map(r=><option key={r.id} value={r.id}>{r.nombre} · {money(r.precioUnitario)}</option>)}</select></label><button className="secondary" disabled={!choice} onClick={add}>Añadir partida</button></div>}
      {!visibleRows.length && <p className="muted">Agregá una partida para preparar el presupuesto.</p>}
      {visibleRows.map((r,i)=><div className="edit-line" key={r.line ?? i}>
        <div><strong>{r.nombre}</strong><p className="muted">{r.descripcion}</p></div>
        <label>Cantidad<input type="number" aria-label={'Cantidad de '+r.nombre+' '+(i+1)} min={1} step={1} value={r.cantidad} disabled={readonly} onChange={e=>change(r.line,'cantidad',e.target.value)}/></label>
        <label>Precio unitario<input type="number" aria-label={'Precio de '+r.nombre+' '+(i+1)} min={0} step="0.01" value={r.precioUnitario} disabled={readonly} onChange={e=>change(r.line,'precioUnitario',e.target.value)}/></label>
        {!readonly && <button className="quiet" onClick={()=>setRows(rows.filter(x=>x.line!==r.line))} aria-label={'Quitar '+r.nombre+' '+(i+1)}>Quitar</button>}
      </div>)}
      <Totals value={value}/>
      <div className="actions">
        {!readonly && <><button className="secondary" disabled={!valid} onClick={()=>mutate({kind:'guardar',sid:s.id,rows},'Versión guardada.')}>Guardar versión</button><button className="primary" disabled={!valid} onClick={()=>mutate({kind:'enviar',sid:s.id,rows},'Propuesta enviada por 15 días.')}>Enviar</button></>}
        {state==='vencido' && <button className="primary" onClick={()=>mutate({kind:'reenviar',sid:s.id},'Propuesta reenviada por 15 días.')}>Reenviar</button>}
        {state==='aceptado' && !cancel && <button className="secondary" onClick={()=>setCancel(true)}>Cancelar aceptación</button>}
        {state==='aceptado' && cancel && <><button className="primary" onClick={async()=>{if(await mutate({kind:'cancelar',sid:s.id},'Aceptación cancelada. Se liberó la plaza.'))setCancel(false)}}>Confirmar cancelación</button><button className="secondary" onClick={()=>setCancel(false)}>Volver</button></>}
      </div>
    </section>
    <History {...{s,p,now}}/>
  </>
}

const emptyItem = {nombre:'',descripcion:'',precioUnitario:'',plazo:''}
function Catalog({db,mutate}) {
  const [item,setItem] = useState(null)
  const [remove,setRemove] = useState('')
  const field = name => ({value:item[name],onChange:e=>setItem({...item,[name]:e.target.value})})
  return <>
    <div className="section-head"><p>{db.partidas.length} partidas · precios base en MXN</p><button className="primary" onClick={()=>{setRemove('');setItem({...emptyItem})}}>+ Nueva partida</button></div>
    {item && <form className="panel" onSubmit={async e=>{
      e.preventDefault()
      if (await mutate({kind:'partida',item:{...item,precioUnitario:Number(item.precioUnitario),plazo:Number(item.plazo)}},'Partida guardada.')) setItem(null)
    }}>
      <h2>{item.id?'Editar partida':'Nueva partida'}</h2>
      <label>Nombre<input required maxLength={100} {...field('nombre')}/></label>
      <label>Descripción<textarea required maxLength={400} rows={3} {...field('descripcion')}/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label>Precio base (MXN)<input type="number" required min={0} step=".01" {...field('precioUnitario')}/></label><label>Plazo en días<input type="number" required min={1} step={1} {...field('plazo')}/></label></div>
      <div className="actions"><button className="primary">Guardar partida</button><button type="button" className="secondary" onClick={()=>setItem(null)}>Volver</button></div>
    </form>}
    <div className="list">{db.partidas.map(p=><article className="list-row catalog-row" key={p.id}><div><h3>{p.nombre}</h3><p className="muted">{p.linea ? p.linea+' · ' : ''}{p.descripcion}</p></div><strong>{money(p.precioUnitario)} · {p.plazo} {p.plazo===1?'día':'días'}{p.unidad ? ' · por '+p.unidad : ''}</strong><div className="actions">
      {remove===p.id ? <><button className="primary" onClick={async()=>{if(await mutate({kind:'baja',id:p.id},'Partida dada de baja.'))setRemove('')}}>Confirmar baja</button><button className="secondary" onClick={()=>setRemove('')}>Volver</button></> : <><button className="secondary" onClick={()=>{setRemove('');setItem({...p});window.scrollTo(0,0)}}>Editar</button><button className="quiet" onClick={()=>{setItem(null);setRemove(p.id)}}>Dar de baja</button></>}
    </div></article>)}</div>
  </>
}
function MonthCard({month,info,mutate}) {
  const [value,setValue] = useState(null)
  return <form className="panel month-card" onSubmit={async e=>{
    e.preventDefault()
    if (await mutate({kind:'cupo',month,limit:Number(value ?? info.plazas)},'Cupo mensual guardado.')) setValue(null)
  }}>
    <h2 className="capitalize whitespace-nowrap text-[clamp(1.45rem,2.6vw,1.7rem)]!">{monthLabel(month).replace(' de ', ' ')}</h2>
    <p className="month-number">{info.usadas}<span> / {info.plazas}</span></p>
    <p>{info.libres===0?'Cupo completo':info.libres===1?'1 plaza disponible':info.libres+' plazas disponibles'}</p>
    <div className="slots" aria-hidden="true">{Array.from({length:RULES.plazas},(_,i)=><span key={i} className={i<info.usadas?'used':i<info.plazas?'free':'closed'}/>)}</div>
    <label>Plazas habilitadas<input required type="number" min={info.usadas} max={RULES.plazas} step={1} value={value ?? info.plazas} onChange={e=>setValue(e.target.value)}/></label>
    <button className="secondary">Guardar cupo</button>
  </form>
}
export function Studio({db,now,mutate}) {
  const [tab,setTab] = useState('Bandeja')
  const [selected,open] = useState('')
  const [filter,setFilter] = useState('')
  const [month,setMonth] = useState('')
  const s = db.solicitudes.find(x=>x.id===selected)
  const p = s && proposalFor(db,s)
  const requests = db.solicitudes.filter(x=>(!month||x.mesInicio===month) && (!filter||status(x,proposalFor(db,x),now)===filter))
  return <>
    <Heading over="PANEL DEL ESTUDIO" title={s?brandFor(db,s).nombre:tab==='Bandeja'?'Bandeja de solicitudes':tab}/>
    <Tabs tab={tab} items={['Bandeja','Catálogo','Cupo mensual']} select={x=>{setTab(x);open('')}}/>
    {tab==='Bandeja' && (s ? <><button className="quiet back" onClick={()=>open('')}>← Bandeja · {s.folio}</button><Editor key={s.id} {...{db,s,p,now,mutate}} state={status(s,p,now)}/></> : <>
      <div className="filters grid gap-3 sm:grid-cols-2"><label>Estado<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todos los estados</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Mes de inicio<select value={month} onChange={e=>setMonth(e.target.value)}><option value="">Todos los meses</option>{monthOptions([...new Set([...months(now),...db.solicitudes.map(x=>x.mesInicio)])].sort())}</select></label></div>
      <p className="count">{requests.length} {requests.length===1?'solicitud':'solicitudes'}</p><List {...{db,requests,open,now}}/>
    </>)}
    {tab==='Catálogo' && <Catalog {...{db,mutate}}/>}
    {tab==='Cupo mensual' && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{months(now).map(month=><MonthCard key={month} {...{month,mutate}} info={capacity(db,month)}/>)}</div>}
  </>
}