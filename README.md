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

**Entrar como Estudio** abre una pantalla de acceso dedicada. Mientras se muestren las **Credenciales de prueba**, podés consultar la clave activa y usar **Copiar contraseña**. El ícono de ojo muestra u oculta lo que escribiste.

Para configurar la clave, creá `.env.local` en la raíz del proyecto con `VITE_STUDIO_PANEL_KEY=tu-clave` y reiniciá Vite o volvé a compilar. Si la variable está vacía o ausente, se usa `albino2026`. La clave forma parte del frontend de demostración. En GitHub Pages podés usar una variable de repositorio del mismo nombre al compilar.


Para ocultar por completo el desplegable, agregá `VITE_SHOW_TEST_CREDENTIALS=false` a `.env.local` y reiniciá Vite o volvé a compilar. En GitHub Pages, configurá la variable de repositorio `VITE_SHOW_TEST_CREDENTIALS` con valor `false` y ejecutá de nuevo el flujo de publicación. Dejar la variable vacía o usar `true` vuelve a mostrar el desplegable. Esta opción cambia la pantalla y conserva la clave configurada y la validación de acceso. La clave pertenece al prototipo de frontend.

### Retirar definitivamente las credenciales de demostración

Cuando termine la revisión, hacé estos cambios en un solo commit:

1. Elegí una clave nueva y configurala en `VITE_STUDIO_PANEL_KEY` para Pages y para los entornos donde se use el panel. Para las ejecuciones locales usá `.env.local`, que se excluye de Git.
2. En `src/model.js`, quitá el valor predeterminado de `RULES.clave`. En `src/main.jsx`, exigí que `RULES.clave` tenga un valor al comprobar el acceso. Conservá la validación del formulario y el control de mostrar u ocultar la contraseña ingresada.
3. En `StudioAccess` eliminá el bloque `<details>` de credenciales, el estado `copyStatus`, la función `copyKey` y la constante `showTestCredentials`. Eliminá `VITE_SHOW_TEST_CREDENTIALS` del flujo de Pages y las menciones a la clave de demostración en el README.
4. Ejecutá `npm test` y `npm run build`. Comprobá que la clave anterior ya no aparece en las fuentes vigentes ni en `dist/`. En la vista previa, confirmá que la clave anterior se rechaza, la nueva abre el panel y el selector de Cliente sigue funcionando. Publicá y repetí el control en la URL de Pages.

La rotación invalida la clave de prueba en el despliegue vigente. Las copias y commits públicos anteriores pueden seguir conteniendo ese valor. La clave nueva se integra en el JavaScript del prototipo, así que debe ser exclusiva de esta demo. Proteger datos reales requiere autenticación fuera de este frontend.

## Datos sintéticos

La primera carga crea 3 marcas, 12 partidas y 14 solicitudes. Los plazos y meses se calculan desde el momento de la inicialización o restauración.

| Folio | Marca | Caso |
| --- | --- | --- |
| PR-1001 | Bruma Café | Solicitud nueva, lista para presupuestar |
| PR-1002 | Trama de Oficio | Propuesta vigente cuyo mes está completo. Elegí otro mes para aceptarla |
| PR-1003 | Lumbre Botánica | Vencimiento próximo (un día desde la restauración) |
| PR-1004 | Bruma Café | Dos rondas agotadas y tres versiones enviadas |
| PR-1005 | Bruma Café | Propuesta vencida, lista para reenviar |
| PR-1006 a PR-1008 | Varias | Tres propuestas aceptadas en el mismo mes |
| PR-1009 | Trama de Oficio | Pedido de cambios pendiente, una ronda usada |
| PR-1010 | Lumbre Botánica | Propuesta rechazada con motivo |
| PR-1011 | Bruma Café | Presupuesto guardado como borrador |
| PR-1012 | Trama de Oficio | Solicitud nueva de packaging |
| PR-1013 | Lumbre Botánica | Aceptación cancelada |
| PR-1014 | Trama de Oficio | Aceptado en el quinto mes. La semilla deja dos plazas libres para el caso del briefing |

## Reglas y configuración

`src/model.js` centraliza IVA del 16 %, anticipo informativo del 50 % sobre el total con IVA, vigencia de 15 días exactos desde el último envío, dos rondas de cambios y un máximo de tres plazas por mes. El cupo muestra seis meses calendario contando el actual y admite valores entre las plazas ocupadas y el máximo. Los meses y las fechas visibles usan la hora de Ciudad de México.

El subtotal, el IVA y el total se calculan en centavos. El anticipo se muestra redondeado al peso mexicano. Guardar versión crea una copia interna. Enviar o reenviar agrega otra copia con fecha de envío. El estudio consulta todas las versiones y el cliente las que fueron enviadas. Las ediciones y bajas del catálogo se aplican a selecciones futuras. Los cambios pedidos acumulan rondas por solicitud y un nuevo envío habilita una respuesta. Las propuestas con cambios pedidos conservan su fecha de vencimiento. Al vencer pueden reenviarse. Rechazado es final. Si el estudio cancela una aceptación, pasa a Rechazado con la nota «Cancelado por el estudio». El cupo ocupado se calcula a partir de las aceptaciones vigentes, por lo que al cancelar se libera la plaza automáticamente.

## Almacenamiento, restauración y borrado

En el pie de cualquier pantalla, elegí **Restaurar datos de prueba** y confirmá **Sí, restaurar**. La operación reemplaza únicamente la clave `estudio-albino.presupuestos.v1` del origen abierto. Si la escritura falla, la interfaz conserva los datos previos y muestra un aviso. Cada navegador conserva su propia copia.


**Borrar datos de prueba → Sí, borrar** guarda una base vacía en esa misma clave. Elimina todas las marcas, partidas, solicitudes, presupuestos y configuraciones de cupo locales de esta app, incluidos los registros agregados durante la prueba. Al recargar se mantiene vacía. Desde ese estado podés crear marcas y solicitudes desde el cliente, crear partidas en el estudio o restaurar los datos iniciales. Ambas acciones tienen confirmación independiente y conservan las claves de otras aplicaciones.

## Pruebas

`npm test` ejecuta las pruebas de reglas, vencimiento, historial, cupo y almacenamiento. Para comprobar los flujos en el navegador, iniciá la vista de producción y usá los folios de la tabla. Para verificar el estado vacío, elegí **Borrar datos de prueba**, confirmá, recargá y consultá ambos roles. Después elegí **Restaurar datos de prueba** y verificá que vuelvan las 14 solicitudes.

### Datos guardados en una versión anterior

Los folios antiguos se muestran con formato PR y las cancelaciones previas se leen como Rechazado. Se conservan las versiones, las marcas, las partidas editadas y los rangos que ya fueron registrados. Si querés probar el catálogo, los rangos y las marcas del briefing desde cero, restaurá los datos de prueba con confirmación. La aplicación no inventa fechas para eventos históricos que no fueron registrados.

Para reproducir el escenario de cosmética, abrí una solicitud de Lumbre Botánica de branding y packaging para el quinto mes del visor (marzo si la semilla se cargó en noviembre). Ese mes arranca con dos plazas libres. Enviá un presupuesto de dos partidas, pedí quitar una desde Cliente, enviá la segunda versión y aceptala con confirmación. Debe quedar una plaza libre y ambas versiones visibles.

## Demo en GitHub Pages

[Abrí la demo de Estudio Albino](https://vikingalabs.github.io/estudio-albino-demo/). Podés probar ambos perfiles. La clave predeterminada del panel es `albino2026`. El flujo de GitHub Actions ejecuta las pruebas, compila la aplicación y publica `dist/`.


## Documentación del encargo

Consultá el [PDF original del encargo de Kodarvia](docs/Kodarvia_Estudio_Albino_Expediente_Auditoria%281%29.PDF). Incluye las capturas del encargo y el briefing.


[Documentación del encargo y tabla de criterios](docs/estudio-albino-documentacion-del-encargo.pdf).

[Documentación técnica y funcional](docs/estudio-albino-documentacion-tecnica.pdf).
