# Núcleo del workspace — Diseño

**Fecha:** 2026-07-29
**Bloque:** 1 de 4 del «salto de calidad» de la web.

## Contexto

`src/components/workspace/Workspace.tsx` tiene 670 líneas, 22 `useState`,
cuatro refs, tres efectos entrelazados y unas 120 líneas de orquestación de PDF
mezcladas con el render. Sus transiciones tocan mucho estado a la vez:

| Transición | Llamadas a `setState` |
|---|---|
| `cambiarNumeroPedido` | hasta 15 |
| `seleccionarRegistro` | 11 |
| `aplicarPedidoRps` | 11 |
| `nuevoElemento` | 9 |

Nada comprueba esas cascadas. Si una olvida limpiar `origenRps`,
`baseGuardada` o `validacionIntentada`, el fallo aparece después y en otro
sitio. Los 26 ficheros de test cubren `src/lib` casi entero; la capa de UI, no.

## Objetivo

Convertir esas transiciones en algo que un test pueda fijar, y dejar
`Workspace.tsx` como componente de render. **Sin ningún cambio de
comportamiento visible.**

## Decisiones tomadas

- **Refactor puro.** El comportamiento observable queda idéntico. Las mejoras
  de UX (avisos tipados, diálogos propios) son el bloque 2 y no entran aquí.
- **Reducer puro, sin dependencias nuevas.** El proyecto testea con
  `environment: "node"` e `include: ["src/**/*.test.ts"]`, sin jsdom ni
  testing-library, y la regla del repo es no añadir dependencias. La lógica se
  extrae como reducer y funciones puras, testeables con el vitest actual.
- **Un solo reducer, no tres por dominio.** Las transiciones interesantes
  cruzan editor, pedido y RPS a la vez. Con reducers separados, la coordinación
  vuelve al hook en código imperativo no testeable, que es justo lo que se
  quiere eliminar.

## Arquitectura

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `src/lib/workspace/estado.ts` | Crear | `EstadoWorkspace`, `estadoInicial()`, unión `AccionWorkspace`, `reducirWorkspace()`. Puro. |
| `src/lib/workspace/selectores.ts` | Crear | `inputActivo`, `hayCambiosSinGuardar`, `medidasSuficientes`, `erroresVisibles`, `pedidoRpsVisible`, `origenRpsActivo`, `estadoRpsVisible`. Puros. |
| `src/lib/workspace/__tests__/estado.test.ts` | Crear | Una transición por test, afirmando el estado resultante completo. |
| `src/lib/workspace/__tests__/selectores.test.ts` | Crear | Casos límite de los derivados. |
| `src/lib/pdf/orquestar-pdf.ts` | Crear | La orquestación de `solicitarPdf`, con `fetch` y `rasterizar` inyectados. |
| `src/lib/pdf/__tests__/orquestar-pdf.test.ts` | Crear | Las cuatro salidas, con dobles. |
| `src/components/workspace/useWorkspace.ts` | Crear | `useReducer` + efectos + manejadores. Único punto con `async`/`fetch` del editor. |
| `src/components/workspace/useConsultaRps.ts` | Crear | Consulta a RPS: debounce 450 ms, `AbortController`, guardas de reconsulta. |
| `src/components/workspace/useRegistrosPedido.ts` | Crear | Registros del pedido: debounce 250 ms, `AbortController`. |
| `src/components/workspace/useAvisoSalida.ts` | Crear | `beforeunload` e interceptación de enlaces. |
| `src/components/workspace/useCatalogos.ts` | Crear | Carga de materiales y parámetros. |
| `src/components/workspace/Workspace.tsx` | Modificar | Solo render. De 670 a unas 150 líneas. |

### Estado

```ts
export interface EstadoWorkspace {
  // Documento en edición
  tipo: TipoPlanteamiento;
  lona: LonaInput;          // ambos se conservan al alternar de tipo,
  baqueton: BaquetonInput;  // igual que hoy
  id?: string;
  editorActivo: boolean;
  baseGuardada: string | null;
  validacionIntentada: boolean;

  // Pedido abierto
  numeroPedido: string;
  cliente: string;
  registros: PlanteamientoRecord[];
  cargandoPedido: boolean;

  // Importación RPS
  rps: {
    estado: "idle" | "buscando" | "encontrado" | "no-encontrado" | "error";
    numeroConsultado: string;
    pedido: PedidoRps | null;
    error: string | null;
    origen: OrigenRps | null;
    reintento: number;
    selectorAbierto: boolean;
  };

  // Transversal
  aviso: string | null;
  accion: "guardar" | "preview" | "pdf" | null;
}
```

`materiales` y `params` quedan **fuera** del reducer: son catálogos que se
cargan una vez y no participan en ninguna transición. Van en `useCatalogos()`,
lo que elimina el `materialesRef` que hoy existe solo para esquivar un closure
obsoleto. `snapshotRef` sigue siendo un ref del hook: es un handle a una
función de `Escena3D`, no estado.

### Acciones

- **Del usuario:** `PEDIDO_CAMBIADO`, `CLIENTE_CAMBIADO`, `INPUT_CAMBIADO`,
  `ELEMENTO_ANADIDO`, `REGISTRO_SELECCIONADO`, `RPS_APLICADO`,
  `RPS_SELECTOR_ABIERTO`, `RPS_REINTENTADO`.
- **De la red:** `REGISTROS_CARGADOS`, `REGISTROS_FALLARON`,
  `RPS_CONSULTA_INICIADA`, `RPS_ENCONTRADO`, `RPS_NO_ENCONTRADO`, `RPS_ERROR`,
  `GUARDADO_OK`.
- **De proceso:** `ACCION_INICIADA`, `ACCION_TERMINADA`,
  `VALIDACION_INTENTADA`, `AVISO_MOSTRADO`.

`INPUT_CAMBIADO { input }` se aplica al tipo activo: sustituye `lona` si
`tipo === "lona"` y `baqueton` en caso contrario. `AVISO_MOSTRADO { texto }`
acepta `null` para limpiar el aviso; no hay una acción aparte para eso.

Dos reglas de diseño sobre ellas:

**El reducer decide si el pedido cambió.** `normalizarNumeroPedidoRps` es pura,
así que la comparación entra en el reducer. `PEDIDO_CAMBIADO { valor }` es una
sola acción y la cascada de reseteo —cliente, registros, editor, id, origen
RPS, selector, aviso, base guardada, validación— es una rama que un test fija
de una vez.

**Los payloads impuros llegan ya resueltos.** `emptyLona()` llama a
`new Date()`, así que `ELEMENTO_ANADIDO` recibe el input base construido en el
hook. `RPS_APLICADO` recibe el input que produjo `crearInputDesdeRps`, no el
catálogo de materiales. El reducer nunca lee `Date`, `fetch` ni catálogos, y
sus tests no dependen del reloj.

### Efectos

Los tres salen tal cual, conservando debounce, `AbortController` y guardas:

- `useRegistrosPedido` — 250 ms; despacha
  `REGISTROS_CARGADOS { registros, clienteGuardado }`. El relleno del cliente,
  hoy tres `setState` con actualizadores funcionales, pasa a ser parte de la
  rama del reducer.
- `useConsultaRps` — 450 ms; mantiene los refs `numeroAnterior` y
  `ultimaConsulta` que evitan reconsultar. El auto-aplicado cuando el pedido
  trae una sola línea necesita el catálogo, así que sigue siendo un callback
  del hook.
- `useAvisoSalida` — `beforeunload` más la interceptación de enlaces en fase de
  captura. Puro efecto, no despacha.

Los `window.confirm` se quedan en el hook, como guardas previas al despacho. El
bloque 2 los sustituirá por diálogos propios.

### PDF

```ts
type ResultadoPdf =
  | { ok: true; respuesta: Response; nombre: string; omitidos: number }
  | { ok: false; motivo: "sin-elementos" | "http"; mensaje: string };

orquestarPdf(opciones, { fetch, rasterizar }): Promise<ResultadoPdf>
```

Cambio de frontera respecto a hoy: `solicitarPdf` llama a `doGuardar()` por
dentro, mezclando guardar con generar. `orquestarPdf` recibe el `idGuardado` ya
resuelto y es el hook quien encadena guardar → orquestar. El enfoque del primer
campo con error se queda en el hook, que es quien puede tocar el DOM.

## Tests

- **`estado.test.ts`** — una transición por test, afirmando el estado
  resultante completo. Con atención especial a `PEDIDO_CAMBIADO` con el mismo
  número y con uno distinto, y a que `GUARDADO_OK` deduplica vía
  `remolquesUnicos`.
- **`selectores.test.ts`** — `medidasSuficientes` para cada `tipoPerfil`
  (TIPO 02 y 03 exigen aguas, TIPO 04 chaflán, TIPO 05 radio de esquina);
  `estadoRpsVisible` cuando el número consultado y el actual no coinciden;
  `pedidoRpsVisible` y `origenRpsActivo` desalineados respecto al pedido
  abierto; `hayCambiosSinGuardar` con y sin editor activo.
- **`orquestar-pdf.test.ts`** — sin registros y sin editor (`sin-elementos`),
  con borrador en vista previa, con registros incompletos que suman `omitidos`,
  y respuesta HTTP de error.

`hayCambiosSinGuardar` conserva la comparación por `JSON.stringify`: se muda a
`selectores.ts` sin tocarla, porque esto es refactor puro.

## Orden de ejecución

Cada paso deja la app funcionando y lleva su commit:

1. `selectores.ts` — extraer los derivados sin tocar el estado.
2. `orquestar-pdf.ts` — independiente del resto.
3. `estado.ts` — el reducer sustituye a los `useState`.
4. Los hooks de efecto y `useCatalogos`.
5. `Workspace.tsx` queda solo con render.

## Verificación

Tras cada paso: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`.

Como no se añade jsdom, **ningún test comprueba que el componente siga cableado
igual**. Los tests fijan la lógica; el cableado lo fija una prueba manual del
recorrido completo al terminar, que forma parte del trabajo:

1. Abrir un pedido que exista en RPS con varias líneas.
2. Aplicar una línea y comprobar que los campos se rellenan.
3. Añadir un segundo remolque al pedido y guardarlo.
4. Vista previa del PDF y luego generarlo.
5. Reabrir el pedido desde el historial con «Abrir».
6. Intentar salir con cambios sin guardar y ver que avisa.

## Fuera de alcance

- Avisos tipados y diálogos propios en lugar de `window.confirm` (bloque 2).
- Modo oscuro y rediseño del historial (bloque 3).
- Memoización de `Escena3D`, cálculo perezoso y rasterizado en paralelo
  (bloque 4).
- Cualquier cambio en `src/lib/calc`, `src/lib/geometry` o el formato del PDF.

## Convenciones

- Código, nombres y textos en español, como el resto del repo.
- Sin dependencias nuevas.
- Commits en español con prefijo `refactor:`.
