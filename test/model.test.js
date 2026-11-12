import test from 'node:test'
import assert from 'node:assert/strict'
import {capacity, DAY, emptyData, expiry, KEY, months, read, status, timeline, totals, update, write} from '../src/model.js'
import {seed} from '../src/seed.js'

const now = Date.UTC(2026,10,12,14)
const [first,full,other] = months(now)
const proposal = (db,n) => db.presupuestos.find(p=>p.solicitudId==='s'+n)
const request = (db,n) => db.solicitudes.find(s=>s.id==='s'+n)
const action = (db,n,kind,rest={}) => update(db,{kind,sid:'s'+n,brand:request(db,n).marcaId,version:proposal(db,n)?.versionEnviada,...rest},now)
test('3 marcas, 12 partidas y 14 solicitudes con todos los estados',()=>{
  const db = seed(now)
  assert.deepEqual([db.marcas.length,db.partidas.length,db.solicitudes.length],[3,12,14])
  assert.equal(new Set(db.solicitudes.map(s=>status(s,db.presupuestos.find(p=>p.solicitudId===s.id),now))).size,7)
  assert.equal(expiry(proposal(db,3))-now,DAY)
})
test('IVA a centavos y anticipo sobre el total, al peso',()=>{
  assert.deepEqual(totals([{cantidad:2,precioUnitario:123.45}]),{subtotal:246.9,iva:39.5,total:286.4,anticipo:143})
  assert.deepEqual(totals([{cantidad:1,precioUnitario:100.50}]),{subtotal:100.50,iva:16.08,total:116.58,anticipo:58})
  assert.deepEqual(totals([{cantidad:1,precioUnitario:.05}]),{subtotal:.05,iva:.01,total:.06,anticipo:0})
})
test('confirmación, marca y cupo, selección de otro mes, cancelación',()=>{
  const db = seed(now)
  assert.equal(capacity(db,full).libres,0)
  assert.throws(()=>action(db,2,'aceptar',{month:other,brand:'m1',confirmed:true}),/marca/)
  assert.throws(()=>action(db,2,'aceptar',{month:other}),/casilla/)
  assert.throws(()=>action(db,2,'aceptar',{month:full,confirmed:true}),/completo/)
  assert.throws(()=>update(db,{kind:'cupo',month:full,limit:2},now),/ocupadas/)
  const accepted = action(db,2,'aceptar',{month:other,confirmed:true})
  assert.equal(capacity(accepted,other).usadas,1)
  assert.equal(request(accepted,2).mesInicio,other)
  assert.equal(capacity(action(accepted,2,'cancelar'),other).usadas,0)
  assert.equal(capacity(update(db,{kind:'cupo',month:first,limit:1},now),first).plazas,1)
})
test('vencimiento al instante límite y reenvío con historial íntegro',()=>{
  const db = seed(now)
  const expired = proposal(db,5)
  assert.throws(()=>action(db,5,'aceptar',{month:other,confirmed:true}),/disponible/)
  const sent = action(db,5,'reenviar')
  assert.equal(expiry(proposal(sent,5)),now+15*DAY)
  assert.equal(status(request(sent,5),proposal(sent,5),now+15*DAY-1),'enviado')
  assert.equal(status(request(sent,5),proposal(sent,5),now+15*DAY),'vencido')
  assert.deepEqual(proposal(sent,5).versiones[0],expired.versiones[0])
})
test('guardar y enviar conservan las versiones y el límite de rondas',()=>{
  let db = seed(now)
  const old = structuredClone(proposal(db,9).versiones)
  const rows = old.at(-1).partidas.map(r=>({...r,precioUnitario:50}))
  db = action(db,9,'guardar',{rows})
  db = action(db,9,'enviar',{rows})
  assert.deepEqual(proposal(db,9).versiones.slice(0,old.length),old)
  assert.throws(()=>action(db,9,'cambios',{comment:'Es corto'}),/20 caracteres/)
  db = action(db,9,'cambios',{comment:'Queremos revisar todo el alcance.'})
  db = action(db,9,'enviar',{rows})
  assert.equal(proposal(db,9).rondasCambios,2)
  assert.throws(()=>action(db,9,'cambios',{comment:'Queremos revisar todo el alcance.'}),/dos rondas/)
  assert.throws(()=>action(db,9,'rechazar',{reason:''}),/motivo/)
})
test('datos persistidos y restauración aislada, escritura fallida conserva el original',()=>{
  const values = new Map([['otra-app','intacto']])
  const storage = {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
  const db = seed(now)
  write(storage,db)
  assert.deepEqual(read(storage),db)
  const changed = update(db,{kind:'baja',id:db.partidas[0].id},now)
  assert.throws(()=>write({...storage,setItem:()=>{throw new Error('QuotaExceededError')}},changed),/QuotaExceededError/)
  assert.equal(JSON.parse(values.get(KEY)).partidas.length,12)
  write(storage,emptyData())
  assert.deepEqual(read(storage),emptyData())
  assert.equal(values.get('otra-app'),'intacto')
  write(storage,seed(now+DAY))
  assert.equal(values.get('otra-app'),'intacto')
})
test('rechazado es final y cancelar registra nota, versión y liberación de una plaza',()=>{
  const db = seed(now)
  const accepted = action(db,2,'aceptar',{month:other,confirmed:true})
  assert.equal(proposal(accepted,2).versionAceptada,proposal(accepted,2).versionEnviada)
  assert.throws(()=>action(accepted,2,'aceptar',{month:other,confirmed:true}),/disponible/)
  const closed = action(accepted,2,'cancelar')
  assert.equal(capacity(closed,other).usadas,capacity(db,other).usadas)
  assert.equal(status(request(closed,2),proposal(closed,2),now),'rechazado')
  assert.equal(request(closed,2).notaCierre,'Cancelado por el estudio')
  assert.ok(timeline(request(closed,2),proposal(closed,2),now).some(e=>e.texto==='Cancelado por el estudio' && e.fecha===now))
  assert.throws(()=>action(closed,2,'cancelar'),/aceptada/)
  for (const kind of ['guardar','enviar','reenviar']) {
    assert.throws(()=>action(closed,2,kind,{rows:proposal(closed,2).versiones[0].partidas}),/impide|vencidas/)
  }
})
test('cambios pendientes vencen y el reenvío conserva ronda e historial',()=>{
  const db = seed(now)
  const s = request(db,9), p = proposal(db,9), limit = expiry(p)
  assert.equal(status(s,p,limit-1),'cambios')
  assert.equal(status(s,p,limit),'vencido')
  assert.equal(timeline(s,p,limit)[0].fecha,limit)
  const next = update(db,{kind:'reenviar',sid:s.id},limit)
  const updated = proposal(next,9)
  assert.equal(updated.rondasCambios,p.rondasCambios)
  assert.equal(expiry(updated),limit+15*DAY)
  assert.deepEqual(updated.versiones.slice(0,-1),p.versiones)
  assert.equal(timeline(request(next,9),updated,limit).filter(e=>e.estado==='vencido').length,1)
  assert.throws(()=>action(next,9,'aceptar',{month:other,confirmed:true,version:p.versionEnviada}),/última versión/)
})
test('datos previos conservan versiones y la migración es repetible',()=>{
  const db = seed(now)
  const s = request(db,13), p = proposal(db,13)
  s.folio = 'EA-013'
  s.estado = 'cancelado'
  delete s.notaCierre
  s.historial = []
  p.estado = 'borrador'
  p.actividad = [{texto:'Aceptación cancelada · plaza liberada',fecha:now-1000}]
  const raw = JSON.stringify(db)
  const migrated = read({getItem:()=>raw})
  assert.equal(request(migrated,13).folio,'PR-1013')
  assert.equal(request(migrated,13).notaCierre,'Cancelado por el estudio')
  assert.deepEqual(proposal(migrated,13).versiones,p.versiones)
  assert.deepEqual(read({getItem:()=>JSON.stringify(migrated)}),migrated)
  assert.equal(capacity(migrated,months(now)[4]).libres,2)
})

test('la semilla respeta las partidas, las marcas y el cupo del briefing',()=>{
  const db = seed(now)
  assert.deepEqual(db.partidas.map(p=>[p.nombre,p.precioUnitario,p.plazo,p.unidad ?? null]),[
    ['Taller de marca y diagnóstico',14000,4,null],
    ['Estrategia y territorio de marca',22000,8,null],
    ['Naming',18000,7,null],
    ['Identidad principal con variantes',38000,15,null],
    ['Sistema tipográfico y cromático',12000,6,null],
    ['Manual de marca',16000,8,null],
    ['Dirección de arte para sesión de producto',19000,2,'jornada'],
    ['Guía de contenido para redes',11000,5,null],
    ['Plantillas editables',9000,4,null],
    ['Concepto de empaque',26000,10,null],
    ['Desarrollo por variedad adicional',6500,3,null],
    ['Seguimiento en imprenta',4500,1,'visita'],
  ])
  assert.deepEqual(db.marcas.map(m=>m.ciudad),['Zapopan','Zapopan','Guadalajara'])
  assert.equal(request(db,2).rubro,'Ropa de trabajo')
  assert.equal(capacity(db,'2027-03').libres,2)
})
