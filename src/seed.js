import {cancellationNote, DAY, folioLabel, labels, months, ranges, totals, types} from './model.js'

const brands = [
  ['m1','Bruma Café','hola@bruma.example','Café de especialidad','Zapopan'],
  ['m2','Trama de Oficio','equipo@trama.example','Ropa de trabajo','Zapopan'],
  ['m3','Lumbre Botánica','estudio@lumbre.example','Cosmética natural','Guadalajara'],
]
const catalog = [
  ['Taller de marca y diagnóstico','Branding','Taller y diagnóstico de la situación de la marca.',14000,4],
  ['Estrategia y territorio de marca','Branding','Posicionamiento y territorio para orientar las decisiones de marca.',22000,8],
  ['Naming','Branding','Exploración y selección de nombres.',18000,7],
  ['Identidad principal con variantes','Sistema de identidad visual','Sistema visual principal y sus variantes.',38000,15],
  ['Sistema tipográfico y cromático','Sistema de identidad visual','Selección de tipografías, paleta y reglas de combinación.',12000,6],
  ['Manual de marca','Sistema de identidad visual','Guía de aplicación del sistema visual.',16000,8],
  ['Dirección de arte para sesión de producto','Dirección de arte','Dirección visual de la sesión de producto.',19000,2,'jornada'],
  ['Guía de contenido para redes','Dirección de arte','Lineamientos visuales para contenido en redes.',11000,5],
  ['Plantillas editables','Dirección de arte','Plantillas que el equipo puede adaptar a nuevos contenidos.',9000,4],
  ['Concepto de empaque','Packaging','Concepto visual para el empaque principal.',26000,10],
  ['Desarrollo por variedad adicional','Packaging','Adaptación del sistema de empaque a una variedad adicional.',6500,3],
  ['Seguimiento en imprenta','Packaging','Revisión de pruebas y seguimiento de producción.',4500,1,'visita'],
]
export function seed(now = Date.now()) {
  const calendar = months(now)
  const marcas = brands.map(([id,nombre,contacto,,ciudad]) => ({id,nombre,contacto,ciudad}))
  const partidas = catalog.map(([nombre,linea,descripcion,precioUnitario,plazo,unidad],i) => ({id:'p'+(i+1),nombre,linea,descripcion,precioUnitario,plazo,...(unidad && {unidad})}))
  const scenarios = [
    [0,0,0,'nueva','Estamos por abrir nuestra segunda barra de café y queremos ordenar la identidad para crecer.'],
    [1,1,1,'enviado','Queremos un empaque para una línea de uniformes de taller que se pueda extender a distintas tallas.',3],
    [2,2,2,'enviado','Vamos a lanzar una colección botánica de cuidado diario y necesitamos una identidad y su empaque.',14],
    [0,1,1,'enviado','Buscamos rediseñar la bolsa de nuestro café de origen con un sistema claro para distinguir los lotes.',2,2],
    [0,1,2,'vencido','Necesitamos adaptar la familia de empaques a un nuevo formato de suscripción mensual.',16],
    [1,0,1,'aceptado','Queremos renovar la identidad del proyecto y preparar el lanzamiento en tiendas especializadas.',5],
    [2,1,1,'aceptado','Necesitamos un sistema de etiquetas para aceites, bálsamos y jabones de nuestra línea.',6],
    [0,0,1,'aceptado','Buscamos una identidad para un punto de venta con una barra móvil en mercados locales.',4],
    [1,2,2,'cambios','Necesitamos un sistema visual completo para la próxima línea de productos de nuestra marca.',7,1],
    [2,0,3,'rechazado','Queremos revisar el posicionamiento y la identidad para una línea independiente de productos.',10],
    [0,2,3,'borrador','Buscamos actualizar la identidad y el empaque de un nuevo café descafeinado de temporada.'],
    [1,1,4,'nueva','Queremos una etiqueta para prendas de taller con espacio para tallas y cuidados de lavado.'],
    [2,1,4,'cancelado','Necesitamos diseñar cajas para un set de regalo con tres productos y un inserto informativo.',8],
    [1,0,4,'aceptado','Nos gustaría actualizar el logotipo y la tipografía para que funcionen mejor en puntos de venta.',1],
  ]
  const solicitudes = []
  const presupuestos = []
  scenarios.forEach(([b,t,m,estado,descripcion,age,rondasCambios=0],i) => {
    const id = 's'+(i+1)
    const mesInicio = calendar[m]
    const sent = age === undefined ? null : now-age*DAY
    const armado = (sent ?? now)-DAY
    const historial = [{estado:'nueva',texto:labels.nueva,fecha:armado-DAY}]
    const solicitud = {id,folio:folioLabel(i+1),marcaId:marcas[b].id,rubro:brands[b][3],tipoProyecto:types[t],descripcion,rangoInversion:ranges[i%ranges.length],mesInicio,estado:estado==='cancelado'?'rechazado':estado,historial}
    solicitudes.push(solicitud)
    if (estado === 'nueva') return
    const lines = [partidas[t === 0 ? 3 : 9],partidas[t === 1 ? 11 : 0]].map(row => ({...row,cantidad:1}))
    const version = (rows,time) => ({partidas:rows,...totals(rows),fechaCreacion:time ?? armado,fechaEnvio:time})
    const olderCount = rondasCambios - Number(estado === 'cambios')
    const older = Array.from({length:olderCount},(_,j) => version([{...lines[0],precioUnitario:lines[0].precioUnitario-1000+j*500}],sent-(olderCount-j)*DAY))
    const versiones = [...older,version(lines,sent)]
    historial[0].fecha -= olderCount*DAY
    historial.push({estado:'borrador',texto:labels.borrador,fecha:armado-olderCount*DAY})
    for (const [index,v] of versiones.entries()) {
      if (v.fechaEnvio === null) continue
      historial.push({estado:'enviado',texto:labels.enviado,fecha:v.fechaEnvio})
      if (index < rondasCambios) {
        historial.push({estado:'cambios',texto:'Pedido de cambios · Revisar el alcance de las aplicaciones y variantes.',fecha:v.fechaEnvio+3600000})
      }
    }
    if (estado === 'rechazado') historial.push({estado:'rechazado',texto:'Rechazo · Fuera de presupuesto',fecha:sent+DAY})
    if (estado === 'aceptado' || estado === 'cancelado') historial.push({estado:'aceptado',texto:'Propuesta aceptada',fecha:sent+DAY})
    if (estado === 'cancelado') {
      solicitud.notaCierre = cancellationNote
      historial.push({estado:'rechazado',texto:cancellationNote,fecha:sent+2*DAY})
    }
    presupuestos.push({id:'q'+(i+1),solicitudId:id,versiones,rondasCambios,estado:({vencido:'enviado',cancelado:'rechazado'})[estado] ?? estado,fechaUltimoEnvio:sent,versionEnviada:sent === null ? null : older.length,mesAceptado:estado === 'aceptado' ? mesInicio : null,actividad:[],...(['aceptado','cancelado'].includes(estado) && {versionAceptada:older.length})})
  })
  return {marcas,partidas,solicitudes,presupuestos,cupos:{},folio:15}
}