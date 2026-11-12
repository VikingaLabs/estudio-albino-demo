import React, {useEffect, useRef, useState} from 'react'
import {createRoot} from 'react-dom/client'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/work-sans'
import './style.css'
import {KEY, RULES, emptyData, read, write, update} from './model.js'
import {seed} from './seed.js'
import {Client, Studio} from './screens.jsx'

const saveError = 'No se pudo guardar en este navegador. Los datos guardados anteriormente se conservaron.'
function boot() {
  try {
    const existing = read(localStorage)
    if (existing) return {db:existing,error:''}
    const db = seed()
    write(localStorage,db)
    return {db,error:''}
  } catch {
    return {db:seed(),error:'No se pudieron cargar o guardar los datos locales. Los datos anteriores se conservaron.'}
  }
}
function App() {
  const [{db,error}, setStore] = useState(boot)
  const [role,setRole] = useState('')
  const [gate,setGate] = useState(false)
  const [key,setKey] = useState('')
  const [gateError,setGateError] = useState('')
  const [revision,setRevision] = useState(0)
  const [notice,setNotice] = useState('')
  const [dataAction,setDataAction] = useState('')
  const [now,setNow] = useState(Date.now)
  const errorRef = useRef(null)
  useEffect(() => { errorRef.current?.scrollIntoView({block:'nearest'}) },[error])
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const timer = setInterval(tick,1000)
    const sync = e => {
      if (e.key !== KEY && e.key !== null) return
      setStore(boot())
    }
    window.addEventListener('storage',sync)
    return () => { clearInterval(timer); window.removeEventListener('storage',sync) }
  },[])
  async function mutate(action, message) {
    function commit() {
      let current
      try { current = ['reset','clear'].includes(action.kind) ? null : read(localStorage) ?? db }
      catch { throw new Error(saveError) }
      const next = action.kind === 'reset' ? seed() : action.kind === 'clear' ? emptyData() : update(current,action)
      try { write(localStorage,next) }
      catch { throw new Error(saveError) }
      setStore({db:next,error:''})
    }
    setNotice('')
    try {
      if (navigator.locks) await navigator.locks.request(KEY,commit)
      else commit()
      setNotice(message)
      return true
    } catch (e) {
      setStore(prev => ({...prev,error:e.message}))
      return false
    }
  }
  function enter(e) {
    e.preventDefault()
    if (key !== RULES.clave) return setGateError('La clave de panel es incorrecta.')
    setKey(''); setGate(false); setGateError(''); setRole('estudio')
  }
  function exit() {
    setRole(''); setGate(false); setGateError(''); setKey(''); setNotice('')
  }
  async function confirmDataAction() {
    const message = dataAction === 'reset' ? 'Se restauraron los datos de prueba.' : 'Se borraron los datos de Estudio Albino.'
    if (await mutate({kind:dataAction},message)) {
      setDataAction('')
      setRevision(n=>n+1)
    }
  }
  return <div className="shell">
    <header className="mast">
      <div className="wordmark"><span className="mark" aria-hidden="true">✳</span> ESTUDIO ALBINO</div>
      <div className="mast-right">{role ? <button className="quiet" onClick={exit}>Cambiar de rol ↗</button> : 'MÉXICO · BRANDING & PACKAGING'}</div>
    </header>
    <main>
      {error && <p ref={errorRef} className="feedback error" role="alert">{error}</p>}
      {notice && <p className="feedback" role="status">{notice}</p>}
      {!role && <div className="landing">
        <section className="intro">
          <div className="intro-copy">
            <p className="eyebrow">ESTUDIO DE DISEÑO INDEPENDIENTE</p>
            <h1>Presupuestos<span>.</span></h1>
            <p>Un espacio para solicitar, preparar y revisar propuestas de branding y packaging.</p>
          </div>
          <div className="intro-art" aria-hidden="true"><span>✳</span></div>
        </section>
        <div className="role-grid grid gap-4 md:grid-cols-2">
          <section className="role-card"><p className="eyebrow">PANEL INTERNO</p><h2>Estudio</h2><p>Revisá solicitudes, armá presupuestos y organizá el cupo mensual.</p><button className="primary" onClick={()=>setGate(true)}>Entrar como Estudio <span aria-hidden="true">↗</span></button></section>
          <section className="role-card"><p className="eyebrow">PORTAL DE MARCA</p><h2>Cliente</h2><p>Contanos sobre tu proyecto y consultá las propuestas de tu marca.</p><button className="secondary" onClick={()=>{setRole('cliente');setGate(false)}}>Entrar como Cliente <span aria-hidden="true">↗</span></button></section>
        </div>
        {gate && <form className="panel gate" onSubmit={enter}><h2>Clave del panel</h2><label>Clave de acceso<input autoFocus type="password" value={key} onChange={e=>setKey(e.target.value)} required /></label>{gateError && <p role="alert" className="error">{gateError}</p>}<div className="actions"><button className="primary">Ingresar al panel</button><button className="secondary" type="button" onClick={exit}>Volver</button></div></form>}
      </div>}
      {role === 'cliente' && <Client key={revision} {...{db,mutate,now}}/>}
      {role === 'estudio' && <Studio key={revision} {...{db,mutate,now}}/>}
    </main>
    <footer><span>ESTUDIO ALBINO <span className="muted">/ Prototipo con datos de prueba</span></span>
      {dataAction ? <div className="reset"><p>{dataAction==='reset' ? 'Se reemplazarán los datos locales de Estudio Albino por los datos iniciales.' : 'Se borrarán todas las marcas, partidas, solicitudes, presupuestos y cupos locales de Estudio Albino, incluidos los que hayas agregado.'}</p><div className="actions"><button className="primary" onClick={confirmDataAction}>{dataAction==='reset' ? 'Sí, restaurar' : 'Sí, borrar'}</button><button className="secondary" onClick={()=>setDataAction('')}>Volver</button></div></div> : <div className="actions"><button className="quiet" onClick={()=>setDataAction('reset')}>Restaurar datos de prueba</button><button className="quiet" onClick={()=>setDataAction('clear')}>Borrar datos de prueba</button></div>}
    </footer>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>)