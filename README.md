# Estudio Albino · Presupuestos

Prototipo estático para un estudio de branding y packaging en México. React, Tailwind CSS y localStorage. Importes en MXN, interfaz en español rioplatense y tipografías Fraunces y Work Sans incluidas en la compilación.

## Instalación y ejecución

Requiere Node.js 22 o posterior y npm. Desde la carpeta del proyecto:

```sh
npm ci
npm run dev
```

Abrí http://localhost:5173. Para comprobar la compilación de producción:

```sh
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

La vista compilada abre en http://127.0.0.1:4173. Cada origen mantiene sus propios datos. El directorio `dist/` se puede servir en cualquier alojamiento estático.

## Roles

- **Estudio**. Clave de demostración: **`albino2026`**. Acceso a bandeja, editor, catálogo y cupo.
- **Cliente**. Elegí una marca y consultá únicamente sus solicitudes. El selector de rol, la clave y las marcas simulan el acceso dentro del mismo navegador.


### Clave del panel

En **Entrar como Estudio**, abrí **Credenciales de prueba** para ver y copiar la clave activa. El ícono de ojo muestra u oculta lo que escribiste.

Para configurar la clave, creá `.env.local` en la raíz del proyecto con `VITE_STUDIO_PANEL_KEY=tu-clave` y reiniciá Vite o volvé a compilar. Si la variable está vacía o ausente, se usa `albino2026`. La clave forma parte del frontend de demostración. En GitHub Pages podés usar una variable de repositorio del mismo nombre al compilar.

## Datos sintéticos

La primera carga crea 3 marcas, 12 partidas y 14 solicitudes. Los plazos y meses se calculan desde el momento de la inicialización o restauración.

| Folio | Marca | Caso |
| --- | --- | --- |
| EA-001 | Bruma Café | Solicitud nueva, lista para presupuestar |
| EA-002 | Casa Nopal | Propuesta vigente cuyo mes está completo. Elegí otro mes para aceptarla |
| EA-003 | Lumbre Botánica | Vencimiento próximo (un día desde la restauración) |
| EA-004 | Bruma Café | Dos rondas agotadas y tres versiones enviadas |
| EA-005 | Bruma Café | Propuesta vencida, lista para reenviar |
| EA-006 a EA-008 | Varias | Tres propuestas aceptadas en el mismo mes |
| EA-009 | Casa Nopal | Pedido de cambios pendiente, una ronda usada |
| EA-010 | Lumbre Botánica | Propuesta rechazada con motivo |
| EA-011 | Bruma Café | Presupuesto guardado como borrador |
| EA-012 | Casa Nopal | Solicitud nueva de packaging |
| EA-013 | Lumbre Botánica | Aceptación cancelada |
| EA-014 | Casa Nopal | Propuesta vigente con cupo disponible |

## Reglas y configuración

`src/model.js` centraliza IVA del 16 %, anticipo informativo del 50 % sobre el total con IVA, vigencia de 15 días exactos desde el último envío, dos rondas de cambios y un máximo de tres plazas por mes. El cupo muestra seis meses calendario contando el actual y admite valores entre las plazas ocupadas y el máximo. Los meses y las fechas visibles usan la hora de Ciudad de México.

Los importes se calculan en centavos. Guardar versión crea una copia interna. Enviar o reenviar agrega otra copia con fecha de envío. El estudio consulta todas las versiones y el cliente las que fueron enviadas. Las ediciones y bajas del catálogo se aplican a selecciones futuras. Los cambios pedidos acumulan rondas por solicitud y un nuevo envío habilita una respuesta. El cupo ocupado se calcula a partir de las aceptaciones vigentes, por lo que al cancelar se libera la plaza automáticamente.

## Almacenamiento, restauración y borrado

En el pie de cualquier pantalla, elegí **Restaurar datos de prueba** y confirmá **Sí, restaurar**. La operación reemplaza únicamente la clave `estudio-albino.presupuestos.v1` del origen abierto. Si la escritura falla, la interfaz conserva los datos previos y muestra un aviso. Cada navegador conserva su propia copia.


**Borrar datos de prueba → Sí, borrar** guarda una base vacía en esa misma clave. Elimina todas las marcas, partidas, solicitudes, presupuestos y configuraciones de cupo locales de esta app, incluidos los registros agregados durante la prueba. Al recargar se mantiene vacía. Desde ese estado podés crear marcas y solicitudes desde el cliente, crear partidas en el estudio o restaurar los datos iniciales. Ambas acciones tienen confirmación independiente y conservan las claves de otras aplicaciones.

## Pruebas

`npm test` ejecuta las pruebas de reglas, vencimiento, historial, cupo y almacenamiento. Para comprobar los flujos en el navegador, iniciá la vista de producción y usá los folios de la tabla. Para verificar el estado vacío, elegí **Borrar datos de prueba**, confirmá, recargá y consultá ambos roles. Después elegí **Restaurar datos de prueba** y verificá que vuelvan las 14 solicitudes.

## GitHub Pages

Subí los archivos fuente a un repositorio con rama principal `main` y elegí **Settings → Pages → Source → GitHub Actions**. El flujo incluido ejecuta las pruebas, compila el frontend y publica el directorio estático. La URL aparece en la ejecución del flujo y en la configuración de Pages.
