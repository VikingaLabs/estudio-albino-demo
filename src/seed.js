import {DAY, months, ranges, totals, types} from './model.js'
const brands = [
  ['m1','Bruma Café','hola@bruma.example','Café de especialidad'],
  ['m2','Casa Nopal','equipo@casanopal.example','Alimentos'],
  ['m3','Lumbre Botánica','estudio@lumbre.example','Cuidado personal'],
]
const catalog = [
  ['Diagnóstico de marca','Entrevista y revisión de referencias.',4500,4],
  ['Estrategia de marca','Posicionamiento, personalidad y atributos.',12500,10],
  ['Naming','Exploración y selección de nombres.',8500,8],
  ['Identidad visual','Logotipo, color y sistema tipográfico.',23500,15],
  ['Manual de marca','Guía de aplicación del sistema visual.',8200,7],
  ['Tono de voz','Principios de escritura y ejemplos.',6400,6],
  ['Diseño de empaque','Diseño gráfico para un formato principal.',16000,12],
  ['Variante de empaque','Adaptación a otro SKU del sistema.',4200,4],
  ['Arte final','Archivos listos para imprenta.',3000,3],
  ['Dirección de arte','Concepto y lineamientos visuales.',9800,7],
  ['Papelería','Aplicaciones impresas de identidad.',5200,5],
  ['Kit digital','Plantillas para canales de marca.',5800,5],
]
export function seed(now = Date.now()) {
  const calendar = months(now)
  const marcas = brands.map(([id,nombre,contacto]) => ({id,nombre,contacto}))
  const partidas = catalog.map(([nombre,descripcion,precioUnitario,plazo],i) => ({id:'p'+(i+1),nombre,descripcion,precioUnitario,plazo}))
  const scenarios = [
    [0,0,0,'nueva','Estamos por abrir nuestra segunda barra de café y queremos ordenar la identidad para crecer.'],
    [1,1,1,'enviado','Queremos un empaque para una línea de salsas de temporada que se pueda extender a otros sabores.',3],
    [2,2,2,'enviado','Vamos a lanzar una colección botánica de cuidado diario y necesitamos una identidad y su empaque.',14],
    [0,1,1,'enviado','Buscamos rediseñar la bolsa de nuestro café de origen con un sistema claro para distinguir los lotes.',2,2],
    [0,1,2,'vencido','Necesitamos adaptar la familia de empaques a un nuevo formato de suscripción mensual.',16],
    [1,0,1,'aceptado','Queremos renovar la identidad del proyecto y preparar el lanzamiento en tiendas especializadas.',5],
    [2,1,1,'aceptado','Necesitamos un sistema de etiquetas para aceites, bálsamos y jabones de nuestra línea.',6],
    [0,0,1,'aceptado','Buscamos una identidad para un punto de venta con una barra móvil en mercados locales.',4],
    [1,2,2,'cambios','Necesitamos un sistema visual completo para la próxima línea de productos de nuestra marca.',7,1],
    [2,0,3,'rechazado','Queremos revisar el posicionamiento y la identidad para una línea independiente de productos.',10],
    [0,2,3,'borrador','Buscamos actualizar la identidad y el empaque de un nuevo café descafeinado de temporada.'],
    [1,1,4,'nueva','Queremos una etiqueta para conservas artesanales con espacio para variantes y datos de lote.'],
    [2,1,4,'cancelado','Necesitamos diseñar cajas para un set de regalo con tres productos y un inserto informativo.',8],
    [1,0,5,'enviado','Nos gustaría actualizar el logotipo y la tipografía para que funcionen mejor en puntos de venta.',1],
  ]
  const solicitudes = []
  const presupuestos = []
  scenarios.forEach(([b,t,m,estado,descripcion,age,rondasCambios=0],i) => {
    const id = 's'+(i+1)
    const mesInicio = calendar[m]
    solicitudes.push({id,folio:'EA-'+String(i+1).padStart(3,'0'),marcaId:marcas[b].id,rubro:brands[b][3],tipoProyecto:types[t],descripcion,rangoInversion:ranges[i%4],mesInicio,estado})
    if (estado === 'nueva') return
    const sent = age === undefined ? null : now-age*DAY
    const lines = [partidas[t === 0 ? 3 : 6],partidas[t === 1 ? 8 : 0]].map(row => ({...row,cantidad:1}))
    const version = (rows,time) => ({partidas:rows,...totals(rows),fechaCreacion:time ?? now-DAY,fechaEnvio:time})
    const older = Array.from({length:rondasCambios},(_,j) => version([{...lines[0],precioUnitario:lines[0].precioUnitario-1000+j*500}],sent-(rondasCambios-j)*DAY))
    const actividad = Array.from({length:rondasCambios},(_,j)=>({texto:'Pedido de cambios · Revisar el alcance de las aplicaciones y variantes.',fecha:older[j].fechaEnvio+3600000}))
    if (estado === 'rechazado') actividad.push({texto:'Rechazo · Fuera de presupuesto',fecha:sent+DAY})
    if (estado === 'cancelado') actividad.push({texto:'Aceptación cancelada · plaza liberada',fecha:sent+DAY})
    if (estado === 'aceptado') actividad.push({texto:'Propuesta aceptada',fecha:sent+DAY})
    presupuestos.push({id:'q'+(i+1),solicitudId:id,versiones:[...older,version(lines,sent)],rondasCambios,estado:({vencido:'enviado',cancelado:'borrador',cambios:'borrador'})[estado] ?? estado,fechaUltimoEnvio:sent,versionEnviada:sent === null ? null : older.length,mesAceptado:estado === 'aceptado' ? mesInicio : null,actividad})
  })
  return {marcas,partidas,solicitudes,presupuestos,cupos:{},folio:15}
}