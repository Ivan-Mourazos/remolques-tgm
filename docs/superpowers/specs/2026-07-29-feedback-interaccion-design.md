# Capa de feedback e interacción — Diseño

**Fecha:** 2026-07-29
**Bloque:** 2 de 4 del «salto de calidad» de la web. El bloque 1
(`2026-07-29-nucleo-workspace-design.md`) ya está fusionado.

## Contexto

La aplicación tiene hoy **tres** implementaciones de feedback que han
divergido:

- El workspace, con un único `aviso: string | null` por el que pasan los 16
  mensajes: 6 fallos, 3 confirmaciones de éxito y 7 instrucciones. Los tres
  tipos se pintan idénticos —misma caja gris, mismo peso, misma posición— y
  solo cabe uno: el nuevo pisa al anterior.
- `src/app/parametros/page.tsx`, con su propio `{ texto, error }` y un `role`
  condicional.
- `src/app/historial/page.tsx`, con `estado: "cargando" | "ok" | "error"`.

Además, tres `window.confirm` nativos cubren la misma situación —cambios sin
guardar— al salir de la página, al cambiar de pedido y al cambiar de elemento.
Los tres ofrecen solo dos salidas: perder el trabajo o quedarse quieto.

El aviso vive en una línea fija encima del editor, así que al pulsar Guardar
desde abajo, junto al dibujo 3D, el mensaje aparece fuera de pantalla.

## Objetivo

Un solo sistema de feedback para toda la aplicación: mensajes tipados y
visibles, diálogos propios que ofrecen guardar en vez de obligar a elegir entre
perder o quedarse, estados de carga que digan la verdad, y errores que se
distingan de los éxitos.

**A diferencia del bloque 1, aquí se cambia comportamiento a propósito.** No hay
contrato de equivalencia que defender.

## Decisiones tomadas

- **Proveedor a nivel de aplicación**, no un sistema dentro del workspace. Ya
  hay tres copias divergiendo; unificar ahora cuesta poco más que hacerlo solo
  para el workspace y evita que el bloque 3 repita el trabajo.
- **Los diálogos de cambios sin guardar ofrecen «Guardar y continuar»**, que es
  lo que hoy falta y casi siempre es lo que se quiere.
- **Avisos apilados flotantes**, visibles desde cualquier posición de scroll,
  en vez de la línea fija actual.
- **`<dialog>` nativo**, que cumple la regla de no añadir dependencias y trae
  el atrapado de foco, el cierre con Escape y el fondo modal.
- **Sin dependencias nuevas**, español en todo, tests solo `*.test.ts` bajo
  `environment: "node"` — las mismas restricciones del bloque 1.

## Arquitectura

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `src/lib/feedback/tipos.ts` | Crear | `Aviso`, `Severidad`, `OpcionesConfirmacion`, `AccionConfirmacion`. |
| `src/lib/feedback/avisos.ts` | Crear | Reducer puro de la pila: alta, descarte, deduplicación, tope y desalojo. |
| `src/lib/feedback/__tests__/avisos.test.ts` | Crear | Duplicados, tope, orden de desalojo, descarte por id. |
| `src/components/feedback/ProveedorFeedback.tsx` | Crear | Contexto, temporizadores de descarte, renderiza pila y diálogo. |
| `src/components/feedback/Aviso.tsx` | Crear | Presentación por severidad. Único componente, dos ubicaciones. |
| `src/components/feedback/PilaAvisos.tsx` | Crear | Contenedor flotante que apila `<Aviso>`. |
| `src/components/feedback/DialogoConfirmacion.tsx` | Crear | `<dialog>` con `showModal()`, resuelto por promesa. |
| `src/components/feedback/useFeedback.ts` | Crear | `useAvisos()` y `useConfirmar()`. |
| `src/app/layout.tsx` | Modificar | Envuelve `AppShell`. |
| `src/lib/workspace/estado.ts` | Modificar | − `aviso`; + `camposTocados`; + acción `CAMPO_TOCADO`. |
| `src/lib/workspace/selectores.ts` | Modificar | `erroresVisibles(errores, validacionIntentada, camposTocados)`. |
| `src/lib/pdf/orquestar-pdf.ts` | Modificar | `DependenciasPdf` gana `onProgreso?: (hecho, total) => void`. |
| `src/components/workspace/useWorkspace.ts` | Modificar | Usa `avisos.mostrar(...)` y `await confirmar(...)`. |
| `src/components/workspace/useAvisoSalida.ts` | Modificar | Diálogo propio y navegación por router. |
| `src/components/workspace/campos.tsx` | Modificar | Emite `onBlur` con el nombre del campo. |
| `src/components/workspace/ImportadorRps.tsx` | Modificar | Su estado de error usa `<Aviso>` en línea. |
| `src/components/workspace/Workspace.tsx` | Modificar | − el párrafo de aviso. |
| `src/app/historial/page.tsx` | Modificar | Su fila de error usa `<Aviso>`. |
| `src/app/parametros/page.tsx` | Modificar | − su `{ texto, error }`; usa `useAvisos()`. |

### Por qué `aviso` sale del reducer del workspace

El bloque 1 lo puso ahí porque era un traslado literal del código anterior, no
porque sea su sitio: un aviso es presentación efímera, no estado del
planteamiento. Sacarlo simplifica `estado.ts` y sus tests. Es tocar código
recién revisado, pero por la razón correcta.

### Un componente, dos ubicaciones

`<Aviso>` se usa dentro de la pila flotante y **en línea** dentro del panel de
RPS y de la tabla del historial. Así un fallo de RPS se ve igual que cualquier
otro error sin obligar a mover a una esquina flotante estados que son
contextuales: «buscando» y «no encontrado» pertenecen al panel.

## Comportamiento de los avisos

```ts
export type Severidad = "error" | "exito" | "info";
export interface Aviso { id: string; severidad: Severidad; texto: string; }
```

- **Duración:** `exito` 6 s, `info` 10 s, `error` permanece hasta descartarlo.
  Todos son descartables con un clic.
- **Duplicados:** mismo texto y misma severidad no apila otro; reinicia su
  temporizador.
- **Tope:** 4. Al desbordar se descarta el más antiguo **que no sea error**;
  solo si todos son errores se descarta el más antiguo. Un error nunca
  desaparece porque lleguen mensajes nuevos.
- **Accesibilidad:** `error` → `role="alert"` y `aria-live="assertive"`; el
  resto → `role="status"` y `aria-live="polite"`. Hoy los 16 comparten un solo
  `role="status"`, así que un fallo de red no interrumpe al lector de pantalla.

### Reparto de los mensajes actuales

| Severidad | Mensajes |
|---|---|
| `error` (6) | «Error al guardar: …», «Error de red al guardar», «Error al generar PDF: …», «Error de red al generar PDF», «Error de red al generar la vista previa del PDF.», «El navegador ha bloqueado la vista previa. Permite ventanas emergentes para esta aplicación.» |
| `exito` (3) | «… guardado dentro del pedido.», «PDF archivado en ESCÁNER/PLANTEAMIENTOS y OFICINA TÉCNICA/….», «PDF descargado (…)…» |
| `info` (7) | «Introduce primero el número de pedido.», «Selecciona o añade un elemento antes de guardar.», «Revisa los campos marcados. …», «… añadido al pedido. Completa sus datos y guárdalo.», «Línea N de RPS aplicada. …», «Vista previa abierta: … No se ha archivado todavía.», «El pedido todavía no contiene ningún elemento válido para generar el PDF.» |

El mensaje de ventana emergente bloqueada es un fallo accionable —hay que
permitir las ventanas emergentes—, así que va como `error` y permanece hasta
descartarlo.

## Comportamiento del diálogo

```ts
confirmar({
  titulo: string;
  mensaje: string;
  acciones: AccionConfirmacion[];
}): Promise<string>   // la clave elegida

interface AccionConfirmacion {
  clave: string;
  etiqueta: string;
  tono?: "primario" | "peligro" | "neutro";
  /** Si viene, el botón se desactiva y muestra este motivo. */
  deshabilitada?: string;
}
```

Para cambios sin guardar: «Guardar y continuar» (primario, desactivado con el
primer error como motivo cuando el elemento está incompleto), «Descartar
cambios» (peligro) y «Cancelar» (neutro).

Escape, clic fuera y cierre resuelven `"cancelar"`: la salida segura es siempre
la que no destruye trabajo.

### Dos límites conocidos

**El aviso de recargar o cerrar la pestaña sigue siendo el nativo.**
`beforeunload` no admite otra cosa; los navegadores ignoran cualquier texto
propio. Solo los otros dos casos pasan a diálogo propio.

**Salir por un enlace pasa a navegar por código.** El handler de captura no
puede esperar a una promesa y decidir después, así que cancela siempre la
navegación, espera la respuesta y llama al router de Next. Es el mecanismo
correcto, pero cambia algo que hoy funciona, y va en el recorrido manual.

**El campo de pedido no se actualiza mientras el diálogo está abierto.** Hoy
`window.confirm` congela la página entera, así que el efecto visible es
equivalente. Nótese que esto ya ocurre hoy: editar el número con cambios sin
guardar dispara la confirmación en la **primera** tecla, no al terminar.

## Validación al salir del campo

`validacionIntentada: boolean` se acompaña de `camposTocados: string[]`, con una
acción `CAMPO_TOCADO { campo }`. Un campo enseña su error si
`validacionIntentada || camposTocados.includes(campo)`. Los campos ya llevan
`data-campo` —lo usa el enfoque automático del primer error—, así que solo hace
falta que `campos.tsx` emita su nombre al perder el foco.

`camposTocados` se limpia allí donde hoy se limpia `validacionIntentada`: al
cambiar de pedido, seleccionar registro, añadir elemento, aplicar una línea de
RPS y guardar con éxito.

Efecto buscado y asumido: tabular por un campo obligatorio vacío y salir lo pone
en rojo ahí mismo. Es más agresivo que ahora. Molesta poco en la práctica,
porque cuando RPS rellena el pedido esos campos ya son válidos y los que quedan
vacíos son los que reclaman atención.

## Estados de carga

El caso que de verdad tarda es generar el PDF: rasteriza los dibujos en serie y
luego llama al servidor, y hoy solo cambia el texto de un botón.

`DependenciasPdf` gana `onProgreso?: (hecho: number, total: number) => void`,
que `orquestarPdf` invoca por cada dibujo rasterizado. El botón pasa a decir
«Preparando dibujo 2 de 5…» y luego «Generando PDF…». Se siguen bloqueando solo
los botones de acción, no la pantalla.

Esto cae del lado testeable: los tests existentes de `orquestarPdf` fijan la
secuencia de progreso.

## Verificación

Se testea lo puro: el reducer de la pila (duplicados, tope, orden de desalojo,
descarte por id), `erroresVisibles` con campos tocados, la acción
`CAMPO_TOCADO`, la desaparición de `aviso` del estado, y la secuencia de
`onProgreso`.

No se puede testear con esta configuración —sin jsdom ni testing-library— el
proveedor, el diálogo, la pila, el cableado del blur ni la interceptación de
enlaces. La red es `tsc`, `lint` y un recorrido manual de seis puntos:

1. Diálogo de cambios sin guardar con «Guardar y continuar» disponible, y con
   un elemento incompleto para verlo desactivado con su motivo.
2. Salir por un enlace del menú: cancelar no navega; descartar y guardar sí.
3. Cambiar de pedido y cambiar de elemento con cambios sin guardar.
4. Un error permanece hasta cerrarlo; un éxito se va solo; repetir el mismo
   mensaje no apila dos.
5. Progreso real al generar un PDF de un pedido con varios remolques.
6. Campos poniéndose en rojo al salir de ellos, y limpiándose al cambiar de
   pedido o de elemento.

## Fuera de alcance

- Modo oscuro, jerarquía visual y rediseño del historial (bloque 3).
- Memoización de `Escena3D`, cálculo perezoso y rasterizado en paralelo
  (bloque 4). El `onProgreso` de este bloque describe el trabajo en serie
  actual; no lo cambia.
- Cualquier cambio en `src/lib/calc`, `src/lib/geometry` o el formato del PDF.
- El aviso nativo de `beforeunload`.

## Convenciones

- Código, nombres, comentarios y textos de UI en español.
- Sin dependencias nuevas.
- Commits en español al estilo del repo (`feat:`, `fix:`, `refactor:`).
