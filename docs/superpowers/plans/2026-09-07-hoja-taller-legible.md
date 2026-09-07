# La hoja de taller legible — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la hoja de taller se lea: lo que se corta arriba y en grande, las observaciones a ancho completo, y tipografía Inter en lugar de Helvetica.

**Architecture:** Todo lo que hoy decide el JSX de `PlanteamientoPdf.tsx` —qué paños listar, qué grupos de datos, cómo se llama la página— sale a `src/lib/pdf/datos-hoja.ts`, puro y testeable en node. El componente se queda pintando bandas. La fuente se registra una sola vez en `src/lib/pdf/fuentes.ts`, con caída a Helvetica si faltan los ficheros. `/api/pdf` no se toca.

**Tech Stack:** TypeScript 5, React 19, @react-pdf/renderer 4.5, Vitest 4 (`environment: "node"`).

## Global Constraints

- **Sin dependencias npm nuevas.** Los `.ttf` de Inter son ficheros del repo, no un paquete. `package.json` y `pnpm-lock.yaml` no se tocan.
- **Español en código, nombres de función, comentarios y textos.**
- Los tests son `src/**/*.test.ts` en `environment: "node"`: **solo módulos puros**. Ningún test de componente ni de JSX.
- La salida es **monocroma** (`SALIDA_MONOCROMA` en `src/lib/pdf/salida.ts`): el diseño se decide en grises, sin fondos amplios.
- **Los opcionales vacíos salen como «—», no desaparecen.**
- Spec: `docs/superpowers/specs/2026-09-07-hoja-taller-legible-design.md`.

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/lib/pdf/datos-hoja.ts` | **Nuevo.** Puro. Convierte un `PlanteamientoRecord` en las bandas y grupos que pinta la hoja. |
| `src/lib/pdf/__tests__/datos-hoja.test.ts` | **Nuevo.** Sus tests. |
| `src/lib/pdf/fuentes.ts` | **Nuevo.** Registra Inter una vez; devuelve la familia a usar. |
| `src/lib/pdf/__tests__/fuentes.test.ts` | **Nuevo.** Sus tests. |
| `public/fuentes/Inter-{Regular,SemiBold,Bold}.ttf` | **Nuevos.** La fuente. |
| `src/lib/pdf/PlanteamientoPdf.tsx` | **Reescrito.** Solo pinta. |
| `src/lib/pdf/datos-geometria.ts` | Sin cambios. `datos-hoja.ts` lo llama. |
| `src/app/api/pdf/route.tsx` | Sin cambios. `PlanteamientoPdf` numera las páginas por su cuenta. |

**Desviación de la spec, deliberada:** la spec decía `src/lib/assets/fuentes/`; los `.ttf` van a `public/fuentes/` porque `getLogoTgmDataUri` ya lee de `public/` con `process.cwd()` y así la fuente está allá donde esté el logo. La Task 4 corrige la spec.

---

### Task 1: Los textos sueltos de la hoja

Arranca `datos-hoja.ts` con las dos piezas más pequeñas y sin dependencias: el plural de los paños y el nombre de la página.

**Files:**
- Create: `src/lib/pdf/datos-hoja.ts`
- Test: `src/lib/pdf/__tests__/datos-hoja.test.ts`

**Interfaces:**
- Consumes: `TipoPlanteamiento` de `@/lib/store/types` (`"lona" | "baqueton"`).
- Produces:
  - `textoPanos(cantidad: number, a: number, b: number): string`
  - `tituloPagina(tipo: TipoPlanteamiento, indice: number, total: number): string` — `indice` empieza en 0.

- [ ] **Step 1: Escribe el test que falla**

Crea `src/lib/pdf/__tests__/datos-hoja.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { textoPanos, tituloPagina } from "@/lib/pdf/datos-hoja";

describe("textos sueltos de la hoja", () => {
  it("concuerda el plural de los paños con la cantidad", () => {
    expect(textoPanos(1, 160, 124.5)).toBe("1 PAÑO DE 160 × 124,5");
    expect(textoPanos(2, 160, 124.5)).toBe("2 PAÑOS DE 160 × 124,5");
  });

  it("numera la página solo cuando el pedido tiene más de una", () => {
    expect(tituloPagina("lona", 0, 1)).toBe("REMOLQUE");
    expect(tituloPagina("lona", 0, 3)).toBe("REMOLQUE · 1 DE 3");
    expect(tituloPagina("baqueton", 1, 3)).toBe("BAQUETÓN · 2 DE 3");
    expect(tituloPagina("baqueton", 0, 1)).toBe("BAQUETÓN");
  });
});
```

- [ ] **Step 2: Ejecuta el test y comprueba que falla**

Run: `pnpm vitest run src/lib/pdf/__tests__/datos-hoja.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/pdf/datos-hoja"».

- [ ] **Step 3: Escribe la implementación mínima**

Crea `src/lib/pdf/datos-hoja.ts`:

```ts
import type { TipoPlanteamiento } from "@/lib/store/types";

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** «1 PAÑO DE» pero «2 PAÑOS DE»: la hoja anterior decía «2 PAÑO DE». */
export function textoPanos(cantidad: number, a: number, b: number): string {
  return `${cantidad} ${cantidad === 1 ? "PAÑO" : "PAÑOS"} DE ${fmt(a)} × ${fmt(b)}`;
}

/**
 * Un pedido de una sola pieza no necesita que le digan que es la 1 de 1; con
 * varias, quien tiene las hojas en la mano sabe cuál es cuál y si le falta una.
 */
export function tituloPagina(tipo: TipoPlanteamiento, indice: number, total: number): string {
  const nombre = tipo === "lona" ? "REMOLQUE" : "BAQUETÓN";
  return total <= 1 ? nombre : `${nombre} · ${indice + 1} DE ${total}`;
}
```

- [ ] **Step 4: Ejecuta el test y comprueba que pasa**

Run: `pnpm vitest run src/lib/pdf/__tests__/datos-hoja.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/datos-hoja.ts src/lib/pdf/__tests__/datos-hoja.test.ts
git commit -m "feat: plural de los paños y nombre de la página de la hoja"
```

---

### Task 2: Los datos de la lona

La parte gorda: convertir un `LonaInput` + `LonaResult` en las tres celdas de la banda de corte y los dos grupos de la columna.

**Files:**
- Modify: `src/lib/pdf/datos-hoja.ts`
- Test: `src/lib/pdf/__tests__/datos-hoja.test.ts`

**Interfaces:**
- Consumes: `textoPanos` de la Task 1; `nombrePerfil` de `@/lib/calc/params`; `datosGeometriaPdf` de `@/lib/pdf/datos-geometria`.
- Produces:
  - `interface Dato { etiqueta: string; valores: string[] }`
  - `interface Grupo { titulo: string; datos: Dato[] }`
  - `interface Celda { titulo: string; lineas: string[]; notas: string[] }` — `lineas` se pinta grande, `notas` en gris pequeño.
  - `interface CuerpoHoja { banda: Celda[]; grupos: Grupo[]; material: string; observaciones: string }`
  - `hojaLona(i: LonaInput, r: LonaResult): CuerpoHoja`

- [ ] **Step 1: Escribe los tests que fallan**

En `src/lib/pdf/__tests__/datos-hoja.test.ts`, amplía el import del módulo a `import { hojaLona, textoPanos, tituloPagina } from "@/lib/pdf/datos-hoja";`, añade estos imports arriba y este bloque al final:

```ts
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { emptyLona } from "@/components/workspace/entradas-vacias";

const hojaDeLona = (extra: Partial<LonaInput> = {}) => {
  const input: LonaInput = {
    ...emptyLona(),
    cantidad: 1, largo: 300, ancho: 157, altoDelante: 120, altoAtras: 0,
    tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
    recogeDelante: "NO", recogeAtras: "GOMA",
    ventana: true, ventanaAncho: 148, ventanaAlto: 35, rotulacion: true,
    modoOllaos: "REPARTIDOS", material: "LONA ALPHA 1L 580", observaciones: "SIN NADA",
    ...extra,
  };
  return hojaLona(input, calcLona(input, DEFAULT_PARAMS));
};

describe("datos de la lona en la hoja", () => {
  it("reparte la banda en paños, lona hecha y contorno", () => {
    const hoja = hojaDeLona();
    expect(hoja.banda.map((celda) => celda.titulo))
      .toEqual(["PAÑOS A CORTAR", "MEDIDA LONA HECHA", "CONTORNO DE CORTE"]);
    expect(hoja.banda[0].lineas).toHaveLength(3);
    expect(hoja.banda[1].lineas[0]).toBe("301 × 158");
  });

  it("solo desdobla alto y ancho cuando delante y detrás difieren", () => {
    expect(hojaDeLona().banda[1].lineas[1]).toBe("ALTO 120");
    expect(hojaDeLona().banda[1].notas).toEqual([]);

    const sesgado = hojaDeLona({ altoAtras: 110, anchoAtras: 150 });
    expect(sesgado.banda[1].lineas[1]).toBe("ALTO 120 DEL. / 110 TRAS.");
    expect(sesgado.banda[1].notas).toEqual(["ANCHO 157 DEL. / 150 TRAS."]);
  });

  it("dice PENDIENTE cuando no hay contorno, y entonces no hay paño de contorno", () => {
    const hoja = hojaDeLona({ contorno: 0 });
    expect(hoja.banda[2].lineas).toEqual(["PENDIENTE"]);
    expect(hoja.banda[0].lineas).toHaveLength(2);
  });

  it("agrupa la forma y los acabados, y deja fuera el modo de ollaos", () => {
    const hoja = hojaDeLona();
    expect(hoja.grupos.map((grupo) => grupo.titulo)).toEqual(["FORMA", "ACABADOS"]);
    expect(hoja.grupos[0].datos[1].valores).toEqual(["RADIO ESQUINA 8 CM"]);
    const etiquetas = hoja.grupos.flatMap((grupo) => grupo.datos.map((dato) => dato.etiqueta));
    expect(etiquetas).not.toContain("OLLAOS");
  });

  it("saca los opcionales sin elegir como raya en vez de esconderlos", () => {
    const hoja = hojaDeLona({
      tipoPerfil: "", ventana: null, rotulacion: null, material: "", observaciones: "",
    });
    const acabados = hoja.grupos[1].datos;
    expect(acabados.find((dato) => dato.etiqueta === "VENTANA")!.valores).toEqual(["—"]);
    expect(acabados.find((dato) => dato.etiqueta === "ROTULACIÓN")!.valores).toEqual(["—"]);
    expect(hoja.grupos[0].datos[0].valores).toEqual(["—"]);
    expect(hoja.material).toBe("—");
    expect(hoja.observaciones).toBe("—");
  });

  it("da las medidas de la ventana cuando las hay y avisa cuando faltan", () => {
    expect(hojaDeLona().grupos[1].datos[2].valores).toEqual(["SÍ · 148 × 35 CM"]);
    expect(hojaDeLona({ ventanaAncho: 0, ventanaAlto: 0 }).grupos[1].datos[2].valores)
      .toEqual(["SÍ · MEDIDAS PENDIENTES"]);
    expect(hojaDeLona({ ventana: false }).grupos[1].datos[2].valores).toEqual(["NO"]);
  });
});
```

- [ ] **Step 2: Ejecuta los tests y comprueba que fallan**

Run: `pnpm vitest run src/lib/pdf/__tests__/datos-hoja.test.ts`
Expected: FAIL, «hojaLona is not a function» o error de importación.

- [ ] **Step 3: Escribe la implementación**

Añade a `src/lib/pdf/datos-hoja.ts` estos imports arriba y el resto al final:

```ts
import type { LonaInput, LonaResult } from "@/lib/calc/lona";
import { nombrePerfil } from "@/lib/calc/params";
import { datosGeometriaPdf } from "@/lib/pdf/datos-geometria";

/** Una etiqueta con sus valores; varios valores se pintan uno por línea. */
export interface Dato { etiqueta: string; valores: string[] }
export interface Grupo { titulo: string; datos: Dato[] }
/** Celda de la banda de corte: `lineas` va en grande, `notas` en gris pequeño. */
export interface Celda { titulo: string; lineas: string[]; notas: string[] }
export interface CuerpoHoja {
  banda: Celda[];
  grupos: Grupo[];
  material: string;
  observaciones: string;
}

/** Que un dato no esté puesto es justo lo que hay que poder ver. */
const oRaya = (valor: string) => (valor.trim() === "" ? "—" : valor);

/** «Sin elegir» no es un «NO»: imprimirlo como tal sería inventar la decisión. */
const siNo = (valor: boolean | null | undefined) => (valor == null ? "—" : valor ? "SÍ" : "NO");

function textoVentana(i: LonaInput): string {
  if (i.ventana == null) return "—";
  if (!i.ventana) return "NO";
  return (i.ventanaAncho ?? 0) > 0 && (i.ventanaAlto ?? 0) > 0
    ? `SÍ · ${fmt(i.ventanaAncho!)} × ${fmt(i.ventanaAlto!)} CM`
    : "SÍ · MEDIDAS PENDIENTES";
}

export function hojaLona(i: LonaInput, r: LonaResult): CuerpoHoja {
  // vacío (0) = igual que delante
  const altoAtras = i.altoAtras > 0 ? i.altoAtras : i.altoDelante;
  const sesgado = (i.anchoAtras ?? 0) > 0 && i.anchoAtras !== i.ancho;
  const panos = [
    textoPanos(i.cantidad, r.panoDelantero.ancho, r.panoDelantero.alto),
    textoPanos(i.cantidad, r.panoTrasero.ancho, r.panoTrasero.alto),
    ...(r.panoContorno ? [textoPanos(i.cantidad, r.panoContorno.ancho, r.panoContorno.alto)] : []),
  ];
  return {
    banda: [
      { titulo: "PAÑOS A CORTAR", lineas: panos, notas: [] },
      {
        titulo: "MEDIDA LONA HECHA",
        lineas: [
          `${fmt(r.lonaHecha.largo)} × ${fmt(r.lonaHecha.ancho)}`,
          altoAtras !== i.altoDelante
            ? `ALTO ${fmt(i.altoDelante)} DEL. / ${fmt(altoAtras)} TRAS.`
            : `ALTO ${fmt(i.altoDelante)}`,
        ],
        notas: sesgado ? [`ANCHO ${fmt(i.ancho)} DEL. / ${fmt(i.anchoAtras!)} TRAS.`] : [],
      },
      {
        titulo: "CONTORNO DE CORTE",
        lineas: [r.contornoAjustado ? fmt(r.contornoAjustado) : "PENDIENTE"],
        notas: [],
      },
    ],
    grupos: [
      {
        titulo: "FORMA",
        datos: [
          { etiqueta: "PERFIL", valores: [i.tipoPerfil ? nombrePerfil(i.tipoPerfil) : "—"] },
          { etiqueta: "GEOMETRÍA", valores: datosGeometriaPdf(i) },
        ],
      },
      {
        // El modo de ollaos no está aquí: ya lo dice el título de su tabla.
        titulo: "ACABADOS",
        datos: [
          { etiqueta: "RECOGE DELANTE", valores: [oRaya(r.recogeDelanteTexto)] },
          { etiqueta: "RECOGE ATRÁS", valores: [oRaya(r.recogeAtrasTexto)] },
          { etiqueta: "VENTANA", valores: [textoVentana(i)] },
          { etiqueta: "ROTULACIÓN", valores: [siNo(i.rotulacion)] },
        ],
      },
    ],
    material: oRaya(i.material),
    observaciones: oRaya(i.observaciones),
  };
}
```

- [ ] **Step 4: Ejecuta los tests y comprueba que pasan**

Run: `pnpm vitest run src/lib/pdf/__tests__/datos-hoja.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/datos-hoja.ts src/lib/pdf/__tests__/datos-hoja.test.ts
git commit -m "feat: los datos de la lona salen en bandas y grupos"
```

---

### Task 3: Los datos del baquetón y el reparto por tipo

**Files:**
- Modify: `src/lib/pdf/datos-hoja.ts`
- Test: `src/lib/pdf/__tests__/datos-hoja.test.ts`

**Interfaces:**
- Consumes: `CuerpoHoja`, `hojaLona`, `tituloPagina` de las tasks anteriores; `PlanteamientoRecord` de `@/lib/store/types`.
- Produces:
  - `hojaBaqueton(i: BaquetonInput, r: BaquetonResult): CuerpoHoja`
  - `interface DatosHoja extends CuerpoHoja { titulo: string }`
  - `datosHoja(rec: PlanteamientoRecord, indice: number, total: number): DatosHoja` — es lo único que llama el componente.

- [ ] **Step 1: Escribe los tests que fallan**

En `src/lib/pdf/__tests__/datos-hoja.test.ts`, amplía el import del módulo a `import { datosHoja, hojaBaqueton, hojaLona, textoPanos, tituloPagina } from "@/lib/pdf/datos-hoja";`, añade estos imports arriba y estos bloques al final:

```ts
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";
import { emptyBaqueton } from "@/components/workspace/entradas-vacias";
import type { PlanteamientoRecord } from "@/lib/store/types";

const entradaBaqueton = (extra: Partial<BaquetonInput> = {}): BaquetonInput => ({
  ...emptyBaqueton(),
  cantidad: 1, largo: 300, ancho: 157, baqueton: 12,
  clienteEspecifico: "GENERAL", rotulacion: false,
  modoOllaos: "REPARTIDOS", material: "LONA ALPHA 1L 580", observaciones: "",
  ...extra,
});

describe("datos del baquetón en la hoja", () => {
  it("tiene sus tres celdas y no las de la lona", () => {
    const input = entradaBaqueton();
    const hoja = hojaBaqueton(input, calcBaqueton(input, DEFAULT_PARAMS));
    expect(hoja.banda.map((celda) => celda.titulo))
      .toEqual(["PAÑOS A CORTAR", "MEDIDA REMOLQUE", "BAQUETÓN"]);
    expect(hoja.banda[2].notas).toEqual(["EN LÍNEA"]);
    const etiquetas = hoja.grupos.flatMap((grupo) => grupo.datos.map((dato) => dato.etiqueta));
    expect(etiquetas).toEqual(["CLIENTE ESPECÍFICO", "ROTULACIÓN"]);
    expect(etiquetas).not.toContain("PERFIL");
    expect(etiquetas).not.toContain("VENTANA");
  });
});

describe("reparto por tipo de planteamiento", () => {
  it("da el título y el cuerpo que le tocan a cada tipo", () => {
    const input = entradaBaqueton();
    const registro = {
      id: "x", tipo: "baqueton", numeroPedido: "AR.26.04329", version: "10",
      cliente: "TALLERES CAL", input, result: calcBaqueton(input, DEFAULT_PARAMS),
      paramsSnapshot: DEFAULT_PARAMS, createdAt: "", updatedAt: "",
    } as PlanteamientoRecord;
    const hoja = datosHoja(registro, 1, 3);
    expect(hoja.titulo).toBe("BAQUETÓN · 2 DE 3");
    expect(hoja.banda[1].titulo).toBe("MEDIDA REMOLQUE");
  });
});
```

- [ ] **Step 2: Ejecuta los tests y comprueba que fallan**

Run: `pnpm vitest run src/lib/pdf/__tests__/datos-hoja.test.ts`
Expected: FAIL, «hojaBaqueton is not a function».

- [ ] **Step 3: Escribe la implementación**

En `src/lib/pdf/datos-hoja.ts`, sustituye el import `import type { TipoPlanteamiento } from "@/lib/store/types";` por `import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";`, añade `import type { BaquetonInput, BaquetonResult } from "@/lib/calc/baqueton";` y esto al final:

```ts
export function hojaBaqueton(i: BaquetonInput, r: BaquetonResult): CuerpoHoja {
  return {
    banda: [
      {
        titulo: "PAÑOS A CORTAR",
        lineas: [textoPanos(i.cantidad, r.panoUnico.largo, r.panoUnico.ancho)],
        notas: [],
      },
      {
        titulo: "MEDIDA REMOLQUE",
        lineas: [`${fmt(r.remolqueHecho.largo)} × ${fmt(r.remolqueHecho.ancho)}`],
        notas: [],
      },
      {
        titulo: "BAQUETÓN",
        lineas: [fmt(i.baqueton)],
        notas: [r.baquetonTrasero ? `TRASERO ${fmt(r.baquetonTrasero)}` : "EN LÍNEA"],
      },
    ],
    grupos: [
      {
        titulo: "ACABADOS",
        datos: [
          { etiqueta: "CLIENTE ESPECÍFICO", valores: [oRaya(i.clienteEspecifico)] },
          { etiqueta: "ROTULACIÓN", valores: [siNo(i.rotulacion)] },
        ],
      },
    ],
    material: oRaya(i.material),
    observaciones: oRaya(i.observaciones),
  };
}

export interface DatosHoja extends CuerpoHoja { titulo: string }

/** Lo único que el componente necesita saber de un registro. */
export function datosHoja(rec: PlanteamientoRecord, indice: number, total: number): DatosHoja {
  const cuerpo = rec.tipo === "lona"
    ? hojaLona(rec.input as LonaInput, rec.result as LonaResult)
    : hojaBaqueton(rec.input as BaquetonInput, rec.result as BaquetonResult);
  return { titulo: tituloPagina(rec.tipo, indice, total), ...cuerpo };
}
```

- [ ] **Step 4: Ejecuta los tests y comprueba que pasan**

Run: `pnpm vitest run src/lib/pdf/__tests__/datos-hoja.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/datos-hoja.ts src/lib/pdf/__tests__/datos-hoja.test.ts
git commit -m "feat: los datos del baquetón y el reparto por tipo"
```

---

### Task 4: Inter incrustada

**Files:**
- Create: `public/fuentes/Inter-Regular.ttf`, `public/fuentes/Inter-SemiBold.ttf`, `public/fuentes/Inter-Bold.ttf`, `public/fuentes/LEEME.txt`
- Create: `src/lib/pdf/fuentes.ts`
- Test: `src/lib/pdf/__tests__/fuentes.test.ts`
- Modify: `docs/superpowers/specs/2026-09-07-hoja-taller-legible-design.md` (la ruta de los `.ttf`)

**Interfaces:**
- Produces: `registrarFuentes(): string` — devuelve `"Inter"` si los tres ficheros están, `"Helvetica"` si falta alguno. Idempotente.

**Por qué la caída a Helvetica no es paranoia:** `@react-pdf` resuelve `fontFamily: "Helvetica"` con `fontWeight: 600` a Helvetica-Bold sin lanzar (los pesos 400 y 700 vienen registrados de serie y `FontFamily.resolve` sube al siguiente peso), pero `fontFamily: "Inter"` sin registrar **lanza**. Por eso la familia es un valor devuelto y no una constante.

- [ ] **Step 1: Descarga los tres pesos**

```bash
mkdir -p public/fuentes
for par in "400:Regular" "600:SemiBold" "700:Bold"; do
  peso="${par%%:*}"; nombre="${par##*:}"
  url=$(curl -sS -H "User-Agent: Mozilla/5.0" \
    "https://fonts.googleapis.com/css2?family=Inter:wght@${peso}" \
    | grep -o 'https://fonts.gstatic.com/[^)]*\.ttf' | head -1)
  curl -sSL -o "public/fuentes/Inter-${nombre}.ttf" "$url"
done
file public/fuentes/*.ttf
```

Expected: las tres líneas dicen `TrueType Font data`. Si alguna dice `HTML document` o `ASCII text`, la descarga falló: repítela. Cada fichero ronda los 300 KB.

- [ ] **Step 2: Deja escrita la procedencia**

```bash
cat > public/fuentes/LEEME.txt <<'FIN'
Inter, de Rasmus Andersson (https://rsms.me/inter/).
Licencia SIL Open Font License 1.1: https://openfontlicense.org/

Descargada de Google Fonts (pesos 400, 600 y 700) e incrustada en el repo a
proposito: la hoja de taller se genera en el servidor y no puede depender de
que haya internet ni de las fuentes que tenga instalada la maquina.
FIN
```

- [ ] **Step 3: Escribe el test que falla**

Crea `src/lib/pdf/__tests__/fuentes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Font } from "@react-pdf/renderer";
import { registrarFuentes } from "@/lib/pdf/fuentes";

describe("registro de la fuente de la hoja", () => {
  it("registra Inter y no la duplica al llamar dos veces", () => {
    expect(registrarFuentes()).toBe("Inter");
    expect(registrarFuentes()).toBe("Inter");
    expect(Font.getRegisteredFontFamilies()).toContain("Inter");
    expect(Font.getRegisteredFonts().Inter.sources).toHaveLength(3);
  });
});
```

- [ ] **Step 4: Ejecuta el test y comprueba que falla**

Run: `pnpm vitest run src/lib/pdf/__tests__/fuentes.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/pdf/fuentes"».

- [ ] **Step 5: Escribe la implementación**

Crea `src/lib/pdf/fuentes.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Font } from "@react-pdf/renderer";

const PESOS = [
  { fichero: "Inter-Regular.ttf", fontWeight: 400 },
  { fichero: "Inter-SemiBold.ttf", fontWeight: 600 },
  { fichero: "Inter-Bold.ttf", fontWeight: 700 },
] as const;

let familia: string | null = null;

/**
 * Registra Inter una sola vez y devuelve la familia que debe usar la hoja.
 * Si faltase algún fichero devuelve "Helvetica", que @react-pdf trae de serie:
 * una hoja de taller no puede dejar de salir por una fuente.
 */
export function registrarFuentes(): string {
  if (familia !== null) return familia;
  const fuentes = PESOS.map((peso) => ({
    src: join(process.cwd(), "public", "fuentes", peso.fichero),
    fontWeight: peso.fontWeight,
  }));
  if (!fuentes.every((fuente) => existsSync(fuente.src))) {
    familia = "Helvetica";
    return familia;
  }
  Font.register({ family: "Inter", fonts: [...fuentes] });
  familia = "Inter";
  return familia;
}
```

- [ ] **Step 6: Ejecuta el test y comprueba que pasa**

Run: `pnpm vitest run src/lib/pdf/__tests__/fuentes.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 7: Corrige la ruta en la spec**

En `docs/superpowers/specs/2026-09-07-hoja-taller-legible-design.md`, sustituye las dos menciones de `src/lib/assets/fuentes/` por `public/fuentes/` y añade tras la primera: «en `public/` porque es donde ya vive el logo y es lo que se despliega seguro».

- [ ] **Step 8: Commit**

```bash
git add public/fuentes src/lib/pdf/fuentes.ts src/lib/pdf/__tests__/fuentes.test.ts docs/superpowers/specs/2026-09-07-hoja-taller-legible-design.md
git commit -m "feat: Inter incrustada, con caída a Helvetica si faltan los ficheros"
```

---

### Task 5: La hoja nueva

Reescritura de `PlanteamientoPdf.tsx`. No lleva test automático —es render, y los tests del proyecto son de node— así que la verificación va entera en la Task 6.

**Files:**
- Modify: `src/lib/pdf/PlanteamientoPdf.tsx` (reescritura completa)

**Interfaces:**
- Consumes: `datosHoja(rec, indice, total)` de la Task 3 y `registrarFuentes()` de la Task 4.
- Produces: `PlanteamientoPdf({ paginas, logoTgm })` — la misma firma de hoy, así que `/api/pdf` no se toca.

- [ ] **Step 1: Sustituye el fichero entero**

Reemplaza el contenido de `src/lib/pdf/PlanteamientoPdf.tsx` por:

```tsx
import {
  Document, Page, Text, View, Image, StyleSheet,
} from "@react-pdf/renderer";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { LonaResult } from "@/lib/calc/lona";
import type { BaquetonResult } from "@/lib/calc/baqueton";
import { datosHoja } from "@/lib/pdf/datos-hoja";
import { registrarFuentes } from "@/lib/pdf/fuentes";

// Se resuelve al importar el módulo, que en esta app solo pasa en el servidor.
const FAMILIA = registrarFuentes();

const TINTA = "#1a1a1a";
const GRIS = "#6b6b6b";
const FILETE = "#c9c9c9";

// La banda de corte no reparte su ancho a partes iguales: los paños son tres
// líneas de texto y el contorno es un número.
const ANCHOS_CELDA = [2.4, 1.5, 1];

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 20, paddingVertical: 16,
    fontSize: 8, fontFamily: FAMILIA, color: TINTA,
  },

  cabecera: { flexDirection: "row", paddingBottom: 8, borderBottom: `1 solid ${TINTA}` },
  logo: { width: 96, justifyContent: "center" },
  logoImagen: { width: 82, height: 46, objectFit: "contain" },
  logoMarca: { fontSize: 22, fontWeight: 700, color: "#f3a000" },
  logoSub: { marginTop: 1, fontSize: 6.5, fontWeight: 600 },
  cabCliente: { flex: 1, paddingLeft: 12 },
  cabPedido: { width: 210 },
  cabValorGrande: { fontSize: 12, fontWeight: 700, marginBottom: 3 },
  cabSecundarios: { flexDirection: "row" },
  cabDato: { flexDirection: "row", marginRight: 18 },
  cabDatoEtiqueta: {
    fontSize: 6.5, fontWeight: 600, letterSpacing: 0.6, color: GRIS, marginRight: 4,
  },
  cabDatoValor: { fontSize: 8.5, fontWeight: 600 },

  identificacion: { paddingVertical: 4, borderBottom: `0.5 solid ${FILETE}` },
  identificacionTexto: {
    fontSize: 8, fontWeight: 700, letterSpacing: 1.4, textAlign: "center",
  },

  // Rótulo de grupo: pesa poco y ordena mucho.
  rotulo: { fontSize: 6.5, fontWeight: 600, letterSpacing: 0.8, color: GRIS, marginBottom: 3 },

  bandaCorte: { flexDirection: "row", paddingVertical: 8, borderBottom: `0.5 solid ${FILETE}` },
  celda: { paddingRight: 10 },
  celdaConFilete: { borderLeft: `0.5 solid ${FILETE}`, paddingLeft: 12 },
  celdaLinea: { fontSize: 12, fontWeight: 700, marginBottom: 1.5 },
  celdaNota: { fontSize: 7.5, color: GRIS, marginTop: 1 },

  // La única banda elástica: si las observaciones crecen, el dibujo cede alto.
  cuerpo: { flexDirection: "row", flexGrow: 1, flexShrink: 1, flexBasis: 236, paddingVertical: 8 },
  columna: { width: 230, paddingRight: 12, borderRight: `0.5 solid ${FILETE}` },
  grupo: { marginBottom: 12 },
  filaDato: { flexDirection: "row", marginBottom: 3.5 },
  etiqueta: { width: 88, fontSize: 7.5, color: GRIS, paddingTop: 1 },
  valores: { flex: 1 },
  valor: { fontSize: 9.5, fontWeight: 600, lineHeight: 1.15 },
  dibujo: { flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 12 },
  foto: { width: "100%", height: "100%", objectFit: "contain" },
  sinPlano: { color: "#a3a3a3" },

  pie: {
    paddingVertical: 6,
    borderTop: `0.5 solid ${FILETE}`, borderBottom: `0.5 solid ${FILETE}`,
  },
  filaPie: { flexDirection: "row", marginBottom: 3 },
  etiquetaPie: {
    width: 88, fontSize: 6.5, fontWeight: 600, letterSpacing: 0.8, color: GRIS, paddingTop: 2,
  },
  valorPie: { flex: 1, fontSize: 9.5, fontWeight: 600 },
  // Regular, no negrita: el texto largo en negrita se lee peor.
  observaciones: { flex: 1, fontSize: 9.5, lineHeight: 1.35 },

  tablaTitulo: {
    marginTop: 8, marginBottom: 3,
    fontSize: 6.5, fontWeight: 600, letterSpacing: 0.8, color: GRIS,
  },
  tabla: { borderTop: `0.5 solid ${TINTA}`, borderBottom: `0.5 solid ${TINTA}` },
  tr: {
    minHeight: 15, flexDirection: "row",
    borderBottom: `0.5 solid ${FILETE}`, alignItems: "center",
  },
  trUltima: { borderBottom: 0 },
  trCabecera: { borderBottom: `0.5 solid ${TINTA}` },
  th: {
    flex: 1, paddingVertical: 3, fontSize: 6.5, fontWeight: 600, color: GRIS,
    textAlign: "center", borderRight: `0.5 solid ${FILETE}`,
  },
  thNombre: { flex: 7.5, textAlign: "left", paddingLeft: 3 },
  td: {
    flex: 1, paddingVertical: 3, fontSize: 8, textAlign: "center",
    borderRight: `0.5 solid ${FILETE}`,
  },
  tdNombre: {
    flex: 7.5, paddingVertical: 3, paddingLeft: 3, fontSize: 7.5, fontWeight: 600,
    borderRight: `0.5 solid ${FILETE}`,
  },
  sinFilete: { borderRight: 0 },
});

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const fechaEs = (fecha: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : fecha;
};

function CabDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.cabDato}>
      <Text style={s.cabDatoEtiqueta}>{etiqueta}</Text>
      <Text style={s.cabDatoValor}>{valor || "—"}</Text>
    </View>
  );
}

function Reparto({ reparto, modo, primerOllao }: {
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  modo: string;
  primerOllao: number;
}) {
  const filas: Array<[string, number[]]> = [
    ["OLLAOS LATERALES DE ATRÁS A ADELANTE", reparto.laterales],
    ["OLLAOS ATRÁS DE IZQUIERDA A DERECHA", reparto.atras],
    ["OLLAOS DELANTE DE IZQUIERDA A DERECHA", reparto.delante],
  ];
  return (
    <>
      <Text style={s.tablaTitulo}>
        {modo === "REPARTIDOS"
          ? `OLLAOS · REPARTIDOS · PRIMER Y ÚLTIMO OLLAO A ${fmt(primerOllao)} CM DEL BORDE`
          : `OLLAOS · ${modo || "SIN ELEGIR"}`}
      </Text>
      <View style={s.tabla}>
        <View style={[s.tr, s.trCabecera]}>
          <Text style={[s.th, s.thNombre]} />
          {Array.from({ length: 12 }, (_, i) => <Text key={i} style={s.th}>{i + 1}</Text>)}
          <Text style={[s.th, s.sinFilete]}>TOTAL</Text>
        </View>
        {filas.map(([nombre, posiciones], fila) => (
          <View key={nombre} style={[s.tr, ...(fila === filas.length - 1 ? [s.trUltima] : [])]}>
            <Text style={s.tdNombre}>{nombre}</Text>
            {Array.from({ length: 12 }, (_, i) => (
              <Text key={i} style={s.td}>{posiciones[i] == null ? "" : fmt(posiciones[i])}</Text>
            ))}
            <Text style={[s.td, s.sinFilete]}>{posiciones.length}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function PaginaPlanteamiento({ rec, png, logoTgm, indice, total }: {
  rec: PlanteamientoRecord;
  png: string | null;
  logoTgm?: string | null;
  indice: number;
  total: number;
}) {
  const cabecera = rec.input.cabecera;
  const resultado = rec.result as LonaResult | BaquetonResult;
  const hoja = datosHoja(rec, indice, total);
  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.cabecera}>
        <View style={s.logo}>
          {logoTgm ? (
            /* eslint-disable-next-line jsx-a11y/alt-text */
            <Image src={logoTgm} style={s.logoImagen} />
          ) : (
            <>
              <Text style={s.logoMarca}>TGM</Text>
              <Text style={s.logoSub}>TOLDOS GÓMEZ</Text>
            </>
          )}
        </View>
        <View style={s.cabCliente}>
          <Text style={s.rotulo}>CLIENTE</Text>
          <Text style={s.cabValorGrande}>{cabecera.cliente || "—"}</Text>
          <View style={s.cabSecundarios}>
            <CabDato etiqueta="REVISIÓN" valor={cabecera.revision} />
            <CabDato etiqueta="REALIZADO" valor={cabecera.realizadoPor} />
          </View>
        </View>
        <View style={s.cabPedido}>
          <Text style={s.rotulo}>Nº PEDIDO</Text>
          <Text style={s.cabValorGrande}>{cabecera.numeroPedido || "—"}</Text>
          <View style={s.cabSecundarios}>
            <CabDato etiqueta="O.F." valor={cabecera.ordenFabricacion ?? ""} />
            <CabDato etiqueta="FECHA" valor={fechaEs(cabecera.fecha)} />
          </View>
        </View>
      </View>

      <View style={s.identificacion}>
        <Text style={s.identificacionTexto}>{hoja.titulo}</Text>
      </View>

      <View style={s.bandaCorte}>
        {hoja.banda.map((celda, indiceCelda) => (
          <View
            key={celda.titulo}
            style={[
              s.celda,
              { flex: ANCHOS_CELDA[indiceCelda] ?? 1 },
              ...(indiceCelda > 0 ? [s.celdaConFilete] : []),
            ]}
          >
            <Text style={s.rotulo}>{celda.titulo}</Text>
            {celda.lineas.map((linea, i) => (
              <Text key={i} style={s.celdaLinea}>{linea}</Text>
            ))}
            {celda.notas.map((nota, i) => (
              <Text key={i} style={s.celdaNota}>{nota}</Text>
            ))}
          </View>
        ))}
      </View>

      <View style={s.cuerpo}>
        <View style={s.columna}>
          {hoja.grupos.map((grupo) => (
            <View key={grupo.titulo} style={s.grupo}>
              <Text style={s.rotulo}>{grupo.titulo}</Text>
              {grupo.datos.map((dato) => (
                <View key={dato.etiqueta} style={s.filaDato}>
                  <Text style={s.etiqueta}>{dato.etiqueta}</Text>
                  <View style={s.valores}>
                    {dato.valores.map((valor, i) => (
                      <Text key={i} style={s.valor}>{valor}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
        <View style={s.dibujo}>
          {png ? (
            /* eslint-disable-next-line jsx-a11y/alt-text */
            <Image src={png} style={s.foto} />
          ) : <Text style={s.sinPlano}>(sin vista técnica)</Text>}
        </View>
      </View>

      <View style={s.pie}>
        <View style={s.filaPie}>
          <Text style={s.etiquetaPie}>MATERIAL</Text>
          <Text style={s.valorPie}>{hoja.material}</Text>
        </View>
        <View style={s.filaPie}>
          <Text style={s.etiquetaPie}>OBSERVACIONES</Text>
          <Text style={s.observaciones}>{hoja.observaciones}</Text>
        </View>
      </View>

      <Reparto
        reparto={resultado.reparto}
        modo={rec.input.modoOllaos}
        primerOllao={rec.input.primerOllao ?? rec.paramsSnapshot?.primerOllao ?? 2.5}
      />
    </Page>
  );
}

/** Hoja de taller: una página por remolque o baquetón del pedido. */
export function PlanteamientoPdf({ paginas, logoTgm }: {
  paginas: Array<{ rec: PlanteamientoRecord; png: string | null }>;
  logoTgm?: string | null;
}) {
  return (
    <Document>
      {paginas.map(({ rec, png }, indice) => (
        <PaginaPlanteamiento
          key={rec.id}
          rec={rec}
          png={png}
          logoTgm={logoTgm}
          indice={indice}
          total={paginas.length}
        />
      ))}
    </Document>
  );
}
```

- [ ] **Step 2: Comprueba que compila y que no se ha roto nada**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

Expected: `tsc` sin errores, lint limpio, los 319 tests de antes más los 11 nuevos en verde.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/PlanteamientoPdf.tsx
git commit -m "feat: la hoja de taller en bandas, con Inter y observaciones a ancho completo"
```

---

### Task 6: Mirar el PDF

Los tests no ven una página. Aquí se renderiza de verdad y **se mira** antes de dar nada por hecho.

**Files:**
- Create (temporal, se borra al acabar): `src/lib/pdf/__tests__/mirar-hoja.test.ts`
- Modify si hace falta: `src/lib/pdf/PlanteamientoPdf.tsx`

- [ ] **Step 1: Escribe el arnés de render**

Crea `src/lib/pdf/__tests__/mirar-hoja.test.ts`. Es un fichero de usar y tirar: escribe cuatro PDF en `tmp/hojas` para poder abrirlos.

```ts
import { describe, it } from "vitest";
import { createElement } from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";
import { getLogoTgmDataUri } from "@/lib/assets/logo-tgm";
import type { PlanteamientoRecord } from "@/lib/store/types";

const SALIDA = "tmp/hojas";

const cabecera = {
  numeroPedido: "AR.26.04329", version: "10", cliente: "TALLERES CAL, C. B.",
  revision: "JAIME", realizadoPor: "IVAN", ordenFabricacion: "0231823",
  fecha: "2026-09-03", fechaSalida: "",
};

const registroLona = (extra: Partial<LonaInput> = {}): PlanteamientoRecord => {
  const input: LonaInput = {
    ...emptyLona(), cabecera,
    cantidad: 1, largo: 300, ancho: 157, altoDelante: 120, altoAtras: 0,
    tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
    recogeDelante: "NO", recogeAtras: "GOMA",
    ventana: true, ventanaAncho: 148, ventanaAlto: 35, rotulacion: true,
    modoOllaos: "REPARTIDOS",
    material: "LONA ALPHA 1L 580 g/m² :VERDE 6024 :250 AN (580)",
    observaciones: "DELANTE VENTANA NORMAL - ATRÁS VENTANA 50X35CM - LATERALES 4 VENTANAS 40X25CM",
    ...extra,
  };
  return {
    id: "lona", tipo: "lona", numeroPedido: cabecera.numeroPedido, version: "10",
    cliente: cabecera.cliente, input, result: calcLona(input, DEFAULT_PARAMS),
    paramsSnapshot: DEFAULT_PARAMS, createdAt: "", updatedAt: "",
  };
};

const registroBaqueton = (): PlanteamientoRecord => {
  const input: BaquetonInput = {
    ...emptyBaqueton(), cabecera,
    cantidad: 2, largo: 300, ancho: 157, baqueton: 12,
    clienteEspecifico: "GENERAL", rotulacion: false, modoOllaos: "REPARTIDOS",
    material: "LONA ALPHA 1L 580 g/m² :VERDE 6024", observaciones: "",
  };
  return {
    id: "baq", tipo: "baqueton", numeroPedido: cabecera.numeroPedido, version: "11",
    cliente: cabecera.cliente, input, result: calcBaqueton(input, DEFAULT_PARAMS),
    paramsSnapshot: DEFAULT_PARAMS, createdAt: "", updatedAt: "",
  };
};

async function escribir(nombre: string, recs: PlanteamientoRecord[]) {
  const buffer = await renderToBuffer(
    createElement(PlanteamientoPdf, {
      paginas: recs.map((rec) => ({ rec, png: null })),
      logoTgm: getLogoTgmDataUri(),
    }),
  );
  mkdirSync(SALIDA, { recursive: true });
  writeFileSync(`${SALIDA}/${nombre}.pdf`, buffer);
}

describe("hojas para mirar", () => {
  it("escribe los cuatro casos", async () => {
    await escribir("1-pedido-real", [registroLona()]);
    await escribir("2-baqueton-y-lona", [registroLona(), registroBaqueton()]);
    await escribir("3-chaflan-y-sesgado", [registroLona({
      tipoPerfil: "TIPO 04", chaflan: 25, radioChaflanAbajo: 7, radioChaflanArriba: 7.5,
      radioEsquina: 0, altoAtras: 110, anchoAtras: 150,
    })]);
    await escribir("4-observaciones-largas", [registroLona({
      observaciones: "DELANTE VENTANA NORMAL DE 50X35 CM CENTRADA A 20 CM DEL BORDE SUPERIOR. ".repeat(15),
    })]);
  }, 60_000);
});
```

- [ ] **Step 2: Genera los PDF**

Run: `pnpm vitest run src/lib/pdf/__tests__/mirar-hoja.test.ts`
Expected: PASS, y `tmp/hojas/` con cuatro ficheros `.pdf` de más de 20 KB cada uno.

- [ ] **Step 3: Ábrelos y míralos uno a uno**

Lee cada PDF (la herramienta Read abre PDF) y comprueba, en este orden:

1. **`1-pedido-real.pdf`** — la letra es Inter, no Helvetica. Los paños salen en 12 pt negrita arriba del todo. Pone `REMOLQUE`, sin numerar, porque es una sola página. Las observaciones ocupan el ancho entero y **no** salen partidas con guion.
2. **`2-baqueton-y-lona.pdf`** — la página 1 dice `REMOLQUE · 1 DE 2` y la 2 `BAQUETÓN · 2 DE 2`. La 2 no lleva PERFIL ni VENTANA, y su banda dice `MEDIDA REMOLQUE` y `BAQUETÓN` con la nota `EN LÍNEA`. Sus paños dicen `2 PAÑOS DE`, en plural.
3. **`3-chaflan-y-sesgado.pdf`** — GEOMETRÍA saca dos líneas (chaflán y radios). La celda de la lona hecha dice `ALTO 120 DEL. / 110 TRAS.` y debajo, en gris, `ANCHO 157 DEL. / 150 TRAS.`
4. **`4-observaciones-largas.pdf`** — **este es el que decide.** Todo tiene que seguir cabiendo en **una sola página**: si el PDF tiene dos páginas, o si el hueco del dibujo se ha quedado en nada, aplica el arreglo del Step 4.

- [ ] **Step 4: Si el dibujo se descuadra, fíjale el alto**

Solo si el Step 3 lo pide. La causa sería `height: "100%"` sobre una caja elástica. En `src/lib/pdf/PlanteamientoPdf.tsx`, cambia estas dos reglas:

```ts
  cuerpo: { flexDirection: "row", height: 236, paddingVertical: 8 },
  foto: { width: "100%", height: 220, objectFit: "contain" },
```

Vuelve al Step 2 y mira otra vez los cuatro. Con el alto fijo, unas observaciones muy largas empujan la tabla de ollaos a una segunda página en lugar de comerle alto al dibujo; es el intercambio aceptado, porque las observaciones reales no pasan de dos líneas.

- [ ] **Step 5: Borra el arnés**

```bash
rm src/lib/pdf/__tests__/mirar-hoja.test.ts
rm -rf tmp/hojas
```

- [ ] **Step 6: Comprobación final**

```bash
pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

Expected: todos los tests en verde, `tsc` sin errores, lint limpio, y el build generando sus 14 páginas.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "fix: ajustes de la hoja tras mirar los PDF generados"
```

Si el Step 4 no hizo falta y no queda nada que añadir, sáltate el commit.
