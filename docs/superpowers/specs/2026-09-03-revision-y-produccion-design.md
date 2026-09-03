# Revisión del pedido y paso a producción — Diseño

**Fecha:** 2026-09-03
**Bloque:** va después de `2026-08-02-flujo-del-pedido-design.md`, que convirtió el
pedido en una lista de líneas y creó *Completar pedido*. Este bloque parte ese
botón en dos y mete a un segundo par de ojos por el medio.

## Contexto

Hoy *Completar pedido* hace todo de una vez (`useWorkspace.ts`,
`completarPedido`): guarda las líneas, genera el PDF y lo archiva en
ESCÁNER/PLANTEAMIENTOS y en OFICINA TÉCNICA/&lt;año&gt;. Entre teclear una medida
y que esa medida esté en la carpeta de producción no hay nadie que la mire. Un
alto de atrás mal copiado del pedido llega al taller convertido en tela cortada.

Lo que falta no es una validación más —los campos ya se comprueban uno a uno—
sino un **compañero que confirme que los datos introducidos son los del pedido**.

## El flujo

1. Se crea el pedido con los remolques y baquetones que lleve y se pulsa
   **Guardar para revisión**. Se guardan las líneas. **No se genera ningún PDF.**
2. Otro compañero abre el pedido en la pestaña **Revisión**, mira los datos
   introducidos de todos los remolques y pulsa **Aprobar** o **No aprobar**.
3. En un pedido **aprobado** aparece el botón **Pasar a producción**: ahí sí se
   genera el PDF de los planteamientos y se archiva, con el nombre de siempre
   —número de pedido y `-10` al final—. En un **no aprobado** se abre el pedido,
   se corrige lo que haga falta y luego se elige: mandarlo otra vez a revisión, o
   pasarlo a producción sin más revisiones si el arreglo era sencillo.

## Decisiones tomadas

- **El estado es del pedido, no de cada línea.** Se revisa y se produce el pedido
  entero. Un estado por remolque acabaría con pedidos mitad aprobados mitad
  producidos y reglas inventadas para resolverlo.
- **El estado vive en su propio sitio**, no en una columna de `Planteamientos`.
  Aprobar un pedido no reescribe sus líneas, y las líneas no cargan con un campo
  que no es suyo.
- **Los rechazos no llevan motivo.** Lo que está mal se habla en coordina-ot,
  como ya se hace. La web guarda quién y cuándo, y nada más.
- **La aprobación se calcula, no se marca**, siguiendo lo que ya hace
  `estadoLinea`: una aprobación es válida mientras nadie toque los datos después.
  Se compara la fecha de aprobación con la última modificación de las líneas del
  pedido. Así no puede quedarse rancia.
- **Guardar cambios sobre un pedido ya aprobado o ya producido avisa antes**, con
  el diálogo de confirmación que ya existe: «este pedido está aprobado; si
  guardas, los cambios quedan sin revisar». Se puede seguir —es la escapatoria
  del arreglo sencillo—, pero no por descuido.
- **Quien guarda para revisión es el técnico de `realizadoPor`** de la cabecera,
  que ya se rellena hoy; no se pregunta dos veces lo mismo.
- **El técnico sale de una lista mantenida en Parámetros.** Hoy `TECNICOS` está
  escrito a mano en `opciones-formulario.ts`; se mueve a `CalcParams`, que ya se
  edita desde `/parametros`. La misma lista sirve para *realizado por*, para
  aprobar y para pasar a producción.
- Español en código, nombres y textos. Sin dependencias nuevas.

## Los estados

```
                Guardar para revisión
   (workspace) ───────────────────────► EN_REVISION
                                        │        │
                             Aprobar    │        │  No aprobar
                                        ▼        ▼
                                   APROBADO   NO_APROBADO
                                        │        │
                                        └────┬───┘
                                             │ Pasar a producción
                                             ▼
                                       EN_PRODUCCION
```

- **EN_REVISION** — esperando al compañero. *Pasar a producción* está apagado:
  es el único punto donde el flujo obliga a esperar.
- **APROBADO** — con *Pasar a producción* disponible. Si alguien modifica las
  líneas después de aprobar, la ficha lo dice —«aprobado, con cambios
  posteriores»— y el botón sigue disponible: la responsabilidad queda escrita.
- **NO_APROBADO** — se corrige y se elige: *Mandar a revisión* o *Pasar a
  producción*.
- **EN_PRODUCCION** — PDF generado y archivado. Guardar cambios sobre él lo
  devuelve a `EN_REVISION`, conservando el registro de lo que ya se produjo.
- **Sin registro** — los pedidos anteriores a este bloque. Se leen como
  *histórico*: no salen en la bandeja y en el historial se marcan como tales. Su
  PDF ya está archivado; no se inventa quién lo hizo.

## Dónde vive el estado

Un registro por pedido, con la clave normalizada que ya usa
`normalizarNumeroPedido` (`AR.26.0123` y `AR260123` son el mismo pedido):

```ts
interface EstadoPedido {
  pedido: string;          // clave normalizada
  numeroPedido: string;    // tal y como se escribió
  revision: { estado: "EN_REVISION" | "APROBADO" | "NO_APROBADO"; por: string; en: string };
  produccion: { por: string; en: string; nombrePdf: string; rutas: string[] } | null;
  updatedAt: string;
}
```

Dos drivers, como `PlanteamientoStore`: `data/pedidos.json` en desarrollo y
`dbo.PedidosRevision` en SQL Server (`Pedido` como clave primaria, `RutasJson`
como texto). La migración es una tabla nueva en `db/schema.sql`; no se toca
`Planteamientos`.

El estado que se enseña no es el guardado a secas, sino el que calcula
`estadoVisiblePedido(estado, registros)`: mete lo de «aprobado con cambios
posteriores» y lo de «histórico» comparando fechas. Es una función pura y es la
que se prueba.

## La bandeja y la ficha

**`/revision`**, nueva entrada del menú entre Planteamiento e Historial. Lista los
pedidos pendientes —primero `EN_REVISION`, después los `NO_APROBADO` sin tocar—
con número, cliente, cuántas líneas, quién lo guardó y cuándo.

Al abrir uno, la **ficha** muestra la cabecera del pedido y una tarjeta por línea
con **los datos tal y como se teclearon**, agrupados igual que el formulario, y
el dibujo guardado en `snapshotSvg` —que ya está en el registro, así que no hay
que recalcular ni volver a montar la escena 3D—. Debajo de cada tarjeta, las
medidas de corte como dato secundario.

Los campos que salen, por grupos. *Remolque:* cabecera (pedido, remolque,
cliente, revisión, realizado por, fecha, fecha de salida, O.F.); medidas
(cantidad, largo, ancho, ancho atrás, alto delante, alto atrás, aguas, contorno);
perfil (tipo, y solo los radios o el chaflán que ese tipo usa); acabados (recoge
delante, recoge atrás, bastilla de enfundar, ventana con sus medidas,
rotulación); ollaos (modo, paso, primer ollao y, si son a medida, las
posiciones); material y observaciones. *Baquetón:* cantidad, largo, ancho,
baquetón, cliente específico, ollaos, rotulación, material y observaciones.

**Los opcionales vacíos salen como «—», no desaparecen.** Que un dato no esté
puesto es justo lo que el revisor tiene que poder ver.

**Una sola lista de campos.** `seccionesRevision(linea)` convierte un `LonaInput`
o un `BaquetonInput` en secciones etiqueta→valor, y de ahí beben la ficha web y
el PDF de revisión. Un campo nuevo en el formulario se añade en un sitio.

**Botones de la ficha:** *Aprobar* y *No aprobar* (piden el nombre del técnico de
la lista de Parámetros), *Imprimir ficha de revisión*, y *Abrir en Planteamiento*,
que reutiliza el `?desde=` que ya usa el historial.

## La ficha de revisión en PDF

A demanda, para quien prefiera revisar en papel. Una página por línea con las
mismas secciones que la ficha web más el dibujo, y una banda bien visible:
**BORRADOR PARA REVISIÓN · NO PRODUCCIÓN**. No se guarda en ninguna carpeta de
red: se descarga y ya. Los dibujos se rasterizan en el navegador antes de pedirlo,
igual que hace `orquestarPdf`, porque `@react-pdf` no dibuja SVG suelto.

## Pasar a producción

Un solo endpoint hace las tres cosas —generar, archivar y anotar— para que no
pueda quedar un PDF en la carpeta sin registro de quién lo puso ahí. El render y
el archivado que hoy están dentro de `/api/pdf` se extraen a
`generarPdfPedido()`, y las dos rutas lo llaman.

El endpoint comprueba el estado antes de escribir nada: un pedido en
`EN_REVISION` se rechaza con «este pedido todavía está pendiente de revisión».

El nombre y los destinos no cambian: `nombrePdf` sigue dando
`<numeroPedido>-10.pdf` y `guardarPdfDuplicado` sigue escribiendo en
RUTA_PLANTEAMIENTOS y en RUTA_OFICINA_TECNICA/&lt;año&gt;.

## Cuando algo falla

- **Falla el archivado** (la unidad de red no contesta): el pedido no pasa a
  `EN_PRODUCCION`. Se avisa del error y se puede reintentar sin repetir nada. Los
  temporales se borran, como ya hace `guardarPdfDuplicado`.
- **Ya hay un PDF de ese pedido** porque se produjo antes: la app avisa —«ya hay
  un PDF archivado de este pedido del 3/9/2026; se sustituirá»— y pide confirmar.
  El nombre del archivo no cambia nunca.
- **Dos personas a la vez:** la segunda recibe «este pedido ya lo pasó a
  producción Jaime hace un momento» en vez de escribir el archivo dos veces.
- **Aprobar un pedido que ya no está en revisión:** la ficha se recarga y dice el
  estado real, en vez de pisar la decisión de otro.

## Qué se toca

| Archivo | Qué |
|---|---|
| `src/lib/pedidos/estado-pedido.ts` | nuevo: tipos, transiciones y `estadoVisiblePedido` |
| `src/lib/store/pedidos-*.ts` | nuevo: driver de fichero y de SQL Server |
| `src/lib/revision/datos-revision.ts` | nuevo: `seccionesRevision` |
| `src/lib/pdf/FichaRevisionPdf.tsx` | nuevo: PDF de revisión |
| `src/lib/pdf/generar-pdf-pedido.ts` | extraído de `/api/pdf` |
| `src/app/api/pedidos/**` | nuevo: bandeja, revisión y producción |
| `src/app/revision/page.tsx` | nueva pestaña |
| `src/components/workspace/useWorkspace.ts` | *Completar* pasa a *Guardar para revisión*: guarda y marca, no archiva |
| `src/components/workspace/PedidoActivo.tsx` | el botón, y el aviso sobre pedido aprobado |
| `src/lib/calc/params.ts`, `/parametros` | la lista de técnicos |
| `src/components/layout/AppNav.tsx` | entrada «Revisión» |
| `db/schema.sql` | tabla `PedidosRevision` |

## Tests

Vitest, sobre módulos puros, como el resto del proyecto:

- **Transiciones:** guardar deja `EN_REVISION`; aprobar y no aprobar solo valen
  desde `EN_REVISION`; producir vale desde `APROBADO` y `NO_APROBADO` y se
  rechaza desde `EN_REVISION`; producir dos veces se rechaza.
- **`estadoVisiblePedido`:** una línea modificada después de aprobar da «aprobado
  con cambios posteriores»; un pedido sin registro da «histórico»; guardar sobre
  un producido lo devuelve a revisión.
- **`seccionesRevision`:** el TIPO 04 saca chaflán y no radio de cumbrera; los
  opcionales vacíos salen como «—»; el baquetón no arrastra campos de lona.
- **Store de pedidos:** el fichero se lee y se escribe con la clave normalizada
  (`AR.26.0123` y `AR260123` son el mismo pedido).
- **`generarPdfPedido`:** con el archivado fallando, no se marca producido.

## Fuera de alcance

Notificar al revisor (se avisa por coordina-ot), permisos por usuario, histórico
de cambios línea a línea, y el contraste automático contra la línea de RPS de la
que se importó: se descartó para este bloque, pero `origenRps` ya se guarda y lo
deja abierto.
