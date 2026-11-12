export const RULES = { iva: 16, anticipo: 50, dias: 15, rondas: 2, plazas: 3, meses: 6, clave: import.meta.env?.VITE_STUDIO_PANEL_KEY || 'albino2026' }
export const KEY = 'estudio-albino.presupuestos.v1'
export const DAY = 86400000
export const types = ['Branding', 'Packaging', 'Branding + packaging']
export const ranges = ['Hasta $50.000', 'De $50.000 a $120.000', 'Más de $120.000']
export const reasons = ['Fuera de presupuesto', 'Cambió el alcance', 'Cambiaron los tiempos', 'Elegimos otra propuesta', 'Otro motivo']
export const labels = {nueva:'Solicitado',borrador:'En armado',enviado:'Enviado',cambios:'Cambios pedidos',aceptado:'Aceptado',rechazado:'Rechazado',vencido:'Vencido'}
export const id = () => crypto.randomUUID()
export const money = (n, decimals = 2) => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(n)
export const folioLabel = number => 'PR-'+String(1000+number)
export const advance = total => Math.round(Math.round(total*100)*RULES.anticipo/10000)
export const cancellationNote = 'Cancelado por el estudio'
export const monthLabel = m => new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-01T00:00:00Z'))
export const dateLabel = t => new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(t)
export function months(now = Date.now()) {
  const [year, month] = new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',timeZone:'America/Mexico_City'}).format(now).split('-').map(Number)
  return Array.from({length:RULES.meses}, (_,i) => new Date(Date.UTC(year, month-1+i,1)).toISOString().slice(0,7))
}
export function totals(rows) {
  const base = rows.reduce((sum,row) => sum + Math.round(Number(row.precioUnitario)*100)*Number(row.cantidad),0)
  const tax = Math.round(base*RULES.iva/100)
  return {subtotal:base/100,iva:tax/100,total:(base+tax)/100,anticipo:advance((base+tax)/100)}
}
export const expiry = p => p?.fechaUltimoEnvio == null ? null : p.fechaUltimoEnvio+RULES.dias*DAY
export function status(s,p,now = Date.now()) {
  const deadline = expiry(p)
  if (['enviado','cambios'].includes(s.estado) && deadline !== null && now >= deadline) return 'vencido'
  return s.estado
}
export function timeline(s,p,now) {
  const events = [...(s.historial ?? []), ...(p?.actividad ?? [])]
  if (status(s,p,now) === 'vencido' && expiry(p) !== null) {
    events.push({estado:'vencido',texto:labels.vencido,fecha:expiry(p)})
  }
  return events.sort((a,b)=>b.fecha-a.fecha)
}
function record(s,estado,fecha,texto = labels[estado]) {
  s.historial ??= []
  s.historial.push({estado,texto,fecha})
}
export function capacity(db,month) {
  const usadas = db.presupuestos.filter(p => p.estado === 'aceptado' && p.mesAceptado === month).length
  const plazas = db.cupos[month] ?? RULES.plazas
  return {usadas, plazas, libres:plazas-usadas}
}
function requireRule(ok,message) { if (!ok) throw new Error(message) }
export function update(db, action, now = Date.now()) {
  const next = structuredClone(db)
  const {kind} = action
  if (kind === 'solicitar') {
    const f = action.form
    requireRule(types.includes(f.tipoProyecto) && f.nombre.trim() && f.rubro.trim() && f.descripcion.trim().length >= 40 && f.descripcion.trim().length <= 600 && ranges.includes(f.rangoInversion) && months(now).includes(f.mesInicio),'Revisá los datos de la solicitud.')
    const name = f.nombre.trim()
    let brand = next.marcas.find(m => m.id === action.brand && m.nombre === name)
    if (!brand) {
      brand = {id:action.newBrand ?? id(),nombre:name,contacto:f.contacto.trim()}
      next.marcas.push(brand)
    }
    next.solicitudes.unshift({id:id(), folio:folioLabel(next.folio++),marcaId:brand.id,tipoProyecto:f.tipoProyecto,rubro:f.rubro.trim(),descripcion:f.descripcion.trim(),rangoInversion:f.rangoInversion,mesInicio:f.mesInicio,estado:'nueva',historial:[{estado:'nueva',texto:labels.nueva,fecha:now}]})
    return next
  }
  if (kind === 'cupo') {
    const {month, limit} = action
    requireRule(months(now).includes(month) && Number.isInteger(limit) && limit >= capacity(next,month).usadas && limit <= RULES.plazas,'Ingresá un cupo entre las plazas ocupadas y el máximo de '+RULES.plazas+'.')
    next.cupos[month] = limit
    return next
  }
  if (kind === 'partida' || kind === 'baja') {
    if (kind === 'baja') next.partidas = next.partidas.filter(p => p.id !== action.id)
    else {
      const p = action.item
      requireRule(p.nombre.trim() && p.descripcion.trim() && Number.isFinite(p.precioUnitario) && p.precioUnitario >= 0 && Number.isInteger(p.plazo) && p.plazo >= 1,'Completá la partida con un precio válido y un plazo de al menos un día.')
      const index = next.partidas.findIndex(x => x.id === p.id)
      const item = {...p,nombre:p.nombre.trim(),descripcion:p.descripcion.trim()}
      if (index < 0) next.partidas.push({...item,id:id()})
      else next.partidas[index] = item
    }
    return next
  }
  const s = next.solicitudes.find(x => x.id === action.sid)
  requireRule(s,'La solicitud ya no está disponible.')
  let p = next.presupuestos.find(x => x.solicitudId === s.id)
  const state = status(s,p,now)
  if (kind === 'guardar' || kind === 'enviar') {
    requireRule(!['aceptado','rechazado','vencido'].includes(state),'El estado actual impide esta acción.')
    const rows = action.rows.map(r => ({...r,cantidad:Number(r.cantidad),precioUnitario:Number(r.precioUnitario)}))
    requireRule(rows.length && rows.every((r,i) => Number.isSafeInteger(r.cantidad) && r.cantidad > 0 && action.rows[i].precioUnitario !== '' && Number.isFinite(r.precioUnitario) && r.precioUnitario >= 0),'Agregá partidas con cantidades enteras positivas y precios válidos.')
    if (!p) {
      p = {id:id(),solicitudId:s.id,versiones:[],rondasCambios:0,fechaUltimoEnvio:null,estado:'borrador',actividad:[]}
      next.presupuestos.push(p)
    }
    const sent = kind === 'enviar'
    p.versiones.push({partidas:rows,...totals(rows),fechaCreacion:now,fechaEnvio:sent ? now : null})
    if (sent) {
      p.fechaUltimoEnvio = now
      p.versionEnviada = p.versiones.length-1
      p.estado = s.estado = 'enviado'
      record(s,'enviado',now)
    } else if (state === 'nueva') {
      p.estado = s.estado = 'borrador'
      record(s,'borrador',now)
    }
    return next
  }
  requireRule(p,'Todavía no hay una propuesta.')
  if (kind === 'reenviar') {
    requireRule(state === 'vencido','Solo se pueden reenviar propuestas vencidas.')
    const original = p.versiones[p.versionEnviada]
    record(s,'vencido',expiry(p))
    p.versiones.push({...original,anticipo:advance(original.total),fechaCreacion:now,fechaEnvio:now})
    p.versionEnviada = p.versiones.length-1
    p.fechaUltimoEnvio = now
    p.estado = s.estado = 'enviado'
    record(s,'enviado',now,'Reenviado')
    return next
  }
  if (kind === 'cancelar') {
    requireRule(state === 'aceptado','La propuesta ya no está aceptada.')
    p.estado = s.estado = 'rechazado'
    s.notaCierre = cancellationNote
    record(s,'rechazado',now,cancellationNote)
    delete p.mesAceptado
    return next
  }
  requireRule(action.brand === s.marcaId,'Elegí la marca de esta propuesta.')
  requireRule(state === 'enviado','La propuesta ya no está disponible para responder.')
  requireRule(action.version === p.versionEnviada,'La propuesta cambió. Revisá la última versión.')
  if (kind === 'aceptar') {
    requireRule(action.confirmed,'Marcá la casilla de confirmación.')
    requireRule(action.month === s.mesInicio || months(now).includes(action.month),'Elegí un mes de inicio válido.')
    requireRule(capacity(next,action.month).libres > 0,'El cupo de ese mes está completo. Elegí otro mes.')
    p.mesAceptado = s.mesInicio = action.month
    p.estado = s.estado = 'aceptado'
    p.versionAceptada = action.version
    record(s,'aceptado',now,'Propuesta aceptada')
  } else if (kind === 'rechazar') {
    requireRule(reasons.includes(action.reason),'Seleccioná un motivo de rechazo.')
    p.estado = s.estado = 'rechazado'
    record(s,'rechazado',now,'Rechazo · '+action.reason)
  } else if (kind === 'cambios') {
    requireRule(p.rondasCambios < RULES.rondas,'Ya usaste las dos rondas de cambios.')
    requireRule(action.comment.trim().length >= 20,'Escribí un comentario de al menos 20 caracteres.')
    p.rondasCambios++
    s.estado = 'cambios'
    p.estado = 'cambios'
    record(s,'cambios',now,'Pedido de cambios · '+action.comment.trim())
  } else throw new Error('Acción desconocida.')
  return next
}
export function emptyData() {
  return {marcas:[],partidas:[],solicitudes:[],presupuestos:[],cupos:{},folio:1}
}
export function read(storage) {
  const raw = storage.getItem(KEY)
  if (raw === null) return null
  const db = JSON.parse(raw)
  if (!db || !['marcas','partidas','solicitudes','presupuestos'].every(k => Array.isArray(db[k])) || !db.cupos || !Number.isInteger(db.folio)) throw new Error('Datos inválidos.')
  for (const s of db.solicitudes) {
    if (/^EA-\d+$/.test(s.folio)) s.folio = folioLabel(Number(s.folio.slice(3)))
    if (s.estado !== 'cancelado') continue
    s.estado = 'rechazado'
    s.notaCierre = cancellationNote
    const p = db.presupuestos.find(item=>item.solicitudId===s.id)
    if (!p) continue
    p.estado = 'rechazado'
    delete p.mesAceptado
    const event = p.actividad?.findLast(e=>e.texto.startsWith('Aceptación cancelada'))
    if (event) record(s,'rechazado',event.fecha,cancellationNote)
  }
  return db
}
export function write(storage, db) {
  storage.setItem(KEY,JSON.stringify(db))
}