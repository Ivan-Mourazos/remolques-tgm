# Planteamientos v2 (lona remolque + baquetón) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web que replica el Excel `REMOLQUE.G3M.FINAL.xlsb`: calcula lonas de remolque y baquetones, pinta la forma del remolque en 3D en vivo, genera PDF A4 apaisado guardado en la carpeta PLANTEAMIENTOS y mantiene un historial reutilizable.

**Architecture:** Cuatro capas independientes: motor de cálculo puro (`src/lib/calc/`), almacenamiento tras interfaz (`src/lib/store/`, drivers fichero JSON y SQL Server), pantalla única `/planteamiento` (formulario + 3D react-three-fiber + resultados en vivo) y PDF servidor (`@react-pdf/renderer`) que se escribe en la ruta de red. Spec: `docs/superpowers/specs/2026-07-13-planteamientos-lona-baqueton-design.md`.

**Tech Stack:** Next.js 16 (App Router, ya instalado), TypeScript, Tailwind 4, Vitest, three + @react-three/fiber + @react-three/drei, @react-pdf/renderer, mssql.

## Global Constraints

- Gestor de paquetes: **pnpm**. SO de desarrollo: Windows (los tests y scripts deben funcionar en PowerShell).
- Unidades en **cm**; redondeos como Excel: `ROUND(x,0)` para nº ollaos, `ROUND(x,1)` para distancias (mitad se aleja de cero). Contorno: redondeo **hacia arriba al mm**.
- Paridad Excel obligatoria: el paño trasero usa la columna **DELANTE** de la recogida (pendiente P1 del spec); se implementa tras la constante `USAR_COLUMNA_ATRAS = false` en `src/lib/calc/lona.ts`.
- Primer ollao a **2,5 cm**; paso por defecto **35**; máximo **12** posiciones por lado.
- PDF: el servidor SOLO genera y devuelve los bytes (header `X-Nombre-Pdf` con `<pedido>-<version>.pdf`); **no escribe en disco ni en red**. El cliente abre «Guardar como» (File System Access API, fallback descarga). PROHIBIDO escribir en `\\FILESERVER` durante desarrollo/tests.
- **No** se escribe nunca en la BD de RPS (RPS_HOST/RPSNext es solo consulta externa, y ni siquiera se usa en esta app).
- Textos de UI y PDF en español, con los mismos literales del Excel donde existan («PAÑOS A CORTAR», «MEDIDA LONA HECHA», «RECOGE DELANTE CON …», «EN LÍNEA», «NO EN LÍNEA»…).
- Selector de datos: env `DATASOURCE` = `file` (defecto en dev) | `mssql`.
- Código nuevo en `src/lib/calc`, `src/lib/store`, `src/lib/geometry`, `src/lib/pdf`, `src/components/workspace`, `src/app/planteamiento`, `src/app/api/…`. El código legado (`src/lib/calculations`, páginas `nuevo/*`, componentes `drawings/print/result/planteamiento`) NO se toca hasta la Task 16 (limpieza).

---

### Task 1: Tooling — Vitest y dependencias nuevas

**Files:**
- Modify: `package.json` (scripts)
- Create: `vitest.config.ts`
- Create: `src/lib/calc/__tests__/smoke.test.ts` (se borra en Task 2)

**Interfaces:**
- Produces: comando `pnpm test` (vitest run) y alias `@/` funcionando en tests.

- [ ] **Step 1: Instalar dependencias**

```powershell
pnpm add three @react-three/fiber @react-three/drei @react-pdf/renderer mssql
pnpm add -D vitest @types/three
```

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Añadir script `test` a `package.json`**

En `"scripts"` añadir: `"test": "vitest run"` (dejar los scripts existentes intactos).

- [ ] **Step 4: Test humo**

```ts
// src/lib/calc/__tests__/smoke.test.ts
import { describe, expect, it } from "vitest";

describe("tooling", () => {
  it("vitest funciona", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Ejecutar y verificar**

Run: `pnpm test`
Expected: `1 passed`

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-lock.yaml vitest.config.ts src/lib/calc/__tests__/smoke.test.ts
git commit -m "chore: vitest y dependencias 3d/pdf/mssql"
```

---

### Task 2: Redondeos Excel

**Files:**
- Create: `src/lib/calc/redondeo.ts`
- Test: `src/lib/calc/__tests__/redondeo.test.ts`
- Delete: `src/lib/calc/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `excelRound(value: number, decimals: number): number` (ROUND de Excel: la mitad se aleja de cero) y `roundUpToMm(cm: number): number` (techo a 1 decimal).

- [ ] **Step 1: Test que falla**

```ts
// src/lib/calc/__tests__/redondeo.test.ts
import { describe, expect, it } from "vitest";
import { excelRound, roundUpToMm } from "@/lib/calc/redondeo";

describe("excelRound", () => {
  it("redondea como ROUND de Excel", () => {
    expect(excelRound(2.5, 0)).toBe(3);
    expect(excelRound(35.15, 1)).toBe(35.2);
    expect(excelRound(35.14, 1)).toBe(35.1);
    expect(excelRound(246 / 7, 1)).toBe(35.1);
    expect(excelRound(-2.5, 0)).toBe(-3);
  });
});

describe("roundUpToMm", () => {
  it("redondea hacia arriba al milímetro (1 decimal en cm)", () => {
    expect(roundUpToMm(270.01)).toBe(270.1);
    expect(roundUpToMm(270.1)).toBe(270.1);
    expect(roundUpToMm(269.91)).toBe(270);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test`
Expected: FAIL — módulo `redondeo` no existe.

- [ ] **Step 3: Implementación**

```ts
// src/lib/calc/redondeo.ts

/** ROUND de Excel: a `decimals` decimales, la mitad se aleja de cero. */
export function excelRound(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  // Corrige el error binario (p.ej. 35.15*10 = 351.49999…) antes de redondear.
  const scaled = Number((value * factor).toPrecision(12));
  return (Math.sign(scaled) * Math.round(Math.abs(scaled))) / factor;
}

/** Contorno: siempre hacia arriba al milímetro (1 decimal en cm). */
export function roundUpToMm(cm: number): number {
  const scaled = Number((cm * 10).toPrecision(12));
  return Math.ceil(scaled) / 10;
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test`
Expected: PASS (borrar antes `src/lib/calc/__tests__/smoke.test.ts`).

- [ ] **Step 5: Commit**

```powershell
git rm src/lib/calc/__tests__/smoke.test.ts
git add src/lib/calc
git commit -m "feat(calc): redondeos excelRound y roundUpToMm"
```

---

### Task 3: Parámetros y tipos del motor (hoja PAR)

**Files:**
- Create: `src/lib/calc/params.ts`
- Test: `src/lib/calc/__tests__/params.test.ts`

**Interfaces:**
- Produces (usado por Tasks 4-6, 10, 12-14):

```ts
export interface Recogida {
  nombre: string;          // "NO" | "GOMA" | ...
  delante: number;
  atras: number;
  lateralSoloAtras: number;   // 0 si no aplica
  lateralSoloDelante: number; // 0 si no aplica
}
export interface ClienteBaqueton {
  nombre: string;              // "GENERAL" | "HIJOS DE PEDRO LOPEZ" | "AYALA" | "GENERAL WOLDER"
  extraLargoCostura: number;
  extraAnchoCostura: number;
  extraBaquetonLargoDelante: number;
  extraBaquetonLargoDetras: number;
  extraLargoFinal: number;
  extraAnchoFinal: number;
  extraBaquetonTrasero: number; // >0 ⇒ baquetón trasero aparte "NO EN LÍNEA"
  observaciones: string[];
}
export interface CalcParams {
  recogidas: Recogida[];
  demasiaAlto: number;                 // 4.5
  demasiaContornoNormal: number;       // 3
  demasiaContornoEnfundar: number;     // 13
  demasiaLonaHecha: number;            // 1
  aumentoCurvaContorno: number;        // 1.5
  pasoOllaosDefecto: number;           // 35
  primerOllao: number;                 // 2.5
  maxPosicionesOllaos: number;         // 12
  baquetonDemasiaLargoCostura: number; // 7
  baquetonDemasiaAnchoCostura: number; // 7
  baquetonDemasiaCostura: number;      // 2
  baquetonDemasiaFinal: number;        // 1
  clientesBaqueton: ClienteBaqueton[];
}
export const DEFAULT_PARAMS: CalcParams;
export function findRecogida(params: CalcParams, nombre: string): Recogida; // fallback "NO"
export function findClienteBaqueton(params: CalcParams, nombre: string): ClienteBaqueton; // fallback "GENERAL"
export const TIPOS_PERFIL = ["TIPO 01", "TIPO 02", "TIPO 03", "TIPO 04", "TIPO 05"] as const;
export type TipoPerfil = (typeof TIPOS_PERFIL)[number];
```

- [ ] **Step 1: Test que falla**

```ts
// src/lib/calc/__tests__/params.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, findClienteBaqueton, findRecogida } from "@/lib/calc/params";

describe("DEFAULT_PARAMS (hoja PAR)", () => {
  it("tiene las 7 recogidas con sus demasías", () => {
    const nombres = DEFAULT_PARAMS.recogidas.map((r) => r.nombre);
    expect(nombres).toEqual([
      "NO", "GOMA", "CREMALLERA", "VELCRO",
      "PUENTES ESVA", "PUENTES LATERALES", "PUENTES HIJOS DE PEDRO LOPEZ",
    ]);
    expect(findRecogida(DEFAULT_PARAMS, "GOMA")).toMatchObject({ delante: 27, atras: 27 });
    expect(findRecogida(DEFAULT_PARAMS, "PUENTES LATERALES")).toMatchObject({
      delante: 41, atras: 21, lateralSoloAtras: 9, lateralSoloDelante: 9,
    });
    expect(findRecogida(DEFAULT_PARAMS, "PUENTES HIJOS DE PEDRO LOPEZ")).toMatchObject({
      delante: 42.5, atras: 42.5, lateralSoloAtras: 11.5, lateralSoloDelante: 9,
    });
    expect(findRecogida(DEFAULT_PARAMS, "no existe").nombre).toBe("NO");
  });

  it("constantes de lona", () => {
    expect(DEFAULT_PARAMS.demasiaAlto).toBe(4.5);
    expect(DEFAULT_PARAMS.demasiaContornoNormal).toBe(3);
    expect(DEFAULT_PARAMS.demasiaContornoEnfundar).toBe(13);
    expect(DEFAULT_PARAMS.demasiaLonaHecha).toBe(1);
    expect(DEFAULT_PARAMS.aumentoCurvaContorno).toBe(1.5);
    expect(DEFAULT_PARAMS.pasoOllaosDefecto).toBe(35);
    expect(DEFAULT_PARAMS.primerOllao).toBe(2.5);
  });

  it("clientes de baquetón con demasías aditivas", () => {
    expect(findClienteBaqueton(DEFAULT_PARAMS, "HIJOS DE PEDRO LOPEZ")).toMatchObject({
      extraLargoCostura: 11, extraAnchoCostura: 2,
      extraBaquetonLargoDelante: 1, extraBaquetonLargoDetras: 11,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 10,
    });
    expect(findClienteBaqueton(DEFAULT_PARAMS, "AYALA")).toMatchObject({
      extraLargoCostura: 1, extraAnchoCostura: 1, extraLargoFinal: 1, extraAnchoFinal: 1,
    });
    expect(findClienteBaqueton(DEFAULT_PARAMS, "GENERAL WOLDER")).toMatchObject({
      extraLargoCostura: -1, extraAnchoCostura: -1,
      extraBaquetonLargoDelante: -0.5, extraBaquetonLargoDetras: -0.5,
    });
    expect(findClienteBaqueton(DEFAULT_PARAMS, "GENERAL WOLDER").observaciones).toHaveLength(3);
    expect(findClienteBaqueton(DEFAULT_PARAMS, "").nombre).toBe("GENERAL");
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test`
Expected: FAIL — módulo `params` no existe.

- [ ] **Step 3: Implementación**

```ts
// src/lib/calc/params.ts
export interface Recogida {
  nombre: string;
  delante: number;
  atras: number;
  lateralSoloAtras: number;
  lateralSoloDelante: number;
}

export interface ClienteBaqueton {
  nombre: string;
  extraLargoCostura: number;
  extraAnchoCostura: number;
  extraBaquetonLargoDelante: number;
  extraBaquetonLargoDetras: number;
  extraLargoFinal: number;
  extraAnchoFinal: number;
  extraBaquetonTrasero: number;
  observaciones: string[];
}

export interface CalcParams {
  recogidas: Recogida[];
  demasiaAlto: number;
  demasiaContornoNormal: number;
  demasiaContornoEnfundar: number;
  demasiaLonaHecha: number;
  aumentoCurvaContorno: number;
  pasoOllaosDefecto: number;
  primerOllao: number;
  maxPosicionesOllaos: number;
  baquetonDemasiaLargoCostura: number;
  baquetonDemasiaAnchoCostura: number;
  baquetonDemasiaCostura: number;
  baquetonDemasiaFinal: number;
  clientesBaqueton: ClienteBaqueton[];
}

export const TIPOS_PERFIL = ["TIPO 01", "TIPO 02", "TIPO 03", "TIPO 04", "TIPO 05"] as const;
export type TipoPerfil = (typeof TIPOS_PERFIL)[number];

const r = (
  nombre: string, delante: number, atras: number,
  lateralSoloAtras = 0, lateralSoloDelante = 0,
): Recogida => ({ nombre, delante, atras, lateralSoloAtras, lateralSoloDelante });

export const DEFAULT_PARAMS: CalcParams = {
  recogidas: [
    r("NO", 3, 3),
    r("GOMA", 27, 27),
    r("CREMALLERA", 3, 3),
    r("VELCRO", 27, 27),
    r("PUENTES ESVA", 21, 21, 19, 19),
    r("PUENTES LATERALES", 41, 21, 9, 9),
    r("PUENTES HIJOS DE PEDRO LOPEZ", 42.5, 42.5, 11.5, 9),
  ],
  demasiaAlto: 4.5,
  demasiaContornoNormal: 3,
  demasiaContornoEnfundar: 13,
  demasiaLonaHecha: 1,
  aumentoCurvaContorno: 1.5,
  pasoOllaosDefecto: 35,
  primerOllao: 2.5,
  maxPosicionesOllaos: 12,
  baquetonDemasiaLargoCostura: 7,
  baquetonDemasiaAnchoCostura: 7,
  baquetonDemasiaCostura: 2,
  baquetonDemasiaFinal: 1,
  clientesBaqueton: [
    {
      nombre: "GENERAL",
      extraLargoCostura: 0, extraAnchoCostura: 0,
      extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0,
      observaciones: [],
    },
    {
      nombre: "HIJOS DE PEDRO LOPEZ",
      extraLargoCostura: 11, extraAnchoCostura: 2,
      extraBaquetonLargoDelante: 1, extraBaquetonLargoDetras: 11,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 10,
      observaciones: ["ABIERTO EN LA PARTE TRASERA (REFORZAR)"],
    },
    {
      nombre: "AYALA",
      extraLargoCostura: 1, extraAnchoCostura: 1,
      extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
      extraLargoFinal: 1, extraAnchoFinal: 1, extraBaquetonTrasero: 0,
      observaciones: [],
    },
    {
      nombre: "GENERAL WOLDER",
      extraLargoCostura: -1, extraAnchoCostura: -1,
      extraBaquetonLargoDelante: -0.5, extraBaquetonLargoDetras: -0.5,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0,
      observaciones: [
        "OLLAOS EN ALTA FRECUENCIA",
        "ETIQUETA EN I.D EN LA PARTE TRASERA ENTRE LOS 2 OLLAOS MÁS A LA DERECHA",
        "MANDAR GOMA SUELTA",
      ],
    },
  ],
};

export function findRecogida(params: CalcParams, nombre: string): Recogida {
  return (
    params.recogidas.find((x) => x.nombre === nombre) ??
    params.recogidas.find((x) => x.nombre === "NO")!
  );
}

export function findClienteBaqueton(params: CalcParams, nombre: string): ClienteBaqueton {
  return (
    params.clientesBaqueton.find((x) => x.nombre === nombre) ??
    params.clientesBaqueton.find((x) => x.nombre === "GENERAL")!
  );
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/calc
git commit -m "feat(calc): parametros por defecto de la hoja PAR"
```

---

### Task 4: Cálculo de ollaos

**Files:**
- Create: `src/lib/calc/ollaos.ts`
- Test: `src/lib/calc/__tests__/ollaos.test.ts`

**Interfaces:**
- Consumes: `excelRound` (Task 2), `CalcParams` (Task 3).
- Produces:

```ts
export interface EjeOllaos { n: number; dist: number; posiciones: number[] }
export interface OllaosResult {
  largo: EjeOllaos;   // fila "OLLAOS LATERALES DE ATRÁS A ADELANTE"
  ancho: EjeOllaos;   // filas "ATRÁS" y "DELANTE DE IZQUIERDA A DERECHA"
}
export function calcOllaos(
  medidaLargo: number, medidaAncho: number, paso: number, params: CalcParams,
): OllaosResult;
```

Fórmulas Excel (`C37–C40`, filas 33-35): `n = ROUND(medida/paso, 0)`;
`dist = ROUND(medida/n, 1)`; posiciones: `p1 = 2,5`, `p_i = p_(i-1) + dist`,
hasta `n` posiciones con tope 12. Si `medida` o `paso` no son > 0, todo a cero.

- [ ] **Step 1: Test que falla**

```ts
// src/lib/calc/__tests__/ollaos.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { calcOllaos } from "@/lib/calc/ollaos";

describe("calcOllaos", () => {
  it("caso largo 246 paso 35 (verificado en Excel)", () => {
    const res = calcOllaos(246, 0, 35, DEFAULT_PARAMS);
    expect(res.largo.n).toBe(7);
    expect(res.largo.dist).toBe(35.1);
    expect(res.largo.posiciones).toEqual([2.5, 37.6, 72.7, 107.8, 142.9, 178, 213.1]);
  });

  it("ambos ejes y acumulado con dist decimal", () => {
    const res = calcOllaos(250, 152, 35, DEFAULT_PARAMS);
    expect(res.largo.n).toBe(7);
    expect(res.largo.dist).toBe(35.7);
    expect(res.ancho.n).toBe(4);
    expect(res.ancho.dist).toBe(38);
    expect(res.ancho.posiciones).toEqual([2.5, 40.5, 78.5, 116.5]);
  });

  it("medida 0 o paso 0 devuelve vacío", () => {
    expect(calcOllaos(0, 100, 35, DEFAULT_PARAMS).largo).toEqual({ n: 0, dist: 0, posiciones: [] });
    expect(calcOllaos(100, 100, 0, DEFAULT_PARAMS).largo.posiciones).toEqual([]);
  });

  it("tope de 12 posiciones", () => {
    const res = calcOllaos(1000, 0, 35, DEFAULT_PARAMS);
    expect(res.largo.n).toBe(29);
    expect(res.largo.posiciones).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test`
Expected: FAIL — módulo `ollaos` no existe.

- [ ] **Step 3: Implementación**

```ts
// src/lib/calc/ollaos.ts
import { excelRound } from "@/lib/calc/redondeo";
import type { CalcParams } from "@/lib/calc/params";

export interface EjeOllaos { n: number; dist: number; posiciones: number[] }
export interface OllaosResult { largo: EjeOllaos; ancho: EjeOllaos }

function eje(medida: number, paso: number, params: CalcParams): EjeOllaos {
  if (!(medida > 0) || !(paso > 0)) return { n: 0, dist: 0, posiciones: [] };
  const n = excelRound(medida / paso, 0);
  if (n <= 0) return { n: 0, dist: 0, posiciones: [] };
  const dist = excelRound(medida / n, 1);
  const posiciones: number[] = [];
  let p = params.primerOllao;
  for (let i = 0; i < Math.min(n, params.maxPosicionesOllaos); i++) {
    posiciones.push(excelRound(p, 1));
    p += dist;
  }
  return { n, dist, posiciones };
}

export function calcOllaos(
  medidaLargo: number, medidaAncho: number, paso: number, params: CalcParams,
): OllaosResult {
  return { largo: eje(medidaLargo, paso, params), ancho: eje(medidaAncho, paso, params) };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test`
Expected: PASS. Si el caso 246/35 no cuadra (37,6 vs 37,7…), revisar `excelRound` — la referencia es el Excel real.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/calc
git commit -m "feat(calc): reparto de ollaos"
```

---

### Task 5: Cálculo lona remolque

**Files:**
- Create: `src/lib/calc/lona.ts`
- Test: `src/lib/calc/__tests__/lona.test.ts`

**Interfaces:**
- Consumes: `excelRound`, `roundUpToMm` (Task 2); `CalcParams`, `findRecogida`, `TipoPerfil` (Task 3); `calcOllaos`, `OllaosResult` (Task 4).
- Produces:

```ts
export interface CabeceraInput {
  numeroPedido: string; version: string; cliente: string; revision: string;
  realizadoPor: string; fecha: string; fechaSalida: string;
}
export interface LonaInput {
  cabecera: CabeceraInput;
  cantidad: number; largo: number; ancho: number;
  altoDelante: number; altoAtras: number;
  contornoScad: number; llevaCurva: boolean;
  tipoPerfil: TipoPerfil;
  recogeDelante: string; recogeAtras: string;
  bastillaEnfundar: boolean; ventana: boolean;
  rotulacion: boolean; textoRotulacion: string;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA";
  pasoOllaos: number;
  ollaosManuales: { laterales: number[]; atras: number[]; delante: number[] };
  material: string; observaciones: string;
}
export interface Pano { ancho: number; alto: number; etiqueta: string }
export interface LonaResult {
  lonaHecha: { largo: number; ancho: number };
  contornoAjustado: number;
  panoDelantero: Pano; panoTrasero: Pano; panoContorno: Pano | null;
  ollaos: OllaosResult;
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  metrosTela: number;
  recogeDelanteTexto: string; recogeAtrasTexto: string;
  notas: string[];
}
export function calcLona(input: LonaInput, params: CalcParams): LonaResult;
export const USAR_COLUMNA_ATRAS = false; // P1 del spec: el Excel usa DELANTE para ambos paños
```

Fórmulas Excel: lona hecha `largo+1 × ancho+1` (`C27`,`C28`); contorno
`roundUpToMm(contornoScad + (llevaCurva ? 1,5 : 0))`; paño delantero (`G10`)
`ancho + recogida(recogeDelante).delante` × `altoDelante + 4,5`; paño trasero
(`G11`) `ancho + recogida(recogeAtras).delante` × `altoAtras + 4,5` (columna
DELANTE adrede, ver P1); paño contorno (`G12`) ancho =
`largo + (enfundar ? 13 : 3) + recogida(recogeDelante).lateralSoloDelante +
recogida(recogeAtras).lateralSoloAtras`, alto = contorno ajustado (null si
contorno 0); ollaos largo sobre `largo` pedido y ancho sobre `ancho hecho`
(`C28`); metros tela (hoja RPS `D7`) =
`cantidad × (anchoPanoDelantero + anchoPanoTrasero + anchoPanoContorno) / 100`
redondeado a 2 decimales (0 si falta contorno).

- [ ] **Step 1: Test que falla**

```ts
// src/lib/calc/__tests__/lona.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { calcLona, type LonaInput } from "@/lib/calc/lona";

const base: LonaInput = {
  cabecera: {
    numeroPedido: "AR2602796", version: "10", cliente: "REMOLQUES YAGÜE",
    revision: "JAIME", realizadoPor: "ADRIAN", fecha: "2026-06-11", fechaSalida: "",
  },
  cantidad: 1, largo: 250, ancho: 151,
  altoDelante: 62, altoAtras: 62,
  contornoScad: 270, llevaCurva: false,
  tipoPerfil: "TIPO 02",
  recogeDelante: "NO", recogeAtras: "CREMALLERA",
  bastillaEnfundar: false, ventana: false,
  rotulacion: true, textoRotulacion: "YAGUE",
  modoOllaos: "REPARTIDOS", pasoOllaos: 35,
  ollaosManuales: { laterales: [], atras: [], delante: [] },
  material: "LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN",
  observaciones: "",
};

describe("calcLona — caso real AR2602796", () => {
  const res = calcLona(base, DEFAULT_PARAMS);

  it("lona hecha 251 x 152", () => {
    expect(res.lonaHecha).toEqual({ largo: 251, ancho: 152 });
  });
  it("paños delantero/trasero 154 x 66,5", () => {
    expect(res.panoDelantero).toMatchObject({ ancho: 154, alto: 66.5 });
    expect(res.panoTrasero).toMatchObject({ ancho: 154, alto: 66.5 });
  });
  it("paño contorno 253 x 270", () => {
    expect(res.panoContorno).toMatchObject({ ancho: 253, alto: 270 });
  });
  it("textos de recogida", () => {
    expect(res.recogeDelanteTexto).toBe("NO RECOGE");
    expect(res.recogeAtrasTexto).toBe("RECOGE ATRÁS CON CREMALLERA");
  });
  it("metros de tela = (154+154+253)/100", () => {
    expect(res.metrosTela).toBe(5.61);
  });
});

describe("calcLona — variantes", () => {
  it("bastilla de enfundar suma 13 al paño contorno", () => {
    const res = calcLona({ ...base, bastillaEnfundar: true }, DEFAULT_PARAMS);
    expect(res.panoContorno?.ancho).toBe(263);
    expect(res.notas.join(" ")).toContain("enfundar");
  });
  it("curva suma 1,5 al contorno y redondea hacia arriba al mm", () => {
    const res = calcLona({ ...base, llevaCurva: true, contornoScad: 270.02 }, DEFAULT_PARAMS);
    expect(res.contornoAjustado).toBe(271.6);
    expect(res.panoContorno?.alto).toBe(271.6);
  });
  it("PUENTES LATERALES: paño trasero usa columna DELANTE (paridad Excel, P1)", () => {
    const res = calcLona({ ...base, recogeAtras: "PUENTES LATERALES" }, DEFAULT_PARAMS);
    expect(res.panoTrasero.ancho).toBe(151 + 41); // no 151 + 21
    expect(res.panoContorno?.ancho).toBe(253 + 9); // lateralSoloAtras
  });
  it("GOMA delante: demasía 27 y nota de orejas", () => {
    const res = calcLona({ ...base, recogeDelante: "GOMA" }, DEFAULT_PARAMS);
    expect(res.panoDelantero.ancho).toBe(178);
    expect(res.notas.join(" ")).toContain("GOMA");
  });
  it("sin contorno: paño contorno null y metros tela 0", () => {
    const res = calcLona({ ...base, contornoScad: 0 }, DEFAULT_PARAMS);
    expect(res.panoContorno).toBeNull();
    expect(res.metrosTela).toBe(0);
  });
  it("modo SEGUN SE INDICA usa las posiciones manuales", () => {
    const manuales = { laterales: [2.5, 37.6], atras: [2.5], delante: [2.5] };
    const res = calcLona({ ...base, modoOllaos: "SEGUN SE INDICA", ollaosManuales: manuales }, DEFAULT_PARAMS);
    expect(res.reparto).toEqual(manuales);
  });
  it("cantidad 2 duplica metros de tela", () => {
    const res = calcLona({ ...base, cantidad: 2 }, DEFAULT_PARAMS);
    expect(res.metrosTela).toBe(11.22);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test`
Expected: FAIL — módulo `lona` no existe.

- [ ] **Step 3: Implementación**

```ts
// src/lib/calc/lona.ts
import { excelRound, roundUpToMm } from "@/lib/calc/redondeo";
import { findRecogida, type CalcParams, type TipoPerfil } from "@/lib/calc/params";
import { calcOllaos, type OllaosResult } from "@/lib/calc/ollaos";

// P1 del spec: el Excel (G11 y RPS D7) usa la columna DELANTE también para el
// paño trasero. Cambiar a true si oficina técnica confirma que era un descuido.
export const USAR_COLUMNA_ATRAS = false;

export interface CabeceraInput {
  numeroPedido: string; version: string; cliente: string; revision: string;
  realizadoPor: string; fecha: string; fechaSalida: string;
}

export interface LonaInput {
  cabecera: CabeceraInput;
  cantidad: number; largo: number; ancho: number;
  altoDelante: number; altoAtras: number;
  contornoScad: number; llevaCurva: boolean;
  tipoPerfil: TipoPerfil;
  recogeDelante: string; recogeAtras: string;
  bastillaEnfundar: boolean; ventana: boolean;
  rotulacion: boolean; textoRotulacion: string;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA";
  pasoOllaos: number;
  ollaosManuales: { laterales: number[]; atras: number[]; delante: number[] };
  material: string; observaciones: string;
}

export interface Pano { ancho: number; alto: number; etiqueta: string }

export interface LonaResult {
  lonaHecha: { largo: number; ancho: number };
  contornoAjustado: number;
  panoDelantero: Pano; panoTrasero: Pano; panoContorno: Pano | null;
  ollaos: OllaosResult;
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  metrosTela: number;
  recogeDelanteTexto: string; recogeAtrasTexto: string;
  notas: string[];
}

const r1 = (v: number) => excelRound(v, 1);

export function calcLona(input: LonaInput, params: CalcParams): LonaResult {
  const recDel = findRecogida(params, input.recogeDelante);
  const recAtr = findRecogida(params, input.recogeAtras);

  const lonaHecha = {
    largo: r1(input.largo + params.demasiaLonaHecha),
    ancho: r1(input.ancho + params.demasiaLonaHecha),
  };

  const contornoAjustado =
    input.contornoScad > 0
      ? roundUpToMm(input.contornoScad + (input.llevaCurva ? params.aumentoCurvaContorno : 0))
      : 0;

  const panoDelantero: Pano = {
    ancho: r1(input.ancho + recDel.delante),
    alto: r1(input.altoDelante + params.demasiaAlto),
    etiqueta: "PAÑO DELANTERO",
  };
  const demasiaTrasera = USAR_COLUMNA_ATRAS ? recAtr.atras : recAtr.delante;
  const panoTrasero: Pano = {
    ancho: r1(input.ancho + demasiaTrasera),
    alto: r1(input.altoAtras + params.demasiaAlto),
    etiqueta: "PAÑO TRASERO",
  };

  const demasiaContorno = input.bastillaEnfundar
    ? params.demasiaContornoEnfundar
    : params.demasiaContornoNormal;
  const panoContorno: Pano | null =
    contornoAjustado > 0
      ? {
          ancho: r1(input.largo + demasiaContorno + recDel.lateralSoloDelante + recAtr.lateralSoloAtras),
          alto: contornoAjustado,
          etiqueta: "PAÑO CONTORNO",
        }
      : null;

  const ollaos = calcOllaos(input.largo, lonaHecha.ancho, input.pasoOllaos, params);
  const reparto =
    input.modoOllaos === "SEGUN SE INDICA"
      ? input.ollaosManuales
      : {
          laterales: ollaos.largo.posiciones,
          atras: ollaos.ancho.posiciones,
          delante: ollaos.ancho.posiciones,
        };

  const metrosTela = panoContorno
    ? excelRound(
        (input.cantidad * (panoDelantero.ancho + panoTrasero.ancho + panoContorno.ancho)) / 100,
        2,
      )
    : 0;

  const notas: string[] = [];
  if (input.recogeDelante === "GOMA" || input.recogeAtras === "GOMA") {
    notas.push("Recoge con GOMA: preparar orejas por lado.");
  }
  if (input.bastillaEnfundar) notas.push("Bastilla de enfundar: paño contorno con demasía 13.");
  if (input.llevaCurva) notas.push(`Contorno con curva: +${params.aumentoCurvaContorno} cm.`);
  if (input.ventana) notas.push("Ventana indicada: verificar en taller.");
  if (input.rotulacion) {
    notas.push(input.textoRotulacion ? `Rotulación: ${input.textoRotulacion}.` : "Incluye rotulación.");
  }

  const textoRecogida = (lado: "DELANTE" | "ATRÁS", nombre: string) =>
    nombre === "NO" ? "NO RECOGE" : `RECOGE ${lado} CON ${nombre}`;

  return {
    lonaHecha, contornoAjustado,
    panoDelantero, panoTrasero, panoContorno,
    ollaos, reparto, metrosTela,
    recogeDelanteTexto: textoRecogida("DELANTE", input.recogeDelante),
    recogeAtrasTexto: textoRecogida("ATRÁS", input.recogeAtras),
    notas,
  };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test`
Expected: PASS (11 tests de lona).

- [ ] **Step 5: Commit**

```powershell
git add src/lib/calc
git commit -m "feat(calc): calculo de lona remolque replica del Excel"
```

---

### Task 6: Cálculo baquetón

**Files:**
- Create: `src/lib/calc/baqueton.ts`
- Test: `src/lib/calc/__tests__/baqueton.test.ts`

**Interfaces:**
- Consumes: `excelRound` (Task 2); `CalcParams`, `findClienteBaqueton` (Task 3); `calcOllaos`, `OllaosResult` (Task 4); `CabeceraInput` (Task 5).
- Produces:

```ts
export interface BaquetonInput {
  cabecera: CabeceraInput;
  cantidad: number; largo: number; ancho: number; baqueton: number;
  clienteEspecifico: string; // "GENERAL" | "HIJOS DE PEDRO LOPEZ" | "AYALA" | "GENERAL WOLDER"
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA";
  pasoOllaos: number;
  ollaosManuales: { laterales: number[]; atras: number[]; delante: number[] };
  rotulacion: boolean; textoRotulacion: string;
  material: string; observaciones: string;
}
export interface BaquetonResult {
  panoUnico: { largo: number; ancho: number };
  remolqueHecho: { largo: number; ancho: number };
  baquetonCostura: number;
  esquinaDelante: number; esquinaDetras: number;
  baquetonTrasero: number | null; // solo HPL: baqueton + 10, "NO EN LÍNEA"
  superficieM2: number;
  ollaos: OllaosResult;
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  metrosTela: number;
  notas: string[];
}
export function calcBaqueton(input: BaquetonInput, params: CalcParams): BaquetonResult;
```

Fórmulas Excel (BAQUETÓN): paño (`C26`,`C27`) `largo + 2×baquetón + 7 + extraLargoCostura`
× `ancho + 2×baquetón + 7 + extraAnchoCostura`; baquetón+costura (`C28`)
`baquetón + 2`; esquinas (`AD10`/`L10`) `baquetónCostura + extraBaquetonLargoDelante/Detras`;
remolque hecho (`G21`,`G22`) `largo + 1 + extraLargoFinal` × `ancho + 1 + extraAnchoFinal`;
baquetón trasero (`G24`) solo si `extraBaquetonTrasero > 0`: `baquetón + extra` («NO EN LÍNEA»);
superficie (`G17`) `pañoLargo × pañoAncho / 10000` m²/ud (4 decimales); ollaos
(`C37–C40`) sobre las medidas **hechas**; metros tela (RPS `D6`)
`cantidad × pañoLargo / 100` (2 decimales).

- [ ] **Step 1: Test que falla**

```ts
// src/lib/calc/__tests__/baqueton.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";

const base: BaquetonInput = {
  cabecera: {
    numeroPedido: "AR2602796", version: "10", cliente: "REMOLQUES YAGÜE",
    revision: "JAIME", realizadoPor: "ADRIAN", fecha: "2026-06-11", fechaSalida: "",
  },
  cantidad: 1, largo: 181, ancho: 121, baqueton: 22,
  clienteEspecifico: "GENERAL",
  modoOllaos: "REPARTIDOS", pasoOllaos: 35,
  ollaosManuales: { laterales: [], atras: [], delante: [] },
  rotulacion: true, textoRotulacion: "YAGUE",
  material: "LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN",
  observaciones: "",
};

describe("calcBaqueton — caso real AR2602796", () => {
  const res = calcBaqueton(base, DEFAULT_PARAMS);

  it("paño único 232 x 172", () => {
    expect(res.panoUnico).toEqual({ largo: 232, ancho: 172 });
  });
  it("remolque hecho 182 x 122, baquetón 22 en línea", () => {
    expect(res.remolqueHecho).toEqual({ largo: 182, ancho: 122 });
    expect(res.baquetonTrasero).toBeNull();
  });
  it("baquetón + costura 24 (esquinas del dibujo)", () => {
    expect(res.baquetonCostura).toBe(24);
    expect(res.esquinaDelante).toBe(24);
    expect(res.esquinaDetras).toBe(24);
  });
  it("superficie 3,9904 m2", () => {
    expect(res.superficieM2).toBe(3.9904);
  });
  it("metros de tela 2,32", () => {
    expect(res.metrosTela).toBe(2.32);
  });
  it("ollaos sobre medidas hechas: largo 182 → 5 uds a 36,4", () => {
    expect(res.ollaos.largo.n).toBe(5);
    expect(res.ollaos.largo.dist).toBe(36.4);
  });
});

describe("calcBaqueton — clientes específicos", () => {
  it("HIJOS DE PEDRO LOPEZ: +11/+2 costura, esquinas 25/35, baquetón trasero 32", () => {
    const res = calcBaqueton({ ...base, clienteEspecifico: "HIJOS DE PEDRO LOPEZ" }, DEFAULT_PARAMS);
    expect(res.panoUnico).toEqual({ largo: 243, ancho: 174 });
    expect(res.esquinaDelante).toBe(25);  // 24 + 1
    expect(res.esquinaDetras).toBe(35);   // 24 + 11
    expect(res.baquetonTrasero).toBe(32); // 22 + 10
    expect(res.notas.join(" ")).toContain("REFORZAR");
  });
  it("AYALA: +1 en costuras y +1 en medidas finales", () => {
    const res = calcBaqueton({ ...base, clienteEspecifico: "AYALA" }, DEFAULT_PARAMS);
    expect(res.panoUnico).toEqual({ largo: 233, ancho: 173 });
    expect(res.remolqueHecho).toEqual({ largo: 183, ancho: 123 });
  });
  it("GENERAL WOLDER: −1 en costuras, −0,5 en esquinas y 3 observaciones fijas", () => {
    const res = calcBaqueton({ ...base, clienteEspecifico: "GENERAL WOLDER" }, DEFAULT_PARAMS);
    expect(res.panoUnico).toEqual({ largo: 231, ancho: 171 });
    expect(res.esquinaDelante).toBe(23.5);
    expect(res.notas).toEqual(expect.arrayContaining(["OLLAOS EN ALTA FRECUENCIA", "MANDAR GOMA SUELTA"]));
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test`
Expected: FAIL — módulo `baqueton` no existe.

- [ ] **Step 3: Implementación**

```ts
// src/lib/calc/baqueton.ts
import { excelRound } from "@/lib/calc/redondeo";
import { findClienteBaqueton, type CalcParams } from "@/lib/calc/params";
import { calcOllaos, type OllaosResult } from "@/lib/calc/ollaos";
import type { CabeceraInput } from "@/lib/calc/lona";

export interface BaquetonInput {
  cabecera: CabeceraInput;
  cantidad: number; largo: number; ancho: number; baqueton: number;
  clienteEspecifico: string;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA";
  pasoOllaos: number;
  ollaosManuales: { laterales: number[]; atras: number[]; delante: number[] };
  rotulacion: boolean; textoRotulacion: string;
  material: string; observaciones: string;
}

export interface BaquetonResult {
  panoUnico: { largo: number; ancho: number };
  remolqueHecho: { largo: number; ancho: number };
  baquetonCostura: number;
  esquinaDelante: number; esquinaDetras: number;
  baquetonTrasero: number | null;
  superficieM2: number;
  ollaos: OllaosResult;
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  metrosTela: number;
  notas: string[];
}

const r1 = (v: number) => excelRound(v, 1);

export function calcBaqueton(input: BaquetonInput, params: CalcParams): BaquetonResult {
  const cli = findClienteBaqueton(params, input.clienteEspecifico);

  const panoUnico = {
    largo: r1(input.largo + 2 * input.baqueton + params.baquetonDemasiaLargoCostura + cli.extraLargoCostura),
    ancho: r1(input.ancho + 2 * input.baqueton + params.baquetonDemasiaAnchoCostura + cli.extraAnchoCostura),
  };
  const baquetonCostura = r1(input.baqueton + params.baquetonDemasiaCostura);
  const remolqueHecho = {
    largo: r1(input.largo + params.baquetonDemasiaFinal + cli.extraLargoFinal),
    ancho: r1(input.ancho + params.baquetonDemasiaFinal + cli.extraAnchoFinal),
  };

  const ollaos = calcOllaos(remolqueHecho.largo, remolqueHecho.ancho, input.pasoOllaos, params);
  const reparto =
    input.modoOllaos === "SEGUN SE INDICA"
      ? input.ollaosManuales
      : {
          laterales: ollaos.largo.posiciones,
          atras: ollaos.ancho.posiciones,
          delante: ollaos.ancho.posiciones,
        };

  const notas: string[] = [...cli.observaciones];
  if (input.rotulacion) {
    notas.push(input.textoRotulacion ? `Rotulación: ${input.textoRotulacion}.` : "Incluye rotulación.");
  }

  return {
    panoUnico, remolqueHecho, baquetonCostura,
    esquinaDelante: r1(baquetonCostura + cli.extraBaquetonLargoDelante),
    esquinaDetras: r1(baquetonCostura + cli.extraBaquetonLargoDetras),
    baquetonTrasero: cli.extraBaquetonTrasero > 0 ? r1(input.baqueton + cli.extraBaquetonTrasero) : null,
    superficieM2: excelRound((panoUnico.largo * panoUnico.ancho) / 10000, 4),
    ollaos, reparto,
    metrosTela: excelRound((input.cantidad * panoUnico.largo) / 100, 2),
    notas,
  };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test`
Expected: PASS. Nota HPL: «ABIERTO EN LA PARTE TRASERA (REFORZAR)» viene de las observaciones del cliente en `params.ts`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/calc
git commit -m "feat(calc): calculo de baqueton con demasias por cliente"
```

---

### Task 7: Materiales — lonas PVC de RPS con semilla TC de respaldo

(Decisión de Iván 2026-07-14: los materiales seleccionables son TODAS las
lonas PVC de RPS, no solo las 50 del Excel. RPS es solo lectura.)

**Files:**
- Create: `src/lib/calc/materiales-seed.ts`
- Create: `src/lib/store/rps-materiales.ts`
- Test: `src/lib/calc/__tests__/materiales.test.ts`
- Test: `src/lib/store/__tests__/rps-materiales.test.ts`

**Interfaces:**
- Produces: `export interface Material { nombre: string; codigoBobina: string }` y `export const MATERIALES_SEED: Material[]` (las 50 lonas de la hoja TC, en el mismo orden) en `materiales-seed.ts`; y en `rps-materiales.ts`:

```ts
export function rowsToMateriales(rows: Array<{ CodArticle: string; Description: string }>): Material[];
export async function getMateriales(): Promise<Material[]>;
// Lee de RPS (SQL Server RPS_HOST/RPSNext, usuario de solo lectura) los artículos
// activos de CodCompany '001', IDProductSubFamily '8fcf241e-fcfa-4760-8992-26e35c031ffc'
// (= PLASTICA (LONA)) cuya Description contiene el patrón ':COLOR :ANCHO'
// (LIKE '%:%:%'). Caché en memoria 1 h. Si RPS falla: última caché o MATERIALES_SEED.
```

- [ ] **Step 1: Test que falla**

```ts
// src/lib/calc/__tests__/materiales.test.ts
import { describe, expect, it } from "vitest";
import { MATERIALES_SEED } from "@/lib/calc/materiales-seed";

describe("MATERIALES_SEED (hoja TC)", () => {
  it("50 materiales, sin códigos duplicados", () => {
    expect(MATERIALES_SEED).toHaveLength(50);
    const codigos = MATERIALES_SEED.map((m) => m.codigoBobina);
    expect(new Set(codigos).size).toBe(50);
  });
  it("casos conocidos", () => {
    expect(
      MATERIALES_SEED.find((m) => m.nombre === "LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN")?.codigoBobina,
    ).toBe("ALPHAAZ15P250");
    expect(
      MATERIALES_SEED.find((m) => m.codigoBobina === "NS86GR38P250")?.nombre,
    ).toBe("LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN");
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 3: Implementación**

Transcribir la hoja TC completa (B4:C53 del Excel). Los nombres se copian **exactamente** (espacios dobles incluidos):

```ts
// src/lib/calc/materiales-seed.ts
export interface Material { nombre: string; codigoBobina: string }

export const MATERIALES_SEED: Material[] = [
  { nombre: "LONA ALPHA 1L 580 :AMARILLO RAL1003 :250 AN", codigoBobina: "ALPHAAM03P250" },
  { nombre: "LONA ALPHA 1L 580 :AMARILLO RAL1018 :250 AN", codigoBobina: "ALPHAAM18P250" },
  { nombre: "LONA ALPHA 1L 580 :ARENA  :250 AN", codigoBobina: "ALPHAARENP250" },
  { nombre: "LONA ALPHA 1L 580: AZUL RAL5015: 220 AN", codigoBobina: "ALPHAAZ15P220" },
  { nombre: "LONA ALPHA 1L 580  :AZUL EUROPA :250 AN", codigoBobina: "ALPHAAZEUP250" },
  { nombre: "LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN", codigoBobina: "ALPHAAZ15P250" },
  { nombre: "LONA RECORD 1 L 580:BLANCO 099 RAL 9010:220 AN", codigoBobina: "RECORDBL10P220" },
  { nombre: "LONA STARPLUS 1L 610  :BLANCO RAL9010 :250 AN", codigoBobina: "STPLUSBL10P250" },
  { nombre: "LONA STARPLUS 1L 610  :BLANCO RAL9010 :300 AN", codigoBobina: "STPLUSBL10P300" },
  { nombre: "LONA STARPLUS 1L 610:BURDEOS 179:250 AN", codigoBobina: "STPLUSBURDP250" },
  { nombre: "LONA STARPLUS 1L 610:CREMA RA1014:250 AN", codigoBobina: "STPLUSCR14P250" },
  { nombre: "LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN", codigoBobina: "STPLUSGR37P250" },
  { nombre: "LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN", codigoBobina: "RECORDGR38P220" },
  { nombre: "LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN", codigoBobina: "STPLUSGR38P250" },
  { nombre: "LONA STARPLUS 1L 610:MARFIL RAL1013:250 AN", codigoBobina: "STPLUSMA13P250" },
  { nombre: "LONA ALPHA 1L 580 :MARRON - 204 MC :250 AN", codigoBobina: "ALPHAMR04P250" },
  { nombre: "LONA ALPHA 1L 580 :NARANJA RAL2004 :250 AN", codigoBobina: "ALPHANA04P250" },
  { nombre: "LONA ALPHA 1L 580: NEGRO: 220 AN", codigoBobina: "ALPHANEGRP220" },
  { nombre: "LONA ALPHA 1L 580  :NEGRO :250 AN", codigoBobina: "ALPHANEGRP250" },
  { nombre: "LONA STARPLUS 1L 610:PLATA 092:250 AN", codigoBobina: "STPLUSPLATP250" },
  { nombre: "LONA STARPLUS 1L 610  :ROJO RAL3002 :250 AN", codigoBobina: "STPLUSRO02P250" },
  { nombre: "LONA ALPHA 1L 580 :VERDE RAL6024 :250 AN", codigoBobina: "ALPHAVE24P250" },
  { nombre: "LONA ALPHA 1L 580: VERDE RAL 6026: 220 AN", codigoBobina: "ALPHAVE26P220" },
  { nombre: "LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN", codigoBobina: "ALPHAVE26P250" },
  { nombre: "LONA G650 2L 650 :AMARILLO RAL1003 :250 AN", codigoBobina: "G650AM03P250" },
  { nombre: "LONA G650 2L 650 :AZUL RAL5015 :250 AN (M5729)", codigoBobina: "G650AZ15P250" },
  { nombre: "LONA G650 2L 650 :AZUL EUROPA 95 :250 AN (M5731)", codigoBobina: "G650AZEUP250" },
  { nombre: "LONA LAC 640 2L 640GR :BLANCO RAL9010 :250 AN", codigoBobina: "LAC640BL10P250" },
  { nombre: "LONA LAC 640 2L 640GR :BLANCO RAL9010 :300 AN", codigoBobina: "LAC640BL10P300" },
  { nombre: "LONA G650 2L 650 :BURDEOS 3C-596 :250 AN (M5715)", codigoBobina: "G650BURDP250" },
  { nombre: "LONA G650 2L 650:CREMA RA1014:250 AN (M5724)", codigoBobina: "G650CR14P250" },
  { nombre: "LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736)", codigoBobina: "G650GR37P250" },
  { nombre: "LONA G650 2L 650 :GRIS RAL7038 :250 AN (M5739)", codigoBobina: "G650GR38P250" },
  { nombre: "LONA LAC650 IGN.M2 680:BLANCO RAL 9010 867:250 AN", codigoBobina: "LAC650BLANP250" },
  { nombre: "LONA LAC650 IGN.M2 680:BLANCO RAL 9010 867:300 AN", codigoBobina: "LAC650BLANP300" },
  { nombre: "LONA G650 2L 650 :NEGRO :250 AN (M5734)", codigoBobina: "G650NEGRP250" },
  { nombre: "LONA G650 2L 650 :ROJO :250 AN (M5714)", codigoBobina: "G650ROJOP250" },
  { nombre: "LONA G650 2L 650:VERDE RAL6024:250 AN", codigoBobina: "G650VE24P250" },
  { nombre: "LONA G650 2L 650 :VERDE RAL6026 :250 AN (M5728)", codigoBobina: "G650VE26P250" },
  { nombre: "LONA GAMMA2 IGN.M2 620:NEGRO:250 AN", codigoBobina: "GAMAM2NEGRP250" },
  { nombre: "LONA ALPHA 1L 580: AZUL EUROPA-95 : 220 AN", codigoBobina: "ALPHAAZEUP220" },
  { nombre: "LONA LAC 640 2L 640GR: NEGRO RAL9005 :300 AN", codigoBobina: "LAC640NE05P300" },
  { nombre: "LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN", codigoBobina: "NS86GR38P250" },
  { nombre: "LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN", codigoBobina: "NS86GR37P250" },
  { nombre: "LONA NS86 2L 630GR [580]: ROJO (COR/400): 250 AN", codigoBobina: "NS86ROJOP250" },
  { nombre: "LONA NS86 2L 630GR [580]: BLANCO : 250 AN", codigoBobina: "NS86BLANP250" },
  { nombre: "LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN", codigoBobina: "MONZAGR38P250" },
  { nombre: "LONA MONZA 1 L 580 G/M2: GRIS RAL 7037: 250 AN", codigoBobina: "MONZAGR37P250" },
  { nombre: "LONA NS86 2L 630GR  [580]: AZUL CLARO 5015 : 250 AN", codigoBobina: "NS86AZ15P250" },
  { nombre: "LONA STARPLUS 1L 610 : AZUL EUROPA R-073 : 250 AN ( 580 )", codigoBobina: "STPLUSAZEUP250" },
];
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test` — Expected: PASS.

- [ ] **Step 5: Test del módulo RPS (falla)**

```ts
// src/lib/store/__tests__/rps-materiales.test.ts
import { describe, expect, it } from "vitest";
import { rowsToMateriales } from "@/lib/store/rps-materiales";

describe("rowsToMateriales", () => {
  it("mapea CodArticle/Description con trim y descarta vacíos", () => {
    const out = rowsToMateriales([
      { CodArticle: "ALPHAAZ15P250 ", Description: " LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)" },
      { CodArticle: "  ", Description: "SIN CODIGO" },
    ]);
    expect(out).toEqual([
      {
        codigoBobina: "ALPHAAZ15P250",
        nombre: "LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)",
      },
    ]);
  });
});
```

Run: `pnpm test` — Expected: FAIL (módulo no existe).

- [ ] **Step 6: Implementación `rps-materiales.ts`**

```ts
// src/lib/store/rps-materiales.ts
import sql from "mssql";
import { MATERIALES_SEED, type Material } from "@/lib/calc/materiales-seed";

// Subfamilia "PLASTICA (LONA)" (lonas PVC) de la empresa 001 en RPSNext.
const SUBFAMILIA_PLASTICA_LONA = "8fcf241e-fcfa-4760-8992-26e35c031ffc";
const CACHE_MS = 60 * 60 * 1000;

let cache: { data: Material[]; at: number } | null = null;
let pool: Promise<sql.ConnectionPool> | null = null;

function config(): sql.config {
  return {
    server: process.env.RPS_DB_HOST ?? "RPS_HOST",
    port: Number(process.env.RPS_DB_PORT ?? 1433),
    database: process.env.RPS_DB_DATABASE ?? "RPSNext",
    user: process.env.RPS_DB_USER ?? "",
    password: process.env.RPS_DB_PASSWORD ?? "",
    // SQL Server 2014: TLS viejo no negocia con Node moderno → sin cifrado (red interna).
    options: { encrypt: false, trustServerCertificate: true },
    pool: { max: 2, min: 0, idleTimeoutMillis: 30_000 },
    connectionTimeout: 8_000,
  };
}

function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = new sql.ConnectionPool(config()).connect().catch((e) => {
      pool = null;
      throw e;
    });
  }
  return pool;
}

export function rowsToMateriales(
  rows: Array<{ CodArticle: string; Description: string }>,
): Material[] {
  return rows
    .map((r) => ({
      codigoBobina: (r.CodArticle ?? "").trim(),
      nombre: (r.Description ?? "").trim(),
    }))
    .filter((m) => m.codigoBobina !== "" && m.nombre !== "");
}

/**
 * Lonas PVC de RPS: artículos activos de la empresa 001, subfamilia
 * PLASTICA (LONA), solo variantes reales de bobina (Description con
 * ':COLOR :ANCHO'). Caché 1 h; si RPS no responde, última caché o semilla TC.
 */
export async function getMateriales(): Promise<Material[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    const p = await getPool();
    const res = await p.request().input("sub", sql.VarChar, SUBFAMILIA_PLASTICA_LONA)
      .query(`
        SELECT CodArticle, Description FROM STKArticle
        WHERE CodCompany = '001'
          AND IDProductSubFamily = @sub
          AND InactiveDate IS NULL
          AND Description LIKE '%:%:%'
        ORDER BY Description`);
    const data = rowsToMateriales(res.recordset);
    if (data.length > 0) {
      cache = { data, at: Date.now() };
      return data;
    }
    return cache?.data ?? MATERIALES_SEED;
  } catch {
    return cache?.data ?? MATERIALES_SEED;
  }
}
```

- [ ] **Step 7: Verificar que pasa**

Run: `pnpm test` — Expected: PASS (el acceso real a RPS no se testea en unitarios; se comprueba en navegador en Task 13).

- [ ] **Step 8: Commit**

```powershell
git add src/lib/calc src/lib/store
git commit -m "feat(materiales): lonas pvc de rps con semilla tc de respaldo"
```

---

### Task 8: Interfaz de almacenamiento + driver de fichero

**Files:**
- Create: `src/lib/store/types.ts`
- Create: `src/lib/store/file-store.ts`
- Create: `src/lib/store/index.ts`
- Test: `src/lib/store/__tests__/file-store.test.ts`
- Modify: `.gitignore` (añadir línea `data/`)

**Interfaces:**
- Consumes: `LonaInput`, `LonaResult` (Task 5); `BaquetonInput`, `BaquetonResult` (Task 6); `CalcParams` (Task 3); `Material` (Task 7).
- Produces:

```ts
// src/lib/store/types.ts
export type TipoPlanteamiento = "lona" | "baqueton";
export interface PlanteamientoRecord {
  id: string;                    // uuid
  tipo: TipoPlanteamiento;
  numeroPedido: string;
  version: string;
  cliente: string;
  input: LonaInput | BaquetonInput;      // JSON
  result: LonaResult | BaquetonResult;   // JSON
  paramsSnapshot: CalcParams;            // JSON
  pdfPath: string | null;
  createdAt: string;             // ISO
  updatedAt: string;             // ISO
}
export interface ListadoFiltro { texto?: string; tipo?: TipoPlanteamiento; limit?: number }
export interface PlanteamientoStore {
  list(filtro?: ListadoFiltro): Promise<PlanteamientoRecord[]>;   // más reciente primero
  get(id: string): Promise<PlanteamientoRecord | null>;
  save(rec: Omit<PlanteamientoRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<PlanteamientoRecord>;
}
// src/lib/store/index.ts
export function getStore(): PlanteamientoStore; // env DATASOURCE: "mssql" → MssqlStore, resto → FileStore
```

(Los materiales NO viven en el store local: se leen de RPS vía
`getMateriales()` de la Task 7.)

- [ ] **Step 1: Test que falla**

```ts
// src/lib/store/__tests__/file-store.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import type { LonaInput, LonaResult } from "@/lib/calc/lona";

const dirs: string[] = [];
function makeStore() {
  const dir = mkdtempSync(path.join(tmpdir(), "tgm-store-"));
  dirs.push(dir);
  return new FileStore(dir);
}
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

const rec = {
  tipo: "lona" as const,
  numeroPedido: "AR2602796", version: "10", cliente: "REMOLQUES YAGÜE",
  input: { cantidad: 1 } as unknown as LonaInput,
  result: { metrosTela: 5.61 } as unknown as LonaResult,
  paramsSnapshot: DEFAULT_PARAMS,
  pdfPath: null,
};

describe("FileStore", () => {
  it("save asigna id y fechas; get lo recupera", async () => {
    const store = makeStore();
    const saved = await store.save(rec);
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    expect(await store.get(saved.id)).toMatchObject({ numeroPedido: "AR2602796" });
    expect(await store.get("no-existe")).toBeNull();
  });

  it("save con id existente actualiza (nueva versión de datos)", async () => {
    const store = makeStore();
    const saved = await store.save(rec);
    const updated = await store.save({ ...rec, id: saved.id, version: "11" });
    expect(updated.id).toBe(saved.id);
    expect(updated.version).toBe("11");
    expect((await store.list()).length).toBe(1);
  });

  it("list filtra por texto (pedido o cliente) y ordena por fecha desc", async () => {
    const store = makeStore();
    await store.save(rec);
    await store.save({ ...rec, numeroPedido: "AR2699999", cliente: "OTRO" });
    const todos = await store.list();
    expect(todos[0].numeroPedido).toBe("AR2699999");
    expect(await store.list({ texto: "yagüe" })).toHaveLength(1);
    expect(await store.list({ tipo: "baqueton" })).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 3: Implementación**

```ts
// src/lib/store/types.ts
import type { LonaInput, LonaResult } from "@/lib/calc/lona";
import type { BaquetonInput, BaquetonResult } from "@/lib/calc/baqueton";
import type { CalcParams } from "@/lib/calc/params";

export type TipoPlanteamiento = "lona" | "baqueton";

export interface PlanteamientoRecord {
  id: string;
  tipo: TipoPlanteamiento;
  numeroPedido: string;
  version: string;
  cliente: string;
  input: LonaInput | BaquetonInput;
  result: LonaResult | BaquetonResult;
  paramsSnapshot: CalcParams;
  pdfPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListadoFiltro { texto?: string; tipo?: TipoPlanteamiento; limit?: number }

export interface PlanteamientoStore {
  list(filtro?: ListadoFiltro): Promise<PlanteamientoRecord[]>;
  get(id: string): Promise<PlanteamientoRecord | null>;
  save(
    rec: Omit<PlanteamientoRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<PlanteamientoRecord>;
}
```

```ts
// src/lib/store/file-store.ts
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ListadoFiltro, PlanteamientoRecord, PlanteamientoStore } from "@/lib/store/types";

/** Driver de desarrollo: dos ficheros JSON en `data/`. */
export class FileStore implements PlanteamientoStore {
  constructor(private readonly dir: string) {}

  private file(name: string) { return path.join(this.dir, name); }

  private readAll(): PlanteamientoRecord[] {
    const f = this.file("planteamientos.json");
    if (!existsSync(f)) return [];
    return JSON.parse(readFileSync(f, "utf8")) as PlanteamientoRecord[];
  }

  private writeAll(recs: PlanteamientoRecord[]) {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.file("planteamientos.json"), JSON.stringify(recs, null, 1), "utf8");
  }

  async list(filtro?: ListadoFiltro): Promise<PlanteamientoRecord[]> {
    let recs = this.readAll();
    if (filtro?.tipo) recs = recs.filter((r) => r.tipo === filtro.tipo);
    if (filtro?.texto) {
      const t = filtro.texto.toLowerCase();
      recs = recs.filter(
        (r) => r.numeroPedido.toLowerCase().includes(t) || r.cliente.toLowerCase().includes(t),
      );
    }
    recs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return recs.slice(0, filtro?.limit ?? 200);
  }

  async get(id: string): Promise<PlanteamientoRecord | null> {
    return this.readAll().find((r) => r.id === id) ?? null;
  }

  async save(
    rec: Omit<PlanteamientoRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<PlanteamientoRecord> {
    const recs = this.readAll();
    const now = new Date().toISOString();
    const existing = rec.id ? recs.find((r) => r.id === rec.id) : undefined;
    const saved: PlanteamientoRecord = {
      ...rec,
      id: existing?.id ?? rec.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.writeAll([...recs.filter((r) => r.id !== saved.id), saved]);
    return saved;
  }
}
```

```ts
// src/lib/store/index.ts
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import type { PlanteamientoStore } from "@/lib/store/types";

let store: PlanteamientoStore | null = null;

export function getStore(): PlanteamientoStore {
  if (!store) {
    if (process.env.DATASOURCE === "mssql") {
      // Se sustituye en Task 9 por MssqlStore; hasta entonces falla claro.
      throw new Error("DATASOURCE=mssql aún no implementado (Task 9)");
    }
    store = new FileStore(path.join(process.cwd(), "data"));
  }
  return store;
}
```

En `.gitignore` añadir la línea `data/`.

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test` — Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/store .gitignore
git commit -m "feat(store): interfaz PlanteamientoStore y driver de fichero"
```

---

### Task 9: Driver SQL Server + schema.sql para IT

**Files:**
- Create: `db/schema.sql`
- Create: `src/lib/store/mssql-store.ts`
- Modify: `src/lib/store/index.ts`
- Create: `.env.example`
- Test: `src/lib/store/__tests__/mssql-store.test.ts` (solo mapeo de filas, sin BD real)

**Interfaces:**
- Consumes: `PlanteamientoStore`, `PlanteamientoRecord` (Task 8).
- Produces: `MssqlStore implements PlanteamientoStore`; `rowToRecord(row): PlanteamientoRecord` exportada para test.

- [ ] **Step 1: `db/schema.sql`** (entregable para IT; los JSON van en NVARCHAR(MAX))

```sql
-- Planteamientos TGM v2 — esquema para SQL Server (ejecutar en la BD que asigne IT)
CREATE TABLE dbo.Planteamientos (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  Tipo VARCHAR(10) NOT NULL CHECK (Tipo IN ('lona','baqueton')),
  NumeroPedido VARCHAR(50) NOT NULL,
  Version VARCHAR(20) NOT NULL DEFAULT '',
  Cliente NVARCHAR(200) NOT NULL DEFAULT '',
  InputJson NVARCHAR(MAX) NOT NULL,
  ResultJson NVARCHAR(MAX) NOT NULL,
  ParamsJson NVARCHAR(MAX) NOT NULL,
  PdfPath NVARCHAR(500) NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Planteamientos_Pedido ON dbo.Planteamientos (NumeroPedido);
CREATE INDEX IX_Planteamientos_UpdatedAt ON dbo.Planteamientos (UpdatedAt DESC);
-- Materiales: no hay tabla local; se leen de RPSNext (STKArticle) en solo lectura.
```

- [ ] **Step 2: Test del mapeo (falla)**

```ts
// src/lib/store/__tests__/mssql-store.test.ts
import { describe, expect, it } from "vitest";
import { rowToRecord } from "@/lib/store/mssql-store";

describe("rowToRecord", () => {
  it("mapea una fila SQL a PlanteamientoRecord", () => {
    const rec = rowToRecord({
      Id: "ABC", Tipo: "lona", NumeroPedido: "AR1", Version: "1", Cliente: "X",
      InputJson: '{"cantidad":1}', ResultJson: '{"metrosTela":2}', ParamsJson: "{}",
      PdfPath: null,
      CreatedAt: new Date("2026-07-13T10:00:00Z"), UpdatedAt: new Date("2026-07-13T11:00:00Z"),
    });
    expect(rec).toMatchObject({
      id: "ABC", tipo: "lona", numeroPedido: "AR1",
      createdAt: "2026-07-13T10:00:00.000Z", updatedAt: "2026-07-13T11:00:00.000Z",
    });
    expect((rec.input as { cantidad: number }).cantidad).toBe(1);
  });
});
```

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 3: Implementación**

```ts
// src/lib/store/mssql-store.ts
import sql from "mssql";
import type { ListadoFiltro, PlanteamientoRecord, PlanteamientoStore } from "@/lib/store/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToRecord(row: any): PlanteamientoRecord {
  return {
    id: row.Id, tipo: row.Tipo,
    numeroPedido: row.NumeroPedido, version: row.Version, cliente: row.Cliente,
    input: JSON.parse(row.InputJson), result: JSON.parse(row.ResultJson),
    paramsSnapshot: JSON.parse(row.ParamsJson),
    pdfPath: row.PdfPath ?? null,
    createdAt: new Date(row.CreatedAt).toISOString(),
    updatedAt: new Date(row.UpdatedAt).toISOString(),
  };
}

function config(): sql.config {
  const req = (name: string) => {
    const v = process.env[name];
    if (!v) throw new Error(`Falta ${name} en .env.local`);
    return v;
  };
  return {
    server: req("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 1433),
    database: req("DB_DATABASE"),
    user: req("DB_USER"),
    password: req("DB_PASSWORD"),
    options: {
      encrypt: process.env.DB_ENCRYPT !== "false",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
    connectionTimeout: 10_000,
  };
}

export class MssqlStore implements PlanteamientoStore {
  private pool: Promise<sql.ConnectionPool> | null = null;

  private getPool(): Promise<sql.ConnectionPool> {
    if (!this.pool) {
      this.pool = new sql.ConnectionPool(config()).connect().catch((e) => {
        this.pool = null;
        throw e;
      });
    }
    return this.pool;
  }

  async list(filtro?: ListadoFiltro): Promise<PlanteamientoRecord[]> {
    const pool = await this.getPool();
    const req = pool.request()
      .input("limit", sql.Int, filtro?.limit ?? 200)
      .input("tipo", sql.VarChar, filtro?.tipo ?? null)
      .input("texto", sql.NVarChar, filtro?.texto ? `%${filtro.texto}%` : null);
    const res = await req.query(`
      SELECT TOP (@limit) * FROM dbo.Planteamientos
      WHERE (@tipo IS NULL OR Tipo = @tipo)
        AND (@texto IS NULL OR NumeroPedido LIKE @texto OR Cliente LIKE @texto)
      ORDER BY UpdatedAt DESC`);
    return res.recordset.map(rowToRecord);
  }

  async get(id: string): Promise<PlanteamientoRecord | null> {
    const pool = await this.getPool();
    const res = await pool.request().input("id", sql.UniqueIdentifier, id)
      .query("SELECT * FROM dbo.Planteamientos WHERE Id = @id");
    return res.recordset[0] ? rowToRecord(res.recordset[0]) : null;
  }

  async save(
    rec: Omit<PlanteamientoRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<PlanteamientoRecord> {
    const pool = await this.getPool();
    const req = pool.request()
      .input("id", sql.UniqueIdentifier, rec.id ?? null)
      .input("tipo", sql.VarChar, rec.tipo)
      .input("pedido", sql.VarChar, rec.numeroPedido)
      .input("version", sql.VarChar, rec.version)
      .input("cliente", sql.NVarChar, rec.cliente)
      .input("input", sql.NVarChar, JSON.stringify(rec.input))
      .input("result", sql.NVarChar, JSON.stringify(rec.result))
      .input("params", sql.NVarChar, JSON.stringify(rec.paramsSnapshot))
      .input("pdf", sql.NVarChar, rec.pdfPath);
    const res = await req.query(`
      MERGE dbo.Planteamientos AS t
      USING (SELECT COALESCE(@id, NEWID()) AS Id) AS s ON t.Id = s.Id
      WHEN MATCHED THEN UPDATE SET Tipo=@tipo, NumeroPedido=@pedido, Version=@version,
        Cliente=@cliente, InputJson=@input, ResultJson=@result, ParamsJson=@params,
        PdfPath=@pdf, UpdatedAt=SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (Id, Tipo, NumeroPedido, Version, Cliente, InputJson, ResultJson, ParamsJson, PdfPath)
        VALUES (s.Id, @tipo, @pedido, @version, @cliente, @input, @result, @params, @pdf)
      OUTPUT inserted.*;`);
    return rowToRecord(res.recordset[0]);
  }
}
```

Actualizar `src/lib/store/index.ts` (sustituir el throw):

```ts
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { MssqlStore } from "@/lib/store/mssql-store";
import type { PlanteamientoStore } from "@/lib/store/types";

let store: PlanteamientoStore | null = null;

export function getStore(): PlanteamientoStore {
  if (!store) {
    store =
      process.env.DATASOURCE === "mssql"
        ? new MssqlStore()
        : new FileStore(path.join(process.cwd(), "data"));
  }
  return store;
}
```

Crear `.env.example`:

```bash
# Datos: "file" (desarrollo, carpeta data/) o "mssql" (producción, BD que asigne IT)
DATASOURCE=file
DB_HOST=
DB_PORT=1433
DB_DATABASE=
DB_USER=
DB_PASSWORD=
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
# RPS (solo lectura, materiales): valores por defecto ya en código
RPS_DB_HOST=RPS_HOST
RPS_DB_PORT=1433
RPS_DB_DATABASE=RPSNext
RPS_DB_USER=
RPS_DB_PASSWORD=
# Carpeta de red donde se guardan los PDF (subcarpeta por año)
RUTA_PLANTEAMIENTOS=\\FILESERVER\RPS\VENTAS\PLANTEAMIENTOS
```

- [ ] **Step 4: Verificar**

Run: `pnpm test` — Expected: PASS (el test solo cubre `rowToRecord`; la conexión real se prueba cuando IT dé la BD — pendiente P3).

- [ ] **Step 5: Commit**

```powershell
git add db src/lib/store .env.example
git commit -m "feat(store): driver SQL Server y schema.sql para IT"
```

---

### Task 10: API de planteamientos y materiales

**Files:**
- Create: `src/app/api/planteamientos/route.ts`
- Create: `src/app/api/planteamientos/[id]/route.ts`
- Create: `src/app/api/materiales/route.ts`
- Test: `src/lib/store/__tests__/api-payload.test.ts`

**Interfaces:**
- Consumes: `getStore()` (Tasks 8-9); `calcLona` (Task 5); `calcBaqueton` (Task 6); `DEFAULT_PARAMS` (Task 3).
- Produces:
  - `GET /api/planteamientos?texto=&tipo=` → `PlanteamientoRecord[]`
  - `POST /api/planteamientos` body `{ id?, tipo, input }` → recalcula en servidor con `DEFAULT_PARAMS` (no confía en el result del cliente) y guarda; devuelve el registro.
  - `GET /api/planteamientos/:id` → registro o 404.
  - `GET /api/materiales` → `Material[]`.
  - Función pura exportada `buildRecord(tipo, input, id?)` (testeable sin HTTP).

- [ ] **Step 1: Test que falla**

```ts
// src/lib/store/__tests__/api-payload.test.ts
import { describe, expect, it } from "vitest";
import { buildRecord } from "@/app/api/planteamientos/build-record";

describe("buildRecord", () => {
  it("lona: recalcula el resultado en servidor y extrae cabecera", () => {
    const input = {
      cabecera: { numeroPedido: "AR1", version: "1", cliente: "YAGÜE", revision: "", realizadoPor: "", fecha: "", fechaSalida: "" },
      cantidad: 1, largo: 250, ancho: 151, altoDelante: 62, altoAtras: 62,
      contornoScad: 270, llevaCurva: false, tipoPerfil: "TIPO 02",
      recogeDelante: "NO", recogeAtras: "CREMALLERA",
      bastillaEnfundar: false, ventana: false, rotulacion: false, textoRotulacion: "",
      modoOllaos: "REPARTIDOS", pasoOllaos: 35,
      ollaosManuales: { laterales: [], atras: [], delante: [] },
      material: "", observaciones: "",
    };
    const rec = buildRecord("lona", input);
    expect(rec.numeroPedido).toBe("AR1");
    expect(rec.cliente).toBe("YAGÜE");
    expect((rec.result as { metrosTela: number }).metrosTela).toBe(5.61);
  });

  it("tipo desconocido lanza error", () => {
    expect(() => buildRecord("otro" as never, {} as never)).toThrow();
  });
});
```

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 2: Implementación**

```ts
// src/app/api/planteamientos/build-record.ts
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";

export function buildRecord(
  tipo: TipoPlanteamiento,
  input: LonaInput | BaquetonInput,
  id?: string,
): Omit<PlanteamientoRecord, "id" | "createdAt" | "updatedAt"> & { id?: string } {
  if (tipo === "lona") {
    const result = calcLona(input as LonaInput, DEFAULT_PARAMS);
    return base(tipo, input, result, id);
  }
  if (tipo === "baqueton") {
    const result = calcBaqueton(input as BaquetonInput, DEFAULT_PARAMS);
    return base(tipo, input, result, id);
  }
  throw new Error(`Tipo de planteamiento desconocido: ${tipo}`);
}

function base(
  tipo: TipoPlanteamiento,
  input: LonaInput | BaquetonInput,
  result: ReturnType<typeof calcLona> | ReturnType<typeof calcBaqueton>,
  id?: string,
) {
  return {
    id, tipo,
    numeroPedido: input.cabecera.numeroPedido,
    version: input.cabecera.version,
    cliente: input.cabecera.cliente,
    input, result,
    paramsSnapshot: DEFAULT_PARAMS,
    pdfPath: null,
  };
}
```

```ts
// src/app/api/planteamientos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { buildRecord } from "@/app/api/planteamientos/build-record";
import type { TipoPlanteamiento } from "@/lib/store/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recs = await getStore().list({
    texto: searchParams.get("texto") ?? undefined,
    tipo: (searchParams.get("tipo") as TipoPlanteamiento) ?? undefined,
  });
  return NextResponse.json(recs);
}

export async function POST(req: NextRequest) {
  try {
    const { id, tipo, input } = await req.json();
    const saved = await getStore().save(buildRecord(tipo, input, id));
    return NextResponse.json(saved);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
```

```ts
// src/app/api/planteamientos/[id]/route.ts
import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rec = await getStore().get(id);
  if (!rec) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(rec);
}
```

```ts
// src/app/api/materiales/route.ts
import { NextResponse } from "next/server";
import { getMateriales } from "@/lib/store/rps-materiales";

export async function GET() {
  return NextResponse.json(await getMateriales());
}
```

Nota: firma de params como Promise — comprobar la guía de rutas en
`node_modules/next/dist/docs/` (este Next 16 puede diferir de lo conocido).

- [ ] **Step 3: Verificar**

Run: `pnpm test` — Expected: PASS.
Run: `pnpm build` — Expected: compila sin errores de tipos en las rutas.

- [ ] **Step 4: Commit**

```powershell
git add src/app/api src/lib/store
git commit -m "feat(api): endpoints de planteamientos y materiales"
```

---

### Task 11: Geometría del perfil (pura, para el 3D)

**Files:**
- Create: `src/lib/geometry/perfil.ts`
- Test: `src/lib/geometry/__tests__/perfil.test.ts`

**Interfaces:**
- Consumes: `TipoPerfil` (Task 3).
- Produces:

```ts
export interface PerfilOpts {
  ancho: number;        // cm (eje X)
  altoDelante: number;  // cm (eje Y) — el perfil usa el alto mayor
  alturaPico?: number;  // TIPO 02/03: alto del pico sobre el lateral (defecto ancho*0.12)
  chaflan?: number;     // TIPO 04 (defecto 15)
  radio?: number;       // TIPO 03/05 (defecto 15)
}
/** Devuelve el contorno 2D del frente del remolque (sentido horario desde
 * abajo-izquierda), en cm, listo para extrusión. Y=0 es el suelo de la caja. */
export function perfilPuntos(tipo: TipoPerfil, opts: PerfilOpts): Array<[number, number]>;
```

Formas (croquis de la hoja TIPOS): TIPO 01 rectángulo; TIPO 02 dos aguas (pico
central); TIPO 03 dos aguas con hombros suavizados (el pico y los hombros se
aproximan con 6 segmentos de arco); TIPO 04 chaflán 45°; TIPO 05 esquinas
superiores en curva (cuarto de círculo aproximado con 8 segmentos).

- [ ] **Step 1: Test que falla**

```ts
// src/lib/geometry/__tests__/perfil.test.ts
import { describe, expect, it } from "vitest";
import { perfilPuntos } from "@/lib/geometry/perfil";

const maxY = (pts: Array<[number, number]>) => Math.max(...pts.map(([, y]) => y));
const maxX = (pts: Array<[number, number]>) => Math.max(...pts.map(([x]) => x));

describe("perfilPuntos", () => {
  it("TIPO 01: rectángulo ancho x alto", () => {
    const pts = perfilPuntos("TIPO 01", { ancho: 150, altoDelante: 60 });
    expect(pts).toEqual([[0, 0], [0, 60], [150, 60], [150, 0]]);
  });
  it("TIPO 02: pico central más alto que los laterales", () => {
    const pts = perfilPuntos("TIPO 02", { ancho: 150, altoDelante: 60, alturaPico: 20 });
    expect(maxY(pts)).toBe(80);
    expect(pts.some(([x, y]) => x === 75 && y === 80)).toBe(true);
  });
  it("TIPO 04: chaflán recorta las esquinas superiores", () => {
    const pts = perfilPuntos("TIPO 04", { ancho: 150, altoDelante: 60, chaflan: 15 });
    expect(pts).toContainEqual([0, 45]);
    expect(pts).toContainEqual([15, 60]);
    expect(pts).toContainEqual([135, 60]);
    expect(pts).toContainEqual([150, 45]);
  });
  it("TIPO 05: esquinas redondeadas dentro de la caja", () => {
    const pts = perfilPuntos("TIPO 05", { ancho: 150, altoDelante: 60, radio: 15 });
    expect(maxY(pts)).toBe(60);
    expect(maxX(pts)).toBe(150);
    expect(pts.length).toBeGreaterThan(10); // arcos discretizados
  });
  it("TIPO 03: pico suavizado, más alto que el lateral", () => {
    const pts = perfilPuntos("TIPO 03", { ancho: 150, altoDelante: 60, alturaPico: 20 });
    expect(maxY(pts)).toBeGreaterThan(60);
    expect(maxY(pts)).toBeLessThanOrEqual(80);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 3: Implementación**

```ts
// src/lib/geometry/perfil.ts
import type { TipoPerfil } from "@/lib/calc/params";

export interface PerfilOpts {
  ancho: number;
  altoDelante: number;
  alturaPico?: number;
  chaflan?: number;
  radio?: number;
}

type Pt = [number, number];

function arco(cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function perfilPuntos(tipo: TipoPerfil, opts: PerfilOpts): Pt[] {
  const w = opts.ancho;
  const h = opts.altoDelante;
  const pico = opts.alturaPico ?? w * 0.12;
  const ch = Math.min(opts.chaflan ?? 15, w / 2, h);
  const r = Math.min(opts.radio ?? 15, w / 2, h);

  switch (tipo) {
    case "TIPO 01":
      return [[0, 0], [0, h], [w, h], [w, 0]];
    case "TIPO 02":
      return [[0, 0], [0, h], [w / 2, h + pico], [w, h], [w, 0]];
    case "TIPO 03": {
      // Dos aguas suavizado: hombros y pico con pequeños arcos.
      const sub = Math.min(r, pico);
      return [
        [0, 0], [0, h - sub],
        ...arco(sub, h - sub, sub, Math.PI, Math.PI / 2, 3).slice(1),
        [w / 2 - sub, h + pico - sub / 2],
        ...arco(w / 2, h + pico - sub, sub, (3 * Math.PI) / 4, Math.PI / 4, 3),
        [w / 2 + sub, h + pico - sub / 2],
        ...arco(w - sub, h - sub, sub, Math.PI / 2, 0, 3).slice(0, -1),
        [w, h - sub], [w, 0],
      ];
    }
    case "TIPO 04":
      return [[0, 0], [0, h - ch], [ch, h], [w - ch, h], [w, h - ch], [w, 0]];
    case "TIPO 05":
      return [
        [0, 0], [0, h - r],
        ...arco(r, h - r, r, Math.PI, Math.PI / 2, 8).slice(1),
        ...arco(w - r, h - r, r, Math.PI / 2, 0, 8),
        [w, 0],
      ];
  }
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test` — Expected: PASS. Si TIPO 03 no supera 60, revisar orden de arcos (los detalles finos de la silueta son estéticos; lo funcional es pico > lateral y dentro de límites).

- [ ] **Step 5: Commit**

```powershell
git add src/lib/geometry
git commit -m "feat(geometry): contorno 2d del perfil del remolque"
```

---

### Task 12: Escena 3D (react-three-fiber)

**Files:**
- Create: `src/components/workspace/Escena3D.tsx`

**Interfaces:**
- Consumes: `perfilPuntos` (Task 11), `TipoPerfil` (Task 3).
- Produces:

```ts
export interface Escena3DProps {
  modo: "lona" | "baqueton";
  largo: number; ancho: number;
  altoDelante: number; altoAtras: number;
  tipoPerfil: TipoPerfil;
  llevaCurva: boolean; radioCurva?: number;
  baqueton?: number;            // solo modo baqueton
  onSnapshotReady?: (getSnapshot: () => string) => void; // dataURL PNG para el PDF (Task 14)
}
export function Escena3D(props: Escena3DProps): JSX.Element;
```

Sin test unitario (componente WebGL): se verifica visualmente en Task 13 y con `pnpm build`.

- [ ] **Step 1: Implementación**

Comportamiento: el frente usa `altoDelante` y la trasera `altoAtras` — la
extrusión se hace con dos secciones (frente y trasera) unidas con
`THREE.Shape` frontal extruida a lo largo de `largo`, escalando Y linealmente
si los altos difieren (aproximación suficiente para "ver la forma"). En modo
`baqueton` se pinta la caja baja (alto = baqueton) con la lona plana encima y
el tubo del baquetón perimetral (cilindros en las 4 aristas superiores).

```tsx
// src/components/workspace/Escena3D.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { perfilPuntos } from "@/lib/geometry/perfil";
import type { TipoPerfil } from "@/lib/calc/params";

export interface Escena3DProps {
  modo: "lona" | "baqueton";
  largo: number; ancho: number;
  altoDelante: number; altoAtras: number;
  tipoPerfil: TipoPerfil;
  llevaCurva: boolean; radioCurva?: number;
  baqueton?: number;
  onSnapshotReady?: (getSnapshot: () => string) => void;
}

const LONA = "#3b82c4"; // azul neutro; solo referencia de forma

function CuerpoLona({ p }: { p: Escena3DProps }) {
  const geom = useMemo(() => {
    const pts = perfilPuntos(p.tipoPerfil, {
      ancho: p.ancho,
      altoDelante: Math.max(p.altoDelante, p.altoAtras),
      radio: p.llevaCurva ? p.radioCurva ?? 15 : 15,
    });
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - p.ancho / 2, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: p.largo, bevelEnabled: false });
    g.translate(0, 0, -p.largo / 2);
    return g;
  }, [p.tipoPerfil, p.ancho, p.altoDelante, p.altoAtras, p.largo, p.llevaCurva, p.radioCurva]);

  return (
    <mesh geometry={geom} castShadow>
      <meshStandardMaterial color={LONA} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

function CuerpoBaqueton({ p }: { p: Escena3DProps }) {
  const alto = Math.max(p.baqueton ?? 20, 1);
  const rTubo = 2.5;
  return (
    <group>
      <mesh position={[0, alto / 2, 0]} castShadow>
        <boxGeometry args={[p.ancho, alto, p.largo]} />
        <meshStandardMaterial color={LONA} roughness={0.55} />
      </mesh>
      {/* tubo del baquetón en las 4 aristas superiores */}
      {[
        { pos: [0, alto, -p.largo / 2], rot: [0, 0, Math.PI / 2], len: p.ancho },
        { pos: [0, alto, p.largo / 2], rot: [0, 0, Math.PI / 2], len: p.ancho },
        { pos: [-p.ancho / 2, alto, 0], rot: [Math.PI / 2, 0, 0], len: p.largo },
        { pos: [p.ancho / 2, alto, 0], rot: [Math.PI / 2, 0, 0], len: p.largo },
      ].map((t, i) => (
        <mesh key={i} position={t.pos as [number, number, number]} rotation={t.rot as [number, number, number]}>
          <cylinderGeometry args={[rTubo, rTubo, t.len, 16]} />
          <meshStandardMaterial color="#666a70" roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Snapshot({ onReady }: { onReady?: Escena3DProps["onSnapshotReady"] }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    onReady?.(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    });
  }, [gl, scene, camera, onReady]);
  return null;
}

export function Escena3D(props: Escena3DProps) {
  const valido = props.largo > 0 && props.ancho > 0 &&
    (props.modo === "baqueton" ? (props.baqueton ?? 0) > 0 : props.altoDelante > 0);
  const dist = Math.max(props.largo, props.ancho, 200) * 1.6;

  return (
    <div className="h-full min-h-[320px] w-full rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-neutral-200">
      {valido ? (
        <Canvas
          shadows
          gl={{ preserveDrawingBuffer: true }}
          camera={{ position: [dist * 0.7, dist * 0.45, dist * 0.7], fov: 35, near: 1, far: dist * 10 }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[dist, dist, dist / 2]} intensity={1.1} castShadow />
          {props.modo === "lona" ? <CuerpoLona p={props} /> : <CuerpoBaqueton p={props} />}
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={dist * 2} blur={2} />
          <Environment preset="city" />
          <OrbitControls makeDefault enableDamping target={[0, Math.max(props.altoDelante, props.baqueton ?? 0) / 2, 0]} />
          <Snapshot onReady={props.onSnapshotReady} />
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">
          Introduce medidas para ver la forma…
        </div>
      )}
    </div>
  );
}
```

**Nota:** `preserveDrawingBuffer: true` es imprescindible para la captura PNG del PDF (Task 14).

- [ ] **Step 2: Verificar compilación**

Run: `pnpm build`
Expected: build sin errores (el componente aún no se usa; añadirlo temporalmente a una página no es necesario — basta typecheck del build).

- [ ] **Step 3: Commit**

```powershell
git add src/components/workspace
git commit -m "feat(3d): escena react-three-fiber con forma del remolque"
```

---

### Task 13: Pantalla de trabajo `/planteamiento`

**Files:**
- Create: `src/components/workspace/campos.tsx` (inputs reutilizables)
- Create: `src/components/workspace/entradas-vacias.ts`
- Create: `src/components/workspace/FormularioLona.tsx`
- Create: `src/components/workspace/FormularioBaqueton.tsx`
- Create: `src/components/workspace/Resultados.tsx`
- Create: `src/components/workspace/Workspace.tsx`
- Create: `src/app/planteamiento/page.tsx`
- Modify: `src/components/layout/AppShell.tsx` (añadir enlace «Planteamiento» a `/planteamiento`)
- Test: `src/components/workspace/__tests__/entradas.test.ts`

**Interfaces:**
- Consumes: `calcLona`, `LonaInput`, `LonaResult` (Task 5); `calcBaqueton`, `BaquetonInput`, `BaquetonResult` (Task 6); `DEFAULT_PARAMS`, `TIPOS_PERFIL` (Task 3); `Escena3D` (Task 12); `GET /api/materiales`, `POST /api/planteamientos` (Task 10).
- Produces: `emptyLona(): LonaInput`, `emptyBaqueton(): BaquetonInput`; componente `Workspace` con prop opcional `inicial?: { tipo, input, id }` (lo usa Task 15 para «Reutilizar»); expone en window el snapshot 3D vía ref interna (lo consume el botón PDF de Task 14).

- [ ] **Step 1: Test de entradas vacías (falla)**

```ts
// src/components/workspace/__tests__/entradas.test.ts
import { describe, expect, it } from "vitest";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import { calcLona } from "@/lib/calc/lona";
import { calcBaqueton } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";

describe("entradas vacías", () => {
  it("calculan sin lanzar aunque estén a cero (como el Excel con IFERROR)", () => {
    expect(() => calcLona(emptyLona(), DEFAULT_PARAMS)).not.toThrow();
    expect(() => calcBaqueton(emptyBaqueton(), DEFAULT_PARAMS)).not.toThrow();
    expect(calcLona(emptyLona(), DEFAULT_PARAMS).panoContorno).toBeNull();
    expect(calcLona(emptyLona(), DEFAULT_PARAMS).ollaos.largo.posiciones).toEqual([]);
  });
  it("paso de ollaos por defecto 35", () => {
    expect(emptyLona().pasoOllaos).toBe(35);
    expect(emptyBaqueton().pasoOllaos).toBe(35);
  });
});
```

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 2: `entradas-vacias.ts`**

```ts
// src/components/workspace/entradas-vacias.ts
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";

const cabecera = () => ({
  numeroPedido: "", version: "", cliente: "", revision: "", realizadoPor: "",
  fecha: new Date().toISOString().slice(0, 10), fechaSalida: "",
});
const sinOllaos = () => ({ laterales: [], atras: [], delante: [] });

export function emptyLona(): LonaInput {
  return {
    cabecera: cabecera(),
    cantidad: 1, largo: 0, ancho: 0, altoDelante: 0, altoAtras: 0,
    contornoScad: 0, llevaCurva: false, tipoPerfil: "TIPO 01",
    recogeDelante: "NO", recogeAtras: "NO",
    bastillaEnfundar: false, ventana: false, rotulacion: false, textoRotulacion: "",
    modoOllaos: "REPARTIDOS", pasoOllaos: DEFAULT_PARAMS.pasoOllaosDefecto,
    ollaosManuales: sinOllaos(), material: "", observaciones: "",
  };
}

export function emptyBaqueton(): BaquetonInput {
  return {
    cabecera: cabecera(),
    cantidad: 1, largo: 0, ancho: 0, baqueton: 0,
    clienteEspecifico: "GENERAL",
    modoOllaos: "REPARTIDOS", pasoOllaos: DEFAULT_PARAMS.pasoOllaosDefecto,
    ollaosManuales: sinOllaos(), rotulacion: false, textoRotulacion: "",
    material: "", observaciones: "",
  };
}
```

Run: `pnpm test` — Expected: PASS. Si `calcLona` lanza con ceros, corregir el
motor (debe devolver ceros/`null`, nunca lanzar).

- [ ] **Step 3: Campos reutilizables**

```tsx
// src/components/workspace/campos.tsx
"use client";
import type { ReactNode } from "react";

export function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-neutral-200 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{titulo}</legend>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </fieldset>
  );
}

export function CampoNum(props: {
  label: string; value: number; onChange: (v: number) => void; ancho?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-0.5 text-xs ${props.ancho ? "col-span-2" : ""}`}>
      <span className="text-neutral-600">{props.label}</span>
      <input
        type="number" inputMode="decimal" step="0.1"
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm tabular-nums"
        value={props.value === 0 ? "" : props.value}
        onChange={(e) => props.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

export function CampoTexto(props: {
  label: string; value: string; onChange: (v: string) => void; ancho?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-0.5 text-xs ${props.ancho ? "col-span-2" : ""}`}>
      <span className="text-neutral-600">{props.label}</span>
      <input
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

export function CampoSelect(props: {
  label: string; value: string; opciones: string[]; onChange: (v: string) => void; ancho?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-0.5 text-xs ${props.ancho ? "col-span-2" : ""}`}>
      <span className="text-neutral-600">{props.label}</span>
      <select
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
      >
        {props.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function CampoCheck(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  );
}
```

- [ ] **Step 4: Formularios**

`FormularioLona.tsx` — controlado, sin estado propio:

```tsx
// src/components/workspace/FormularioLona.tsx
"use client";
import type { LonaInput } from "@/lib/calc/lona";
import { DEFAULT_PARAMS, TIPOS_PERFIL } from "@/lib/calc/params";
import { CampoCheck, CampoNum, CampoSelect, CampoTexto, Grupo } from "@/components/workspace/campos";

const RECOGIDAS = DEFAULT_PARAMS.recogidas.map((r) => r.nombre);

export function FormularioLona({
  input, materiales, onChange,
}: {
  input: LonaInput; materiales: string[]; onChange: (i: LonaInput) => void;
}) {
  const set = <K extends keyof LonaInput>(k: K, v: LonaInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof LonaInput["cabecera"], v: string) =>
    onChange({ ...input, cabecera: { ...input.cabecera, [k]: v } });

  return (
    <div className="flex flex-col gap-3">
      <Grupo titulo="Pedido">
        <CampoTexto label="Nº pedido" value={input.cabecera.numeroPedido} onChange={(v) => setCab("numeroPedido", v)} />
        <CampoTexto label="Versión" value={input.cabecera.version} onChange={(v) => setCab("version", v)} />
        <CampoTexto label="Cliente" ancho value={input.cabecera.cliente} onChange={(v) => setCab("cliente", v)} />
        <CampoTexto label="Revisión" value={input.cabecera.revision} onChange={(v) => setCab("revision", v)} />
        <CampoTexto label="Realizado por" value={input.cabecera.realizadoPor} onChange={(v) => setCab("realizadoPor", v)} />
      </Grupo>
      <Grupo titulo="Medidas (cm)">
        <CampoNum label="Cantidad" value={input.cantidad} onChange={(v) => set("cantidad", v)} />
        <CampoNum label="Largo" value={input.largo} onChange={(v) => set("largo", v)} />
        <CampoNum label="Ancho" value={input.ancho} onChange={(v) => set("ancho", v)} />
        <CampoNum label="Alto delante" value={input.altoDelante} onChange={(v) => set("altoDelante", v)} />
        <CampoNum label="Alto detrás" value={input.altoAtras} onChange={(v) => set("altoAtras", v)} />
        <CampoNum label="Contorno SCAD" value={input.contornoScad} onChange={(v) => set("contornoScad", v)} />
        <CampoCheck label="Lleva curva (+1,5 al contorno)" value={input.llevaCurva} onChange={(v) => set("llevaCurva", v)} />
      </Grupo>
      <Grupo titulo="Configuración">
        <CampoSelect label="Perfil" value={input.tipoPerfil} opciones={[...TIPOS_PERFIL]}
          onChange={(v) => set("tipoPerfil", v as LonaInput["tipoPerfil"])} />
        <CampoSelect label="Recoge delante" value={input.recogeDelante} opciones={RECOGIDAS}
          onChange={(v) => set("recogeDelante", v)} />
        <CampoSelect label="Recoge atrás" value={input.recogeAtras} opciones={RECOGIDAS}
          onChange={(v) => set("recogeAtras", v)} />
        <CampoCheck label="Bastilla de enfundar" value={input.bastillaEnfundar} onChange={(v) => set("bastillaEnfundar", v)} />
        <CampoCheck label="Ventana" value={input.ventana} onChange={(v) => set("ventana", v)} />
        <CampoCheck label="Rotulación" value={input.rotulacion} onChange={(v) => set("rotulacion", v)} />
        {input.rotulacion && (
          <CampoTexto label="Texto rotulación" ancho value={input.textoRotulacion} onChange={(v) => set("textoRotulacion", v)} />
        )}
      </Grupo>
      <Grupo titulo="Ollaos">
        <CampoSelect label="Modo" value={input.modoOllaos} opciones={["REPARTIDOS", "SEGUN SE INDICA"]}
          onChange={(v) => set("modoOllaos", v as LonaInput["modoOllaos"])} />
        <CampoNum label="Paso" value={input.pasoOllaos} onChange={(v) => set("pasoOllaos", v)} />
        {input.modoOllaos === "SEGUN SE INDICA" && (
          <>
            <PosicionesManuales label="Laterales (atrás→delante)" valores={input.ollaosManuales.laterales}
              onChange={(v) => set("ollaosManuales", { ...input.ollaosManuales, laterales: v })} />
            <PosicionesManuales label="Atrás (izq→dcha)" valores={input.ollaosManuales.atras}
              onChange={(v) => set("ollaosManuales", { ...input.ollaosManuales, atras: v })} />
            <PosicionesManuales label="Delante (izq→dcha)" valores={input.ollaosManuales.delante}
              onChange={(v) => set("ollaosManuales", { ...input.ollaosManuales, delante: v })} />
          </>
        )}
      </Grupo>
      <Grupo titulo="Material y observaciones">
        <CampoSelect label="Material" ancho value={input.material} opciones={["", ...materiales]}
          onChange={(v) => set("material", v)} />
        <CampoTexto label="Observaciones" ancho value={input.observaciones} onChange={(v) => set("observaciones", v)} />
      </Grupo>
    </div>
  );
}

function PosicionesManuales({
  label, valores, onChange,
}: { label: string; valores: number[]; onChange: (v: number[]) => void }) {
  return (
    <CampoTexto
      label={`${label} — separadas por guion`} ancho
      value={valores.join(" - ")}
      onChange={(txt) =>
        onChange(
          txt.split("-").map((s) => Number(s.replace(",", ".").trim())).filter((n) => Number.isFinite(n) && n > 0).slice(0, 12),
        )
      }
    />
  );
}
```

`FormularioBaqueton.tsx` — misma estructura con sus campos:

```tsx
// src/components/workspace/FormularioBaqueton.tsx
"use client";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { CampoCheck, CampoNum, CampoSelect, CampoTexto, Grupo } from "@/components/workspace/campos";

const CLIENTES = DEFAULT_PARAMS.clientesBaqueton.map((c) => c.nombre);

export function FormularioBaqueton({
  input, materiales, onChange,
}: {
  input: BaquetonInput; materiales: string[]; onChange: (i: BaquetonInput) => void;
}) {
  const set = <K extends keyof BaquetonInput>(k: K, v: BaquetonInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof BaquetonInput["cabecera"], v: string) =>
    onChange({ ...input, cabecera: { ...input.cabecera, [k]: v } });

  return (
    <div className="flex flex-col gap-3">
      <Grupo titulo="Pedido">
        <CampoTexto label="Nº pedido" value={input.cabecera.numeroPedido} onChange={(v) => setCab("numeroPedido", v)} />
        <CampoTexto label="Versión" value={input.cabecera.version} onChange={(v) => setCab("version", v)} />
        <CampoTexto label="Cliente" ancho value={input.cabecera.cliente} onChange={(v) => setCab("cliente", v)} />
        <CampoSelect label="Cliente específico" ancho value={input.clienteEspecifico} opciones={CLIENTES}
          onChange={(v) => set("clienteEspecifico", v)} />
        <CampoTexto label="Revisión" value={input.cabecera.revision} onChange={(v) => setCab("revision", v)} />
        <CampoTexto label="Realizado por" value={input.cabecera.realizadoPor} onChange={(v) => setCab("realizadoPor", v)} />
      </Grupo>
      <Grupo titulo="Medidas (cm)">
        <CampoNum label="Cantidad" value={input.cantidad} onChange={(v) => set("cantidad", v)} />
        <CampoNum label="Largo" value={input.largo} onChange={(v) => set("largo", v)} />
        <CampoNum label="Ancho" value={input.ancho} onChange={(v) => set("ancho", v)} />
        <CampoNum label="Baquetón" value={input.baqueton} onChange={(v) => set("baqueton", v)} />
      </Grupo>
      <Grupo titulo="Ollaos y rotulación">
        <CampoSelect label="Modo ollaos" value={input.modoOllaos} opciones={["REPARTIDOS", "SEGUN SE INDICA"]}
          onChange={(v) => set("modoOllaos", v as BaquetonInput["modoOllaos"])} />
        <CampoNum label="Paso" value={input.pasoOllaos} onChange={(v) => set("pasoOllaos", v)} />
        <CampoCheck label="Rotulación" value={input.rotulacion} onChange={(v) => set("rotulacion", v)} />
        {input.rotulacion && (
          <CampoTexto label="Texto rotulación" ancho value={input.textoRotulacion} onChange={(v) => set("textoRotulacion", v)} />
        )}
      </Grupo>
      <Grupo titulo="Material y observaciones">
        <CampoSelect label="Material" ancho value={input.material} opciones={["", ...materiales]}
          onChange={(v) => set("material", v)} />
        <CampoTexto label="Observaciones" ancho value={input.observaciones} onChange={(v) => set("observaciones", v)} />
      </Grupo>
    </div>
  );
}
```

(En baquetón, las posiciones manuales «según se indica» reutilizan el mismo
patrón `PosicionesManuales` que en lona — extraerlo a `campos.tsx` si se usa
en ambos.)

- [ ] **Step 5: Resultados en vivo**

```tsx
// src/components/workspace/Resultados.tsx
"use client";
import type { LonaResult } from "@/lib/calc/lona";
import type { BaquetonResult } from "@/lib/calc/baqueton";

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{valor}</div>
    </div>
  );
}

function TablaReparto({ reparto }: { reparto: { laterales: number[]; atras: number[]; delante: number[] } }) {
  const filas: Array<[string, number[]]> = [
    ["OLLAOS LATERALES DE ATRÁS A ADELANTE", reparto.laterales],
    ["OLLAOS ATRÁS DE IZQUIERDA A DERECHA", reparto.atras],
    ["OLLAOS DELANTE DE IZQUIERDA A DERECHA", reparto.delante],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="bg-neutral-100 text-neutral-600">
            <th className="p-1 text-left font-medium">Reparto</th>
            {Array.from({ length: 12 }, (_, i) => <th key={i} className="p-1 font-medium">{i + 1}</th>)}
            <th className="p-1 font-medium">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([nombre, pos]) => (
            <tr key={nombre} className="border-b border-neutral-100">
              <td className="p-1">{nombre}</td>
              {Array.from({ length: 12 }, (_, i) => (
                <td key={i} className="p-1 text-center">{pos[i] != null ? fmt(pos[i]) : "–"}</td>
              ))}
              <td className="p-1 text-center font-semibold">{pos.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultadosLona({ res, codigoBobina }: { res: LonaResult; codigoBobina?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Dato label="Medida lona hecha" valor={`${fmt(res.lonaHecha.largo)} × ${fmt(res.lonaHecha.ancho)}`} />
        <Dato label="Contorno ajustado" valor={res.contornoAjustado ? fmt(res.contornoAjustado) : "—"} />
        <Dato label="Metros de tela" valor={res.metrosTela ? `${fmt(res.metrosTela)} m${codigoBobina ? ` · ${codigoBobina}` : ""}` : "—"} />
        <Dato label="Paño delantero" valor={`${fmt(res.panoDelantero.ancho)} × ${fmt(res.panoDelantero.alto)}`} />
        <Dato label="Paño trasero" valor={`${fmt(res.panoTrasero.ancho)} × ${fmt(res.panoTrasero.alto)}`} />
        <Dato label="Paño contorno" valor={res.panoContorno ? `${fmt(res.panoContorno.ancho)} × ${fmt(res.panoContorno.alto)}` : "—"} />
        <Dato label="Recoge delante" valor={res.recogeDelanteTexto} />
        <Dato label="Recoge atrás" valor={res.recogeAtrasTexto} />
      </div>
      <TablaReparto reparto={res.reparto} />
      {res.notas.length > 0 && (
        <ul className="list-inside list-disc text-xs text-amber-700">
          {res.notas.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

export function ResultadosBaqueton({ res, codigoBobina }: { res: BaquetonResult; codigoBobina?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Dato label="Paño único" valor={`${fmt(res.panoUnico.largo)} × ${fmt(res.panoUnico.ancho)}`} />
        <Dato label="Remolque hecho" valor={`${fmt(res.remolqueHecho.largo)} × ${fmt(res.remolqueHecho.ancho)}`} />
        <Dato label="Baquetón + costura" valor={fmt(res.baquetonCostura)} />
        <Dato label="Esquinas (del./tras.)" valor={`${fmt(res.esquinaDelante)} / ${fmt(res.esquinaDetras)}`} />
        <Dato label="Baquetón" valor={res.baquetonTrasero ? `Trasero ${fmt(res.baquetonTrasero)} · NO EN LÍNEA` : "EN LÍNEA"} />
        <Dato label="Superficie" valor={`${fmt(res.superficieM2)} m²/ud`} />
        <Dato label="Metros de tela" valor={res.metrosTela ? `${fmt(res.metrosTela)} m${codigoBobina ? ` · ${codigoBobina}` : ""}` : "—"} />
      </div>
      <TablaReparto reparto={res.reparto} />
      {res.notas.length > 0 && (
        <ul className="list-inside list-disc text-xs text-amber-700">
          {res.notas.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Workspace y página**

```tsx
// src/components/workspace/Workspace.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import type { Material } from "@/lib/calc/materiales-seed";
import type { TipoPlanteamiento } from "@/lib/store/types";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import { FormularioLona } from "@/components/workspace/FormularioLona";
import { FormularioBaqueton } from "@/components/workspace/FormularioBaqueton";
import { ResultadosLona, ResultadosBaqueton } from "@/components/workspace/Resultados";
import { Escena3D } from "@/components/workspace/Escena3D";

export interface WorkspaceInicial {
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export function Workspace({ inicial }: { inicial?: WorkspaceInicial }) {
  const [tipo, setTipo] = useState<TipoPlanteamiento>(inicial?.tipo ?? "lona");
  const [lona, setLona] = useState<LonaInput>(
    inicial?.tipo === "lona" ? (inicial.input as LonaInput) : emptyLona(),
  );
  const [baq, setBaq] = useState<BaquetonInput>(
    inicial?.tipo === "baqueton" ? (inicial.input as BaquetonInput) : emptyBaqueton(),
  );
  const [id, setId] = useState<string | undefined>(inicial?.id);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const snapshotRef = useRef<(() => string) | null>(null);

  useEffect(() => {
    fetch("/api/materiales").then((r) => r.json()).then(setMateriales).catch(() => setMateriales([]));
  }, []);

  const resLona = useMemo(() => calcLona(lona, DEFAULT_PARAMS), [lona]);
  const resBaq = useMemo(() => calcBaqueton(baq, DEFAULT_PARAMS), [baq]);
  const input = tipo === "lona" ? lona : baq;
  const codigoBobina = materiales.find((m) => m.nombre === input.material)?.codigoBobina;

  async function guardar(): Promise<string | null> {
    setAviso(null);
    const res = await fetch("/api/planteamientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, tipo, input }),
    });
    if (!res.ok) {
      setAviso(`Error al guardar: ${(await res.json()).error ?? res.status}`);
      return null;
    }
    const saved = await res.json();
    setId(saved.id);
    setAviso("Guardado en el historial.");
    return saved.id as string;
  }

  async function generarPdf() {
    const savedId = await guardar();
    if (!savedId) return;
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: savedId, snapshot: snapshotRef.current?.() ?? null }),
    });
    if (!res.ok) {
      setAviso(`Error al generar PDF: ${res.status}`);
      return;
    }
    const guardadoEnRed = res.headers.get("X-Guardado-Red") === "ok";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("X-Nombre-Pdf") ?? "planteamiento.pdf";
    a.click();
    URL.revokeObjectURL(url);
    setAviso(guardadoEnRed ? "PDF guardado en PLANTEAMIENTOS y descargado." : "⚠ No se pudo escribir en la red: PDF solo descargado.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <div>
        <div className="mb-3 flex gap-1 rounded-lg bg-neutral-100 p-1">
          {(["lona", "baqueton"] as const).map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${tipo === t ? "bg-white shadow" : "text-neutral-500"}`}>
              {t === "lona" ? "Lona remolque" : "Baquetón"}
            </button>
          ))}
        </div>
        {tipo === "lona" ? (
          <FormularioLona input={lona} materiales={materiales.map((m) => m.nombre)} onChange={setLona} />
        ) : (
          <FormularioBaqueton input={baq} materiales={materiales.map((m) => m.nombre)} onChange={setBaq} />
        )}
        <div className="mt-3 flex gap-2">
          <button onClick={guardar} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium">
            Guardar
          </button>
          <button onClick={generarPdf} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            Generar PDF
          </button>
        </div>
        {aviso && <p className="mt-2 text-xs text-neutral-600">{aviso}</p>}
      </div>
      <div className="flex flex-col gap-4">
        {tipo === "lona" ? (
          <Escena3D modo="lona" largo={lona.largo} ancho={lona.ancho}
            altoDelante={lona.altoDelante} altoAtras={lona.altoAtras}
            tipoPerfil={lona.tipoPerfil} llevaCurva={lona.llevaCurva}
            onSnapshotReady={(fn) => { snapshotRef.current = fn; }} />
        ) : (
          <Escena3D modo="baqueton" largo={baq.largo} ancho={baq.ancho}
            altoDelante={0} altoAtras={0} tipoPerfil="TIPO 01" llevaCurva={false}
            baqueton={baq.baqueton}
            onSnapshotReady={(fn) => { snapshotRef.current = fn; }} />
        )}
        {tipo === "lona"
          ? <ResultadosLona res={resLona} codigoBobina={codigoBobina} />
          : <ResultadosBaqueton res={resBaq} codigoBobina={codigoBobina} />}
      </div>
    </div>
  );
}
```

```tsx
// src/app/planteamiento/page.tsx
import { Workspace } from "@/components/workspace/Workspace";

export default function PlanteamientoPage() {
  return (
    <main className="p-4">
      <h1 className="mb-4 text-lg font-semibold">Planteamiento</h1>
      <Workspace />
    </main>
  );
}
```

En `AppShell.tsx`, añadir un enlace de navegación a `/planteamiento` con el
texto «Planteamiento» siguiendo el patrón de los enlaces existentes.

Nota: `/api/pdf` no existe hasta la Task 14 — el botón devolverá 404 de
momento; es aceptable dentro de la rama.

- [ ] **Step 7: Verificar en el navegador**

Run: `pnpm dev` → abrir `http://localhost:3000/planteamiento`.
Comprobar: teclear largo/ancho/altos pinta la forma 3D al instante; cambiar
perfil cambia la silueta; los resultados coinciden con los tests (caso
AR2602796: 250/151/62/62, contorno 270, recoge atrás CREMALLERA → paños
154×66,5 y 253×270); el modo baquetón muestra caja + tubos.

- [ ] **Step 8: Verificar tests y build**

Run: `pnpm test` y `pnpm build` — Expected: PASS / build OK.

- [ ] **Step 9: Commit**

```powershell
git add src/components/workspace src/app/planteamiento src/components/layout/AppShell.tsx
git commit -m "feat(ui): pantalla unica de planteamiento con 3d y resultados en vivo"
```

---

### Task 14: PDF A4 apaisado y guardado en red

**Files:**
- Create: `src/lib/pdf/ruta-pdf.ts` (pura, testeable)
- Create: `src/lib/pdf/PlanteamientoPdf.tsx`
- Create: `src/app/api/pdf/route.ts`
- Test: `src/lib/pdf/__tests__/ruta-pdf.test.ts`

**Interfaces:**
- Consumes: `PlanteamientoRecord`, `getStore()` (Tasks 8-10); `LonaResult`, `BaquetonResult` (Tasks 5-6).
- Produces:

```ts
// ruta-pdf.ts
export function nombrePdf(numeroPedido: string, version: string): string;
// "AR.26.02796" + "10" → "AR.26.02796-10.pdf"; sin versión → "AR.26.02796-.pdf" (P2: como los ejemplos reales)
export function carpetaPdf(base: string, fecha: Date): string;
// ("\\\\FILESERVER\\RPS\\VENTAS\\PLANTEAMIENTOS", 2026-07-14) → "\\\\…\\PLANTEAMIENTOS\\2026"
// PlanteamientoPdf.tsx
export function PlanteamientoPdf(props: { rec: PlanteamientoRecord; snapshotPng: string | null }): JSX.Element; // <Document> de @react-pdf/renderer
// POST /api/pdf  body { id, snapshot }  → bytes del PDF
//   headers de respuesta: X-Nombre-Pdf, X-Guardado-Red: "ok" | "error"
```

- [ ] **Step 1: Test de rutas (falla)**

```ts
// src/lib/pdf/__tests__/ruta-pdf.test.ts
import { describe, expect, it } from "vitest";
import { carpetaPdf, nombrePdf } from "@/lib/pdf/ruta-pdf";

describe("nombrePdf", () => {
  it("pedido-version.pdf", () => {
    expect(nombrePdf("AR.26.02796", "10")).toBe("AR.26.02796-10.pdf");
  });
  it("sin versión: guion y .pdf (como AR.26.03509-.pdf real)", () => {
    expect(nombrePdf("AR.26.03509", "")).toBe("AR.26.03509-.pdf");
  });
  it("sanea caracteres inválidos en Windows", () => {
    expect(nombrePdf("AR/26:02796", "1*")).toBe("AR_26_02796-1_.pdf");
  });
});

describe("carpetaPdf", () => {
  it("añade el año de la fecha", () => {
    expect(carpetaPdf("\\\\FILESERVER\\RPS\\VENTAS\\PLANTEAMIENTOS", new Date("2026-07-14")))
      .toBe("\\\\FILESERVER\\RPS\\VENTAS\\PLANTEAMIENTOS\\2026");
  });
});
```

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 2: Implementación `ruta-pdf.ts`**

```ts
// src/lib/pdf/ruta-pdf.ts
import path from "node:path";

const INVALIDOS = /[<>:"/\\|?*]/g;

export function nombrePdf(numeroPedido: string, version: string): string {
  const pedido = numeroPedido.replace(INVALIDOS, "_");
  const ver = version.replace(INVALIDOS, "_");
  return `${pedido}-${ver}.pdf`;
}

export function carpetaPdf(base: string, fecha: Date): string {
  return path.win32.join(base, String(fecha.getFullYear()));
}
```

Ojo: `nombrePdf` sanea `.` NO — los pedidos reales llevan puntos
(`AR.26.02796`). Solo se reemplazan los caracteres inválidos de Windows.

Run: `pnpm test` — Expected: PASS.

- [ ] **Step 3: Documento PDF**

```tsx
// src/lib/pdf/PlanteamientoPdf.tsx
import {
  Document, Page, Text, View, Image, StyleSheet,
} from "@react-pdf/renderer";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { LonaInput, LonaResult } from "@/lib/calc/lona";
import type { BaquetonInput, BaquetonResult } from "@/lib/calc/baqueton";

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  cabecera: {
    flexDirection: "row", justifyContent: "space-between",
    borderBottom: "2 solid #111", paddingBottom: 8, marginBottom: 10,
  },
  marca: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  titulo: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  fila: { flexDirection: "row", marginBottom: 2 },
  etiqueta: { width: 110, color: "#555", textTransform: "uppercase", fontSize: 7.5 },
  valor: { fontFamily: "Helvetica-Bold" },
  columnas: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  tabla: { marginTop: 8, border: "1 solid #ccc" },
  tr: { flexDirection: "row", borderBottom: "1 solid #eee" },
  th: { flex: 1, padding: 3, backgroundColor: "#f3f3f3", fontFamily: "Helvetica-Bold", fontSize: 7 },
  td: { flex: 1, padding: 3, fontSize: 7, textAlign: "center" },
  tdNombre: { flex: 6, padding: 3, fontSize: 7 },
  nota: { color: "#92400e", fontSize: 8, marginTop: 2 },
  foto: { width: 260, height: 180, objectFit: "contain", alignSelf: "center" },
});

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

function Dato({ l, v }: { l: string; v: string }) {
  return (
    <View style={s.fila}>
      <Text style={s.etiqueta}>{l}</Text>
      <Text style={s.valor}>{v}</Text>
    </View>
  );
}

function Reparto({ reparto }: { reparto: { laterales: number[]; atras: number[]; delante: number[] } }) {
  const filas: Array<[string, number[]]> = [
    ["OLLAOS LATERALES DE ATRÁS A ADELANTE", reparto.laterales],
    ["OLLAOS ATRÁS DE IZQUIERDA A DERECHA", reparto.atras],
    ["OLLAOS DELANTE DE IZQUIERDA A DERECHA", reparto.delante],
  ];
  return (
    <View style={s.tabla}>
      <View style={s.tr}>
        <Text style={[s.th, { flex: 6 }]}>REPARTO</Text>
        {Array.from({ length: 12 }, (_, i) => <Text key={i} style={s.th}>{i + 1}</Text>)}
        <Text style={s.th}>TOTAL</Text>
      </View>
      {filas.map(([nombre, pos]) => (
        <View key={nombre} style={s.tr}>
          <Text style={s.tdNombre}>{nombre}</Text>
          {Array.from({ length: 12 }, (_, i) => (
            <Text key={i} style={s.td}>{pos[i] != null ? fmt(pos[i]) : "-"}</Text>
          ))}
          <Text style={[s.td, { fontFamily: "Helvetica-Bold" }]}>{pos.length}</Text>
        </View>
      ))}
    </View>
  );
}

export function PlanteamientoPdf({ rec, snapshotPng }: {
  rec: PlanteamientoRecord; snapshotPng: string | null;
}) {
  const esLona = rec.tipo === "lona";
  const input = rec.input;
  const notas = (rec.result as LonaResult | BaquetonResult).notas;
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.cabecera}>
          <Text style={s.marca}>TGM · TOLDOS GÓMEZ</Text>
          <View>
            <Dato l="Nº pedido" v={input.cabecera.numeroPedido || "—"} />
            <Dato l="Versión" v={input.cabecera.version || "—"} />
            <Dato l="Fecha" v={input.cabecera.fecha || "—"} />
          </View>
        </View>
        <Text style={s.titulo}>
          {esLona ? "PLANTEAMIENTO · LONA REMOLQUE" : "PLANTEAMIENTO · BAQUETÓN"}
        </Text>
        <View style={s.columnas}>
          <View style={s.col}>
            <Dato l="Cliente" v={input.cabecera.cliente || "—"} />
            <Dato l="Revisión" v={input.cabecera.revision || "—"} />
            <Dato l="Realizado" v={input.cabecera.realizadoPor || "—"} />
            <Dato l="Material" v={input.material || "—"} />
            {esLona ? <DatosLona rec={rec} /> : <DatosBaqueton rec={rec} />}
            {notas.map((n) => <Text key={n} style={s.nota}>• {n}</Text>)}
          </View>
          <View style={s.col}>
            {snapshotPng ? (
              /* eslint-disable-next-line jsx-a11y/alt-text */
              <Image src={snapshotPng} style={s.foto} />
            ) : (
              <Text style={{ color: "#999", textAlign: "center", marginTop: 60 }}>(sin vista 3D)</Text>
            )}
          </View>
        </View>
        <Reparto reparto={(rec.result as LonaResult | BaquetonResult).reparto} />
      </Page>
    </Document>
  );
}

function DatosLona({ rec }: { rec: PlanteamientoRecord }) {
  const r = rec.result as LonaResult;
  const i = rec.input as LonaInput;
  return (
    <>
      <Dato l="Paños a cortar" v={[
        `${i.cantidad} PAÑO DE ${fmt(r.panoDelantero.ancho)} x ${fmt(r.panoDelantero.alto)}`,
        `${i.cantidad} PAÑO DE ${fmt(r.panoTrasero.ancho)} x ${fmt(r.panoTrasero.alto)}`,
        r.panoContorno ? `${i.cantidad} PAÑO DE ${fmt(r.panoContorno.ancho)} x ${fmt(r.panoContorno.alto)}` : "",
      ].filter(Boolean).join("  ·  ")} />
      <Dato l="Medida lona hecha" v={`${fmt(r.lonaHecha.largo)} X ${fmt(r.lonaHecha.ancho)} · ALTO ${fmt(i.altoDelante)}`} />
      <Dato l="Perfil" v={i.tipoPerfil} />
      <Dato l="Recoge delante" v={r.recogeDelanteTexto} />
      <Dato l="Recoge atrás" v={r.recogeAtrasTexto} />
      <Dato l="Ventana" v={i.ventana ? "SÍ" : "NO"} />
      <Dato l="Bastilla enfundar" v={i.bastillaEnfundar ? "SÍ" : "NO"} />
      <Dato l="Ollaos" v={i.modoOllaos} />
      <Dato l="Metros de tela" v={r.metrosTela ? `${fmt(r.metrosTela)} m` : "—"} />
      {i.observaciones ? <Dato l="Observaciones" v={i.observaciones} /> : null}
    </>
  );
}

function DatosBaqueton({ rec }: { rec: PlanteamientoRecord }) {
  const r = rec.result as BaquetonResult;
  const i = rec.input as BaquetonInput;
  return (
    <>
      <Dato l="Paños a cortar" v={`${i.cantidad} PAÑO DE ${fmt(r.panoUnico.largo)} x ${fmt(r.panoUnico.ancho)}`} />
      <Dato l="Remolque hecho" v={`LARGO ${fmt(r.remolqueHecho.largo)} · ANCHO ${fmt(r.remolqueHecho.ancho)}`} />
      <Dato l="Baquetón" v={`${fmt(i.baqueton)} ${r.baquetonTrasero ? `· TRASERO ${fmt(r.baquetonTrasero)} NO EN LÍNEA` : "· EN LÍNEA"}`} />
      <Dato l="Cliente específico" v={i.clienteEspecifico} />
      <Dato l="Superficie de tela" v={`${fmt(r.superficieM2)} m2 / unidad`} />
      <Dato l="Metros de tela" v={r.metrosTela ? `${fmt(r.metrosTela)} m` : "—"} />
      <Dato l="Ollaos" v={i.modoOllaos} />
      {i.observaciones ? <Dato l="Observaciones" v={i.observaciones} /> : null}
    </>
  );
}
```

- [ ] **Step 4: Ruta API con guardado en red**

```ts
// src/app/api/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { carpetaPdf, nombrePdf } from "@/lib/pdf/ruta-pdf";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";

const RUTA_DEFECTO = "\\\\FILESERVER\\RPS\\VENTAS\\PLANTEAMIENTOS";

export async function POST(req: NextRequest) {
  const { id, snapshot } = await req.json();
  const rec = await getStore().get(id);
  if (!rec) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const buffer = await renderToBuffer(
    <PlanteamientoPdf rec={rec} snapshotPng={snapshot ?? null} />,
  );

  const nombre = nombrePdf(rec.numeroPedido || "SIN-PEDIDO", rec.version);
  const carpeta = carpetaPdf(process.env.RUTA_PLANTEAMIENTOS ?? RUTA_DEFECTO, new Date());
  let guardadoRed: "ok" | "error" = "error";
  let pdfPath: string | null = null;
  try {
    mkdirSync(carpeta, { recursive: true });
    pdfPath = path.win32.join(carpeta, nombre);
    writeFileSync(pdfPath, buffer);
    guardadoRed = "ok";
  } catch {
    pdfPath = null; // la descarga sigue funcionando; el registro queda sin ruta
  }
  await getStore().save({ ...rec, pdfPath });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "X-Nombre-Pdf": nombre,
      "X-Guardado-Red": guardadoRed,
    },
  });
}
```

El fichero debe llamarse `route.tsx` si el compilador exige JSX, o usar
`createElement(PlanteamientoPdf, { rec, snapshotPng: snapshot ?? null })` en
`route.ts` — comprobar qué admite este Next 16 en
`node_modules/next/dist/docs/` antes de decidir.

Para desarrollo sin red: en `.env.local` poner
`RUTA_PLANTEAMIENTOS=C:\temp\PLANTEAMIENTOS` y comprobar que el PDF aparece en
`C:\temp\PLANTEAMIENTOS\2026\`.

- [ ] **Step 5: Verificar**

Run: `pnpm test` (rutas) y `pnpm dev` → botón «Generar PDF» con el caso
AR2602796: descarga `AR2602796-10.pdf`, se crea el fichero en la carpeta del
año, el PDF muestra datos + instantánea 3D + tabla de reparto. Borrar
`RUTA_PLANTEAMIENTOS` del `.env.local` y repetir: descarga con aviso «no se
pudo escribir en la red».

- [ ] **Step 6: Commit**

```powershell
git add src/lib/pdf src/app/api/pdf
git commit -m "feat(pdf): a4 apaisado con guardado en carpeta planteamientos"
```

---

### Task 15: Historial con «Reutilizar»

**Files:**
- Create: `src/app/historial-v2/page.tsx` (en Task 16 pasará a ser `/historial`)
- Modify: `src/app/planteamiento/page.tsx` (leer `?desde=<id>`)
- Modify: `src/components/layout/AppShell.tsx` (enlace «Historial v2» temporal)

**Interfaces:**
- Consumes: `GET /api/planteamientos`, `GET /api/planteamientos/:id` (Task 10); `Workspace` + `WorkspaceInicial` (Task 13).
- Produces: `/historial-v2` con buscador; botón «Reutilizar» navega a `/planteamiento?desde=<id>`.

- [ ] **Step 1: Página de historial**

```tsx
// src/app/historial-v2/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlanteamientoRecord } from "@/lib/store/types";

export default function HistorialPage() {
  const [texto, setTexto] = useState("");
  const [items, setItems] = useState<PlanteamientoRecord[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/planteamientos?texto=${encodeURIComponent(texto)}`)
        .then((r) => r.json()).then(setItems).catch(() => setItems([]));
    }, 200);
    return () => clearTimeout(t);
  }, [texto]);

  return (
    <main className="p-4">
      <h1 className="mb-4 text-lg font-semibold">Historial de planteamientos</h1>
      <input
        className="mb-3 w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
        placeholder="Buscar por pedido o cliente…"
        value={texto} onChange={(e) => setTexto(e.target.value)}
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <th className="p-2">Pedido</th><th className="p-2">Ver.</th><th className="p-2">Tipo</th>
            <th className="p-2">Cliente</th><th className="p-2">Modificado</th><th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100">
              <td className="p-2 font-medium">{r.numeroPedido || "—"}</td>
              <td className="p-2">{r.version || "—"}</td>
              <td className="p-2">{r.tipo === "lona" ? "Lona remolque" : "Baquetón"}</td>
              <td className="p-2">{r.cliente || "—"}</td>
              <td className="p-2 tabular-nums">{new Date(r.updatedAt).toLocaleString("es-ES")}</td>
              <td className="p-2">
                <Link className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium"
                  href={`/planteamiento?desde=${r.id}`}>
                  Reutilizar
                </Link>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} className="p-4 text-center text-neutral-400">Sin resultados</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] **Step 2: Cargar `?desde=` en la pantalla de trabajo**

Reescribir `src/app/planteamiento/page.tsx` como Server Component que lee el
registro y lo pasa a `Workspace`. «Reutilizar» carga los datos pero **sin id**
(guardará como planteamiento nuevo):

```tsx
// src/app/planteamiento/page.tsx
import { Workspace, type WorkspaceInicial } from "@/components/workspace/Workspace";
import { getStore } from "@/lib/store";

export default async function PlanteamientoPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  const { desde } = await searchParams;
  let inicial: WorkspaceInicial | undefined;
  if (desde) {
    const rec = await getStore().get(desde);
    if (rec) inicial = { tipo: rec.tipo, input: rec.input }; // sin id: copia nueva
  }
  return (
    <main className="p-4">
      <h1 className="mb-4 text-lg font-semibold">Planteamiento</h1>
      <Workspace inicial={inicial} key={desde ?? "nuevo"} />
    </main>
  );
}
```

(Comprobar la forma de `searchParams` en la guía de este Next 16 en
`node_modules/next/dist/docs/` — puede ser Promise como aquí o directa.)

- [ ] **Step 3: Verificar en navegador**

`pnpm dev`: guardar un planteamiento, verlo en `/historial-v2`, pulsar
«Reutilizar» → formulario precargado; cambiar el nº de pedido y guardar →
aparece un registro nuevo (no machaca el original).

- [ ] **Step 4: Commit**

```powershell
git add src/app/historial-v2 src/app/planteamiento src/components/layout/AppShell.tsx
git commit -m "feat(historial): listado con busqueda y reutilizar"
```

---

### Task 16: Limpieza del legado y verificación final

**Files:**
- Delete: `src/app/nuevo/` (las tres páginas), `src/app/materiales/page.tsx`, `src/app/parametros/page.tsx`, `src/app/plantillas-ollaos/page.tsx`, `src/app/historial/page.tsx`
- Delete: `src/components/drawings/`, `src/components/print/`, `src/components/result/`, `src/components/planteamiento/`, `src/components/ollaos/`, `src/components/history/`, `src/components/settings/`, `src/components/ui/`
- Delete: `src/lib/calculations/`, `src/lib/drawings/`, `src/lib/print/`, `src/lib/defaults/`, `src/lib/hooks/`, `src/lib/storage/`, `src/lib/validation/`, `src/lib/format/`, `src/lib/types/`
- Delete: `scripts/verify-calculations.mjs` (sustituido por Vitest) y el script `verify` de `package.json`
- Rename: `src/app/historial-v2/` → `src/app/historial/`
- Modify: `src/app/page.tsx` (portada: dos accesos, «Nuevo planteamiento» → `/planteamiento` e «Historial» → `/historial`), `src/components/layout/AppShell.tsx` (dejar solo Planteamiento e Historial)

**Interfaces:**
- Consumes: todo lo anterior. No produce API nueva.

- [ ] **Step 1: Borrar legado y renombrar**

```powershell
git rm -r src/app/nuevo src/app/materiales src/app/parametros src/app/plantillas-ollaos src/app/historial
git rm -r src/components/drawings src/components/print src/components/result src/components/planteamiento src/components/ollaos src/components/history src/components/settings src/components/ui
git rm -r src/lib/calculations src/lib/drawings src/lib/print src/lib/defaults src/lib/hooks src/lib/storage src/lib/validation src/lib/format src/lib/types
git rm scripts/verify-calculations.mjs
git mv src/app/historial-v2 src/app/historial
```

Si `AppShell.tsx` u otra página superviviente importa algo borrado, el build lo
detecta: reescribir esas importaciones apuntando al código nuevo (o eliminar el
componente si era solo del flujo antiguo). Actualizar el enlace del historial a
`/historial`.

- [ ] **Step 2: Portada**

```tsx
// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Planteamientos TGM</h1>
      <p className="text-sm text-neutral-500">Lonas de remolque y baquetones</p>
      <div className="flex gap-4">
        <Link href="/planteamiento" className="rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white">
          Nuevo planteamiento
        </Link>
        <Link href="/historial" className="rounded-xl border border-neutral-300 px-6 py-3 font-medium">
          Historial
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verificación completa**

Run: `pnpm test` — Expected: todos los tests PASS.
Run: `pnpm lint` — Expected: sin errores.
Run: `pnpm build` — Expected: build OK (ninguna importación rota).
Run: `pnpm dev` — recorrer: portada → nuevo planteamiento (lona AR2602796 y un
baquetón HPL) → 3D correcto → guardar → PDF descargado y en carpeta →
historial → reutilizar.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "refactor: retirar flujo antiguo; v2 como unico flujo"
```

---

### Task 17: Parámetros editables (hoja PAR en ajustes)

**Files:**
- Modify: `src/lib/store/types.ts` (interfaz), `src/lib/store/file-store.ts`, `src/lib/store/mssql-store.ts`, `db/schema.sql`
- Create: `src/app/api/parametros/route.ts`
- Create: `src/app/parametros/page.tsx`
- Modify: `src/app/api/planteamientos/build-record.ts` (usar parámetros del store)
- Modify: `src/app/api/planteamientos/route.ts` (pasar params a buildRecord)
- Modify: `src/components/workspace/Workspace.tsx` (cálculo en vivo con params del servidor)
- Modify: `src/components/layout/AppShell.tsx` (enlace «Parámetros»)
- Test: `src/lib/store/__tests__/params-store.test.ts`

**Interfaces:**
- Consumes: `CalcParams`, `DEFAULT_PARAMS` (Task 3); `FileStore` (Task 8); `MssqlStore` (Task 9).
- Produces: en `PlanteamientoStore`: `getParams(): Promise<CalcParams>` y
  `saveParams(p: CalcParams): Promise<void>`; API `GET/PUT /api/parametros`;
  `buildRecord(tipo, input, params, id?)` — **cambia la firma**: recibe los
  parámetros en vez de usar `DEFAULT_PARAMS` (el snapshot por planteamiento ya
  conserva el histórico, que es lo que pide el spec).

- [ ] **Step 1: Test que falla**

```ts
// src/lib/store/__tests__/params-store.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { DEFAULT_PARAMS } from "@/lib/calc/params";

const dirs: string[] = [];
const makeStore = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "tgm-params-"));
  dirs.push(dir);
  return new FileStore(dir);
};
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

describe("parámetros en FileStore", () => {
  it("sin fichero devuelve DEFAULT_PARAMS", async () => {
    expect(await makeStore().getParams()).toEqual(DEFAULT_PARAMS);
  });
  it("saveParams persiste y getParams lo devuelve", async () => {
    const store = makeStore();
    await store.saveParams({ ...DEFAULT_PARAMS, pasoOllaosDefecto: 40 });
    expect((await store.getParams()).pasoOllaosDefecto).toBe(40);
  });
});
```

Run: `pnpm test` — Expected: FAIL (métodos no existen).

- [ ] **Step 2: Store**

Añadir a `PlanteamientoStore` (`types.ts`):

```ts
  getParams(): Promise<CalcParams>;
  saveParams(p: CalcParams): Promise<void>;
```

`FileStore` (fichero `parametros.json`):

```ts
  async getParams(): Promise<CalcParams> {
    const f = this.file("parametros.json");
    if (!existsSync(f)) return DEFAULT_PARAMS;
    return JSON.parse(readFileSync(f, "utf8")) as CalcParams;
  }

  async saveParams(p: CalcParams): Promise<void> {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.file("parametros.json"), JSON.stringify(p, null, 1), "utf8");
  }
```

(con `import { DEFAULT_PARAMS } from "@/lib/calc/params";` y el tipo `CalcParams`).

`MssqlStore` — tabla clave/valor con una sola fila vigente; añadir a `db/schema.sql`:

```sql
CREATE TABLE dbo.Parametros (
  Id INT NOT NULL PRIMARY KEY DEFAULT 1 CHECK (Id = 1),
  ParamsJson NVARCHAR(MAX) NOT NULL,
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

```ts
  async getParams(): Promise<CalcParams> {
    const pool = await this.getPool();
    const res = await pool.request().query("SELECT ParamsJson FROM dbo.Parametros WHERE Id = 1");
    return res.recordset[0] ? JSON.parse(res.recordset[0].ParamsJson) : DEFAULT_PARAMS;
  }

  async saveParams(p: CalcParams): Promise<void> {
    const pool = await this.getPool();
    await pool.request().input("json", sql.NVarChar, JSON.stringify(p)).query(`
      MERGE dbo.Parametros AS t USING (SELECT 1 AS Id) AS s ON t.Id = s.Id
      WHEN MATCHED THEN UPDATE SET ParamsJson = @json, UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (Id, ParamsJson) VALUES (1, @json);`);
  }
```

Run: `pnpm test` — Expected: PASS.

- [ ] **Step 3: API y recálculo con parámetros vigentes**

```ts
// src/app/api/parametros/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await getStore().getParams());
}

export async function PUT(req: NextRequest) {
  const params = await req.json();
  await getStore().saveParams(params);
  return NextResponse.json(params);
}
```

En `build-record.ts`, cambiar la firma a
`buildRecord(tipo, input, params: CalcParams, id?)` y usar `params` en
`calcLona`/`calcBaqueton` y como `paramsSnapshot`. En
`src/app/api/planteamientos/route.ts` (POST):

```ts
const params = await getStore().getParams();
const saved = await getStore().save(buildRecord(tipo, input, params, id));
```

Actualizar el test de Task 10 (`api-payload.test.ts`) para pasar
`DEFAULT_PARAMS` como tercer argumento.

En `Workspace.tsx`: cargar los parámetros junto a los materiales y usarlos en
el cálculo en vivo:

```ts
const [params, setParams] = useState<CalcParams>(DEFAULT_PARAMS);
useEffect(() => {
  fetch("/api/parametros").then((r) => r.json()).then(setParams).catch(() => {});
}, []);
const resLona = useMemo(() => calcLona(lona, params), [lona, params]);
const resBaq = useMemo(() => calcBaqueton(baq, params), [baq, params]);
```

(con `import { DEFAULT_PARAMS, type CalcParams } from "@/lib/calc/params";`;
las listas de recogidas/clientes de los formularios pasan a leerse de `params`
en vez de `DEFAULT_PARAMS`: pasar `params` como prop a ambos formularios).

- [ ] **Step 4: Página de parámetros**

```tsx
// src/app/parametros/page.tsx
"use client";
import { useEffect, useState } from "react";
import type { CalcParams } from "@/lib/calc/params";
import { CampoNum } from "@/components/workspace/campos";

export default function ParametrosPage() {
  const [p, setP] = useState<CalcParams | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    fetch("/api/parametros").then((r) => r.json()).then(setP);
  }, []);
  if (!p) return <main className="p-4 text-sm text-neutral-400">Cargando…</main>;

  const setConst = (k: keyof CalcParams, v: number) => setP({ ...p, [k]: v });
  const setRecogida = (i: number, campo: "delante" | "atras" | "lateralSoloAtras" | "lateralSoloDelante", v: number) =>
    setP({ ...p, recogidas: p.recogidas.map((r, j) => (j === i ? { ...r, [campo]: v } : r)) });

  async function guardar() {
    const res = await fetch("/api/parametros", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
    });
    setAviso(res.ok ? "Parámetros guardados." : "Error al guardar.");
  }

  return (
    <main className="max-w-3xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Parámetros de cálculo</h1>
      <h2 className="mb-2 text-sm font-semibold">Constantes de lona</h2>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <CampoNum label="Demasía alto" value={p.demasiaAlto} onChange={(v) => setConst("demasiaAlto", v)} />
        <CampoNum label="Contorno normal" value={p.demasiaContornoNormal} onChange={(v) => setConst("demasiaContornoNormal", v)} />
        <CampoNum label="Contorno enfundar" value={p.demasiaContornoEnfundar} onChange={(v) => setConst("demasiaContornoEnfundar", v)} />
        <CampoNum label="Lona hecha" value={p.demasiaLonaHecha} onChange={(v) => setConst("demasiaLonaHecha", v)} />
        <CampoNum label="Aumento curva" value={p.aumentoCurvaContorno} onChange={(v) => setConst("aumentoCurvaContorno", v)} />
        <CampoNum label="Paso ollaos" value={p.pasoOllaosDefecto} onChange={(v) => setConst("pasoOllaosDefecto", v)} />
        <CampoNum label="Primer ollao" value={p.primerOllao} onChange={(v) => setConst("primerOllao", v)} />
      </div>
      <h2 className="mb-2 text-sm font-semibold">Tipos de recogida (demasías)</h2>
      <table className="mb-4 w-full text-xs">
        <thead>
          <tr className="bg-neutral-50 text-left uppercase text-neutral-500">
            <th className="p-1">Recogida</th><th className="p-1">Delante</th><th className="p-1">Atrás</th>
            <th className="p-1">Lat. solo atrás</th><th className="p-1">Lat. solo delante</th>
          </tr>
        </thead>
        <tbody>
          {p.recogidas.map((r, i) => (
            <tr key={r.nombre} className="border-b border-neutral-100">
              <td className="p-1 font-medium">{r.nombre}</td>
              {(["delante", "atras", "lateralSoloAtras", "lateralSoloDelante"] as const).map((campo) => (
                <td key={campo} className="p-1">
                  <input type="number" step="0.5" className="w-20 rounded border border-neutral-300 px-1 py-0.5 tabular-nums"
                    value={r[campo]} onChange={(e) => setRecogida(i, campo, Number(e.target.value))} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={guardar} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
        Guardar parámetros
      </button>
      {aviso && <p className="mt-2 text-xs text-neutral-600">{aviso}</p>}
    </main>
  );
}
```

(Las demasías de clientes de baquetón se editan igual si hace falta más
adelante; de momento la tabla de recogidas y las constantes cubren lo que
cambia en el día a día. Añadir enlace «Parámetros» en `AppShell.tsx`.)

- [ ] **Step 5: Verificar**

Run: `pnpm test` y `pnpm build` — Expected: PASS/OK.
En navegador: cambiar «Paso ollaos» a 40, guardar, volver a `/planteamiento` y
comprobar que el reparto usa 40; los planteamientos ya guardados conservan su
`paramsSnapshot` anterior.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/store src/app/api src/app/parametros src/components db/schema.sql
git commit -m "feat(parametros): hoja PAR editable con persistencia"
```

---

## Verificación de cierre (tras Task 17)

1. `pnpm test && pnpm lint && pnpm build` en limpio.
2. Caso de aceptación completo con datos reales del pedido AR2602796 (los dos
   modos) comparando contra los PDFs de `R:\VENTAS\PLANTEAMIENTOS\2026\`.
3. Revisar los pendientes del spec antes de dar por cerrada la rama:
   - **P1** (columna DELANTE/ATRÁS del paño trasero): si Iván ya tiene
     respuesta, ajustar `USAR_COLUMNA_ATRAS` y su test.
   - **P2** (sufijo del PDF): confirmar la regla `-10`/`-20` con un caso real.
   - **P3** (SQL Server): cuando IT dé la BD, probar `DATASOURCE=mssql` con
     `db/schema.sql` aplicado.
4. Usar la skill superpowers:finishing-a-development-branch para decidir
   merge/PR.

