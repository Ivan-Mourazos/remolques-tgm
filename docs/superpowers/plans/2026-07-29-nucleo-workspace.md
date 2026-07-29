# Núcleo del workspace — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer el estado, los derivados y la orquestación de PDF de `Workspace.tsx` a módulos puros y testeables, dejando el componente solo con el render, sin ningún cambio de comportamiento visible.

**Architecture:** La lógica sale a `src/lib/workspace` (reducer puro + selectores puros) y `src/lib/pdf/orquestar-pdf.ts` (orquestación con `fetch` y `rasterizar` inyectados). Los tres efectos con temporizadores pasan a hooks propios en `src/components/workspace`. `Workspace.tsx` consume un único hook `useWorkspace()` y solo pinta.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4, Vitest 4 (`environment: "node"`, `include: ["src/**/*.test.ts"]`).

## Global Constraints

- Refactor puro: el comportamiento observable queda **idéntico**. Nada de mejoras de UX, visuales ni de rendimiento — son los bloques 2, 3 y 4.
- **Sin dependencias nuevas.** En particular, no se añaden jsdom ni testing-library.
- Código, nombres, comentarios y textos de UI en **español**, como el resto del repo.
- Los tests solo pueden ser `*.test.ts` (no `.tsx`) y ejecutarse en `environment: "node"`: nada que toque el DOM ni renderice React.
- Los textos de aviso al usuario se copian **literalmente** de `Workspace.tsx`; cualquier variación es un cambio de comportamiento.
- Tras cada tarea: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`. Los tres deben pasar antes de commitear.
- Commits en español con prefijo `refactor:` (o `test:` cuando el commit solo añade tests).
- No tocar `src/lib/calc`, `src/lib/geometry`, ni el formato del PDF.

---

### Task 1: Selectores puros

Los valores derivados que hoy se calculan dentro del componente salen a un módulo puro. Reciben **argumentos estrechos**, no el objeto de estado completo: así funcionan igual antes y después de que exista el reducer (Task 3), y sus tests son triviales de montar.

**Files:**
- Create: `src/lib/workspace/selectores.ts`
- Create: `src/lib/workspace/__tests__/selectores.test.ts`
- Modify: `src/components/workspace/Workspace.tsx:82-96` (bloque de derivados) y `src/components/workspace/Workspace.tsx:165-177` (derivados de RPS)

**Interfaces:**
- Consumes: `erroresPlanteamiento`, `ErrorPlanteamiento` de `@/lib/pedidos/validar-planteamiento`; `normalizarNumeroPedidoRps` de `@/lib/rps/numero-pedido`.
- Produces:
  ```ts
  export type EstadoConsultaRps = "idle" | "buscando" | "encontrado" | "no-encontrado" | "error";
  export function inputActivo(tipo: TipoPlanteamiento, lona: LonaInput, baqueton: BaquetonInput): LonaInput | BaquetonInput;
  export function hayCambiosSinGuardar(editorActivo: boolean, input: LonaInput | BaquetonInput, baseGuardada: string | null): boolean;
  export function medidasSuficientes(input: LonaInput | BaquetonInput): boolean;
  export function erroresVisibles(errores: ErrorPlanteamiento[], validacionIntentada: boolean): Record<string, string>;
  export function pedidoRpsVisible(numeroPedido: string, pedido: PedidoRps | null): PedidoRps | null;
  export function origenRpsActivo(numeroPedido: string, origen: OrigenRps | null): OrigenRps | null;
  export function estadoRpsVisible(numeroPedido: string, numeroConsultado: string, estado: EstadoConsultaRps): EstadoConsultaRps;
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/workspace/__tests__/selectores.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { OrigenRps, PedidoRps } from "@/lib/rps/types";
import {
  erroresVisibles,
  estadoRpsVisible,
  hayCambiosSinGuardar,
  inputActivo,
  medidasSuficientes,
  origenRpsActivo,
  pedidoRpsVisible,
} from "@/lib/workspace/selectores";

const lonaConMedidas = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(), largo: 600, ancho: 250, altoDelante: 220, ...extra,
});

const pedidoRps = (numero: string): PedidoRps => ({
  numero, fecha: null, fechaSalida: null,
  cliente: { codigo: "1", nombre: "CLIENTE", alias: null },
  lineas: [],
});

const origen = (numeroPedido: string): OrigenRps => ({
  numeroPedido, numeroLinea: 1, idLinea: "L1", ordenFabricacion: null,
  importadoEn: "2026-07-29T10:00:00Z",
});

describe("inputActivo", () => {
  it("devuelve la lona o el baquetón según el tipo activo", () => {
    const lona = emptyLona();
    const baqueton = emptyBaqueton();
    expect(inputActivo("lona", lona, baqueton)).toBe(lona);
    expect(inputActivo("baqueton", lona, baqueton)).toBe(baqueton);
  });
});

describe("hayCambiosSinGuardar", () => {
  it("es falso sin editor activo, aunque el input difiera de la base", () => {
    expect(hayCambiosSinGuardar(false, lonaConMedidas(), JSON.stringify(emptyLona()))).toBe(false);
  });

  it("es verdadero con editor activo y base nula", () => {
    expect(hayCambiosSinGuardar(true, emptyLona(), null)).toBe(true);
  });

  it("es falso cuando el input coincide exactamente con la base guardada", () => {
    const lona = lonaConMedidas();
    expect(hayCambiosSinGuardar(true, lona, JSON.stringify(lona))).toBe(false);
  });
});

describe("medidasSuficientes", () => {
  it("exige largo, ancho y alto delantero en el TIPO 01", () => {
    expect(medidasSuficientes(emptyLona())).toBe(false);
    expect(medidasSuficientes(lonaConMedidas())).toBe(true);
  });

  it("exige aguas en los TIPO 02 y TIPO 03", () => {
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 02" }))).toBe(false);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 02", aguas: 30 }))).toBe(true);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 03" }))).toBe(false);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 03", aguas: 30 }))).toBe(true);
  });

  it("exige chaflán en el TIPO 04 y radio de esquina en el TIPO 05", () => {
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 04" }))).toBe(false);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 04", chaflan: 20 }))).toBe(true);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 05" }))).toBe(false);
    expect(medidasSuficientes(lonaConMedidas({ tipoPerfil: "TIPO 05", radioEsquina: 15 }))).toBe(true);
  });

  it("en el baquetón exige largo, ancho y medida de baquetón", () => {
    expect(medidasSuficientes({ ...emptyBaqueton(), largo: 600, ancho: 250 })).toBe(false);
    expect(medidasSuficientes({ ...emptyBaqueton(), largo: 600, ancho: 250, baqueton: 12 })).toBe(true);
  });
});

describe("erroresVisibles", () => {
  it("no muestra nada hasta que se ha intentado validar", () => {
    expect(erroresVisibles([{ campo: "largo", mensaje: "Introduce el largo." }], false)).toEqual({});
  });

  it("indexa por campo y conserva el último mensaje de un campo repetido", () => {
    const visibles = erroresVisibles([
      { campo: "ventanaAncho", mensaje: "Introduce el ancho de la ventana." },
      { campo: "ventanaAncho", mensaje: "El ancho de la ventana debe ser menor que el ancho del remolque." },
    ], true);
    expect(visibles.ventanaAncho).toBe("El ancho de la ventana debe ser menor que el ancho del remolque.");
  });
});

describe("derivados de RPS", () => {
  it("oculta el pedido y el origen de RPS cuando no corresponden al pedido abierto", () => {
    expect(pedidoRpsVisible("AR2603583", pedidoRps("AR2603583"))?.numero).toBe("AR2603583");
    expect(pedidoRpsVisible("AR2699999", pedidoRps("AR2603583"))).toBeNull();
    expect(origenRpsActivo("AR2603583", origen("AR.26.03583"))?.idLinea).toBe("L1");
    expect(origenRpsActivo("AR2699999", origen("AR2603583"))).toBeNull();
  });

  it("solo muestra el estado de la consulta si el número consultado es el actual", () => {
    expect(estadoRpsVisible("AR2603583", "AR2603583", "buscando")).toBe("buscando");
    expect(estadoRpsVisible("AR2603583", "AR2699999", "buscando")).toBe("idle");
  });

  it("mantiene el estado en reposo mientras el número no tiene forma de pedido", () => {
    expect(estadoRpsVisible("AR26", "AR26", "encontrado")).toBe("idle");
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/selectores.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/workspace/selectores"`.

- [ ] **Step 3: Escribir la implementación**

Crear `src/lib/workspace/selectores.ts`. Cada función es un traslado literal de la expresión que hoy vive en `Workspace.tsx`:

```ts
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { TipoPlanteamiento } from "@/lib/store/types";
import type { OrigenRps, PedidoRps } from "@/lib/rps/types";
import type { ErrorPlanteamiento } from "@/lib/pedidos/validar-planteamiento";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

export type EstadoConsultaRps =
  | "idle" | "buscando" | "encontrado" | "no-encontrado" | "error";

/** Un número con forma de pedido de RPS: dos letras y al menos cinco dígitos. */
const FORMA_PEDIDO_RPS = /^[A-Z]{2}\d{5,}$/;

export function inputActivo(
  tipo: TipoPlanteamiento,
  lona: LonaInput,
  baqueton: BaquetonInput,
): LonaInput | BaquetonInput {
  return tipo === "lona" ? lona : baqueton;
}

export function hayCambiosSinGuardar(
  editorActivo: boolean,
  input: LonaInput | BaquetonInput,
  baseGuardada: string | null,
): boolean {
  return editorActivo && JSON.stringify(input) !== baseGuardada;
}

/** Medidas mínimas para que el cálculo de paños y ollaos tenga sentido. */
export function medidasSuficientes(input: LonaInput | BaquetonInput): boolean {
  if ("baqueton" in input) {
    return input.largo > 0 && input.ancho > 0 && input.baqueton > 0;
  }
  return input.largo > 0 && input.ancho > 0 && input.altoDelante > 0
    && (!["TIPO 02", "TIPO 03"].includes(input.tipoPerfil) || (input.aguas ?? 0) > 0)
    && (input.tipoPerfil !== "TIPO 04" || (input.chaflan ?? 0) > 0)
    && (input.tipoPerfil !== "TIPO 05" || (input.radioEsquina ?? 0) > 0);
}

/** Errores indexados por campo, solo una vez que se ha intentado validar. */
export function erroresVisibles(
  errores: ErrorPlanteamiento[],
  validacionIntentada: boolean,
): Record<string, string> {
  if (!validacionIntentada) return {};
  return Object.fromEntries(errores.map((error) => [error.campo, error.mensaje]));
}

export function pedidoRpsVisible(
  numeroPedido: string,
  pedido: PedidoRps | null,
): PedidoRps | null {
  if (!pedido) return null;
  return normalizarNumeroPedidoRps(pedido.numero) === normalizarNumeroPedidoRps(numeroPedido)
    ? pedido
    : null;
}

export function origenRpsActivo(
  numeroPedido: string,
  origen: OrigenRps | null,
): OrigenRps | null {
  if (!origen) return null;
  return normalizarNumeroPedidoRps(origen.numeroPedido) === normalizarNumeroPedidoRps(numeroPedido)
    ? origen
    : null;
}

export function estadoRpsVisible(
  numeroPedido: string,
  numeroConsultado: string,
  estado: EstadoConsultaRps,
): EstadoConsultaRps {
  const normalizado = normalizarNumeroPedidoRps(numeroPedido);
  return FORMA_PEDIDO_RPS.test(normalizado) && numeroConsultado === normalizado
    ? estado
    : "idle";
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/selectores.test.ts`
Expected: PASS — 13 tests.

- [ ] **Step 5: Cablear `Workspace.tsx` a los selectores**

Añadir el import:

```ts
import {
  erroresVisibles as calcularErroresVisibles,
  estadoRpsVisible as calcularEstadoRpsVisible,
  hayCambiosSinGuardar as calcularHayCambiosSinGuardar,
  inputActivo,
  medidasSuficientes as calcularMedidasSuficientes,
  origenRpsActivo as calcularOrigenRpsActivo,
  pedidoRpsVisible as calcularPedidoRpsVisible,
} from "@/lib/workspace/selectores";
```

Sustituir el bloque de las líneas 84-96 por:

```ts
  const input = inputActivo(tipo, lona, baq);
  const hayCambiosSinGuardar = calcularHayCambiosSinGuardar(editorActivo, input, baseGuardada);
  const erroresActuales = useMemo(() => erroresPlanteamiento(input), [input]);
  const erroresVisibles = calcularErroresVisibles(erroresActuales, validacionIntentada);
  const medidasSuficientes = calcularMedidasSuficientes(input);
```

y el bloque de las líneas 165-177 por:

```ts
  const numeroPedidoNormalizado = normalizarNumeroPedidoRps(numeroPedido);
  const pedidoRpsVisible = calcularPedidoRpsVisible(numeroPedido, pedidoRps);
  const origenRpsActivo = calcularOrigenRpsActivo(numeroPedido, origenRps);
  const estadoRpsVisible = calcularEstadoRpsVisible(numeroPedido, numeroEstadoRps, estadoRps);
```

Borrar el `useMemo` de `erroresFormulario`, que ya no se usa. `numeroPedidoNormalizado` sigue haciendo falta en el efecto de RPS.

- [ ] **Step 6: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: los 26 ficheros de test previos siguen pasando, más el nuevo. Sin errores de tipos ni de lint.

- [ ] **Step 7: Commit**

```bash
git add src/lib/workspace src/components/workspace/Workspace.tsx
git commit -m "refactor: extrae los derivados del workspace a selectores puros"
```

---

### Task 2: Orquestación del PDF

`solicitarPdf` mezcla hoy tres cosas: validar el formulario, guardar y componer la petición al PDF. Sale solo la composición, con `fetch` y el rasterizado inyectados para poder testearla en node.

**Files:**
- Create: `src/lib/pdf/orquestar-pdf.ts`
- Create: `src/lib/pdf/__tests__/orquestar-pdf.test.ts`
- Modify: `src/components/workspace/Workspace.tsx:410-473` (función `solicitarPdf`)

**Interfaces:**
- Consumes: `nombrePdf` de `@/lib/pdf/ruta-pdf`; `remolquesUnicos` de `@/lib/pedidos/agrupar-pedido`; `planteamientoGenerable` de `@/lib/pedidos/validar-planteamiento`.
- Produces:
  ```ts
  export interface OpcionesOrquestarPdf {
    numeroPedido: string;
    archivar: boolean;
    editorActivo: boolean;
    /** id devuelto por el guardado previo, si el flujo guardó antes de generar. */
    idGuardado: string | null;
    /** id del elemento en edición, o "__vista-previa__" si aún no se ha guardado. */
    idBorrador: string;
    tipo: TipoPlanteamiento;
    input: LonaInput | BaquetonInput;
    /** SVG serializado de la vista técnica en pantalla. */
    svgActual: string | null;
  }
  export interface DependenciasPdf {
    fetch: typeof globalThis.fetch;
    rasterizar: (svg: string) => Promise<string | null>;
  }
  export type ResultadoPdf =
    | { ok: true; respuesta: Response; nombre: string; omitidos: number }
    | { ok: false; motivo: "sin-elementos" | "http"; mensaje: string };
  export function orquestarPdf(opciones: OpcionesOrquestarPdf, deps: DependenciasPdf): Promise<ResultadoPdf>;
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/pdf/__tests__/orquestar-pdf.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { PlanteamientoRecord } from "@/lib/store/types";
import { orquestarPdf, type OpcionesOrquestarPdf } from "@/lib/pdf/orquestar-pdf";

const lonaValida = (version: string): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version },
  largo: 600, ancho: 250, altoDelante: 220, contorno: 620, material: "PVC 580 AZUL",
});

const registro = (id: string, version: string, input: LonaInput): PlanteamientoRecord => ({
  id, tipo: "lona", numeroPedido: "AR2603583", version, cliente: "CLIENTE",
  input, result: {}, paramsSnapshot: {}, snapshotSvg: `<svg id="${id}"/>`,
  createdAt: `2026-07-2${version.slice(-1)}T10:00:00Z`,
  updatedAt: `2026-07-2${version.slice(-1)}T10:00:00Z`,
} as unknown as PlanteamientoRecord);

const opciones = (extra: Partial<OpcionesOrquestarPdf> = {}): OpcionesOrquestarPdf => ({
  numeroPedido: "AR2603583", archivar: true, editorActivo: false,
  idGuardado: null, idBorrador: "__vista-previa__",
  tipo: "lona", input: lonaValida("10"), svgActual: "<svg id=\"actual\"/>",
  ...extra,
});

/** Doble de fetch: primero el listado del pedido, luego POST /api/pdf. */
function fetchFalso(registros: PlanteamientoRecord[], respuestaPdf?: Response) {
  const llamadas: { url: string; body: unknown }[] = [];
  const doble = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada);
    llamadas.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (url.startsWith("/api/planteamientos")) {
      return new Response(JSON.stringify(registros), { status: 200 });
    }
    return respuestaPdf ?? new Response("%PDF", {
      status: 200, headers: { "X-Pdf-Omitidos": "0" },
    });
  }) as unknown as typeof globalThis.fetch;
  return { doble, llamadas };
}

const deps = (fetchDoble: typeof globalThis.fetch) => ({
  fetch: fetchDoble,
  rasterizar: async (svg: string) => (svg ? `png:${svg}` : null),
});

describe("orquestarPdf", () => {
  it("falla sin elementos cuando el pedido no tiene registros y no hay editor abierto", async () => {
    const { doble } = fetchFalso([]);
    const resultado = await orquestarPdf(opciones(), deps(doble));
    expect(resultado).toEqual({
      ok: false,
      motivo: "sin-elementos",
      mensaje: "El pedido todavía no contiene ningún elemento válido para generar el PDF.",
    });
  });

  it("envía una página por registro guardado, ordenadas por fecha de creación", async () => {
    const { doble, llamadas } = fetchFalso([
      registro("b", "11", lonaValida("11")),
      registro("a", "10", lonaValida("10")),
    ]);
    const resultado = await orquestarPdf(opciones(), deps(doble));
    expect(resultado.ok).toBe(true);
    const peticionPdf = llamadas.find((l) => l.url === "/api/pdf")!.body as {
      ids: string[]; snapshots: Record<string, string>; archivar: boolean; borrador: unknown;
    };
    expect(peticionPdf.ids).toEqual(["a", "b"]);
    expect(peticionPdf.snapshots).toEqual({ a: "png:<svg id=\"a\"/>", b: "png:<svg id=\"b\"/>" });
    expect(peticionPdf.borrador).toBeNull();
  });

  it("en vista previa manda el borrador y excluye su versión de los registros", async () => {
    const { doble, llamadas } = fetchFalso([registro("a", "10", lonaValida("10"))]);
    const resultado = await orquestarPdf(
      opciones({ archivar: false, editorActivo: true, idBorrador: "__vista-previa__" }),
      deps(doble),
    );
    expect(resultado.ok).toBe(true);
    const peticionPdf = llamadas.find((l) => l.url === "/api/pdf")!.body as {
      ids: string[]; snapshots: Record<string, string>; borrador: { id: string } | null;
    };
    expect(peticionPdf.ids).toEqual([]);
    expect(peticionPdf.borrador?.id).toBe("__vista-previa__");
    expect(peticionPdf.snapshots["__vista-previa__"]).toBe("png:<svg id=\"actual\"/>");
  });

  it("cuenta como omitidos los registros incompletos", async () => {
    const incompleto = registro("malo", "11", { ...lonaValida("11"), material: "" });
    const { doble } = fetchFalso([registro("a", "10", lonaValida("10")), incompleto]);
    const resultado = await orquestarPdf(opciones(), deps(doble));
    expect(resultado).toMatchObject({ ok: true, omitidos: 1, nombre: "AR2603583-10.pdf" });
  });

  it("devuelve el error del servidor cuando el PDF responde con fallo", async () => {
    const { doble } = fetchFalso(
      [registro("a", "10", lonaValida("10"))],
      new Response(JSON.stringify({ error: "Plantilla no encontrada" }), { status: 500 }),
    );
    const resultado = await orquestarPdf(opciones(), deps(doble));
    expect(resultado).toEqual({
      ok: false, motivo: "http", mensaje: "Plantilla no encontrada",
    });
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/pdf/__tests__/orquestar-pdf.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/pdf/orquestar-pdf"`.

- [ ] **Step 3: Escribir la implementación**

Crear `src/lib/pdf/orquestar-pdf.ts`, trasladando literalmente el cuerpo de `solicitarPdf` a partir de la línea `const pedido = numeroPedido.trim();`, sin la validación ni el guardado:

```ts
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { planteamientoGenerable } from "@/lib/pedidos/validar-planteamiento";

export interface OpcionesOrquestarPdf {
  numeroPedido: string;
  archivar: boolean;
  editorActivo: boolean;
  /** id devuelto por el guardado previo, si el flujo guardó antes de generar. */
  idGuardado: string | null;
  /** id del elemento en edición, o "__vista-previa__" si aún no se ha guardado. */
  idBorrador: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
  /** SVG serializado de la vista técnica en pantalla. */
  svgActual: string | null;
}

export interface DependenciasPdf {
  fetch: typeof globalThis.fetch;
  rasterizar: (svg: string) => Promise<string | null>;
}

export type ResultadoPdf =
  | { ok: true; respuesta: Response; nombre: string; omitidos: number }
  | { ok: false; motivo: "sin-elementos" | "http"; mensaje: string };

export async function orquestarPdf(
  opciones: OpcionesOrquestarPdf,
  deps: DependenciasPdf,
): Promise<ResultadoPdf> {
  const { archivar, editorActivo, idBorrador, idGuardado, input, tipo } = opciones;
  const pedido = opciones.numeroPedido.trim();
  const nombre = nombrePdf(pedido);

  // Un PDF por pedido: una página por cada remolque guardado, en orden de creación.
  let registros: PlanteamientoRecord[] = [];
  if (pedido) {
    registros = await deps.fetch(`/api/planteamientos?pedido=${encodeURIComponent(pedido)}`)
      .then((r) => (r.ok ? r.json() as Promise<PlanteamientoRecord[]> : []))
      .catch(() => []);
  }
  const agrupados = remolquesUnicos(registros);
  const generables = agrupados.filter((registro) => planteamientoGenerable(registro.input));
  const omitidos = agrupados.length - generables.length;
  const paginas = generables
    .filter((registro) => archivar || !editorActivo || registro.version !== input.cabecera.version)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const ids = paginas.map((r) => r.id);
  if (ids.length === 0 && !editorActivo) {
    return {
      ok: false,
      motivo: "sin-elementos",
      mensaje: "El pedido todavía no contiene ningún elemento válido para generar el PDF.",
    };
  }

  const snapshots: Record<string, string | null> = {};
  for (const r of paginas) {
    snapshots[r.id] = r.snapshotSvg ? await deps.rasterizar(r.snapshotSvg) : null;
  }
  if (editorActivo) {
    const idPaginaActual = idGuardado ?? idBorrador;
    if (!(idPaginaActual in snapshots)) {
      snapshots[idPaginaActual] = await deps.rasterizar(opciones.svgActual ?? "");
    }
  }

  const respuesta = await deps.fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ids,
      snapshots,
      archivar,
      borrador: archivar || !editorActivo ? null : { id: idBorrador, tipo, input },
    }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => null) as { error?: string } | null;
    return { ok: false, motivo: "http", mensaje: detalle?.error ?? String(respuesta.status) };
  }
  return {
    ok: true,
    respuesta,
    nombre,
    omitidos: Math.max(omitidos, Number(respuesta.headers.get("X-Pdf-Omitidos") ?? 0)),
  };
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/pdf/__tests__/orquestar-pdf.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Cablear `Workspace.tsx`**

Sustituir el cuerpo de `solicitarPdf` para que solo valide, guarde y delegue. El texto de los avisos no cambia:

```ts
  async function solicitarPdf(archivar: boolean): Promise<{
    respuesta: Response; nombre: string; omitidos: number;
  } | null> {
    if (editorActivo) {
      if (validarYEnfocar()) return null;
    }
    const savedId = archivar && editorActivo ? await doGuardar() : null;
    if (archivar && editorActivo && !savedId) return null;

    const resultado = await orquestarPdf({
      numeroPedido,
      archivar,
      editorActivo,
      idGuardado: savedId,
      idBorrador: id ?? "__vista-previa__",
      tipo,
      input,
      svgActual: snapshotRef.current?.() ?? null,
    }, {
      fetch: (entrada, init) => fetch(entrada, init),
      rasterizar: (svg) => rasterizarSvg(svg, { monocromo: true }),
    });

    if (!resultado.ok) {
      setAviso(resultado.motivo === "sin-elementos"
        ? resultado.mensaje
        : `Error al generar PDF: ${resultado.mensaje}`);
      return null;
    }
    return {
      respuesta: resultado.respuesta,
      nombre: resultado.nombre,
      omitidos: resultado.omitidos,
    };
  }
```

Añadir `import { orquestarPdf } from "@/lib/pdf/orquestar-pdf";` y borrar los imports de `nombrePdf`, `remolquesUnicos` y `planteamientoGenerable` **solo si ya no se usan en el fichero** (`remolquesUnicos` sí se sigue usando en el efecto del pedido y en `doGuardar`).

Ojo a este detalle de comportamiento, que debe conservarse: antes el `svgActual` se leía dentro del bucle, tras el `await` del guardado; ahora se lee justo antes de llamar a `orquestarPdf`, también tras el guardado. El orden respecto al guardado es el mismo.

- [ ] **Step 6: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pdf src/components/workspace/Workspace.tsx
git commit -m "refactor: extrae la orquestación del PDF a una función testeable"
```

---

### Task 3: El reducer del workspace

Los 22 `useState` pasan a un reducer puro. Es el paso que convierte las cascadas de hasta 15 `setState` en transiciones que un test puede fijar.

**Files:**
- Create: `src/lib/workspace/estado.ts`
- Create: `src/lib/workspace/__tests__/estado.test.ts`
- Modify: `src/components/workspace/Workspace.tsx` (declaraciones de estado y todos los `setX`)

**Interfaces:**
- Consumes: `EstadoConsultaRps` de `@/lib/workspace/selectores` (Task 1); `remolquesUnicos` de `@/lib/pedidos/agrupar-pedido`; `normalizarNumeroPedidoRps` de `@/lib/rps/numero-pedido`.
- Produces: `EstadoWorkspace`, `AccionWorkspace`, `estadoInicial(inicial, vacios)`, `reducirWorkspace(estado, accion)`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/workspace/__tests__/estado.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { OrigenRps } from "@/lib/rps/types";
import {
  estadoInicial,
  reducirWorkspace,
  type EstadoWorkspace,
} from "@/lib/workspace/estado";

const vacios = () => ({ lona: emptyLona(), baqueton: emptyBaqueton() });

const registro = (id: string, version: string, cliente = "CLIENTE"): PlanteamientoRecord => ({
  id, tipo: "lona", numeroPedido: "AR2603583", version, cliente,
  input: { ...emptyLona(), cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente } },
  result: {}, paramsSnapshot: {}, snapshotSvg: null,
  createdAt: "2026-07-20T10:00:00Z", updatedAt: "2026-07-20T10:00:00Z",
} as unknown as PlanteamientoRecord);

const conPedidoAbierto = (): EstadoWorkspace => {
  const base = estadoInicial(undefined, vacios());
  const conNumero = reducirWorkspace(base, { tipo: "PEDIDO_CAMBIADO", valor: "AR2603583" });
  return reducirWorkspace(conNumero, {
    tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10")],
  });
};

describe("estadoInicial", () => {
  it("arranca vacío y con el selector de RPS abierto", () => {
    const estado = estadoInicial(undefined, vacios());
    expect(estado.editorActivo).toBe(false);
    expect(estado.cargandoPedido).toBe(false);
    expect(estado.baseGuardada).toBeNull();
    expect(estado.rps.selectorAbierto).toBe(true);
  });

  it("al reutilizar un registro abre el editor con la base ya guardada", () => {
    const input = registro("a", "11").input as LonaInput;
    const estado = estadoInicial({ id: "a", tipo: "lona", input }, vacios());
    expect(estado.editorActivo).toBe(true);
    expect(estado.id).toBe("a");
    expect(estado.numeroPedido).toBe("AR2603583");
    expect(estado.cargandoPedido).toBe(true);
    expect(estado.baseGuardada).toBe(JSON.stringify(input));
  });
});

describe("PEDIDO_CAMBIADO", () => {
  it("propaga el número a las cabeceras de lona y baquetón", () => {
    const estado = reducirWorkspace(estadoInicial(undefined, vacios()), {
      tipo: "PEDIDO_CAMBIADO", valor: "AR2603583",
    });
    expect(estado.numeroPedido).toBe("AR2603583");
    expect(estado.lona.cabecera.numeroPedido).toBe("AR2603583");
    expect(estado.baqueton.cabecera.numeroPedido).toBe("AR2603583");
  });

  it("cambiar a otro pedido limpia editor, cliente, registros, id, origen y avisos", () => {
    const abierto = reducirWorkspace(conPedidoAbierto(), {
      tipo: "REGISTRO_SELECCIONADO", registro: registro("a", "10"),
    });
    const nuevo = reducirWorkspace(abierto, { tipo: "PEDIDO_CAMBIADO", valor: "AR2604000" });
    expect(nuevo.editorActivo).toBe(false);
    expect(nuevo.id).toBeUndefined();
    expect(nuevo.cliente).toBe("");
    expect(nuevo.lona.cabecera.cliente).toBe("");
    expect(nuevo.registros).toEqual([]);
    expect(nuevo.cargandoPedido).toBe(true);
    expect(nuevo.baseGuardada).toBeNull();
    expect(nuevo.validacionIntentada).toBe(false);
    expect(nuevo.aviso).toBeNull();
    expect(nuevo.rps.origen).toBeNull();
    expect(nuevo.rps.selectorAbierto).toBe(true);
  });

  it("reescribir el mismo pedido en otro formato no descarta el trabajo en curso", () => {
    const abierto = reducirWorkspace(conPedidoAbierto(), {
      tipo: "REGISTRO_SELECCIONADO", registro: registro("a", "10"),
    });
    const igual = reducirWorkspace(abierto, { tipo: "PEDIDO_CAMBIADO", valor: "AR.26.03583" });
    expect(igual.editorActivo).toBe(true);
    expect(igual.id).toBe("a");
    expect(igual.registros).toHaveLength(1);
  });

  it("vaciar el número deja de cargar el pedido", () => {
    const estado = reducirWorkspace(conPedidoAbierto(), { tipo: "PEDIDO_CAMBIADO", valor: "" });
    expect(estado.cargandoPedido).toBe(false);
  });
});

describe("REGISTROS_CARGADOS", () => {
  it("deduplica, deja de cargar y rellena el cliente solo si está vacío", () => {
    const estado = reducirWorkspace(
      reducirWorkspace(estadoInicial(undefined, vacios()), {
        tipo: "PEDIDO_CAMBIADO", valor: "AR2603583",
      }),
      { tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10"), registro("a2", "10")] },
    );
    expect(estado.cargandoPedido).toBe(false);
    expect(estado.registros).toHaveLength(1);
    expect(estado.cliente).toBe("CLIENTE");
    expect(estado.lona.cabecera.cliente).toBe("CLIENTE");
  });

  it("no pisa un cliente ya escrito a mano", () => {
    const conCliente = reducirWorkspace(conPedidoAbierto(), {
      tipo: "CLIENTE_CAMBIADO", valor: "OTRO CLIENTE",
    });
    const estado = reducirWorkspace(conCliente, {
      tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10", "CLIENTE DE RPS")],
    });
    expect(estado.cliente).toBe("OTRO CLIENTE");
    expect(estado.lona.cabecera.cliente).toBe("OTRO CLIENTE");
  });
});

describe("REGISTRO_SELECCIONADO", () => {
  it("abre el elegido, fija la base guardada y cierra el selector de RPS", () => {
    const estado = reducirWorkspace(conPedidoAbierto(), {
      tipo: "REGISTRO_SELECCIONADO", registro: registro("a", "10"),
    });
    expect(estado.editorActivo).toBe(true);
    expect(estado.id).toBe("a");
    expect(estado.tipo).toBe("lona");
    expect(estado.baseGuardada).toBe(JSON.stringify(registro("a", "10").input));
    expect(estado.validacionIntentada).toBe(false);
    expect(estado.aviso).toBeNull();
    expect(estado.rps.origen).toBeNull();
    expect(estado.rps.selectorAbierto).toBe(false);
  });
});

describe("ELEMENTO_ANADIDO", () => {
  it("abre un borrador sin id, sin base guardada y con el selector de RPS abierto", () => {
    const previo = conPedidoAbierto();
    const base = { ...emptyBaqueton(), cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR2603583", version: "11" } };
    const estado = reducirWorkspace(previo, {
      tipo: "ELEMENTO_ANADIDO", tipoElemento: "baqueton", base, aviso: "Baquetón 2 añadido al pedido.",
    });
    expect(estado.tipo).toBe("baqueton");
    expect(estado.baqueton.cabecera.version).toBe("11");
    expect(estado.id).toBeUndefined();
    expect(estado.editorActivo).toBe(true);
    expect(estado.baseGuardada).toBeNull();
    expect(estado.aviso).toBe("Baquetón 2 añadido al pedido.");
    expect(estado.rps.selectorAbierto).toBe(true);
    // La lona anterior se conserva intacta al cambiar de tipo.
    expect(estado.lona).toBe(previo.lona);
  });
});

describe("RPS_APLICADO", () => {
  it("reengancha el id del registro cuya versión coincide con la línea aplicada", () => {
    const origen: OrigenRps = {
      numeroPedido: "AR2603583", numeroLinea: 1, idLinea: "L1",
      ordenFabricacion: null, importadoEn: "2026-07-29T10:00:00Z",
    };
    const input = registro("a", "10").input as LonaInput;
    const estado = reducirWorkspace(conPedidoAbierto(), {
      tipo: "RPS_APLICADO", tipoElemento: "lona", input, origen,
      aviso: "Línea 1 de RPS aplicada. Todos los campos siguen siendo editables.",
    });
    expect(estado.id).toBe("a");
    expect(estado.editorActivo).toBe(true);
    expect(estado.cliente).toBe("CLIENTE");
    expect(estado.baseGuardada).toBeNull();
    expect(estado.rps.origen).toEqual(origen);
    expect(estado.rps.selectorAbierto).toBe(false);
  });

  it("deja el id sin definir si ninguna versión guardada coincide", () => {
    const input = { ...emptyLona(), cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version: "12" } };
    const estado = reducirWorkspace(conPedidoAbierto(), {
      tipo: "RPS_APLICADO", tipoElemento: "lona", input,
      origen: { numeroPedido: "AR2603583", numeroLinea: 3, idLinea: "L3", ordenFabricacion: null, importadoEn: "x" },
      aviso: "Línea 3 de RPS aplicada. Todos los campos siguen siendo editables.",
    });
    expect(estado.id).toBeUndefined();
  });
});

describe("GUARDADO_OK", () => {
  it("fija la base guardada y sustituye el registro previo de la misma versión", () => {
    const guardado = { ...registro("a-nuevo", "10"), updatedAt: "2026-07-29T12:00:00Z" };
    const estado = reducirWorkspace(conPedidoAbierto(), {
      tipo: "GUARDADO_OK", registro: guardado, aviso: "Remolque 1 guardado dentro del pedido.",
    });
    expect(estado.id).toBe("a-nuevo");
    expect(estado.registros).toHaveLength(1);
    expect(estado.registros[0].id).toBe("a-nuevo");
    expect(estado.baseGuardada).toBe(JSON.stringify(guardado.input));
    expect(estado.validacionIntentada).toBe(false);
  });
});

describe("acciones de RPS y de proceso", () => {
  it("recorre el ciclo de consulta de RPS", () => {
    const buscando = reducirWorkspace(conPedidoAbierto(), {
      tipo: "RPS_CONSULTA_INICIADA", numero: "AR2603583",
    });
    expect(buscando.rps).toMatchObject({ estado: "buscando", numeroConsultado: "AR2603583", error: null });

    const error = reducirWorkspace(buscando, { tipo: "RPS_ERROR", mensaje: "RPS no responde." });
    expect(error.rps).toMatchObject({ estado: "error", pedido: null, error: "RPS no responde." });

    const reintento = reducirWorkspace(error, { tipo: "RPS_REINTENTADO" });
    expect(reintento.rps.reintento).toBe(1);
  });

  it("marca la validación intentada y respeta el aviso previo si no hay mensaje", () => {
    const conAviso = reducirWorkspace(conPedidoAbierto(), { tipo: "AVISO_MOSTRADO", texto: "Anterior" });
    const sinMensaje = reducirWorkspace(conAviso, { tipo: "VALIDACION_INTENTADA", aviso: null });
    expect(sinMensaje.validacionIntentada).toBe(true);
    expect(sinMensaje.aviso).toBe("Anterior");

    const conMensaje = reducirWorkspace(conAviso, {
      tipo: "VALIDACION_INTENTADA", aviso: "Revisa los campos marcados. Introduce el largo del remolque.",
    });
    expect(conMensaje.aviso).toBe("Revisa los campos marcados. Introduce el largo del remolque.");
  });

  it("abre y cierra la acción en curso", () => {
    const guardando = reducirWorkspace(conPedidoAbierto(), { tipo: "ACCION_INICIADA", accion: "guardar" });
    expect(guardando.accion).toBe("guardar");
    expect(reducirWorkspace(guardando, { tipo: "ACCION_TERMINADA" }).accion).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/estado.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/workspace/estado"`.

- [ ] **Step 3: Escribir la implementación**

Crear `src/lib/workspace/estado.ts`:

```ts
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import type { OrigenRps, PedidoRps } from "@/lib/rps/types";
import type { EstadoConsultaRps } from "@/lib/workspace/selectores";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

export interface EstadoRpsWorkspace {
  estado: EstadoConsultaRps;
  /** Número por el que se lanzó la última consulta, ya normalizado. */
  numeroConsultado: string;
  pedido: PedidoRps | null;
  error: string | null;
  origen: OrigenRps | null;
  reintento: number;
  selectorAbierto: boolean;
}

export interface EstadoWorkspace {
  // Documento en edición
  tipo: TipoPlanteamiento;
  lona: LonaInput;
  baqueton: BaquetonInput;
  id?: string;
  editorActivo: boolean;
  /** JSON del input tal como quedó guardado; null si nunca se guardó. */
  baseGuardada: string | null;
  validacionIntentada: boolean;

  // Pedido abierto
  numeroPedido: string;
  cliente: string;
  registros: PlanteamientoRecord[];
  cargandoPedido: boolean;

  // Importación RPS
  rps: EstadoRpsWorkspace;

  // Transversal
  aviso: string | null;
  accion: "guardar" | "preview" | "pdf" | null;
}

export interface EntradaInicial {
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export type AccionWorkspace =
  | { tipo: "PEDIDO_CAMBIADO"; valor: string }
  | { tipo: "CLIENTE_CAMBIADO"; valor: string }
  | { tipo: "INPUT_CAMBIADO"; input: LonaInput | BaquetonInput }
  | { tipo: "ELEMENTO_ANADIDO"; tipoElemento: TipoPlanteamiento; base: LonaInput | BaquetonInput; aviso: string }
  | { tipo: "REGISTRO_SELECCIONADO"; registro: PlanteamientoRecord }
  | { tipo: "RPS_APLICADO"; tipoElemento: TipoPlanteamiento; input: LonaInput | BaquetonInput; origen: OrigenRps; aviso: string; id?: string }
  | { tipo: "RPS_SELECTOR_ABIERTO" }
  | { tipo: "RPS_REINTENTADO" }
  | { tipo: "REGISTROS_CARGADOS"; registros: PlanteamientoRecord[] }
  | { tipo: "REGISTROS_FALLARON" }
  | { tipo: "RPS_CONSULTA_INICIADA"; numero: string }
  | { tipo: "RPS_ENCONTRADO"; pedido: PedidoRps }
  | { tipo: "RPS_NO_ENCONTRADO" }
  | { tipo: "RPS_ERROR"; mensaje: string }
  | { tipo: "GUARDADO_OK"; registro: PlanteamientoRecord; aviso: string }
  | { tipo: "ACCION_INICIADA"; accion: "guardar" | "preview" | "pdf" }
  | { tipo: "ACCION_TERMINADA" }
  | { tipo: "VALIDACION_INTENTADA"; aviso: string | null }
  | { tipo: "AVISO_MOSTRADO"; texto: string | null };

type Cabecera = LonaInput["cabecera"];

const conCabecera = <T extends LonaInput | BaquetonInput>(
  input: T,
  cambios: Partial<Cabecera>,
): T => ({ ...input, cabecera: { ...input.cabecera, ...cambios } });

/**
 * `vacios` llega desde fuera porque `emptyLona()` lee la fecha del día: el
 * reducer y su estado inicial se mantienen puros y deterministas.
 */
export function estadoInicial(
  inicial: EntradaInicial | undefined,
  vacios: { lona: LonaInput; baqueton: BaquetonInput },
): EstadoWorkspace {
  return {
    tipo: inicial?.tipo ?? "lona",
    lona: inicial?.tipo === "lona" ? (inicial.input as LonaInput) : vacios.lona,
    baqueton: inicial?.tipo === "baqueton" ? (inicial.input as BaquetonInput) : vacios.baqueton,
    id: inicial?.id,
    editorActivo: Boolean(inicial),
    baseGuardada: inicial ? JSON.stringify(inicial.input) : null,
    validacionIntentada: false,
    numeroPedido: inicial?.input.cabecera.numeroPedido ?? "",
    cliente: inicial?.input.cabecera.cliente ?? "",
    registros: [],
    cargandoPedido: Boolean(inicial?.input.cabecera.numeroPedido),
    rps: {
      estado: "idle", numeroConsultado: "", pedido: null, error: null,
      origen: null, reintento: 0, selectorAbierto: true,
    },
    aviso: null,
    accion: null,
  };
}

export function reducirWorkspace(
  estado: EstadoWorkspace,
  accion: AccionWorkspace,
): EstadoWorkspace {
  switch (accion.tipo) {
    case "PEDIDO_CAMBIADO": {
      const cambiaPedido = normalizarNumeroPedidoRps(accion.valor)
        !== normalizarNumeroPedidoRps(estado.numeroPedido);
      const conNumero: EstadoWorkspace = {
        ...estado,
        numeroPedido: accion.valor,
        lona: conCabecera(estado.lona, { numeroPedido: accion.valor }),
        baqueton: conCabecera(estado.baqueton, { numeroPedido: accion.valor }),
      };
      if (!cambiaPedido) return conNumero;
      return {
        ...conNumero,
        cliente: "",
        lona: conCabecera(conNumero.lona, { cliente: "" }),
        baqueton: conCabecera(conNumero.baqueton, { cliente: "" }),
        registros: [],
        cargandoPedido: Boolean(normalizarNumeroPedidoRps(accion.valor)),
        editorActivo: false,
        id: undefined,
        baseGuardada: null,
        validacionIntentada: false,
        aviso: null,
        rps: { ...estado.rps, origen: null, selectorAbierto: true },
      };
    }

    case "CLIENTE_CAMBIADO":
      return {
        ...estado,
        cliente: accion.valor,
        lona: conCabecera(estado.lona, { cliente: accion.valor }),
        baqueton: conCabecera(estado.baqueton, { cliente: accion.valor }),
      };

    case "INPUT_CAMBIADO":
      return estado.tipo === "lona"
        ? { ...estado, lona: accion.input as LonaInput }
        : { ...estado, baqueton: accion.input as BaquetonInput };

    case "ELEMENTO_ANADIDO":
      return {
        ...estado,
        tipo: accion.tipoElemento,
        lona: accion.tipoElemento === "lona" ? accion.base as LonaInput : estado.lona,
        baqueton: accion.tipoElemento === "baqueton" ? accion.base as BaquetonInput : estado.baqueton,
        id: undefined,
        editorActivo: true,
        baseGuardada: null,
        validacionIntentada: false,
        aviso: accion.aviso,
        rps: { ...estado.rps, origen: null, selectorAbierto: true },
      };

    case "REGISTRO_SELECCIONADO": {
      const { registro } = accion;
      return {
        ...estado,
        tipo: registro.tipo,
        lona: registro.tipo === "lona" ? registro.input as LonaInput : estado.lona,
        baqueton: registro.tipo === "baqueton" ? registro.input as BaquetonInput : estado.baqueton,
        numeroPedido: registro.numeroPedido,
        cliente: registro.cliente,
        id: registro.id,
        editorActivo: true,
        baseGuardada: JSON.stringify(registro.input),
        validacionIntentada: false,
        aviso: null,
        rps: { ...estado.rps, origen: null, selectorAbierto: false },
      };
    }

    case "RPS_APLICADO": {
      const { input } = accion;
      return {
        ...estado,
        tipo: accion.tipoElemento,
        lona: accion.tipoElemento === "lona" ? input as LonaInput : estado.lona,
        baqueton: accion.tipoElemento === "baqueton" ? input as BaquetonInput : estado.baqueton,
        numeroPedido: input.cabecera.numeroPedido,
        cliente: input.cabecera.cliente,
        editorActivo: true,
        // El id lo resuelve el componente y llega en el payload. Resolverlo aquí
        // desde `estado.registros` obligaba a sacar `registrosPedido` de las
        // dependencias de `aplicarPedidoRps`, y eso abría una carrera: si RPS
        // contestaba antes que el listado del pedido, el id quedaba sin resolver
        // y al guardar se creaba un registro duplicado de la misma versión.
        id: accion.id,
        baseGuardada: null,
        validacionIntentada: false,
        aviso: accion.aviso,
        rps: { ...estado.rps, origen: accion.origen, selectorAbierto: false },
      };
    }

    case "RPS_SELECTOR_ABIERTO":
      return { ...estado, rps: { ...estado.rps, selectorAbierto: true } };

    case "RPS_REINTENTADO":
      return { ...estado, rps: { ...estado.rps, reintento: estado.rps.reintento + 1 } };

    case "REGISTROS_CARGADOS": {
      const registros = remolquesUnicos(accion.registros);
      const base: EstadoWorkspace = { ...estado, registros, cargandoPedido: false };
      const guardado = registros.find((r) => r.cliente.trim())?.cliente;
      if (!guardado) return base;
      return {
        ...base,
        cliente: base.cliente.trim() ? base.cliente : guardado,
        lona: base.lona.cabecera.cliente.trim() ? base.lona : conCabecera(base.lona, { cliente: guardado }),
        baqueton: base.baqueton.cabecera.cliente.trim()
          ? base.baqueton
          : conCabecera(base.baqueton, { cliente: guardado }),
      };
    }

    case "REGISTROS_FALLARON":
      return { ...estado, registros: [], cargandoPedido: false };

    case "RPS_CONSULTA_INICIADA":
      return {
        ...estado,
        rps: { ...estado.rps, numeroConsultado: accion.numero, estado: "buscando", error: null },
      };

    case "RPS_ENCONTRADO":
      return { ...estado, rps: { ...estado.rps, pedido: accion.pedido, estado: "encontrado" } };

    case "RPS_NO_ENCONTRADO":
      return { ...estado, rps: { ...estado.rps, pedido: null, estado: "no-encontrado" } };

    case "RPS_ERROR":
      return {
        ...estado,
        rps: { ...estado.rps, pedido: null, error: accion.mensaje, estado: "error" },
      };

    case "GUARDADO_OK":
      return {
        ...estado,
        id: accion.registro.id,
        baseGuardada: JSON.stringify(accion.registro.input),
        validacionIntentada: false,
        registros: remolquesUnicos([...estado.registros, accion.registro]),
        aviso: accion.aviso,
      };

    case "ACCION_INICIADA":
      return { ...estado, accion: accion.accion };

    case "ACCION_TERMINADA":
      return { ...estado, accion: null };

    case "VALIDACION_INTENTADA":
      return { ...estado, validacionIntentada: true, aviso: accion.aviso ?? estado.aviso };

    case "AVISO_MOSTRADO":
      return { ...estado, aviso: accion.texto };
  }
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/estado.test.ts`
Expected: PASS — 16 tests.

- [ ] **Step 5: Cablear `Workspace.tsx` al reducer**

Sustituir las 22 declaraciones `useState` (líneas 35-62, salvo `materiales` y `params`, que se quedan como están hasta la Task 4) por:

```ts
  const [estado, despachar] = useReducer(
    reducirWorkspace,
    undefined,
    () => estadoInicial(inicial, { lona: emptyLona(), baqueton: emptyBaqueton() }),
  );
  const {
    tipo, lona, baqueton: baq, id, editorActivo, baseGuardada, validacionIntentada,
    numeroPedido, cliente: clientePedido, registros: registrosPedido, cargandoPedido,
    aviso, accion,
  } = estado;
```

Renombrar cada `setX(...)` por su despacho equivalente:

| Antes | Después |
|---|---|
| `setNumeroPedido(v)` y la cascada de `cambiarNumeroPedido` | `despachar({ tipo: "PEDIDO_CAMBIADO", valor: v })` |
| la cascada de `cambiarClientePedido` | `despachar({ tipo: "CLIENTE_CAMBIADO", valor: v })` |
| `setLona(x)` / `setBaq(x)` desde los formularios | `despachar({ tipo: "INPUT_CAMBIADO", input: x })` |
| la cascada de `nuevoElemento` | `despachar({ tipo: "ELEMENTO_ANADIDO", tipoElemento, base, aviso })` |
| la cascada de `seleccionarRegistro` | `despachar({ tipo: "REGISTRO_SELECCIONADO", registro })` |
| la cascada de `aplicarPedidoRps` | `despachar({ tipo: "RPS_APLICADO", tipoElemento, input, origen, aviso })` |
| `setRegistrosPedido` + `setCargandoPedido(false)` + relleno de cliente | `despachar({ tipo: "REGISTROS_CARGADOS", registros })` |
| en `validarYEnfocar`: `setValidacionIntentada(true)` + `setAviso(...)` | `despachar({ tipo: "VALIDACION_INTENTADA", aviso })`, con `aviso: null` si no hay errores |
| en `doGuardar`: `setId` + `setBaseGuardada` + `setValidacionIntentada(false)` + `setRegistrosPedido` + `setAviso` | `despachar({ tipo: "GUARDADO_OK", registro: saved, aviso })` |
| `setAviso(x)` | `despachar({ tipo: "AVISO_MOSTRADO", texto: x })` |
| `setAccion(x)` / `setAccion(null)` | `despachar({ tipo: "ACCION_INICIADA", accion: x })` / `{ tipo: "ACCION_TERMINADA" }` |

Los cuerpos de `nuevoElemento` y `aplicarPedidoRps` quedan reducidos a construir el payload y despachar. Por ejemplo `nuevoElemento`:

```ts
  function nuevoElemento(nuevoTipo: TipoPlanteamiento) {
    if (!numeroPedido.trim()) {
      despachar({ tipo: "AVISO_MOSTRADO", texto: "Introduce primero el número de pedido." });
      return;
    }
    if (!puedeCambiarElemento()) return;
    const plantilla = nuevoTipo === "lona" ? emptyLona() : emptyBaqueton();
    const version = siguienteVersionPedido(registrosPedido);
    const base = {
      ...plantilla,
      cabecera: {
        ...plantilla.cabecera,
        numeroPedido,
        cliente: clientePedido,
        version,
        realizadoPor: input.cabecera.realizadoPor,
        revision: input.cabecera.revision,
      },
    };
    despachar({
      tipo: "ELEMENTO_ANADIDO",
      tipoElemento: nuevoTipo,
      base,
      aviso: `${nombreElementoPedido(version, nuevoTipo)} añadido al pedido. Completa sus datos y guárdalo.`,
    });
  }
```

`materiales` y `params` siguen en `useState`; `snapshotRef`, `numeroAnteriorRps` y `ultimaConsultaRps` siguen siendo refs. `materialesRef` también, de momento.

- [ ] **Step 6: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde. Si `tsc` se queja de que falta una rama del `switch`, es que la unión de acciones y el reducer se han desincronizado: el `switch` no lleva `default` a propósito, para que TypeScript detecte los huecos.

- [ ] **Step 7: Commit**

```bash
git add src/lib/workspace src/components/workspace/Workspace.tsx
git commit -m "refactor: el estado del workspace pasa a un reducer puro"
```

---

### Task 4: Hooks de efecto y catálogos

Los tres efectos y la carga de catálogos salen a hooks propios. **No llevan tests**: son React con temporizadores y sin jsdom no se pueden ejecutar. Su red de seguridad es `tsc`, `lint` y la prueba manual de la Task 5. Por eso se trasladan **literalmente**, sin aprovechar para reescribir nada.

**Files:**
- Create: `src/components/workspace/useCatalogos.ts`
- Create: `src/components/workspace/useRegistrosPedido.ts`
- Create: `src/components/workspace/useConsultaRps.ts`
- Create: `src/components/workspace/useAvisoSalida.ts`
- Modify: `src/components/workspace/Workspace.tsx` (borrar los cuatro `useEffect` y el `useState` de `materiales` y `params`)

**Interfaces:**
- Consumes: `AccionWorkspace` de `@/lib/workspace/estado` (Task 3).
- Produces:
  ```ts
  export function useCatalogos(): {
    materiales: Material[];
    params: CalcParams;
    materialesRef: RefObject<Material[]>;
    setMateriales: Dispatch<SetStateAction<Material[]>>;
  };
  export function useRegistrosPedido(numeroPedido: string, despachar: Dispatch<AccionWorkspace>): void;
  export function useConsultaRps(opciones: {
    numeroPedido: string;
    reintento: number;
    hayInicial: boolean;
    despachar: Dispatch<AccionWorkspace>;
    onPedidoUnicaLinea: (pedido: PedidoRps) => void;
    reiniciarGuarda: RefObject<(() => void) | null>;
  }): void;
  export function useAvisoSalida(activo: boolean): void;
  ```

- [ ] **Step 1: Crear `useCatalogos`**

```ts
"use client";
import { useEffect, useRef, useState } from "react";
import type { Material } from "@/lib/calc/materiales-seed";
import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";

/** Catálogos que se cargan una vez y no participan en ninguna transición. */
export function useCatalogos() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [params, setParams] = useState<CalcParams>(DEFAULT_PARAMS);
  const materialesRef = useRef<Material[]>([]);

  useEffect(() => {
    fetch("/api/materiales").then((r) => r.json()).then((data: Material[]) => {
      materialesRef.current = data;
      setMateriales(data);
    }).catch(() => setMateriales([]));
  }, []);

  useEffect(() => {
    fetch("/api/parametros").then((r) => r.json()).then(setParams).catch(() => {});
  }, []);

  return { materiales, params, materialesRef, setMateriales };
}
```

- [ ] **Step 2: Crear `useRegistrosPedido`**

Traslado literal del efecto de `Workspace.tsx:179-211`, con el relleno del cliente delegado al reducer:

```ts
"use client";
import { useEffect, type Dispatch } from "react";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { AccionWorkspace } from "@/lib/workspace/estado";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

/** Registros ya guardados del pedido abierto. Debounce de 250 ms. */
export function useRegistrosPedido(
  numeroPedido: string,
  despachar: Dispatch<AccionWorkspace>,
) {
  useEffect(() => {
    const numero = normalizarNumeroPedidoRps(numeroPedido);
    if (!numero) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(`/api/planteamientos?pedido=${encodeURIComponent(numeroPedido)}`, {
        signal: controller.signal,
        cache: "no-store",
      }).then(async (respuesta) => {
        if (!respuesta.ok) throw new Error(String(respuesta.status));
        despachar({
          tipo: "REGISTROS_CARGADOS",
          registros: await respuesta.json() as PlanteamientoRecord[],
        });
      }).catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") despachar({ tipo: "REGISTROS_FALLARON" });
      });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [despachar, numeroPedido]);
}
```

Diferencia respecto al original, deliberada y sin efecto observable: antes `cargandoPedido` se ponía a `false` en un `finally`; ahora lo hacen `REGISTROS_CARGADOS` y `REGISTROS_FALLARON`, que son las dos únicas salidas no abortadas. En la ruta abortada tampoco se tocaba antes.

- [ ] **Step 3: Crear `useConsultaRps`**

Traslado literal del efecto de `Workspace.tsx:213-270`. Los dos refs de guarda viven ahora dentro del hook, y `reiniciarGuarda` expone al componente la forma de limpiarlos al pulsar «Reintentar»:

```ts
"use client";
import { useEffect, useRef, type Dispatch, type RefObject } from "react";
import type { PedidoRps } from "@/lib/rps/types";
import type { AccionWorkspace } from "@/lib/workspace/estado";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

const FORMA_PEDIDO_RPS = /^[A-Z]{2}\d{5,}$/;

export function useConsultaRps({
  numeroPedido, reintento, hayInicial, despachar, onPedidoUnicaLinea, reiniciarGuarda,
}: {
  numeroPedido: string;
  reintento: number;
  hayInicial: boolean;
  despachar: Dispatch<AccionWorkspace>;
  onPedidoUnicaLinea: (pedido: PedidoRps) => void;
  reiniciarGuarda: RefObject<(() => void) | null>;
}) {
  const numeroAnterior = useRef(normalizarNumeroPedidoRps(numeroPedido));
  const ultimaConsulta = useRef("");
  reiniciarGuarda.current = () => { ultimaConsulta.current = ""; };

  useEffect(() => {
    const numero = normalizarNumeroPedidoRps(numeroPedido);
    const cambioPedido = numero !== numeroAnterior.current;
    numeroAnterior.current = numero;

    if (!FORMA_PEDIDO_RPS.test(numero)) {
      ultimaConsulta.current = "";
      return;
    }
    // Un registro reutilizado no se sobrescribe al abrirse. La consulta se
    // activa en cuanto el usuario cambie el número o pulse Reintentar.
    if (hayInicial && !cambioPedido && reintento === 0) return;
    const clave = `${numero}:${reintento}`;
    if (ultimaConsulta.current === clave) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      ultimaConsulta.current = clave;
      despachar({ tipo: "RPS_CONSULTA_INICIADA", numero });
      void fetch(`/api/rps/pedido?numero=${encodeURIComponent(numero)}`, {
        signal: controller.signal,
        cache: "no-store",
      }).then(async (response) => {
        const payload = await response.json() as { pedido?: PedidoRps | null; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar RPS.");
        if (!payload.pedido) {
          despachar({ tipo: "RPS_NO_ENCONTRADO" });
          return;
        }
        despachar({ tipo: "RPS_ENCONTRADO", pedido: payload.pedido });
        if (payload.pedido.lineas.length === 1) onPedidoUnicaLinea(payload.pedido);
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        despachar({
          tipo: "RPS_ERROR",
          mensaje: error instanceof Error ? error.message : "No se pudo consultar RPS.",
        });
      });
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [despachar, hayInicial, numeroPedido, onPedidoUnicaLinea, reintento]);
}
```

- [ ] **Step 4: Crear `useAvisoSalida`**

Traslado literal del efecto de `Workspace.tsx:98-120`:

```ts
"use client";
import { useEffect } from "react";

/** Avisa antes de recargar o de navegar con cambios sin guardar. */
export function useAvisoSalida(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const antesDeSalir = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const interceptarEnlace = (event: MouseEvent) => {
      const enlace = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!enlace || enlace.target === "_blank" || event.defaultPrevented) return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin || destino.pathname === window.location.pathname) return;
      if (!window.confirm("Hay cambios sin guardar. ¿Quieres salir y descartarlos?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", antesDeSalir);
    document.addEventListener("click", interceptarEnlace, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeSalir);
      document.removeEventListener("click", interceptarEnlace, true);
    };
  }, [activo]);
}
```

- [ ] **Step 5: Cablear `Workspace.tsx`**

Borrar los cuatro `useEffect` y los `useState` de `materiales` y `params`, y en su lugar:

```ts
  const { materiales, params, materialesRef, setMateriales } = useCatalogos();
  const reiniciarGuardaRps = useRef<(() => void) | null>(null);

  useRegistrosPedido(numeroPedido, despachar);
  useAvisoSalida(hayCambiosSinGuardar);
  useConsultaRps({
    numeroPedido,
    reintento: estado.rps.reintento,
    hayInicial: Boolean(inicial),
    despachar,
    onPedidoUnicaLinea: aplicarPrimeraLineaRps,
    reiniciarGuarda: reiniciarGuardaRps,
  });
```

`aplicarPrimeraLineaRps` es un `useCallback` que conserva el rescate del catálogo que hoy vive dentro del efecto:

```ts
  const aplicarPrimeraLineaRps = useCallback(async (pedido: PedidoRps) => {
    let catalogo = materialesRef.current;
    if (catalogo.length === 0) {
      catalogo = await fetch("/api/materiales", { cache: "no-store" })
        .then((respuesta) => respuesta.ok ? respuesta.json() as Promise<Material[]> : []);
      if (catalogo.length > 0) {
        materialesRef.current = catalogo;
        setMateriales(catalogo);
      }
    }
    aplicarPedidoRps(pedido, pedido.lineas[0], catalogo);
  }, [aplicarPedidoRps, materialesRef, setMateriales]);
```

El `onReintentar` del panel de RPS pasa a:

```ts
      onReintentar={() => {
        reiniciarGuardaRps.current?.();
        despachar({ tipo: "RPS_REINTENTADO" });
      }}
```

- [ ] **Step 6: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde. Prestar atención a los avisos de `react-hooks/exhaustive-deps`: si aparece alguno nuevo, es señal de que una dependencia se ha perdido en el traslado — arreglarlo, no silenciarlo.

- [ ] **Step 7: Commit**

```bash
git add src/components/workspace
git commit -m "refactor: los efectos del workspace pasan a hooks propios"
```

---

### Task 5: `useWorkspace` y componente de render

Último paso: los manejadores se agrupan en un hook y `Workspace.tsx` queda solo con JSX.

**Files:**
- Create: `src/components/workspace/useWorkspace.ts`
- Modify: `src/components/workspace/Workspace.tsx`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:
  ```ts
  export function useWorkspace(inicial?: EntradaInicial): {
    estado: EstadoWorkspace;
    materiales: Material[];
    params: CalcParams;
    // derivados
    input: LonaInput | BaquetonInput;
    hayCambiosSinGuardar: boolean;
    erroresVisibles: Record<string, string>;
    medidasSuficientes: boolean;
    pedidoRpsVisible: PedidoRps | null;
    origenRpsActivo: OrigenRps | null;
    estadoRpsVisible: EstadoConsultaRps;
    busy: boolean;
    // manejadores
    cambiarNumeroPedido: (valor: string) => void;
    cambiarClientePedido: (valor: string) => void;
    cambiarInput: (input: LonaInput | BaquetonInput) => void;
    seleccionarRegistro: (registro: PlanteamientoRecord) => void;
    nuevoElemento: (tipo: TipoPlanteamiento) => void;
    aplicarPedidoRps: (pedido: PedidoRps, linea: LineaPedidoRps) => void;
    abrirSelectorRps: () => void;
    reintentarRps: () => void;
    guardar: () => Promise<string | null>;
    previsualizarPdf: () => Promise<void>;
    generarPdf: () => Promise<void>;
    registrarSnapshot: (fn: () => string | null) => void;
  };
  ```

- [ ] **Step 1: Mover el cuerpo del componente al hook**

Crear `src/components/workspace/useWorkspace.ts` y trasladar allí, tal cual, todo lo que hoy hay en `Workspace.tsx` por encima del `return`: el `useReducer`, los hooks de la Task 4, los derivados de la Task 1, los refs, `validarYEnfocar`, `puedeCambiarElemento`, `aplicarPedidoRps`, `cambiarNumeroPedido`, `cambiarClientePedido`, `nuevoElemento`, `seleccionarRegistro`, `doGuardar`, `guardar`, `descargar`, `solicitarPdf`, `previsualizarPdf` y `generarPdf`. Terminar con el objeto de retorno de la firma de arriba.

No reescribir ninguna de esas funciones en este paso: es un traslado.

- [ ] **Step 2: Dejar `Workspace.tsx` solo con el render**

```tsx
"use client";
import { useWorkspace } from "@/components/workspace/useWorkspace";
import type { EntradaInicial } from "@/lib/workspace/estado";
// … resto de imports de componentes

export type WorkspaceInicial = EntradaInicial;

export function Workspace({ inicial }: { inicial?: WorkspaceInicial }) {
  const ws = useWorkspace(inicial);
  // El JSX actual (líneas 532-668) sin cambios, leyendo de `ws`.
}
```

`WorkspaceInicial` se mantiene exportado con ese nombre porque `src/app/planteamiento/page.tsx:1` lo importa.

- [ ] **Step 3: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 4: Comprobar el tamaño alcanzado**

Run: `pnpm exec wc -l src/components/workspace/Workspace.tsx src/components/workspace/useWorkspace.ts src/lib/workspace/*.ts`
Expected: `Workspace.tsx` por debajo de 200 líneas. Si se queda muy por encima, es que ha quedado lógica en el render que debería estar en el hook.

- [ ] **Step 5: Prueba manual del recorrido completo**

Arrancar con `pnpm dev` y recorrer, comprobando que **nada** se comporta distinto de antes del refactor:

1. Abrir `/planteamiento` e introducir un pedido que exista en RPS con **varias** líneas. Aparece el selector de líneas.
2. Aplicar una línea: los campos se rellenan y el aviso dice «Línea N de RPS aplicada…».
3. Introducir un pedido de **una sola** línea: se aplica solo, sin pasar por el selector.
4. Añadir un segundo elemento con «Añadir baquetón» y guardarlo. Aparece en la lista del pedido.
5. «Vista previa»: se abre una pestaña con el PDF y el aviso avisa de que no se ha archivado.
6. «Generar PDF»: se archiva o se descarga según la configuración del entorno.
7. Volver a `/historial`, buscar el pedido y pulsar «Abrir». Se recupera el elemento.
8. Editar un campo y pulsar en el enlace «Historial» del menú: aparece la confirmación de cambios sin guardar. Cancelar y comprobar que no navega.
9. Cambiar el número de pedido con cambios sin guardar: pide confirmación; al aceptar, la vista queda vacía y el cliente en blanco.
10. Guardar un elemento incompleto: el aviso pide revisar y el foco salta al primer campo con error.

Anotar cualquier diferencia respecto al comportamiento previo y corregirla antes de commitear.

- [ ] **Step 6: Commit**

```bash
git add src/components/workspace
git commit -m "refactor: Workspace queda como componente de render sobre useWorkspace"
```

---

## Estado final esperado

| Fichero | Líneas aprox. | Testeado |
|---|---|---|
| `src/lib/workspace/estado.ts` | 250 | Sí, 15 tests |
| `src/lib/workspace/selectores.ts` | 80 | Sí, 11 tests |
| `src/lib/pdf/orquestar-pdf.ts` | 90 | Sí, 5 tests |
| `src/components/workspace/useWorkspace.ts` | 220 | No (prueba manual) |
| `src/components/workspace/useConsultaRps.ts` | 70 | No (prueba manual) |
| `src/components/workspace/useRegistrosPedido.ts` | 35 | No (prueba manual) |
| `src/components/workspace/useAvisoSalida.ts` | 30 | No (prueba manual) |
| `src/components/workspace/useCatalogos.ts` | 30 | No (prueba manual) |
| `src/components/workspace/Workspace.tsx` | <200 | No (prueba manual) |
