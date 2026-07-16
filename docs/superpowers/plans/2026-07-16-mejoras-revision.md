# Mejoras de la revisión 2026-07-16 — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar las correcciones y mejoras acordadas tras la revisión: parámetros validados y completos, versión editable, PDF multi-remolque por pedido, historial robusto, dibujo técnico profesional y estilos unificados con tokens.

**Architecture:** La lógica de cálculo vive en `src/lib/calc` (pura, testeada con Vitest); la geometría del dibujo en `src/lib/geometry`; la persistencia detrás de `PlanteamientoStore` (FileStore en dev, MssqlStore en prod). El snapshot del dibujo pasa a guardarse como **SVG** en cada registro para poder componer un PDF con una página por remolque del mismo pedido; el cliente rasteriza a PNG antes de pedir PDF/Excel.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind 4 (`@theme`), @react-pdf/renderer, exceljs, mssql, Vitest.

## Global Constraints

- Idioma del código y UI: **español** (nombres, comentarios, textos), como el resto del repo.
- No añadir dependencias nuevas (validación a mano, sin zod).
- PDF y Excel se entregan con «Guardar como» en el cliente; **no** se escribe en disco/red del servidor (decisión confirmada por Iván 2026-07-16).
- El campo `ARCO` del PDF muestra el cliente: **es correcto** (paridad con el Excel histórico). No tocar.
- `USAR_COLUMNA_ATRAS` (P1) queda como está, pendiente de oficina técnica.
- Todo compacto: no aumentar paddings; los aumentos tipográficos son de 1px.
- Comprobar con `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` tras cada tarea.
- Commits frecuentes en español estilo repo (`feat:`, `fix:`, `refactor:`…).

## Estructura de ficheros

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `src/lib/calc/params.ts` | Modificar | + `ajusteContornoBase/Curva` en `CalcParams` y `DEFAULT_PARAMS`; + función `ajusteContorno()` |
| `src/lib/calc/validar-params.ts` | Crear | `normalizarParams` (lectura tolerante) y `validarParams` (estricta para PUT) |
| `src/lib/calc/lona.ts` | Modificar | usar `ajusteContorno(params, tipo)` |
| `src/lib/svg/rasterizar.ts` | Crear | util cliente SVG string → PNG dataURL |
| `src/lib/pdf/ruta-pdf.ts` | Modificar | `nombrePdf(pedido, versiones[])` (multi) |
| `src/lib/pdf/PlanteamientoPdf.tsx` | Modificar | acepta `paginas[]`, una `Page` por remolque |
| `src/lib/geometry/perfil.ts` | Modificar | + `perfilForma()` que devuelve `puntos` y `aristas` |
| `src/lib/store/types.ts` | Modificar | + `snapshotSvg`, − `pdfPath`, + filtro `pedido` |
| `src/lib/store/file-store.ts` | Modificar | filtro `pedido`, `getParams` normalizado |
| `src/lib/store/mssql-store.ts` | Modificar | columna `SnapshotSvg`, − `PdfPath`, filtro `pedido`, params normalizados |
| `db/schema.sql` | Modificar | ídem |
| `src/app/api/planteamientos/route.ts` | Modificar | filtro `pedido`, acepta `snapshotSvg` |
| `src/app/api/planteamientos/build-record.ts` | Modificar | guarda `snapshotSvg` |
| `src/app/api/parametros/route.ts` | Modificar | PUT validado (400 con errores) |
| `src/app/api/pdf/route.tsx` | Modificar | body `{ids, snapshots}` → PDF multipágina |
| `src/components/workspace/Workspace.tsx` | Modificar | snapshot SVG, guardado con svg, flujo PDF multi |
| `src/components/workspace/Escena3D.tsx` | Modificar | expone SVG, aristas de `perfilForma`, cotas ancladas, estilos inline, paleta unificada |
| `src/components/workspace/FormularioLona.tsx` | Modificar | campo Versión, `ajusteContorno()`, select Tipo ancho, tokens |
| `src/components/workspace/FormularioBaqueton.tsx` | Modificar | campo Versión, tokens |
| `src/components/workspace/campos.tsx` | Modificar | `Grupo` 4 columnas, tokens, `CampoNum` min 0 |
| `src/components/workspace/Resultados.tsx` | Modificar | tokens, tipografía +1px |
| `src/app/historial/page.tsx` | Modificar | estados carga/error, AbortController, tokens |
| `src/app/parametros/page.tsx` | Modificar | nuevos campos, catch de carga, errores del PUT, tokens |
| `src/app/page.tsx` | Modificar | redirect a `/planteamiento` |
| `src/app/globals.css` | Modificar | tokens `@theme`, borrar CSS de impresión muerto |
| `src/components/layout/AppShell.tsx`, `AppNav.tsx` | Modificar | tokens |
| `README.md` | Reescribir | descripción real del proyecto |

---

### Task 1: `ajusteContorno` en CalcParams

**Files:**
- Modify: `src/lib/calc/params.ts` (interfaz ya tiene los campos añadidos; falta DEFAULT_PARAMS y la función)
- Modify: `src/lib/calc/lona.ts:62`
- Modify: `src/components/workspace/FormularioLona.tsx:13`
- Test: `src/lib/calc/__tests__/params.test.ts`, `src/lib/calc/__tests__/lona.test.ts`

**Interfaces:**
- Produces: `ajusteContorno(params: CalcParams, tipo: TipoPerfil): number`; `DEFAULT_PARAMS.ajusteContornoBase = 7`, `DEFAULT_PARAMS.ajusteContornoCurva = 1.5`.

- [ ] **Step 1: Tests que fallan** — en `params.test.ts` (bloque "constantes de lona") añadir:

```ts
expect(DEFAULT_PARAMS.ajusteContornoBase).toBe(7);
expect(DEFAULT_PARAMS.ajusteContornoCurva).toBe(1.5);
```

y nuevo test en `lona.test.ts` (bloque variantes):

```ts
it("el ajuste de contorno sale de los parámetros", () => {
  const params = { ...DEFAULT_PARAMS, ajusteContornoBase: 9, ajusteContornoCurva: 2 };
  expect(calcLona({ ...base, tipoPerfil: "TIPO 01" }, params).ajusteContorno).toBe(9);
  expect(calcLona({ ...base, tipoPerfil: "TIPO 05" }, params).ajusteContorno).toBe(11);
});
```

- [ ] **Step 2: Verificar fallo** — `pnpm vitest run src/lib/calc` → FAIL (propiedad inexistente / 7 ≠ 9).
- [ ] **Step 3: Implementación** — en `params.ts`, dentro de `DEFAULT_PARAMS` tras `demasiaLonaHecha: 1,`:

```ts
  ajusteContornoBase: 7,
  ajusteContornoCurva: 1.5,
```

y tras `perfilTieneCurva`:

```ts
/** Suma de bastillas (y demasía de curva si procede) sobre el contorno real. */
export function ajusteContorno(params: CalcParams, tipo: TipoPerfil): number {
  return params.ajusteContornoBase + (perfilTieneCurva(tipo) ? params.ajusteContornoCurva : 0);
}
```

En `lona.ts` sustituir `const ajusteContorno = 7 + (perfilTieneCurva(input.tipoPerfil) ? 1.5 : 0);` por:

```ts
const ajuste = ajusteContorno(params, input.tipoPerfil);
```

(renombrar los usos locales `ajusteContorno` → `ajuste`; el campo del resultado sigue siendo `ajusteContorno: ajuste`). Importar `ajusteContorno` y quitar `perfilTieneCurva` si queda sin uso.

En `FormularioLona.tsx` sustituir las líneas 13-15 por:

```ts
const ajuste = ajusteContorno(params ?? DEFAULT_PARAMS, input.tipoPerfil);
const contornoVisible = input.contorno ?? Math.max((input.contornoScad ?? 0) - ajuste, 0);
```

- [ ] **Step 4: Verificar** — `pnpm vitest run` → PASS; `pnpm exec tsc --noEmit` limpio.
- [ ] **Step 5: Commit** — `git commit -m "refactor: ajuste de contorno configurable en parámetros"`

### Task 2: Validación y normalización de parámetros

**Files:**
- Create: `src/lib/calc/validar-params.ts`
- Test: `src/lib/calc/__tests__/validar-params.test.ts`
- Modify: `src/lib/store/file-store.ts:57-61`, `src/lib/store/mssql-store.ts:99-103`, `src/app/api/parametros/route.ts`, `src/app/parametros/page.tsx`

**Interfaces:**
- Produces: `normalizarParams(bruto: unknown): CalcParams` (rellena huecos con DEFAULT_PARAMS; para lecturas), `validarParams(bruto: unknown): { ok: true; params: CalcParams } | { ok: false; errores: string[] }` (para el PUT).

- [ ] **Step 1: Test que falla** — `validar-params.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { normalizarParams, validarParams } from "@/lib/calc/validar-params";

describe("normalizarParams", () => {
  it("rellena campos ausentes con los valores por defecto", () => {
    const p = normalizarParams({ demasiaAlto: 5 });
    expect(p.demasiaAlto).toBe(5);
    expect(p.ajusteContornoBase).toBe(7);
    expect(p.recogidas).toEqual(DEFAULT_PARAMS.recogidas);
  });
  it("con null devuelve los valores por defecto", () => {
    expect(normalizarParams(null)).toEqual(DEFAULT_PARAMS);
  });
});

describe("validarParams", () => {
  it("acepta los parámetros por defecto", () => {
    expect(validarParams(DEFAULT_PARAMS)).toEqual({ ok: true, params: DEFAULT_PARAMS });
  });
  it("rechaza números no finitos o ausentes", () => {
    const res = validarParams({ ...DEFAULT_PARAMS, demasiaAlto: "4,5" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errores.join(" ")).toContain("demasiaAlto");
  });
  it("rechaza paso de ollaos no positivo", () => {
    expect(validarParams({ ...DEFAULT_PARAMS, pasoOllaosDefecto: 0 }).ok).toBe(false);
  });
  it("exige la recogida NO y el cliente GENERAL", () => {
    expect(validarParams({ ...DEFAULT_PARAMS, recogidas: DEFAULT_PARAMS.recogidas.slice(1) }).ok).toBe(false);
    expect(validarParams({ ...DEFAULT_PARAMS, clientesBaqueton: [] }).ok).toBe(false);
  });
  it("rechaza recogidas con demasías no numéricas", () => {
    const rotas = [{ ...DEFAULT_PARAMS.recogidas[0], delante: null }];
    expect(validarParams({ ...DEFAULT_PARAMS, recogidas: rotas }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Verificar fallo** — módulo inexistente.
- [ ] **Step 3: Implementar** `validar-params.ts`:

```ts
import { DEFAULT_PARAMS, type CalcParams, type ClienteBaqueton, type Recogida } from "@/lib/calc/params";

const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const CAMPOS_NUMERICOS = [
  "demasiaAlto", "demasiaContornoNormal", "demasiaContornoEnfundar", "demasiaLonaHecha",
  "ajusteContornoBase", "ajusteContornoCurva", "pasoOllaosDefecto", "primerOllao",
  "maxPosicionesOllaos", "baquetonDemasiaLargoCostura", "baquetonDemasiaAnchoCostura",
  "baquetonDemasiaCostura", "baquetonDemasiaFinal",
] as const;

/** Lectura tolerante: completa con DEFAULT_PARAMS lo que falte en datos guardados antiguos. */
export function normalizarParams(bruto: unknown): CalcParams {
  const p = (typeof bruto === "object" && bruto !== null ? bruto : {}) as Record<string, unknown>;
  const resultado = { ...DEFAULT_PARAMS } as CalcParams & Record<string, unknown>;
  for (const campo of CAMPOS_NUMERICOS) if (esNumero(p[campo])) resultado[campo] = p[campo];
  if (Array.isArray(p.recogidas) && p.recogidas.length > 0) resultado.recogidas = p.recogidas as Recogida[];
  if (Array.isArray(p.clientesBaqueton) && p.clientesBaqueton.length > 0) {
    resultado.clientesBaqueton = p.clientesBaqueton as ClienteBaqueton[];
  }
  return resultado;
}

/** Validación estricta antes de persistir: todo presente, numérico y coherente. */
export function validarParams(
  bruto: unknown,
): { ok: true; params: CalcParams } | { ok: false; errores: string[] } {
  if (typeof bruto !== "object" || bruto === null) {
    return { ok: false, errores: ["El cuerpo debe ser un objeto de parámetros"] };
  }
  const p = bruto as Record<string, unknown>;
  const errores: string[] = [];
  for (const campo of CAMPOS_NUMERICOS) {
    if (!esNumero(p[campo])) errores.push(`«${campo}» debe ser un número`);
  }
  if (esNumero(p.pasoOllaosDefecto) && p.pasoOllaosDefecto <= 0) {
    errores.push("«pasoOllaosDefecto» debe ser mayor que 0");
  }
  if (esNumero(p.maxPosicionesOllaos) && p.maxPosicionesOllaos < 1) {
    errores.push("«maxPosicionesOllaos» debe ser al menos 1");
  }
  const recogidas = p.recogidas;
  if (!Array.isArray(recogidas) || recogidas.length === 0) {
    errores.push("«recogidas» debe tener al menos una entrada");
  } else {
    if (!recogidas.some((r) => (r as Recogida)?.nombre === "NO")) {
      errores.push("«recogidas» debe incluir la entrada «NO» (es el fallback)");
    }
    recogidas.forEach((r, i) => {
      const rec = r as Partial<Recogida>;
      if (typeof rec?.nombre !== "string" || rec.nombre.trim() === "") {
        errores.push(`recogida ${i + 1}: falta el nombre`);
      }
      for (const campo of ["delante", "atras", "lateralSoloAtras", "lateralSoloDelante"] as const) {
        if (!esNumero(rec?.[campo])) errores.push(`recogida «${rec?.nombre ?? i + 1}»: «${campo}» debe ser un número`);
      }
    });
  }
  const clientes = p.clientesBaqueton;
  if (!Array.isArray(clientes) || clientes.length === 0) {
    errores.push("«clientesBaqueton» debe tener al menos una entrada");
  } else if (!clientes.some((c) => (c as ClienteBaqueton)?.nombre === "GENERAL")) {
    errores.push("«clientesBaqueton» debe incluir la entrada «GENERAL» (es el fallback)");
  }
  return errores.length > 0 ? { ok: false, errores } : { ok: true, params: bruto as CalcParams };
}
```

- [ ] **Step 4: Cablear lecturas y PUT.**
  - `file-store.ts` `getParams`: `return normalizarParams(JSON.parse(readFileSync(f, "utf8")));`
  - `mssql-store.ts` `getParams`: `return res.recordset[0] ? normalizarParams(JSON.parse(res.recordset[0].ParamsJson)) : DEFAULT_PARAMS;`
  - `api/parametros/route.ts` PUT:

```ts
export async function PUT(req: NextRequest) {
  let bruto: unknown;
  try { bruto = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }
  const res = validarParams(bruto);
  if (!res.ok) return NextResponse.json({ error: res.errores.join(" · ") }, { status: 400 });
  await getStore().saveParams(res.params);
  return NextResponse.json(res.params);
}
```

  - `parametros/page.tsx`: `useEffect` con `.catch(() => setAviso("No se pudieron cargar los parámetros."))`; `guardar()` lee `(await res.json()).error` cuando `!res.ok` y lo muestra en `aviso` (en rojo si error: `text-red-700` cuando `!res.ok`); añadir dos `CampoNum` en "Constantes de lona": `Contorno: bastillas` → `ajusteContornoBase`, `Contorno: extra curva` → `ajusteContornoCurva`.
- [ ] **Step 5: Verificar** — `pnpm vitest run` PASS, tsc limpio.
- [ ] **Step 6: Commit** — `git commit -m "feat: valida y normaliza los parámetros de cálculo"`

### Task 3: Campo Versión editable

**Files:**
- Modify: `src/components/workspace/campos.tsx` (`Grupo` acepta `columnas 2|3|4`)
- Modify: `src/components/workspace/FormularioLona.tsx`, `FormularioBaqueton.tsx`

**Interfaces:**
- Consumes: `cabecera.version` ya existe en `CabeceraInput` (default "10" en `entradas-vacias.ts`, no cambiar).

- [ ] **Step 1:** `Grupo`: tipo `columnas?: 2 | 3 | 4` y clase `columnas === 4 ? "grid-cols-4" : columnas === 3 ? "grid-cols-3" : "grid-cols-2"`.
- [ ] **Step 2:** En ambos formularios, grupo Pedido con `columnas={4}`:

```tsx
<Grupo titulo="Pedido" columnas={4} compacto>
  <CampoTexto label="Nº pedido" value={input.cabecera.numeroPedido} onChange={(v) => setCab("numeroPedido", v)} />
  <CampoTexto label="Versión" value={input.cabecera.version} onChange={(v) => setCab("version", v)} />
  <CampoTexto label="O.F." value={input.cabecera.ordenFabricacion ?? ""} onChange={(v) => setCab("ordenFabricacion", v)} />
  <CampoTexto label="Realizado por" value={input.cabecera.realizadoPor} onChange={(v) => setCab("realizadoPor", v)} />
  <CampoTexto label="Cliente" span={3} value={input.cabecera.cliente} onChange={(v) => setCab("cliente", v)} />
  <CampoTexto label="Revisión" value={input.cabecera.revision} onChange={(v) => setCab("revision", v)} />
</Grupo>
```

(`columna()` en campos.tsx ya devuelve `col-span-3` para span 3.)
- [ ] **Step 3:** Verificar en dev que el grupo queda en 2 filas compactas. `pnpm exec tsc --noEmit`.
- [ ] **Step 4: Commit** — `git commit -m "feat: versión del planteamiento editable"`

### Task 4: Snapshot SVG persistido + PDF multi-remolque

**Files:**
- Create: `src/lib/svg/rasterizar.ts`
- Modify: `src/lib/store/types.ts`, `file-store.ts`, `mssql-store.ts`, `db/schema.sql`
- Modify: `src/app/api/planteamientos/build-record.ts`, `route.ts`
- Modify: `src/lib/pdf/ruta-pdf.ts`, `PlanteamientoPdf.tsx`, `src/app/api/pdf/route.tsx`
- Modify: `src/components/workspace/Escena3D.tsx` (snapshot→SVG), `Workspace.tsx`
- Test: `src/lib/pdf/__tests__/ruta-pdf.test.ts`, `src/lib/store/__tests__/file-store.test.ts`, `src/lib/store/__tests__/api-payload.test.ts`

**Interfaces:**
- Produces:
  - `PlanteamientoRecord.snapshotSvg?: string | null`; `ListadoFiltro.pedido?: string` (igualdad exacta).
  - `rasterizarSvg(svg: string, ancho?: number, alto?: number): Promise<string | null>` (PNG dataURL, solo cliente).
  - `nombrePdf(numeroPedido: string, versiones: string[]): string` — 1 versión → `PEDIDO-VER.pdf`; varias → `PEDIDO.pdf`.
  - `PlanteamientoPdf({ paginas, logoTgm })` con `paginas: Array<{ rec: PlanteamientoRecord; png: string | null }>`.
  - `POST /api/pdf` body `{ ids: string[]; snapshots?: Record<string, string | null> }`.
  - `POST /api/planteamientos` body `{ id?, tipo, input, snapshotSvg? }`.
  - `Escena3DProps.onSnapshotReady?: (getSvg: (() => string | null) | null) => void` (devuelve el SVG serializado, ya no PNG).

- [ ] **Step 1: Test de nombre multi** — reescribir `ruta-pdf.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";

describe("nombrePdf", () => {
  it("una versión: PEDIDO-VERSION.pdf", () => {
    expect(nombrePdf("AR.26.02796", ["10"])).toBe("AR.26.02796-10.pdf");
  });
  it("varias versiones: un solo PDF por pedido", () => {
    expect(nombrePdf("AR.26.02796", ["10", "11"])).toBe("AR.26.02796.pdf");
  });
  it("sanea caracteres inválidos en Windows", () => {
    expect(nombrePdf("AR/26:02796", ["1*"])).toBe("AR_26_02796-1_.pdf");
  });
  it("sin pedido usa SIN-PEDIDO", () => {
    expect(nombrePdf("", ["10"])).toBe("SIN-PEDIDO-10.pdf");
  });
});
```

- [ ] **Step 2: Verificar fallo** y **Step 3: implementar** `ruta-pdf.ts`:

```ts
const INVALIDOS = /[<>:"/\\|?*]/g;
const limpiar = (s: string) => s.replace(INVALIDOS, "_");

/** Con una versión mantiene el sufijo -10 histórico; con varias, un único PDF por pedido. */
export function nombrePdf(numeroPedido: string, versiones: string[]): string {
  const pedido = limpiar(numeroPedido || "SIN-PEDIDO");
  if (versiones.length === 1) return `${pedido}-${limpiar(versiones[0])}.pdf`;
  return `${pedido}.pdf`;
}
```

- [ ] **Step 4: Tipos y stores.**
  - `types.ts`: en `PlanteamientoRecord` sustituir `pdfPath: string | null;` por `snapshotSvg?: string | null;`; `ListadoFiltro` → `{ texto?: string; tipo?: TipoPlanteamiento; pedido?: string; limit?: number }`.
  - `file-store.ts` `list`: tras el filtro de tipo añadir `if (filtro?.pedido) recs = recs.filter((r) => r.numeroPedido === filtro.pedido);`
  - `mssql-store.ts`: `rowToRecord` → `snapshotSvg: row.SnapshotSvg ?? null` (quitar `pdfPath`); `list` añade `.input("pedido", sql.VarChar, filtro?.pedido ?? null)` y `AND (@pedido IS NULL OR NumeroPedido = @pedido)`; `save` sustituye el input `pdf` por `.input("snapshotSvg", sql.NVarChar, rec.snapshotSvg ?? null)` y en el MERGE `PdfPath=@pdf` → `SnapshotSvg=@snapshotSvg` (UPDATE e INSERT).
  - `schema.sql`: `PdfPath NVARCHAR(500) NULL,` → `SnapshotSvg NVARCHAR(MAX) NULL,`.
  - `build-record.ts`: firma `buildRecord(tipo, input, params, id?, snapshotSvg?: string | null)` y en `base(...)` `pdfPath: null` → `snapshotSvg: snapshotSvg ?? null` (pasar el parámetro por `base`).
  - Actualizar fixtures: `file-store.test.ts:23` y `mssql-store.test.ts:9` (`pdfPath/PdfPath` → `snapshotSvg/SnapshotSvg`).
- [ ] **Step 5: API planteamientos** — POST: `const { id, tipo, input, snapshotSvg } = await req.json();` → `buildRecord(tipo, input, params, id, snapshotSvg ?? null)`. GET: añadir `pedido: searchParams.get("pedido") ?? undefined` al filtro.
- [ ] **Step 6: Rasterizador** `src/lib/svg/rasterizar.ts`:

```ts
/** Convierte un SVG serializado en PNG dataURL usando canvas. Solo en navegador. */
export async function rasterizarSvg(svg: string, ancho = 1520, alto = 880): Promise<string | null> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const imagen = new Image();
    imagen.src = url;
    await imagen.decode();
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(imagen, 0, 0, ancho, alto);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 7: Escena3D expone SVG.** Cambiar tipo de prop y efecto (sustituye al bloque canvas actual, líneas 224-249):

```ts
onSnapshotReady?: (getSvg: (() => string | null) | null) => void;
```

```ts
useEffect(() => {
  if (!onSnapshotReady) return;
  onSnapshotReady(() => {
    const svg = svgRef.current;
    return svg ? new XMLSerializer().serializeToString(svg) : null;
  });
  return () => onSnapshotReady(null);
}, [onSnapshotReady]);
```

El `<svg>` necesita tamaño intrínseco y fondo para el raster: añadir `width={760} height={440}` como atributos (la clase CSS sigue mandando en pantalla). (Los estilos inline del dibujo llegan en Task 7.)
- [ ] **Step 8: Workspace.** `snapshotRef` pasa a `useRef<(() => string | null) | null>(null)`.
  - `doGuardar`: body `JSON.stringify({ id, tipo, input, snapshotSvg: snapshotRef.current?.() ?? null })`.
  - `generarExcel`: rasteriza el SVG actual → `const png = await rasterizarSvg(snapshotRef.current?.() ?? "")`; body `{ id: savedId, snapshot: png }` (el API de Excel no cambia).
  - `generarPdf` (sustituye el cuerpo actual):

```ts
async function generarPdf() {
  if (busy) return;
  setAccion("pdf");
  try {
    const savedId = await doGuardar();
    if (!savedId) return;
    const pedido = input.cabecera.numeroPedido.trim();
    let registros: PlanteamientoRecord[] = [];
    if (pedido) {
      registros = await fetch(`/api/planteamientos?pedido=${encodeURIComponent(pedido)}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
    }
    // Una página por versión del pedido: nos quedamos con el registro más reciente de cada una.
    const porVersion = new Map<string, PlanteamientoRecord>();
    for (const r of registros) {
      const previo = porVersion.get(r.version);
      if (!previo || r.updatedAt > previo.updatedAt) porVersion.set(r.version, r);
    }
    const paginas = [...porVersion.values()]
      .sort((a, b) => a.version.localeCompare(b.version, "es", { numeric: true }));
    const ids = paginas.length > 0 ? paginas.map((r) => r.id) : [savedId];
    const snapshots: Record<string, string | null> = {};
    for (const r of paginas) {
      snapshots[r.id] = r.snapshotSvg ? await rasterizarSvg(r.snapshotSvg) : null;
    }
    if (!(savedId in snapshots)) {
      snapshots[savedId] = await rasterizarSvg(snapshotRef.current?.() ?? "");
    }
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, snapshots }),
    });
    if (!res.ok) {
      setAviso(`Error al generar PDF: ${res.status}`);
      return;
    }
    const nombre = res.headers.get("X-Nombre-Pdf") ?? "planteamiento.pdf";
    await guardarComo(await res.blob(), nombre, "PDF", "application/pdf", ".pdf");
  } catch {
    setAviso("Error de red al generar PDF");
  } finally {
    setAccion(null);
  }
}
```

  (importar `rasterizarSvg` y `type PlanteamientoRecord`).
- [ ] **Step 9: PlanteamientoPdf multipágina.** Extraer el contenido actual de la página a `function PaginaPlanteamiento({ rec, png, logoTgm })` y:

```tsx
export function PlanteamientoPdf({ paginas, logoTgm }: {
  paginas: Array<{ rec: PlanteamientoRecord; png: string | null }>;
  logoTgm?: string | null;
}) {
  return (
    <Document>
      {paginas.map(({ rec, png }) => (
        <Page key={rec.id} size="A4" orientation="landscape" style={s.page}>
          {/* …contenido actual con rec/png… */}
        </Page>
      ))}
    </Document>
  );
}
```

  En la banda central, mostrar la versión: `<Text style={s.bandaTexto}>REMOLQUES · VERSIÓN {rec.version || "10"}</Text>` para distinguir páginas.
- [ ] **Step 10: /api/pdf** (reescribir):

```tsx
export async function POST(req: NextRequest) {
  let ids: string[];
  let snapshots: Record<string, string | null>;
  try {
    const body = await req.json();
    ids = Array.isArray(body.ids) ? body.ids : [];
    snapshots = body.snapshots ?? {};
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }
  const store = getStore();
  const recs = (await Promise.all(ids.map((id) => store.get(id))))
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (recs.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const doc = (
    <PlanteamientoPdf
      paginas={recs.map((rec) => ({ rec, png: snapshots[rec.id] ?? null }))}
      logoTgm={getLogoTgmDataUri()}
    />
  );
  try {
    const buffer = await renderToBuffer(doc);
    const nombre = nombrePdf(recs[0].numeroPedido, recs.map((r) => r.version));
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf", "X-Nombre-Pdf": nombre },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo generar el PDF: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 11: Verificar** — `pnpm vitest run`, tsc, lint. Prueba manual en dev: guardar dos versiones (10 y 11) del mismo pedido y generar PDF → 2 páginas, nombre `PEDIDO.pdf`.
- [ ] **Step 12: Commit** — `git commit -m "feat: PDF único por pedido con una página por remolque"`

### Task 5: Historial robusto

**Files:** Modify: `src/app/historial/page.tsx`

- [ ] **Step 1:** Estado y efecto:

```tsx
const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");

useEffect(() => {
  const ctrl = new AbortController();
  setEstado("cargando");
  const t = setTimeout(() => {
    fetch(`/api/planteamientos?texto=${encodeURIComponent(texto)}`, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((datos) => { setItems(datos); setEstado("ok"); })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setItems([]);
        setEstado("error");
      });
  }, 200);
  return () => { clearTimeout(t); ctrl.abort(); };
}, [texto]);
```

  Fila vacía: `estado === "cargando" ? "Cargando…" : estado === "error" ? "No se pudo cargar el historial" : "Sin resultados"`.
- [ ] **Step 2:** Verificar en dev (buscar rápido tecleando; sin parpadeos de "Sin resultados"). tsc + lint.
- [ ] **Step 3: Commit** — `git commit -m "fix: historial con estado de carga y sin carreras"`

### Task 6: Hydration mismatch

**Files:** por determinar por la investigación (candidatos: `Workspace.tsx`, `campos.tsx`, `Escena3D.tsx`).

- [ ] **Step 1:** `pnpm dev` en background (SIN tuberías tipo `| head`, bloquean el proceso) y capturar la consola del navegador:

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless --disable-gpu \
  --enable-logging=stderr --v=0 --timeout=15000 --screenshot=/tmp/x.png \
  "http://localhost:3001/planteamiento" 2>&1 | grep -iA 40 "hydrat"
```

- [ ] **Step 2:** Leer el diff del aviso (React 19 imprime el atributo exacto). Corregir la causa raíz (no suprimir con `suppressHydrationWarning` salvo que sea una fecha legítimamente variable).
- [ ] **Step 3:** Repetir la captura → sin avisos. Commit `fix: elimina el aviso de hidratación en planteamiento`.

### Task 7: Aristas desde perfil.ts

**Files:**
- Modify: `src/lib/geometry/perfil.ts`, `src/components/workspace/Escena3D.tsx:167-175`
- Test: `src/lib/geometry/__tests__/perfil.test.ts`

**Interfaces:**
- Produces: `perfilForma(tipo, opts): { puntos: Pt[]; aristas: number[] }` — `aristas` = índices de los vértices que generan arista longitudinal visible (excluye las bases). `perfilPuntos` se mantiene como envoltorio.

- [ ] **Step 1: Test que falla** (añadir a `perfil.test.ts`):

```ts
import { perfilForma, perfilPuntos } from "@/lib/geometry/perfil";

it("expone las aristas longitudinales de cada perfil", () => {
  const opts = { ancho: 150, altoDelante: 100, alturaPico: 10, chaflan: 12, radio: 12 };
  for (const tipo of ["TIPO 01", "TIPO 02", "TIPO 03", "TIPO 04", "TIPO 05"] as const) {
    const { puntos, aristas } = perfilForma(tipo, opts);
    expect(puntos).toEqual(perfilPuntos(tipo, opts));
    expect(aristas.length).toBeGreaterThanOrEqual(2);
    for (const i of aristas) {
      expect(i).toBeGreaterThan(0);
      expect(i).toBeLessThan(puntos.length - 1);
    }
  }
  expect(perfilForma("TIPO 01", opts).aristas).toEqual([1, 2]);
  expect(perfilForma("TIPO 04", opts).aristas).toEqual([1, 2, 3, 4]);
  // TIPO 05: hombros = tangentes de los dos arcos
  const t5 = perfilForma("TIPO 05", opts);
  expect(t5.puntos[t5.aristas[1]][1]).toBe(100); // fin del arco izquierdo, a altura h
  expect(t5.puntos[t5.aristas[2]][1]).toBe(100); // inicio del arco derecho
});
```

- [ ] **Step 2: Verificar fallo.**
- [ ] **Step 3: Implementar** — reescribir `perfilPuntos` como `perfilForma` construyendo los índices durante la construcción (nada de números mágicos aguas abajo):

```ts
export interface PerfilForma { puntos: Pt[]; aristas: number[] }

export function perfilForma(tipo: TipoPerfil, opts: PerfilOpts): PerfilForma {
  const w = opts.ancho;
  const h = opts.altoDelante;
  const pico = Math.min(Math.max(opts.alturaPico ?? w * 0.12, 0), h);
  const ch = Math.min(opts.chaflan ?? 15, w / 2, h);
  const r = Math.min(opts.radio ?? 15, w / 2, h);

  switch (tipo) {
    case "TIPO 01":
      return { puntos: [[0, 0], [0, h], [w, h], [w, 0]], aristas: [1, 2] };
    case "TIPO 02":
      return { puntos: [[0, 0], [0, h - pico], [w / 2, h], [w, h - pico], [w, 0]], aristas: [1, 2, 3] };
    case "TIPO 03": {
      if (pico === 0) return { puntos: [[0, 0], [0, h], [w, h], [w, 0]], aristas: [1, 2] };
      const sub = Math.min(r, pico, w / 4);
      const hombro = h - pico;
      const puntos: Pt[] = [
        [0, 0], [0, Math.max(0, hombro - sub)],
        [sub * 0.3, hombro - sub * 0.3], [sub, hombro],
        [w / 2 - sub, h - sub * 0.3], [w / 2, h],
        [w / 2 + sub, h - sub * 0.3], [w - sub, hombro],
        [w - sub * 0.3, hombro - sub * 0.3], [w, Math.max(0, hombro - sub)],
        [w, 0],
      ];
      return { puntos, aristas: [1, 5, puntos.length - 2] };
    }
    case "TIPO 04":
      return {
        puntos: [[0, 0], [0, h - ch], [ch, h], [w - ch, h], [w, h - ch], [w, 0]],
        aristas: [1, 2, 3, 4],
      };
    case "TIPO 05": {
      const subida: Pt[] = [[0, 0], [0, h - r]];
      const arcoIzq = arco(r, h - r, r, Math.PI, Math.PI / 2, 8).slice(1);
      const arcoDer = arco(w - r, h - r, r, Math.PI / 2, 0, 8);
      const puntos: Pt[] = [...subida, ...arcoIzq, ...arcoDer, [w, 0]];
      const finArcoIzq = subida.length + arcoIzq.length - 1;
      return { puntos, aristas: [1, finArcoIzq, finArcoIzq + 1, puntos.length - 2] };
    }
  }
}

export function perfilPuntos(tipo: TipoPerfil, opts: PerfilOpts): Pt[] {
  return perfilForma(tipo, opts).puntos;
}
```

- [ ] **Step 4:** En `Escena3D.tsx` usar `perfilForma(perfil, opts(altoDelante))` y sustituir todo el ternario `indicesAristas` por `forma.aristas`. (El TIPO 03 con aguas usaba `indicePicoFrente` — coincide con el índice 5 = `aristas[1]`; conservar `indicePicoFrente` solo para la cumbrera/cotas.)
- [ ] **Step 5:** `pnpm vitest run` PASS + revisión visual en dev de los 5 tipos.
- [ ] **Step 6: Commit** — `git commit -m "refactor: el perfil declara sus aristas longitudinales"`

### Task 8: Dibujo técnico profesional

**Files:** Modify: `src/components/workspace/Escena3D.tsx`

Cambios concretos (todo dentro del `<svg>`; ningún `className` de Tailwind dentro del SVG para que el raster sea fiel):

- [ ] **Step 1: Estilos inline.** En `Cota`: quitar `className="text-slate-600"`; línea `stroke="#64748b"`, texto `fill="#334155"`, y `fontFamily={FUENTE}` con `const FUENTE = "'Plus Jakarta Sans','Segoe UI',Arial,sans-serif";` aplicado a **todos** los `<text>` del SVG. Marker `#cota` fill `#64748b`. Mantener el halo blanco (`stroke #fff`, `paintOrder stroke`).
- [ ] **Step 2: ALTO TRAS. como cota real** (sustituye al `<text x="592" y="105">`): cota vertical anclada a la arista trasera derecha, solo si `altoAtras !== altoDelante`:

```tsx
{props.modo === "lona" && altoAtras !== altoDelante && (
  <g>
    <line x1={dibujo.fondo.at(-1)!.x + 6} y1={dibujo.fondo.at(-1)!.y} x2={dibujo.altoTrasDesde.x + 7} y2={dibujo.fondo.at(-1)!.y} stroke="#94a3b8" />
    <line x1={dibujo.fondo.at(-2)!.x + 6} y1={dibujo.fondo.at(-2)!.y} x2={dibujo.altoTrasDesde.x + 7} y2={dibujo.fondo.at(-2)!.y} stroke="#94a3b8" />
    <Cota desde={dibujo.altoTrasDesde} hasta={dibujo.altoTrasHasta}
      texto={`ALTO TRAS. ${fmt(altoAtras)}`} rotacion={-90} textoDy={-9} />
  </g>
)}
```

  con, en el `useMemo` del dibujo:

```ts
altoTrasDesde: { x: fondo.at(-1)!.x + 30, y: fondo.at(-1)!.y },
altoTrasHasta: { x: fondo.at(-1)!.x + 30, y: fondo.at(-2)!.y },
```

- [ ] **Step 3: Cota AGUAS sin pisar la cubierta.** `xCotaAguas = frente.at(-1)!.x + 30` y en la `<Cota>` de aguas `textoDx={12} textoDy={0}` (probar visualmente; el texto debe quedar a la derecha de la línea, fuera del faldón). Si el largo de la cota es < 26 px (aguas pequeñas), dibujar el texto encima del extremo superior (`textoDy=-10`, sin rotación).
- [ ] **Step 4: viewBox más ancho si hace falta.** Con las cotas traseras a la derecha, ampliar `viewBox` a `0 0 780 440` y `canvas` del raster a 1560×880 (en `rasterizarSvg` los defaults; mantener proporción con `width={780} height={440}`).
- [ ] **Step 5: Paleta del lienzo unificada** (deja de ser "slate ajeno"): gradiente `lienzo` con paradas `#fcfdfc → #f4f8f6 → #ecf2ef`; rectángulo interior `stroke="#ffffff"`; contorno frontal `#122d32`; aristas `#4c6468`; coronación/borde trasero `#7d9297`; resalte de baquetón `#d3a024`; ventana `#0f766e`. La tarjeta contenedora pasa a tokens en Task 9 (border-line, sombra suave).
- [ ] **Step 6:** Revisión visual en dev de TIPO 01–05, con/sin aguas, alto atrás distinto, ventana y baquetón; capturas como en la revisión. Verificar también un PDF: el dibujo debe verse idéntico a pantalla (fuente y colores).
- [ ] **Step 7: Commit** — `git commit -m "feat: cotas ancladas y estilos propios en el dibujo técnico"`

### Task 9: Tokens de tema y unificación visual

**Files:** Modify: `src/app/globals.css`, y sweep de: `AppShell.tsx`, `AppNav.tsx`, `campos.tsx`, `FormularioLona.tsx`, `FormularioBaqueton.tsx`, `Workspace.tsx`, `Resultados.tsx`, `Escena3D.tsx` (contenedor), `historial/page.tsx`, `parametros/page.tsx`, `planteamiento/page.tsx`, `page.tsx`.

- [ ] **Step 1: Tokens** — `globals.css` (sustituye `:root`/`@theme` actuales):

```css
:root {
  --background: #edf2f0;
  --foreground: #102a2f;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: #fbfcfb;      /* tarjetas */
  --color-surface-2: #f5f8f7;    /* fondos suaves */
  --color-surface-3: #e5ece9;    /* cabeceras de tabla, pastillas */
  --color-line: #d4dfdb;         /* bordes */
  --color-line-2: #c9d8d3;       /* bordes marcados */
  --color-ink: #102a2f;          /* texto principal */
  --color-ink-2: #38575c;        /* texto secundario fuerte */
  --color-muted: #587278;        /* etiquetas */
  --color-muted-2: #71878a;      /* pistas */
  --color-deep: #0d2c31;         /* botón primario */
  --color-deep-2: #173a40;       /* hover primario */
  --color-nav: #0b2328;          /* sidebar */
  --color-gold: #d3a024;         /* acento TGM */
  --color-gold-2: #a7760b;       /* acento sobre claro */
  --font-sans: var(--font-jakarta), "Avenir Next", "Segoe UI Variable", sans-serif;
  --font-mono: "Cascadia Mono", Consolas, monospace;
}
```

- [ ] **Step 2: Sweep mecánico** de hex → token en los `className` (tabla de equivalencias; los tonos cercanos se consolidan):

| Hex actuales | Token |
|---|---|
| `#fbfcfb`, `#fcfdfc` | `surface` |
| `#f5f8f7`, `#f8faf9`, `#f3f7f5` | `surface-2` |
| `#e5ece9`, `#e8eeec`, `#edf2f0`, `#eef3f1`, `#dfe8e5` | `surface-3` |
| `#d4dfdb`, `#d3dfdb`, `#d5dfdc`, `#d0ddd8`, `#dbe4e1`, `#d1ddda`, `#cfdbd7`, `#e1e8e5`, `#e5ebe9` | `line` |
| `#c9d8d3`, `#c7d5d0`, `#b6c9c3`, `#b8cbc5`, `#9fb8b0` | `line-2` |
| `#102a2f`, `#122d32`, `#10272b`, `#17383e`, `#16353b` | `ink` |
| `#294b51`, `#31545a`, `#38575c`, `#3f5d62`, `#425f64` | `ink-2` |
| `#536d72`, `#587278`, `#587075`, `#60777b`, `#668084`, `#6d8286` | `muted` |
| `#71878a`, `#789094`, `#799094`, `#94a3b8` (fuera del SVG) | `muted-2` |
| `#0d2c31`, `#0c272c` | `deep` · `#173a40` → `deep-2` · `#0b2328` → `nav` |
| `#d3a024`, `#c59420`, `#c99821`, `#e2b232` | `gold` |
| `#a7760b`, `#8a6410`, `#76540a` | `gold-2` |
| `#f8edcd`/`#e7ce89` (pastilla stock) | `gold/15` fondo, `gold/40` ring, texto `gold-2` |

  Ejemplo (`campos.tsx` línea `control`):

```ts
const control = "min-h-8 rounded-lg border border-line bg-surface px-2.5 py-1 text-sm font-semibold text-ink shadow-[0_1px_2px_rgb(13_42_47/0.045)] transition-[border-color,box-shadow,background-color] hover:border-line-2 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/15";
```

  Mantener las sombras suaves y gradientes existentes (look "Apple moderno, no plano"): no eliminar `shadow-*`, `backdrop-blur`, ni el gradiente del `AppShell`.
- [ ] **Step 3: Home → redirect.** `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/planteamiento");
}
```

- [ ] **Step 4: Tipografía +1px manteniendo lo compacto** (solo tamaños, no paddings):
  - `Resultados.tsx` `Dato`: etiqueta `text-[8px]` → `text-[9px]`, valor `text-[11px]` → `text-[12px]`; nombres de fila `text-[9px]` → `text-[10px]`.
  - `campos.tsx` `CampoMaterial` pista compacta `text-[9px]` → `text-[10px]`.
  - `Escena3D.tsx` etiqueta Observaciones `text-[9px]` → `text-[10px]`, input `text-[11px]` → `text-[12px]`.
- [ ] **Step 5: `CampoNum` con `min="0"`** (las medidas nunca son negativas).
- [ ] **Step 6:** `pnpm lint`, tsc, revisión visual completa (capturas de las 4 páginas).
- [ ] **Step 7: Commit** — `git commit -m "feat: tokens de tema y estilo unificado"`

### Task 10: Limpieza CSS de impresión + README

**Files:** Modify: `src/app/globals.css`, `src/components/layout/AppShell.tsx`; Rewrite: `README.md`

- [ ] **Step 1:** Borrar de `globals.css` TODO el bloque de impresión heredado: `.print-landscape-sheet`, `.workshop-plan` (y variantes), `.print-sheet`, `.print-break-avoid`, `.landscape-plan-layout`, y el `@media print {…}` completo (el PDF se genera en servidor; no se imprime desde el navegador). Quitar la clase `no-print` de `AppShell.tsx`.
- [ ] **Step 2:** README nuevo (contenido completo):

```markdown
# Remolques TGM — Planteamientos

Aplicación interna de oficina técnica para calcular los planteamientos de
fabricación de lonas de remolque y baquetones (paños a cortar, contorno de
corte, reparto de ollaos) y emitir la hoja de taller.

## Qué hace

- **Planteamiento**: formulario por pasos + vista técnica acotada del remolque.
- **PDF**: hoja de taller A4 apaisada; si el pedido tiene varias versiones
  (-10, -11…), un único PDF con una página por remolque.
- **Excel**: hoja de cálculo por remolque (paridad con el Excel histórico).
- **Historial**: búsqueda por pedido/cliente y «Reutilizar».
- **Parámetros**: demasías y recogidas editables (hoja PAR), validadas al guardar.

Ambos ficheros se entregan con «Guardar como» — el usuario elige la carpeta.

## Desarrollo

​```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # vitest
pnpm lint
​```

Configuración en `.env.local` (ver variables en `src/lib/store/`):
`DATASOURCE=file` guarda en `data/` (desarrollo); `DATASOURCE=mssql` usa el
SQL Server que administre IT (`db/schema.sql`). El catálogo de materiales se
lee de RPS (`RPS_DB_*`, solo lectura).

## Estructura

- `src/lib/calc` — cálculo puro (lona, baquetón, ollaos, parámetros).
- `src/lib/geometry` — perfiles y geometría del dibujo.
- `src/lib/pdf` / `src/lib/excel` — generación de documentos.
- `src/lib/store` — persistencia (FileStore / MssqlStore) tras una interfaz común.
- `src/components/workspace` — formulario, vista técnica y resultados.
```

  (sin los zero-width breaks en los fences reales).
- [ ] **Step 3:** Verificar que la app se ve igual (el CSS borrado no afecta a pantalla). Commit `chore: retira el CSS de impresión heredado y actualiza el README`.

### Task 11: Verificación final

- [ ] `pnpm vitest run` → todo verde.
- [ ] `pnpm exec tsc --noEmit` → sin errores.
- [ ] `pnpm lint` → sin avisos.
- [ ] `pnpm build` → compila.
- [ ] `pnpm dev` en background (sin tuberías) + capturas Edge headless de `/planteamiento?desde=…` (TIPO 03 con aguas y alto trasero distinto, TIPO 05), `/historial`, `/parametros` → revisar colisiones de cotas y coherencia visual.
- [ ] Prueba funcional del PDF multi-versión (dos registros del mismo pedido) y del Excel.
- [ ] Commit final si quedan retoques de las capturas.

### Task 12: Memoria del proyecto

- [ ] Actualizar `proyecto-planteamientos-v2.md` en la memoria: P2 resuelto (regla -10/-11 por remolque; PDF único por pedido con página por versión), «Guardar como» confirmado para PDF y Excel (no se escribe en red), ARCO=cliente es paridad con el Excel histórico. P1 y P3 siguen pendientes.
