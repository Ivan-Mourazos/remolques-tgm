# El flujo del pedido — Diseño

**Fecha:** 2026-08-02
**Bloque:** B2. Va **después** de B1 (`2026-08-02-decisiones-explicitas-design.md`),
porque la verificación al completar un pedido no vale gran cosa si los campos que
comprueba se aprueban solos. Los bloques 1, 2 y 3a están fusionados en `main`.

## Contexto

Hoy el workspace sabe editar **un** elemento cada vez. `EstadoWorkspace` tiene un
`lona` y un `baqueton`, y cambiar de remolque obliga a descartar o guardar lo que
haya. No hay forma de dejar uno a medias, abrir otro y volver; ni de quitar una
línea que se añadió por error; ni de saber, antes de generar el PDF, si todo el
pedido está en condiciones. `orquestarPdf` omite en silencio los registros
incompletos y solo dice cuántos.

Es lo que bloquea a Iván a diario.

## El modelo

Un pedido es **una lista de líneas**. La cabecera arriba y, debajo, las líneas
que se van metiendo: «Remolque 1», «Baquetón 2»… Cada una con su tipo, su estado
y dos acciones, abrir y eliminar. Al seleccionar una se despliega su formulario,
su dibujo y sus resultados. Se salta de una a otra sin perder nada.

Las líneas viven como borradores **en el navegador** hasta que se completa el
pedido. Al completarlo se comprueba que todas están listas, se guardan todas y se
genera y archiva el PDF.

## Decisiones tomadas

- **Los borradores se guardan en el navegador**, no en la base de datos.
  Sobreviven a recargar y a cerrar la pestaña. **Contrapartida asumida:** hasta
  completar un pedido, lo que se lleve hecho vive solo en ese equipo; vaciar los
  datos del navegador lo pierde, y un pedido a medias no sigue al usuario a otro
  ordenador.
- **Se guarda al completar el pedido, y solo entonces.** Nada entra en el
  historial antes de que Iván dé el pedido por bueno.
- **Eliminar quita la línea del pedido.** Si era un borrador, desaparece sin
  tocar nada. Si venía de un registro guardado, se borra también el registro, con
  el diálogo de confirmación del bloque 2 nombrando qué remolque es. Es
  irreversible; la confirmación es la salvaguarda, y es proporcionado para lo que
  hace la aplicación.
- **El estado de cada línea se calcula, no se marca.** Un estado que se marca a
  mano se queda rancio: marcas «listo», cambias el ancho y sigue diciendo listo.
- Español en código, nombres y textos. Sin dependencias nuevas.

**Los campos de decisión ya nacen sin elegir**, porque B1 lo resolvió antes: el
tipo de perfil, el modo de ollaos, la ventana, las dos recogidas, la rotulación y
la bastilla. Este bloque se apoya en ello y no lo repite.

## La lista y el estado de cada línea

Una línea es `{ version, tipo, input, id? }`. El `id` está si vino de un registro
guardado y falta si es nueva.

**Las líneas guardadas y los borradores son lo mismo.** Al abrir un pedido del
historial sus registros se convierten en líneas con `id`; las nuevas nacen sin
él. Así no hay dos listas que cuadrar.

**El estado se calcula igual para todas, vengan de donde vengan.** Una línea con
`id` no está lista «por definición»: la base de datos contiene registros
incompletos —de hecho `orquestarPdf` los filtra hoy con `planteamientoGenerable`
precisamente porque existen—, y darlos por buenos porque están guardados sería
volver al estado que miente. Se comprueban todas.

**El estado sale de `erroresPlanteamiento`**, la función que ya decide si un
planteamiento se puede guardar. No se inventa una comprobación nueva: se
reutiliza y se muestra por línea, en vez de solo al pulsar Guardar. La lista dice
qué le falta a cada una.

Añadir línea ofrece las tres vías que ya existen: remolque, baquetón, o importar
una línea de RPS de ese pedido.

## Completar el pedido

Un botón «Completar pedido» que hace en un paso lo que hoy son varios:

1. Comprueba todas las líneas. **Si alguna no está lista, dice cuál y qué le
   falta**, en vez de omitirla en silencio como hace hoy `orquestarPdf`.
2. Si están todas, las guarda.
3. Genera el PDF y lo archiva.
4. Limpia los borradores locales de ese pedido: ya están en la base de datos.

## Arquitectura

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `src/lib/workspace/lineas.ts` | Crear | Qué es una línea, cómo se numera dentro del pedido y su estado derivado. Puro. |
| `src/lib/workspace/__tests__/lineas.test.ts` | Crear | Numeración, estado por línea, conversión de registros guardados a líneas. |
| `src/lib/workspace/borradores-locales.ts` | Crear | Volcar y recuperar las líneas de un pedido. Recibe el `Storage`, así que se testea sin navegador. |
| `src/lib/workspace/__tests__/borradores-locales.test.ts` | Crear | Ida y vuelta, pedido inexistente, contenido corrupto, limpieza. |
| `src/lib/workspace/completar-pedido.ts` | Crear | Qué impide completar el pedido, línea por línea. Puro. |
| `src/lib/workspace/__tests__/completar-pedido.test.ts` | Crear | Todas listas, una sin ollaos elegidos, varias incompletas. |
| `src/lib/workspace/estado.ts` | Modificar | `lineas` y `versionActiva` sustituyen a `lona`, `baqueton`, `id` y `editorActivo`. |
| `src/lib/workspace/selectores.ts` | Modificar | El input activo sale de la línea activa. |
| `src/components/workspace/PedidoActivo.tsx` | Modificar | La lista con estado por línea, abrir y eliminar. |
| `src/components/workspace/useWorkspace.ts` | Modificar | Completar el pedido: comprobar, guardar todas, generar. |
| `src/lib/store/types.ts`, `file-store.ts`, `mssql-store.ts` | Modificar | `PlanteamientoStore` gana `delete(id)`. |
| `src/app/api/planteamientos/[id]/route.ts` | Modificar | Ruta DELETE. |

**Rehacer `estado.ts` es parte del trabajo, no un daño colateral.** El reducer del
bloque 1 se construyó alrededor de «un elemento activo» y tiene 22 tests que
fijan sus cascadas. El modelo de lista no cabe ahí, y meterlo como un mapa
auxiliar sería disimular: el pedido *es* una lista de líneas y el estado debe
decirlo.

**Borrar no existe hoy en ninguna capa** — ni en `PlanteamientoStore`, ni en el
API, ni en las dos implementaciones. Hay que añadirlo entero.

## Verificación

Se testea lo puro: la numeración y el estado de las líneas, el ida y vuelta de
los borradores locales (con un `Storage` falso), qué impide completar un pedido,
el reparto vacío cuando no se ha elegido modo, y las transiciones del reducer
reescrito.

No se puede testear con esta configuración la lista en pantalla ni el guardado
múltiple. La red es `tsc`, `lint` y un recorrido manual:

1. Abrir un pedido de RPS con varias líneas, importar dos, dejar una a medias.
2. Saltar a la otra, editarla, y volver: la primera conserva lo que se dejó.
3. Recargar la página: siguen ahí.
4. Añadir una tercera por error y eliminarla.
5. Intentar completar el pedido con una línea sin el modo de ollaos elegido:
   debe negarse y decir cuál y qué le falta.
6. Elegirlo y completar: se guardan todas, sale el PDF y el historial las
   muestra.
7. Abrir ese pedido desde el historial, añadir un remolque más y completarlo otra
   vez.

## Fuera de alcance

- El historial, el acabado general y la coherencia entre páginas (bloque 3b).
- El rendimiento (bloque 4).
- Cambiar el formato de la hoja o el contenido de los datos.
- Recuperar líneas eliminadas.
