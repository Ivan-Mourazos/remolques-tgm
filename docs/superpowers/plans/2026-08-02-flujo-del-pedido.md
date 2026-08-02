# El flujo del pedido — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un pedido sea una lista de líneas que se editan sin perder nada, se eliminan si sobran, y solo se guardan y archivan cuando todas están listas.

**Architecture:** `EstadoWorkspace` deja de tener «un elemento activo» (`lona`, `baqueton`, `id`, `editorActivo`) y pasa a tener `lineas` y `versionActiva`. Las líneas viven como borradores en `localStorage` hasta que se completa el pedido; al completarlo se comprueban todas, se guardan todas, se genera el PDF y se limpian los borradores. Lo puro —qué es una línea, su estado, los borradores, qué impide completar— vive en `src/lib/workspace/` y se testea; los componentes solo pintan.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4, Vitest 4 (`environment: "node"`), @react-pdf/renderer, mssql.

## Global Constraints

- **Sin dependencias nuevas.** Ni de producción, ni de desarrollo, ni fuentes.
- **Español** en código, nombres, comentarios y textos de UI.
- Tests solo `*.test.ts` (nunca `.tsx`) bajo `environment: "node"`. Los componentes React no se pueden testear aquí; su red es `tsc`, `lint` y el recorrido de Iván (Task 9).
- **La aplicación se abre por IP sobre HTTP plano**, así que no hay contexto seguro: prohibido `crypto.randomUUID`, `navigator.clipboard`, `showSaveFilePicker` y los service workers. Para identificadores locales, contadores o `Date.now()`.
- **Eliminar una línea nunca es silencioso**: si tiene registro guardado se borra también el registro, y siempre media el diálogo de confirmación del bloque 2 nombrando qué remolque es.
- Tras cada tarea: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`. Los tres en verde antes del commit, salvo donde una tarea diga lo contrario.
- Commits en español al estilo del repo.
- **Fuera de alcance:** el historial y el acabado general (bloque 3b), el rendimiento (bloque 4), cambiar el formato de la hoja o el contenido de los datos, y recuperar líneas eliminadas.

## Dos cosas que el diseño no previó y este plan resuelve

1. **El dibujo de una línea que no está abierta.** Hoy cada elemento se guarda con su `snapshotSvg` en el momento de guardarlo, así que al generar el PDF todos tenían dibujo. Con el modelo de lista no se guarda nada hasta completar, y la escena solo dibuja la línea abierta: las demás llegarían al PDF sin dibujo. La línea guarda su propio `snapshotSvg`, capturado al dejar de editarla (Task 5, `SNAPSHOT_CAPTURADO`).
2. **`orquestarPdf` y `/api/pdf` solo saben de un borrador.** Con varias líneas sin guardar, la vista previa del pedido enseñaría una sola página. Las dos capas pasan a aceptar varias (Task 6). No estaban en la tabla del diseño; sin ellas la vista previa sería una regresión.

---

### Task 1: Qué es una línea y cuándo está lista

**Files:**
- Create: `src/lib/workspace/lineas.ts`
- Create: `src/lib/workspace/__tests__/lineas.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface LineaPedido {
    version: string;
    tipo: TipoPlanteamiento;
    input: LonaInput | BaquetonInput;
    id?: string;
    snapshotSvg?: string | null;
    origenRps?: OrigenRps | null;
  }
  export interface EstadoLinea { lista: boolean; falta: string | null }
  export function nombreLinea(linea: LineaPedido): string;
  export function estadoLinea(linea: LineaPedido): EstadoLinea;
  export function lineasDesdeRegistros(registros: PlanteamientoRecord[]): LineaPedido[];
  export function fusionarLineas(guardadas: LineaPedido[], borradores: LineaPedido[]): LineaPedido[];
  export function siguienteVersion(lineas: LineaPedido[]): string;
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/workspace/__tests__/lineas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "@/components/workspace/entradas-vacias";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { LonaInput } from "@/lib/calc/lona";
import {
  estadoLinea, fusionarLineas, lineasDesdeRegistros, nombreLinea, siguienteVersion,
  type LineaPedido,
} from "@/lib/workspace/lineas";

/** Una lona con todo decidido: la referencia de «lista». */
const lonaCompleta = (version: string): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente: "CLIENTE" },
  largo: 600, ancho: 250, altoDelante: 220, contorno: 620, material: "PVC 580 AZUL",
  tipoPerfil: "TIPO 01", recogeDelante: "NO", recogeAtras: "NO",
  ventana: false, rotulacion: false, bastillaEnfundar: false, modoOllaos: "REPARTIDOS",
});

const linea = (version: string, cambios: Partial<LineaPedido> = {}): LineaPedido => ({
  version, tipo: "lona", input: lonaCompleta(version), ...cambios,
});

const registro = (id: string, version: string, createdAt: string): PlanteamientoRecord => ({
  id, tipo: "lona", numeroPedido: "AR2603583", version, cliente: "CLIENTE",
  input: lonaCompleta(version),
  result: {}, paramsSnapshot: {}, snapshotSvg: `<svg id="${id}"/>`,
  createdAt, updatedAt: createdAt,
} as unknown as PlanteamientoRecord);

describe("nombreLinea", () => {
  it("numera desde 1 aunque la versión empiece en 10", () => {
    expect(nombreLinea(linea("10"))).toBe("Remolque 1");
    expect(nombreLinea(linea("12"))).toBe("Remolque 3");
  });

  it("distingue el baquetón del remolque", () => {
    expect(nombreLinea({ version: "11", tipo: "baqueton", input: emptyBaqueton() })).toBe("Baquetón 2");
  });
});

describe("estadoLinea", () => {
  it("da por lista la que no tiene ningún error", () => {
    expect(estadoLinea(linea("10"))).toEqual({ lista: true, falta: null });
  });

  it("no da por lista una línea guardada solo porque tenga id", () => {
    // La base de datos contiene registros incompletos: se comprueban igual.
    const guardadaIncompleta = linea("10", {
      id: "abc",
      input: { ...lonaCompleta("10"), modoOllaos: "" },
    });
    expect(estadoLinea(guardadaIncompleta).lista).toBe(false);
  });

  it("dice qué falta, con el primer error", () => {
    const sinPerfil = linea("10", { input: { ...lonaCompleta("10"), tipoPerfil: "" } });
    expect(estadoLinea(sinPerfil).falta).toBe("Elige el tipo de perfil del remolque.");
  });
});

describe("lineasDesdeRegistros", () => {
  it("convierte cada registro en línea con su id y su dibujo, en orden de versión", () => {
    const lineas = lineasDesdeRegistros([
      registro("b", "11", "2026-07-20T11:00:00Z"),
      registro("a", "10", "2026-07-20T10:00:00Z"),
    ]);
    expect(lineas.map((l) => [l.version, l.id])).toEqual([["10", "a"], ["11", "b"]]);
    expect(lineas[0].snapshotSvg).toBe('<svg id="a"/>');
  });

  it("deduplica quedándose con el guardado más reciente de cada versión", () => {
    const viejo = registro("a", "10", "2026-07-20T10:00:00Z");
    const nuevo = { ...registro("c", "10", "2026-07-20T10:00:00Z"), updatedAt: "2026-07-21T10:00:00Z" };
    expect(lineasDesdeRegistros([viejo, nuevo]).map((l) => l.id)).toEqual(["c"]);
  });
});

describe("fusionarLineas", () => {
  it("el borrador manda sobre el registro guardado, pero hereda su id", () => {
    // Si el borrador perdiera el id se guardaría como registro nuevo y
    // aparecerían dos versiones iguales del mismo remolque.
    const guardadas = lineasDesdeRegistros([registro("a", "10", "2026-07-20T10:00:00Z")]);
    const borrador = linea("10", { input: { ...lonaCompleta("10"), largo: 999 } });
    const fusionadas = fusionarLineas(guardadas, [borrador]);
    expect(fusionadas).toHaveLength(1);
    expect((fusionadas[0].input as LonaInput).largo).toBe(999);
    expect(fusionadas[0].id).toBe("a");
  });

  it("conserva el dibujo guardado cuando el borrador no trae uno", () => {
    const guardadas = lineasDesdeRegistros([registro("a", "10", "2026-07-20T10:00:00Z")]);
    const fusionadas = fusionarLineas(guardadas, [linea("10")]);
    expect(fusionadas[0].snapshotSvg).toBe('<svg id="a"/>');
  });

  it("suma las líneas que solo existen en un lado, ordenadas por versión", () => {
    const guardadas = lineasDesdeRegistros([registro("a", "10", "2026-07-20T10:00:00Z")]);
    const fusionadas = fusionarLineas(guardadas, [linea("12"), linea("11")]);
    expect(fusionadas.map((l) => l.version)).toEqual(["10", "11", "12"]);
  });
});

describe("siguienteVersion", () => {
  it("arranca en 10 cuando el pedido está vacío", () => {
    expect(siguienteVersion([])).toBe("10");
  });

  it("sigue a la mayor, no al número de líneas", () => {
    // Tras eliminar la del medio, la siguiente no puede repetir una versión viva.
    expect(siguienteVersion([linea("10"), linea("12")])).toBe("13");
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/lineas.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/workspace/lineas"`.

- [ ] **Step 3: Escribir el módulo**

Crear `src/lib/workspace/lineas.ts`:

```ts
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { OrigenRps } from "@/lib/rps/types";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { nombreElementoPedido, remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { erroresPlanteamiento } from "@/lib/pedidos/validar-planteamiento";

/**
 * Una línea del pedido. Las guardadas y los borradores son lo mismo: lo único
 * que las distingue es que la guardada trae `id`. Así no hay dos listas que
 * cuadrar entre sí.
 */
export interface LineaPedido {
  version: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
  /** id del registro guardado del que salió; ausente si nunca se guardó. */
  id?: string;
  /**
   * SVG de la vista técnica, capturado al dejar de editar la línea. La escena
   * solo dibuja la línea abierta, así que sin esto las demás llegarían al PDF
   * sin dibujo.
   */
  snapshotSvg?: string | null;
  /** Línea de RPS de la que se importó, si vino de ahí. */
  origenRps?: OrigenRps | null;
}

export interface EstadoLinea {
  lista: boolean;
  /** Primer error pendiente, o null si está lista. */
  falta: string | null;
}

export function nombreLinea(linea: LineaPedido): string {
  return nombreElementoPedido(linea.version, linea.tipo);
}

/**
 * El estado se calcula, no se marca: uno marcado a mano se queda rancio en
 * cuanto se toca una medida. Y se calcula igual para todas, vengan de donde
 * vengan: una línea con `id` no está lista «por definición», porque la base de
 * datos contiene registros incompletos.
 */
export function estadoLinea(linea: LineaPedido): EstadoLinea {
  const errores = erroresPlanteamiento(linea.input);
  return { lista: errores.length === 0, falta: errores[0]?.mensaje ?? null };
}

const numeroVersion = (version: string) => {
  const numero = Number(version);
  return Number.isFinite(numero) ? numero : Number.MAX_SAFE_INTEGER;
};

const porVersion = (a: LineaPedido, b: LineaPedido) =>
  numeroVersion(a.version) - numeroVersion(b.version);

export function lineasDesdeRegistros(registros: PlanteamientoRecord[]): LineaPedido[] {
  return remolquesUnicos(registros).map((registro) => ({
    version: registro.version,
    tipo: registro.tipo,
    input: registro.input,
    id: registro.id,
    snapshotSvg: registro.snapshotSvg ?? null,
  }));
}

/**
 * Une lo que hay en la base de datos con lo que hay en el navegador. El
 * borrador manda —es lo último que tocó el usuario— pero hereda el `id` del
 * registro de su misma versión: sin él se guardaría como registro nuevo y el
 * pedido acabaría con dos veces el mismo remolque.
 */
export function fusionarLineas(
  guardadas: LineaPedido[], borradores: LineaPedido[],
): LineaPedido[] {
  const porClave = new Map(guardadas.map((linea) => [linea.version, linea]));
  for (const borrador of borradores) {
    const guardada = porClave.get(borrador.version);
    porClave.set(borrador.version, guardada
      ? {
          ...borrador,
          id: borrador.id ?? guardada.id,
          snapshotSvg: borrador.snapshotSvg ?? guardada.snapshotSvg,
        }
      : borrador);
  }
  return [...porClave.values()].sort(porVersion);
}

/** Sigue a la versión más alta, no al número de líneas: eliminar no reutiliza. */
export function siguienteVersion(lineas: LineaPedido[]): string {
  const ultima = lineas.reduce((maximo, linea) => {
    const version = Number(linea.version);
    return Number.isInteger(version) ? Math.max(maximo, version) : maximo;
  }, 9);
  return String(ultima + 1);
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/lineas.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde. Este módulo es nuevo y todavía no lo usa nadie.

- [ ] **Step 6: Commit**

```bash
git add src/lib/workspace/lineas.ts src/lib/workspace/__tests__/lineas.test.ts
git commit -m "feat: un pedido es una lista de líneas con estado calculado"
```

---

### Task 2: Los borradores sobreviven a cerrar la pestaña

**Files:**
- Create: `src/lib/workspace/borradores-locales.ts`
- Create: `src/lib/workspace/__tests__/borradores-locales.test.ts`

**Interfaces:**
- Consumes: `LineaPedido` de la Task 1.
- Produces:
  ```ts
  export function claveBorradores(numeroPedido: string): string;
  export function leerBorradores(almacen: Storage | null, numeroPedido: string): LineaPedido[];
  export function guardarBorradores(almacen: Storage | null, numeroPedido: string, lineas: LineaPedido[]): boolean;
  export function limpiarBorradores(almacen: Storage | null, numeroPedido: string): void;
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/workspace/__tests__/borradores-locales.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LineaPedido } from "@/lib/workspace/lineas";
import {
  claveBorradores, guardarBorradores, leerBorradores, limpiarBorradores,
} from "@/lib/workspace/borradores-locales";

/** `Storage` de mentira: el módulo recibe el almacén, así que no hace falta navegador. */
function almacenFalso(inicial: Record<string, string> = {}, fallaAlEscribir = false): Storage {
  const datos = new Map(Object.entries(inicial));
  return {
    get length() { return datos.size; },
    clear: () => datos.clear(),
    getItem: (clave: string) => datos.get(clave) ?? null,
    key: (indice: number) => [...datos.keys()][indice] ?? null,
    removeItem: (clave: string) => { datos.delete(clave); },
    setItem: (clave: string, valor: string) => {
      if (fallaAlEscribir) throw new DOMException("QuotaExceededError");
      datos.set(clave, valor);
    },
  };
}

const linea: LineaPedido = { version: "10", tipo: "lona", input: emptyLona() };

describe("claveBorradores", () => {
  it("normaliza el número, para que AR.26.03583 y AR2603583 sean el mismo pedido", () => {
    expect(claveBorradores("AR.26.03583")).toBe(claveBorradores("AR2603583"));
  });
});

describe("ida y vuelta", () => {
  it("devuelve las líneas que se guardaron", () => {
    const almacen = almacenFalso();
    expect(guardarBorradores(almacen, "AR2603583", [linea])).toBe(true);
    expect(leerBorradores(almacen, "AR2603583")).toEqual([linea]);
  });

  it("cada pedido tiene su propia lista", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea]);
    expect(leerBorradores(almacen, "AR2600001")).toEqual([]);
  });

  it("guardar una lista vacía retira la entrada en vez de dejar un rastro", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea]);
    guardarBorradores(almacen, "AR2603583", []);
    expect(almacen.getItem(claveBorradores("AR2603583"))).toBeNull();
  });
});

describe("cuando el almacén no colabora", () => {
  it("sin almacén no revienta y no hay nada que leer", () => {
    expect(leerBorradores(null, "AR2603583")).toEqual([]);
    expect(guardarBorradores(null, "AR2603583", [linea])).toBe(false);
  });

  it("avisa de que no pudo guardar en vez de fingir que sí", () => {
    // El aviso importa: si esto falla, el trabajo solo vive en memoria.
    expect(guardarBorradores(almacenFalso({}, true), "AR2603583", [linea])).toBe(false);
  });

  it("un contenido corrupto se ignora como si no hubiera nada", () => {
    const almacen = almacenFalso({ [claveBorradores("AR2603583")]: "{ esto no es json" });
    expect(leerBorradores(almacen, "AR2603583")).toEqual([]);
  });

  it("un contenido que no es una lista de líneas tampoco cuela", () => {
    const almacen = almacenFalso({ [claveBorradores("AR2603583")]: '{"version":"10"}' });
    expect(leerBorradores(almacen, "AR2603583")).toEqual([]);
  });

  it("descarta las entradas de la lista que no parecen líneas", () => {
    const almacen = almacenFalso({
      [claveBorradores("AR2603583")]: JSON.stringify([linea, { version: "11" }, null]),
    });
    expect(leerBorradores(almacen, "AR2603583")).toEqual([linea]);
  });
});

describe("limpiarBorradores", () => {
  it("borra solo los de ese pedido", () => {
    const almacen = almacenFalso();
    guardarBorradores(almacen, "AR2603583", [linea]);
    guardarBorradores(almacen, "AR2600001", [linea]);
    limpiarBorradores(almacen, "AR2603583");
    expect(leerBorradores(almacen, "AR2603583")).toEqual([]);
    expect(leerBorradores(almacen, "AR2600001")).toEqual([linea]);
  });

  it("sin almacén no revienta", () => {
    expect(() => limpiarBorradores(null, "AR2603583")).not.toThrow();
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/borradores-locales.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/workspace/borradores-locales"`.

- [ ] **Step 3: Escribir el módulo**

Crear `src/lib/workspace/borradores-locales.ts`:

```ts
import type { LineaPedido } from "@/lib/workspace/lineas";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";

const PREFIJO = "tgm:borradores:";

/**
 * Los borradores viven en el navegador hasta que se completa el pedido. La
 * contrapartida es sabida y aceptada: un pedido a medias no sigue al usuario a
 * otro ordenador, y vaciar los datos del navegador lo pierde.
 *
 * El almacén llega por parámetro —no se lee `localStorage` aquí dentro— para
 * poder testear el módulo entero sin navegador.
 */
export function claveBorradores(numeroPedido: string): string {
  return `${PREFIJO}${normalizarNumeroPedido(numeroPedido)}`;
}

const pareceLinea = (valor: unknown): valor is LineaPedido => {
  if (typeof valor !== "object" || valor === null) return false;
  const linea = valor as Partial<LineaPedido>;
  return typeof linea.version === "string"
    && (linea.tipo === "lona" || linea.tipo === "baqueton")
    && typeof linea.input === "object" && linea.input !== null;
};

export function leerBorradores(almacen: Storage | null, numeroPedido: string): LineaPedido[] {
  if (!almacen) return [];
  try {
    const crudo = almacen.getItem(claveBorradores(numeroPedido));
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    // Lo que hay en el navegador puede venir de una versión anterior de la
    // aplicación: se filtra en vez de confiar en que tenga la forma esperada.
    return Array.isArray(datos) ? datos.filter(pareceLinea) : [];
  } catch {
    return [];
  }
}

/** Devuelve false si no se pudo guardar; entonces el trabajo solo vive en memoria. */
export function guardarBorradores(
  almacen: Storage | null, numeroPedido: string, lineas: LineaPedido[],
): boolean {
  if (!almacen) return false;
  try {
    if (lineas.length === 0) {
      almacen.removeItem(claveBorradores(numeroPedido));
      return true;
    }
    almacen.setItem(claveBorradores(numeroPedido), JSON.stringify(lineas));
    return true;
  } catch {
    return false;
  }
}

export function limpiarBorradores(almacen: Storage | null, numeroPedido: string): void {
  if (!almacen) return;
  try {
    almacen.removeItem(claveBorradores(numeroPedido));
  } catch {
    // Si no se puede limpiar, la próxima carga fusiona borrador y registro por
    // versión y el borrador ya coincide con lo guardado: no se pierde nada.
  }
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/borradores-locales.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 6: Commit**

```bash
git add src/lib/workspace/borradores-locales.ts src/lib/workspace/__tests__/borradores-locales.test.ts
git commit -m "feat: los borradores del pedido sobreviven a cerrar la pestaña"
```

---

### Task 3: Qué impide completar el pedido

**Files:**
- Create: `src/lib/workspace/completar-pedido.ts`
- Create: `src/lib/workspace/__tests__/completar-pedido.test.ts`

**Interfaces:**
- Consumes: `LineaPedido`, `estadoLinea`, `nombreLinea` de la Task 1.
- Produces:
  ```ts
  export interface ImpedimentoLinea { version: string; nombre: string; falta: string }
  export function impedimentosCompletar(lineas: LineaPedido[]): ImpedimentoLinea[];
  export function mensajeImpedimentos(impedimentos: ImpedimentoLinea[]): string;
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/workspace/__tests__/completar-pedido.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { LineaPedido } from "@/lib/workspace/lineas";
import { impedimentosCompletar, mensajeImpedimentos } from "@/lib/workspace/completar-pedido";

const lonaCompleta = (version: string): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente: "CLIENTE" },
  largo: 600, ancho: 250, altoDelante: 220, contorno: 620, material: "PVC 580 AZUL",
  tipoPerfil: "TIPO 01", recogeDelante: "NO", recogeAtras: "NO",
  ventana: false, rotulacion: false, bastillaEnfundar: false, modoOllaos: "REPARTIDOS",
});

const linea = (version: string, cambios: Partial<LonaInput> = {}): LineaPedido => ({
  version, tipo: "lona", input: { ...lonaCompleta(version), ...cambios },
});

describe("impedimentosCompletar", () => {
  it("no impide nada cuando todas las líneas están listas", () => {
    expect(impedimentosCompletar([linea("10"), linea("11")])).toEqual([]);
  });

  it("un pedido sin líneas no se puede completar", () => {
    expect(impedimentosCompletar([])).toEqual([
      { version: "", nombre: "El pedido", falta: "Añade al menos un remolque o un baquetón." },
    ]);
  });

  it("nombra la línea y dice qué le falta, en vez de omitirla en silencio", () => {
    expect(impedimentosCompletar([linea("10"), linea("11", { modoOllaos: "" })])).toEqual([
      { version: "11", nombre: "Remolque 2", falta: "Elige cómo van repartidos los ollaos." },
    ]);
  });

  it("recoge todas las que fallan, en el orden de la lista", () => {
    const impedimentos = impedimentosCompletar([
      linea("10", { tipoPerfil: "" }),
      linea("11"),
      linea("12", { material: "" }),
    ]);
    expect(impedimentos.map((i) => i.version)).toEqual(["10", "12"]);
  });
});

describe("mensajeImpedimentos", () => {
  it("una sola línea se nombra en singular y con su falta", () => {
    const mensaje = mensajeImpedimentos([
      { version: "11", nombre: "Remolque 2", falta: "Elige cómo van repartidos los ollaos." },
    ]);
    expect(mensaje).toBe("Remolque 2: Elige cómo van repartidos los ollaos.");
  });

  it("varias líneas se enumeran todas", () => {
    const mensaje = mensajeImpedimentos([
      { version: "10", nombre: "Remolque 1", falta: "Elige el tipo de perfil del remolque." },
      { version: "12", nombre: "Remolque 3", falta: "Elige el material." },
    ]);
    expect(mensaje).toBe(
      "Faltan 2 líneas por terminar. Remolque 1: Elige el tipo de perfil del remolque."
      + " Remolque 3: Elige el material.",
    );
  });

  it("sin impedimentos no hay mensaje", () => {
    expect(mensajeImpedimentos([])).toBe("");
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/completar-pedido.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/workspace/completar-pedido"`.

Si el mensaje de «Elige el material.» no coincide literalmente con el de
`erroresPlanteamiento`, **copiar el real** desde `src/lib/pedidos/validar-planteamiento.ts`
al test: el mensaje es el de la validación, no uno nuevo.

- [ ] **Step 3: Escribir el módulo**

Crear `src/lib/workspace/completar-pedido.ts`:

```ts
import { estadoLinea, nombreLinea, type LineaPedido } from "@/lib/workspace/lineas";

export interface ImpedimentoLinea {
  /** Versión de la línea que falla; "" cuando el problema es del pedido entero. */
  version: string;
  nombre: string;
  falta: string;
}

/**
 * Lo que impide dar el pedido por terminado, línea por línea. Hasta ahora
 * `orquestarPdf` filtraba las incompletas y solo decía cuántas había omitido:
 * el pedido salía «bien» con un remolque menos.
 */
export function impedimentosCompletar(lineas: LineaPedido[]): ImpedimentoLinea[] {
  if (lineas.length === 0) {
    return [{ version: "", nombre: "El pedido", falta: "Añade al menos un remolque o un baquetón." }];
  }
  return lineas.flatMap((linea) => {
    const estado = estadoLinea(linea);
    return estado.lista
      ? []
      : [{ version: linea.version, nombre: nombreLinea(linea), falta: estado.falta ?? "" }];
  });
}

export function mensajeImpedimentos(impedimentos: ImpedimentoLinea[]): string {
  if (impedimentos.length === 0) return "";
  const detalle = impedimentos.map(({ nombre, falta }) => `${nombre}: ${falta}`).join(" ");
  return impedimentos.length === 1
    ? detalle
    : `Faltan ${impedimentos.length} líneas por terminar. ${detalle}`;
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/completar-pedido.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 6: Commit**

```bash
git add src/lib/workspace/completar-pedido.ts src/lib/workspace/__tests__/completar-pedido.test.ts
git commit -m "feat: completar un pedido dice qué línea falta y por qué"
```

---

### Task 4: Borrar existe en las cuatro capas

Borrar no existe hoy en ninguna: ni en `PlanteamientoStore`, ni en `FileStore`, ni en `MssqlStore`, ni en la ruta `[id]`, que solo tiene `GET`.

**Files:**
- Modify: `src/lib/store/types.ts`
- Modify: `src/lib/store/file-store.ts`
- Modify: `src/lib/store/mssql-store.ts`
- Modify: `src/app/api/planteamientos/[id]/route.ts`
- Modify: `src/lib/store/__tests__/file-store.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // PlanteamientoStore
  delete(id: string): Promise<boolean>;   // true si existía y se borró
  ```

**Sobre `MssqlStore`:** su fichero de test solo cubre `rowToRecord`; no hay doble
del pool de `mssql` y montarlo para una consulta de una línea no compensa. `delete`
se escribe siguiendo el patrón de `save` —misma forma de pedir el pool, mismo
`sql.UniqueIdentifier`— y su red es `tsc` y el recorrido de Iván contra el servidor
real (Task 9, Step 4). No inventar un doble nuevo para esta tarea.

- [ ] **Step 1: Escribir el test que falla**

Añadir a `src/lib/store/__tests__/file-store.test.ts`, dentro del `describe("FileStore", …)`:

```ts
  it("delete borra solo ese registro y dice que existía", async () => {
    const store = makeStore();
    const uno = await store.save(rec);
    const otro = await store.save({ ...rec, version: "11" });
    expect(await store.delete(uno.id)).toBe(true);
    expect(await store.get(uno.id)).toBeNull();
    expect(await store.get(otro.id)).not.toBeNull();
  });

  it("delete de un id que no existe no borra nada y devuelve false", async () => {
    const store = makeStore();
    const uno = await store.save(rec);
    expect(await store.delete("no-existe")).toBe(false);
    expect(await store.get(uno.id)).not.toBeNull();
  });
```

- [ ] **Step 2: Ejecutar los tests y comprobar que fallan**

Run: `pnpm exec vitest run src/lib/store/__tests__/file-store.test.ts`
Expected: FAIL — `store.delete is not a function`.

- [ ] **Step 3: Añadir `delete` al contrato**

En `src/lib/store/types.ts`, dentro de `PlanteamientoStore`, justo después de `save`:

```ts
  /** Borra un planteamiento. Devuelve true si existía. Irreversible. */
  delete(id: string): Promise<boolean>;
```

- [ ] **Step 4: Implementarlo en las dos tiendas**

En `src/lib/store/file-store.ts`, después de `save`:

```ts
  async delete(id: string): Promise<boolean> {
    const recs = this.readAll();
    const quedan = recs.filter((r) => r.id !== id);
    if (quedan.length === recs.length) return false;
    this.writeAll(quedan);
    return true;
  }
```

En `src/lib/store/mssql-store.ts`, después de `save`:

```ts
  async delete(id: string): Promise<boolean> {
    const pool = await this.getPool();
    const res = await pool.request().input("id", sql.UniqueIdentifier, id)
      .query("DELETE FROM dbo.Planteamientos WHERE Id = @id");
    return (res.rowsAffected[0] ?? 0) > 0;
  }
```

- [ ] **Step 5: Añadir la ruta DELETE**

En `src/app/api/planteamientos/[id]/route.ts`, después del `GET`:

```ts
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const borrado = await getStore().delete(id);
  if (!borrado) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 6: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde. Si `tsc` señala otra implementación de `PlanteamientoStore`
(por ejemplo un doble en algún test), añadirle también `delete`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/store src/app/api/planteamientos
git commit -m "feat: se puede borrar un planteamiento guardado"
```

---

### Task 5: El estado del workspace es una lista de líneas

La tarea grande. `estado.ts` se construyó alrededor de «un elemento activo» y el
modelo de lista no cabe ahí: se reescribe, con sus tests.

**Files:**
- Modify: `src/lib/workspace/estado.ts`
- Modify: `src/lib/workspace/selectores.ts`
- Modify: `src/lib/workspace/__tests__/estado.test.ts`
- Modify: `src/lib/workspace/__tests__/selectores.test.ts`

**Interfaces:**
- Consumes: `LineaPedido`, `fusionarLineas`, `lineasDesdeRegistros`, `siguienteVersion` (Task 1).
- Produces:
  ```ts
  export interface EstadoWorkspace {
    numeroPedido: string;
    cliente: string;
    lineas: LineaPedido[];
    /** Versión de la línea abierta; null si no hay ninguna. */
    versionActiva: string | null;
    cargandoPedido: boolean;
    validacionIntentada: boolean;
    camposTocados: string[];
    rps: EstadoRpsWorkspace;      // sin `origen`: ahora va en cada línea
    accion: "preview" | "completar" | null;
  }
  export type AccionWorkspace =
    | { tipo: "PEDIDO_CAMBIADO"; valor: string }
    | { tipo: "CLIENTE_CAMBIADO"; valor: string }
    | { tipo: "BORRADORES_RECUPERADOS"; lineas: LineaPedido[] }
    | { tipo: "REGISTROS_CARGADOS"; registros: PlanteamientoRecord[] }
    | { tipo: "REGISTROS_FALLARON" }
    | { tipo: "LINEA_ANADIDA"; linea: LineaPedido }
    | { tipo: "LINEA_SELECCIONADA"; version: string }
    | { tipo: "LINEA_ELIMINADA"; version: string }
    | { tipo: "INPUT_CAMBIADO"; input: LonaInput | BaquetonInput }
    | { tipo: "SNAPSHOT_CAPTURADO"; version: string; svg: string | null }
    | { tipo: "PEDIDO_COMPLETADO"; registros: PlanteamientoRecord[] }
    | { tipo: "RPS_SELECTOR_ABIERTO" } | { tipo: "RPS_REINTENTADO" }
    | { tipo: "RPS_CONSULTA_INICIADA"; numero: string }
    | { tipo: "RPS_ENCONTRADO"; pedido: PedidoRps }
    | { tipo: "RPS_NO_ENCONTRADO" } | { tipo: "RPS_ERROR"; mensaje: string }
    | { tipo: "ACCION_INICIADA"; accion: "preview" | "completar" }
    | { tipo: "ACCION_TERMINADA" }
    | { tipo: "VALIDACION_INTENTADA" } | { tipo: "CAMPO_TOCADO"; campo: string };
  export function lineaActiva(estado: EstadoWorkspace): LineaPedido | null;   // en selectores.ts
  export function origenRpsActivo(numeroPedido: string, linea: LineaPedido | null): OrigenRps | null;
  ```

**Lo que desaparece y por qué:** `tipo`, `lona`, `baqueton`, `id`, `editorActivo`
y `baseGuardada` se derivan ahora de la línea activa. Con ellos se van
`inputActivo` y `hayCambiosSinGuardar`: **ya no hay nada que descartar al cambiar
de línea**, porque nada se pierde. `RPS_APLICADO` y `ELEMENTO_ANADIDO` se funden
en `LINEA_ANADIDA`, que recibe la línea ya construida —igual que hoy
`RPS_APLICADO` recibe el `id` ya resuelto, y por el mismo motivo: la numeración
vive en `lineas.ts`, que es puro y está testeado.

También se va `recienGuardadoRef` de `useWorkspace` (Task 7): existía para
puentear el hueco entre guardar y ver el registro en la lista, y con las líneas
en el estado ese hueco no existe.

- [ ] **Step 1: Reescribir el fichero de tests**

Sustituir **todo** `src/lib/workspace/__tests__/estado.test.ts` por:

```ts
import { describe, expect, it } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { PlanteamientoRecord } from "@/lib/store/types";
import type { PedidoRps } from "@/lib/rps/types";
import type { LineaPedido } from "@/lib/workspace/lineas";
import { estadoInicial, reducirWorkspace, type EstadoWorkspace } from "@/lib/workspace/estado";

const inputCon = (version: string, cambios: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente: "CLIENTE" },
  ...cambios,
});

const linea = (version: string, cambios: Partial<LineaPedido> = {}): LineaPedido => ({
  version, tipo: "lona", input: inputCon(version), ...cambios,
});

const registro = (id: string, version: string, cliente = "CLIENTE"): PlanteamientoRecord => ({
  id, tipo: "lona", numeroPedido: "AR2603583", version, cliente,
  input: inputCon(version), result: {}, paramsSnapshot: {}, snapshotSvg: null,
  createdAt: "2026-07-20T10:00:00Z", updatedAt: "2026-07-20T10:00:00Z",
} as unknown as PlanteamientoRecord);

const conPedido = (): EstadoWorkspace =>
  reducirWorkspace(estadoInicial(), {
    tipo: "PEDIDO_CAMBIADO", valor: "AR2603583",
  });

const conDosLineas = (): EstadoWorkspace => {
  const una = reducirWorkspace(conPedido(), { tipo: "LINEA_ANADIDA", linea: linea("10") });
  return reducirWorkspace(una, { tipo: "LINEA_ANADIDA", linea: linea("11") });
};

describe("estadoInicial", () => {
  it("arranca sin líneas, sin línea activa y con el selector de RPS abierto", () => {
    const estado = estadoInicial();
    expect(estado.lineas).toEqual([]);
    expect(estado.versionActiva).toBeNull();
    expect(estado.numeroPedido).toBe("");
    expect(estado.rps.selectorAbierto).toBe(true);
  });

  it("al reutilizar un registro lo abre como línea con su id", () => {
    const estado = estadoInicial({ id: "a", tipo: "lona", input: inputCon("10") });
    expect(estado.lineas).toEqual([{ version: "10", tipo: "lona", input: inputCon("10"), id: "a", snapshotSvg: null }]);
    expect(estado.versionActiva).toBe("10");
    expect(estado.numeroPedido).toBe("AR2603583");
    expect(estado.cargandoPedido).toBe(true);
  });
});

describe("PEDIDO_CAMBIADO", () => {
  it("propaga el número a la cabecera de cada línea", () => {
    const cambiado = reducirWorkspace(conDosLineas(), {
      tipo: "PEDIDO_CAMBIADO", valor: "AR2603583-B",
    });
    // Mismo pedido normalizado: no descarta nada, solo reescribe el número.
    for (const l of cambiado.lineas) expect(l.input.cabecera.numeroPedido).toBe("AR2603583-B");
    expect(cambiado.lineas).toHaveLength(2);
  });

  it("cambiar a otro pedido vacía las líneas, el cliente y el estado de edición", () => {
    const previo = conDosLineas();
    const cambiado = reducirWorkspace(previo, { tipo: "PEDIDO_CAMBIADO", valor: "AR2600001" });
    expect(cambiado).toEqual({
      ...previo,
      numeroPedido: "AR2600001",
      cliente: "",
      lineas: [],
      versionActiva: null,
      cargandoPedido: true,
      validacionIntentada: false,
      camposTocados: [],
      rps: { ...previo.rps, selectorAbierto: true },
    });
  });

  it("vaciar el número deja de cargar el pedido", () => {
    expect(reducirWorkspace(conPedido(), { tipo: "PEDIDO_CAMBIADO", valor: "" }).cargandoPedido)
      .toBe(false);
  });
});

describe("BORRADORES_RECUPERADOS y REGISTROS_CARGADOS", () => {
  it("los borradores recuperados abren la primera línea", () => {
    const estado = reducirWorkspace(conPedido(), {
      tipo: "BORRADORES_RECUPERADOS", lineas: [linea("10"), linea("11")],
    });
    expect(estado.lineas).toHaveLength(2);
    expect(estado.versionActiva).toBe("10");
  });

  it("los borradores no pisan la línea que ya se está editando", () => {
    const editando = conDosLineas();
    const estado = reducirWorkspace(editando, {
      tipo: "BORRADORES_RECUPERADOS", lineas: [linea("10", { input: inputCon("10", { largo: 999 }) })],
    });
    expect(estado.versionActiva).toBe("11");
    expect((estado.lineas[0].input as LonaInput).largo).toBe(0);
  });

  it("los registros guardados se fusionan sin pisar el borrador y deja de cargar", () => {
    const conBorrador = reducirWorkspace(conPedido(), {
      tipo: "LINEA_ANADIDA", linea: linea("10", { input: inputCon("10", { largo: 999 }) }),
    });
    const estado = reducirWorkspace(conBorrador, {
      tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10"), registro("b", "11")],
    });
    expect(estado.cargandoPedido).toBe(false);
    expect(estado.lineas.map((l) => [l.version, l.id])).toEqual([["10", "a"], ["11", "b"]]);
    // El borrador manda en el contenido, pero hereda el id del registro.
    expect((estado.lineas[0].input as LonaInput).largo).toBe(999);
  });

  it("rellena el cliente del pedido solo si está vacío", () => {
    const estado = reducirWorkspace(conPedido(), {
      tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10", "REMOLQUES YAGÜE")],
    });
    expect(estado.cliente).toBe("REMOLQUES YAGÜE");
    const aMano = reducirWorkspace(
      reducirWorkspace(conPedido(), { tipo: "CLIENTE_CAMBIADO", valor: "OTRO" }),
      { tipo: "REGISTROS_CARGADOS", registros: [registro("a", "10", "REMOLQUES YAGÜE")] },
    );
    expect(aMano.cliente).toBe("OTRO");
  });

  it("REGISTROS_FALLARON deja de cargar sin tocar las líneas", () => {
    const previo = conDosLineas();
    const estado = reducirWorkspace(previo, { tipo: "REGISTROS_FALLARON" });
    expect(estado).toEqual({ ...previo, cargandoPedido: false });
  });
});

describe("LINEA_ANADIDA", () => {
  it("añade al final, la abre y limpia la validación", () => {
    const previo = reducirWorkspace(conDosLineas(), { tipo: "VALIDACION_INTENTADA" });
    const estado = reducirWorkspace(previo, { tipo: "LINEA_ANADIDA", linea: linea("12") });
    expect(estado).toEqual({
      ...previo,
      lineas: [...previo.lineas, linea("12")],
      versionActiva: "12",
      validacionIntentada: false,
      camposTocados: [],
      rps: { ...previo.rps, selectorAbierto: true },
    });
  });

  it("una línea importada de RPS sustituye a la de su misma versión", () => {
    const previo = conDosLineas();
    const importada = linea("11", { origenRps: {
      numeroPedido: "AR2603583", numeroLinea: 20, idLinea: "L20",
      ordenFabricacion: "0230001", importadoEn: "2026-08-02T09:00:00Z",
    } });
    const estado = reducirWorkspace(previo, { tipo: "LINEA_ANADIDA", linea: importada });
    expect(estado.lineas).toHaveLength(2);
    expect(estado.lineas[1]).toEqual(importada);
    expect(estado.versionActiva).toBe("11");
  });
});

describe("LINEA_SELECCIONADA y LINEA_ELIMINADA", () => {
  it("seleccionar abre otra línea y limpia la validación de la anterior", () => {
    const previo = reducirWorkspace(conDosLineas(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    const estado = reducirWorkspace(previo, { tipo: "LINEA_SELECCIONADA", version: "10" });
    expect(estado).toEqual({
      ...previo, versionActiva: "10", validacionIntentada: false, camposTocados: [],
      rps: { ...previo.rps, selectorAbierto: false },
    });
  });

  it("seleccionar una versión que no existe no cambia nada", () => {
    const previo = conDosLineas();
    expect(reducirWorkspace(previo, { tipo: "LINEA_SELECCIONADA", version: "99" })).toBe(previo);
  });

  it("eliminar quita la línea y abre la anterior", () => {
    const estado = reducirWorkspace(conDosLineas(), { tipo: "LINEA_ELIMINADA", version: "11" });
    expect(estado.lineas.map((l) => l.version)).toEqual(["10"]);
    expect(estado.versionActiva).toBe("10");
  });

  it("eliminar la única línea deja el pedido sin línea activa", () => {
    const una = reducirWorkspace(conPedido(), { tipo: "LINEA_ANADIDA", linea: linea("10") });
    const estado = reducirWorkspace(una, { tipo: "LINEA_ELIMINADA", version: "10" });
    expect(estado.lineas).toEqual([]);
    expect(estado.versionActiva).toBeNull();
  });

  it("eliminar una que no está abierta no cambia cuál está abierta", () => {
    const estado = reducirWorkspace(conDosLineas(), { tipo: "LINEA_ELIMINADA", version: "10" });
    expect(estado.versionActiva).toBe("11");
  });
});

describe("INPUT_CAMBIADO y SNAPSHOT_CAPTURADO", () => {
  it("cambia solo la línea activa, y deja las demás por identidad", () => {
    const previo = conDosLineas();
    const estado = reducirWorkspace(previo, { tipo: "INPUT_CAMBIADO", input: inputCon("11", { largo: 700 }) });
    expect((estado.lineas[1].input as LonaInput).largo).toBe(700);
    expect(estado.lineas[0]).toBe(previo.lineas[0]);
  });

  it("sin línea activa no hay nada que cambiar", () => {
    const previo = conPedido();
    expect(reducirWorkspace(previo, { tipo: "INPUT_CAMBIADO", input: inputCon("10") })).toBe(previo);
  });

  it("el dibujo se guarda en su línea, no en la activa", () => {
    const estado = reducirWorkspace(conDosLineas(), {
      tipo: "SNAPSHOT_CAPTURADO", version: "10", svg: "<svg/>",
    });
    expect(estado.lineas[0].snapshotSvg).toBe("<svg/>");
    expect(estado.lineas[1].snapshotSvg).toBeUndefined();
    expect(estado.versionActiva).toBe("11");
  });
});

describe("PEDIDO_COMPLETADO", () => {
  it("asigna a cada línea el id del registro que se acaba de guardar", () => {
    const estado = reducirWorkspace(conDosLineas(), {
      tipo: "PEDIDO_COMPLETADO", registros: [registro("a", "10"), registro("b", "11")],
    });
    expect(estado.lineas.map((l) => l.id)).toEqual(["a", "b"]);
    expect(estado.validacionIntentada).toBe(false);
  });
});

describe("acciones de RPS y de proceso", () => {
  it("recorre el ciclo de consulta de RPS", () => {
    const pedidoRps = { numero: "AR2603583", lineas: [] } as unknown as PedidoRps;
    const buscando = reducirWorkspace(conPedido(), {
      tipo: "RPS_CONSULTA_INICIADA", numero: "AR2603583",
    });
    expect(buscando.rps.estado).toBe("buscando");
    expect(reducirWorkspace(buscando, { tipo: "RPS_ENCONTRADO", pedido: pedidoRps }).rps.estado)
      .toBe("encontrado");
    expect(reducirWorkspace(buscando, { tipo: "RPS_NO_ENCONTRADO" }).rps.pedido).toBeNull();
    expect(reducirWorkspace(buscando, { tipo: "RPS_ERROR", mensaje: "boom" }).rps.error).toBe("boom");
  });

  it("RPS_SELECTOR_ABIERTO y RPS_REINTENTADO solo tocan lo suyo", () => {
    const previo = conDosLineas();
    expect(reducirWorkspace(previo, { tipo: "RPS_SELECTOR_ABIERTO" }))
      .toEqual({ ...previo, rps: { ...previo.rps, selectorAbierto: true } });
    expect(reducirWorkspace(previo, { tipo: "RPS_REINTENTADO" }))
      .toEqual({ ...previo, rps: { ...previo.rps, reintento: previo.rps.reintento + 1 } });
  });

  it("abre y cierra la acción en curso", () => {
    const ocupado = reducirWorkspace(conPedido(), { tipo: "ACCION_INICIADA", accion: "completar" });
    expect(ocupado.accion).toBe("completar");
    expect(reducirWorkspace(ocupado, { tipo: "ACCION_TERMINADA" }).accion).toBeNull();
  });
});

describe("CAMPO_TOCADO", () => {
  it("acumula campos sin repetirlos", () => {
    const uno = reducirWorkspace(conDosLineas(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    const dos = reducirWorkspace(uno, { tipo: "CAMPO_TOCADO", campo: "ancho" });
    expect(dos.camposTocados).toEqual(["largo", "ancho"]);
  });

  it("devuelve el mismo estado si el campo ya estaba", () => {
    const uno = reducirWorkspace(conDosLineas(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    expect(reducirWorkspace(uno, { tipo: "CAMPO_TOCADO", campo: "largo" })).toBe(uno);
  });
});
```

- [ ] **Step 2: Ejecutar los tests y comprobar que fallan**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/estado.test.ts`
Expected: FAIL en todos — el estado todavía tiene `lona`/`baqueton`/`id` y no conoce las acciones nuevas.

- [ ] **Step 3: Reescribir el estado**

Sustituir en `src/lib/workspace/estado.ts` la interfaz, las acciones, `estadoInicial` y `reducirWorkspace` por:

```ts
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import type { PedidoRps } from "@/lib/rps/types";
import type { EstadoConsultaRps } from "@/lib/workspace/selectores";
import {
  fusionarLineas, lineasDesdeRegistros, type LineaPedido,
} from "@/lib/workspace/lineas";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

export interface EstadoRpsWorkspace {
  estado: EstadoConsultaRps;
  /** Número por el que se lanzó la última consulta, ya normalizado. */
  numeroConsultado: string;
  pedido: PedidoRps | null;
  error: string | null;
  reintento: number;
  selectorAbierto: boolean;
}

export interface EstadoWorkspace {
  // El pedido y sus líneas
  numeroPedido: string;
  cliente: string;
  lineas: LineaPedido[];
  /** Versión de la línea abierta; null si no hay ninguna. */
  versionActiva: string | null;
  cargandoPedido: boolean;

  // Edición de la línea abierta
  validacionIntentada: boolean;
  /** Campos que el usuario ya visitó y abandonó: enseñan su error. */
  camposTocados: string[];

  // Importación RPS
  rps: EstadoRpsWorkspace;

  // Transversal
  accion: "preview" | "completar" | null;
}

export interface EntradaInicial {
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export type AccionWorkspace =
  | { tipo: "PEDIDO_CAMBIADO"; valor: string }
  | { tipo: "CLIENTE_CAMBIADO"; valor: string }
  | { tipo: "BORRADORES_RECUPERADOS"; lineas: LineaPedido[] }
  | { tipo: "REGISTROS_CARGADOS"; registros: PlanteamientoRecord[] }
  | { tipo: "REGISTROS_FALLARON" }
  | { tipo: "LINEA_ANADIDA"; linea: LineaPedido }
  | { tipo: "LINEA_SELECCIONADA"; version: string }
  | { tipo: "LINEA_ELIMINADA"; version: string }
  | { tipo: "INPUT_CAMBIADO"; input: LonaInput | BaquetonInput }
  | { tipo: "SNAPSHOT_CAPTURADO"; version: string; svg: string | null }
  | { tipo: "PEDIDO_COMPLETADO"; registros: PlanteamientoRecord[] }
  | { tipo: "RPS_SELECTOR_ABIERTO" }
  | { tipo: "RPS_REINTENTADO" }
  | { tipo: "RPS_CONSULTA_INICIADA"; numero: string }
  | { tipo: "RPS_ENCONTRADO"; pedido: PedidoRps }
  | { tipo: "RPS_NO_ENCONTRADO" }
  | { tipo: "RPS_ERROR"; mensaje: string }
  | { tipo: "ACCION_INICIADA"; accion: "preview" | "completar" }
  | { tipo: "ACCION_TERMINADA" }
  | { tipo: "VALIDACION_INTENTADA" }
  | { tipo: "CAMPO_TOCADO"; campo: string };

/** Al abrir otra línea, lo que se enseñaba en rojo de la anterior no vale. */
const SIN_VALIDAR = { validacionIntentada: false, camposTocados: [] as string[] };

const conNumeroPedido = (linea: LineaPedido, numeroPedido: string): LineaPedido => ({
  ...linea,
  input: { ...linea.input, cabecera: { ...linea.input.cabecera, numeroPedido } },
});

const conCliente = (linea: LineaPedido, cliente: string): LineaPedido => ({
  ...linea,
  input: { ...linea.input, cabecera: { ...linea.input.cabecera, cliente } },
});

/**
 * Ya no recibe las entradas vacías: el estado arranca sin ninguna línea, y las
 * plantillas solo hacen falta al añadir una. Así el reducer y su estado inicial
 * siguen siendo puros y deterministas sin arrastrar la fecha del día que lee
 * `emptyLona()`. Quien llamaba con el segundo argumento (`useWorkspace`) deja de
 * pasarlo.
 */
export function estadoInicial(inicial?: EntradaInicial): EstadoWorkspace {
  const lineas: LineaPedido[] = inicial
    ? [{
        version: inicial.input.cabecera.version,
        tipo: inicial.tipo,
        input: inicial.input,
        id: inicial.id,
        snapshotSvg: null,
      }]
    : [];
  return {
    numeroPedido: inicial?.input.cabecera.numeroPedido ?? "",
    cliente: inicial?.input.cabecera.cliente ?? "",
    lineas,
    versionActiva: lineas[0]?.version ?? null,
    cargandoPedido: Boolean(inicial?.input.cabecera.numeroPedido),
    validacionIntentada: false,
    camposTocados: [],
    rps: {
      estado: "idle", numeroConsultado: "", pedido: null, error: null,
      reintento: 0, selectorAbierto: true,
    },
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
      if (!cambiaPedido) {
        return {
          ...estado,
          numeroPedido: accion.valor,
          lineas: estado.lineas.map((linea) => conNumeroPedido(linea, accion.valor)),
        };
      }
      // Otro pedido es otro trabajo: sus líneas llegan de sus borradores y de
      // sus registros, no se arrastran las del anterior.
      return {
        ...estado,
        numeroPedido: accion.valor,
        cliente: "",
        lineas: [],
        versionActiva: null,
        cargandoPedido: Boolean(normalizarNumeroPedidoRps(accion.valor)),
        ...SIN_VALIDAR,
        rps: { ...estado.rps, selectorAbierto: true },
      };
    }

    case "CLIENTE_CAMBIADO":
      return {
        ...estado,
        cliente: accion.valor,
        lineas: estado.lineas.map((linea) => conCliente(linea, accion.valor)),
      };

    case "BORRADORES_RECUPERADOS": {
      // Lo que ya se esté editando manda: los borradores llegan de un efecto y
      // pueden aterrizar después de que el usuario haya empezado a trabajar.
      const lineas = fusionarLineas(accion.lineas, estado.lineas);
      return {
        ...estado,
        lineas,
        versionActiva: estado.versionActiva ?? lineas[0]?.version ?? null,
      };
    }

    case "REGISTROS_CARGADOS": {
      const lineas = fusionarLineas(lineasDesdeRegistros(accion.registros), estado.lineas);
      const guardado = accion.registros.find((registro) => registro.cliente.trim())?.cliente;
      const cliente = estado.cliente.trim() ? estado.cliente : (guardado ?? "");
      return {
        ...estado,
        lineas: cliente === estado.cliente
          ? lineas
          : lineas.map((linea) => (linea.input.cabecera.cliente.trim()
            ? linea
            : conCliente(linea, cliente))),
        cliente,
        versionActiva: estado.versionActiva ?? lineas[0]?.version ?? null,
        cargandoPedido: false,
      };
    }

    case "REGISTROS_FALLARON":
      return { ...estado, cargandoPedido: false };

    case "LINEA_ANADIDA": {
      const existe = estado.lineas.some((linea) => linea.version === accion.linea.version);
      return {
        ...estado,
        lineas: existe
          ? estado.lineas.map((linea) => (linea.version === accion.linea.version ? accion.linea : linea))
          : [...estado.lineas, accion.linea],
        versionActiva: accion.linea.version,
        ...SIN_VALIDAR,
        rps: { ...estado.rps, selectorAbierto: !accion.linea.origenRps },
      };
    }

    case "LINEA_SELECCIONADA": {
      if (accion.version === estado.versionActiva) return estado;
      if (!estado.lineas.some((linea) => linea.version === accion.version)) return estado;
      return {
        ...estado,
        versionActiva: accion.version,
        ...SIN_VALIDAR,
        rps: { ...estado.rps, selectorAbierto: false },
      };
    }

    case "LINEA_ELIMINADA": {
      const indice = estado.lineas.findIndex((linea) => linea.version === accion.version);
      if (indice < 0) return estado;
      const lineas = estado.lineas.filter((linea) => linea.version !== accion.version);
      const siguienteActiva = estado.versionActiva === accion.version
        ? (lineas[Math.max(indice - 1, 0)]?.version ?? null)
        : estado.versionActiva;
      return { ...estado, lineas, versionActiva: siguienteActiva, ...SIN_VALIDAR };
    }

    case "INPUT_CAMBIADO": {
      if (!estado.versionActiva) return estado;
      return {
        ...estado,
        lineas: estado.lineas.map((linea) => (linea.version === estado.versionActiva
          ? { ...linea, input: accion.input }
          : linea)),
      };
    }

    case "SNAPSHOT_CAPTURADO":
      return {
        ...estado,
        lineas: estado.lineas.map((linea) => (linea.version === accion.version
          ? { ...linea, snapshotSvg: accion.svg }
          : linea)),
      };

    case "PEDIDO_COMPLETADO": {
      const idPorVersion = new Map(accion.registros.map((r) => [r.version, r.id]));
      return {
        ...estado,
        lineas: estado.lineas.map((linea) => ({
          ...linea,
          id: idPorVersion.get(linea.version) ?? linea.id,
        })),
        ...SIN_VALIDAR,
      };
    }

    case "RPS_SELECTOR_ABIERTO":
      return { ...estado, rps: { ...estado.rps, selectorAbierto: true } };

    case "RPS_REINTENTADO":
      return { ...estado, rps: { ...estado.rps, reintento: estado.rps.reintento + 1 } };

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

    case "ACCION_INICIADA":
      return { ...estado, accion: accion.accion };

    case "ACCION_TERMINADA":
      return { ...estado, accion: null };

    case "VALIDACION_INTENTADA":
      return { ...estado, validacionIntentada: true };

    case "CAMPO_TOCADO":
      // Devolver el mismo estado cuando el campo ya estaba evita un render por
      // cada salida de un campo que el usuario recorre varias veces.
      return estado.camposTocados.includes(accion.campo)
        ? estado
        : { ...estado, camposTocados: [...estado.camposTocados, accion.campo] };
  }
}
```

- [ ] **Step 4: Ajustar los selectores**

En `src/lib/workspace/selectores.ts`: **borrar** `inputActivo` y `hayCambiosSinGuardar`
(ya no hay nada que descartar), **añadir** `lineaActiva` y **cambiar** `origenRpsActivo`
para que lea el origen de la línea. Lo demás se queda igual.

```ts
import type { EstadoWorkspace } from "@/lib/workspace/estado";
import type { LineaPedido } from "@/lib/workspace/lineas";

export function lineaActiva(estado: EstadoWorkspace): LineaPedido | null {
  return estado.lineas.find((linea) => linea.version === estado.versionActiva) ?? null;
}

/** El origen de RPS es de la línea, no del workspace: cada una vino de la suya. */
export function origenRpsActivo(
  numeroPedido: string, linea: LineaPedido | null,
): OrigenRps | null {
  const origen = linea?.origenRps;
  if (!origen) return null;
  return normalizarNumeroPedidoRps(origen.numeroPedido) === normalizarNumeroPedidoRps(numeroPedido)
    ? origen
    : null;
}
```

Ese `import type { EstadoWorkspace }` cruza con el `import type { EstadoConsultaRps }`
que `estado.ts` hace de aquí. Son solo tipos, así que no hay ciclo en tiempo de
ejecución, pero si `tsc` o `lint` protestan, mover `EstadoConsultaRps` a
`selectores.ts` → `estado.ts` y punto: el tipo es de la consulta, no del estado.

En `src/lib/workspace/__tests__/selectores.test.ts`, quitar los bloques de
`inputActivo` y `hayCambiosSinGuardar`, y añadir:

```ts
describe("lineaActiva", () => {
  it("devuelve la línea cuya versión está abierta", () => {
    const estado = {
      lineas: [{ version: "10", tipo: "lona", input: emptyLona() }],
      versionActiva: "10",
    } as unknown as EstadoWorkspace;
    expect(lineaActiva(estado)?.version).toBe("10");
  });

  it("devuelve null cuando no hay ninguna abierta", () => {
    const estado = { lineas: [], versionActiva: null } as unknown as EstadoWorkspace;
    expect(lineaActiva(estado)).toBeNull();
  });
});

describe("origenRpsActivo", () => {
  const origen = {
    numeroPedido: "AR2603583", numeroLinea: 20, idLinea: "L20",
    ordenFabricacion: null, importadoEn: "2026-08-02T09:00:00Z",
  };

  it("devuelve el origen de la línea cuando el pedido coincide", () => {
    const linea = { version: "10", tipo: "lona", input: emptyLona(), origenRps: origen } as LineaPedido;
    expect(origenRpsActivo("AR.26.03583", linea)).toEqual(origen);
  });

  it("lo descarta si la línea vino de otro pedido", () => {
    const linea = { version: "10", tipo: "lona", input: emptyLona(), origenRps: origen } as LineaPedido;
    expect(origenRpsActivo("AR2600001", linea)).toBeNull();
  });

  it("sin línea no hay origen", () => {
    expect(origenRpsActivo("AR2603583", null)).toBeNull();
  });
});
```

- [ ] **Step 5: Ejecutar los tests del estado y comprobar que pasan**

Run: `pnpm exec vitest run src/lib/workspace`
Expected: PASS. `tsc` seguirá fallando en `useWorkspace.ts`, `Workspace.tsx` y
`PedidoActivo.tsx`: es el estado esperado al terminar esta tarea, y lo cierran
las tareas 7 y 8.

- [ ] **Step 6: Commit**

`tsc` todavía no pasa, y el commit lo dice.

```bash
git add src/lib/workspace
git commit -m "feat: el estado del workspace es una lista de líneas"
```

---

### Task 6: El PDF sabe de varias líneas sin guardar

Hoy `orquestarPdf` se baja los registros del pedido por HTTP y solo admite **un**
borrador. Con el modelo de lista, el workspace ya tiene las líneas en la mano y
casi ninguna está guardada: sin este cambio la vista previa enseñaría una sola
página.

**Files:**
- Modify: `src/lib/pdf/orquestar-pdf.ts`
- Modify: `src/lib/pdf/__tests__/orquestar-pdf.test.ts`
- Modify: `src/app/api/pdf/route.tsx`

**Interfaces:**
- Consumes: `LineaPedido`, `estadoLinea` (Task 1).
- Produces:
  ```ts
  export interface OpcionesOrquestarPdf {
    numeroPedido: string;
    archivar: boolean;
    /** Las líneas del pedido, en orden. Las guardadas traen `id`. */
    lineas: LineaPedido[];
  }
  export type ResultadoPdf =
    | { ok: true; respuesta: Response; nombre: string; omitidos: number }
    | { ok: false; motivo: "sin-elementos" | "http"; mensaje: string };
  ```
  Cuerpo que se manda a `POST /api/pdf`:
  ```ts
  {
    paginas: Array<{ clave: string; id?: string; tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput }>,
    snapshots: Record<string, string | null>,   // clave → PNG data URI
    archivar: boolean,
  }
  ```
  `clave` es `id ?? \`borrador:${version}\``: las líneas sin guardar no tienen id
  y aun así necesitan emparejar su dibujo.

- [ ] **Step 1: Escribir el test que falla**

Sustituir el contenido de `src/lib/pdf/__tests__/orquestar-pdf.test.ts` por (adaptando
los ayudantes que ya existan en el fichero si son útiles):

```ts
import { describe, expect, it, vi } from "vitest";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { LineaPedido } from "@/lib/workspace/lineas";
import { orquestarPdf } from "@/lib/pdf/orquestar-pdf";

const lonaCompleta = (version: string): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583", version, cliente: "CLIENTE" },
  largo: 600, ancho: 250, altoDelante: 220, contorno: 620, material: "PVC 580 AZUL",
  tipoPerfil: "TIPO 01", recogeDelante: "NO", recogeAtras: "NO",
  ventana: false, rotulacion: false, bastillaEnfundar: false, modoOllaos: "REPARTIDOS",
});

const linea = (version: string, cambios: Partial<LineaPedido> = {}): LineaPedido => ({
  version, tipo: "lona", input: lonaCompleta(version), snapshotSvg: `<svg id="${version}"/>`,
  ...cambios,
});

function deps(respuesta = new Response("%PDF", { status: 200 })) {
  const fetch = vi.fn(async () => respuesta);
  const rasterizar = vi.fn(async (svg: string) => `png:${svg}`);
  const onProgreso = vi.fn();
  return { fetch: fetch as unknown as typeof globalThis.fetch, rasterizar, onProgreso };
}

const cuerpo = (fetch: ReturnType<typeof vi.fn>) =>
  JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string);

describe("orquestarPdf", () => {
  it("manda una página por línea, con su dibujo, sin bajarse nada del servidor", async () => {
    const d = deps();
    const resultado = await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: true, lineas: [linea("10", { id: "a" }), linea("11")] },
      d,
    );
    expect(resultado.ok).toBe(true);
    // Antes se pedía /api/planteamientos para reconstruir el pedido; ahora las
    // líneas ya vienen dadas y la única llamada es la del PDF.
    expect((d.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    const enviado = cuerpo(d.fetch as unknown as ReturnType<typeof vi.fn>);
    expect(enviado.paginas.map((p: { clave: string }) => p.clave)).toEqual(["a", "borrador:11"]);
    expect(enviado.snapshots).toEqual({ a: "png:<svg id=\"10\"/>", "borrador:11": "png:<svg id=\"11\"/>" });
    expect(enviado.archivar).toBe(true);
  });

  it("cuenta el avance una vez por dibujo", async () => {
    const d = deps();
    await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [linea("10"), linea("11")] },
      d,
    );
    expect(d.onProgreso.mock.calls).toEqual([[1, 2], [2, 2]]);
  });

  it("omite las líneas incompletas y dice cuántas", async () => {
    const d = deps();
    const incompleta = linea("11", { input: { ...lonaCompleta("11"), modoOllaos: "" } });
    const resultado = await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [linea("10"), incompleta] },
      d,
    );
    expect(resultado).toMatchObject({ ok: true, omitidos: 1 });
    expect(cuerpo(d.fetch as unknown as ReturnType<typeof vi.fn>).paginas).toHaveLength(1);
  });

  it("sin ninguna línea completa no llega a pedir el PDF", async () => {
    const d = deps();
    const incompleta = linea("10", { input: { ...lonaCompleta("10"), modoOllaos: "" } });
    const resultado = await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [incompleta] },
      d,
    );
    expect(resultado).toMatchObject({ ok: false, motivo: "sin-elementos" });
    expect((d.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("una línea sin dibujo va sin PNG en vez de romper", async () => {
    const d = deps();
    await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [linea("10", { snapshotSvg: null })] },
      d,
    );
    expect(cuerpo(d.fetch as unknown as ReturnType<typeof vi.fn>).snapshots).toEqual({ "borrador:10": null });
    expect(d.rasterizar).not.toHaveBeenCalled();
  });

  it("un error HTTP se devuelve con su mensaje", async () => {
    const d = deps(new Response(JSON.stringify({ error: "no se pudo" }), { status: 500 }));
    const resultado = await orquestarPdf(
      { numeroPedido: "AR2603583", archivar: false, lineas: [linea("10")] },
      d,
    );
    expect(resultado).toEqual({ ok: false, motivo: "http", mensaje: "no se pudo" });
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/pdf/__tests__/orquestar-pdf.test.ts`
Expected: FAIL — `orquestarPdf` todavía espera `editorActivo`, `idBorrador`, `tipo`, `input` y `svgActual`.

- [ ] **Step 3: Reescribir el orquestador**

Sustituir `src/lib/pdf/orquestar-pdf.ts` por:

```ts
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { TipoPlanteamiento } from "@/lib/store/types";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { estadoLinea, type LineaPedido } from "@/lib/workspace/lineas";

export interface OpcionesOrquestarPdf {
  numeroPedido: string;
  archivar: boolean;
  /** Las líneas del pedido, en orden. Las guardadas traen `id`. */
  lineas: LineaPedido[];
}

export interface DependenciasPdf {
  fetch: typeof globalThis.fetch;
  rasterizar: (svg: string) => Promise<string | null>;
  /**
   * Se llama una vez por dibujo rasterizado. Los dibujos se preparan en serie
   * y es la parte lenta de generar el PDF de un pedido con varios remolques,
   * así que es lo único que se puede contar honestamente.
   */
  onProgreso?: (hecho: number, total: number) => void;
}

export interface PaginaPdf {
  clave: string;
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export type ResultadoPdf =
  | { ok: true; respuesta: Response; nombre: string; omitidos: number }
  | { ok: false; motivo: "sin-elementos" | "http"; mensaje: string };

/** Las líneas sin guardar no tienen id y aun así necesitan casar con su dibujo. */
const claveLinea = (linea: LineaPedido) => linea.id ?? `borrador:${linea.version}`;

export async function orquestarPdf(
  opciones: OpcionesOrquestarPdf,
  deps: DependenciasPdf,
): Promise<ResultadoPdf> {
  const nombre = nombrePdf(opciones.numeroPedido.trim());
  // Las líneas ya vienen dadas: el workspace las tiene en la mano y casi
  // ninguna está guardada todavía. Completar el pedido comprueba antes que
  // están todas listas; aquí el filtro solo protege a la vista previa.
  const generables = opciones.lineas.filter((linea) => estadoLinea(linea).lista);
  const omitidos = opciones.lineas.length - generables.length;
  if (generables.length === 0) {
    return {
      ok: false,
      motivo: "sin-elementos",
      mensaje: "El pedido todavía no contiene ninguna línea completa para generar el PDF.",
    };
  }

  const total = generables.length;
  let hechos = 0;
  const snapshots: Record<string, string | null> = {};
  for (const linea of generables) {
    snapshots[claveLinea(linea)] = linea.snapshotSvg
      ? await deps.rasterizar(linea.snapshotSvg)
      : null;
    deps.onProgreso?.(++hechos, total);
  }

  const paginas: PaginaPdf[] = generables.map((linea) => ({
    clave: claveLinea(linea),
    id: linea.id,
    tipo: linea.tipo,
    input: linea.input,
  }));

  const respuesta = await deps.fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paginas, snapshots, archivar: opciones.archivar }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => null) as { error?: string } | null;
    return { ok: false, motivo: "http", mensaje: detalle?.error ?? String(respuesta.status) };
  }
  return { ok: true, respuesta, nombre, omitidos };
}
```

- [ ] **Step 4: Adaptar la ruta del PDF**

En `src/app/api/pdf/route.tsx`, sustituir el bloque que lee el cuerpo y arma `recs`
(desde `let ids: string[];` hasta el `recs.sort(...)` del borrador) por:

```tsx
  let paginasPedidas: Array<{
    clave: string; id?: string; tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput;
  }>;
  let snapshots: Record<string, string | null>;
  let archivar: boolean;
  try {
    const body = await req.json();
    paginasPedidas = Array.isArray(body.paginas) ? body.paginas : [];
    snapshots = body.snapshots ?? {};
    archivar = body.archivar === true;
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }
  const store = getStore();
  const params = await store.getParams();
  const ahora = new Date().toISOString();
  // Cada página llega con su input: las líneas del pedido son borradores hasta
  // que se completa. De las guardadas se recupera su fecha de creación para que
  // el orden del PDF sea el de siempre.
  const recs: PlanteamientoRecord[] = [];
  for (const pagina of paginasPedidas) {
    const errorValidacion = errorPlanteamientoIncompleto(pagina.input);
    if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });
    const existente = pagina.id ? await store.get(pagina.id) : null;
    const base = buildRecord(pagina.tipo, pagina.input, params, pagina.id, null);
    recs.push({
      ...base,
      id: pagina.clave,
      createdAt: existente?.createdAt ?? ahora,
      updatedAt: ahora,
    });
  }
```

El resto de la función sigue igual: `remolquesUnicos`, el filtro de
`planteamientoGenerable`, el `omitidos`, el render y el archivado. La lectura
`snapshots[rec.id]` sigue valiendo porque `rec.id` es ahora la `clave`.

Ajustar los imports del fichero: sobran `TipoPlanteamiento`/`LonaInput`/`BaquetonInput`
solo si dejan de usarse (aquí siguen usándose en el tipo de `paginasPedidas`).

- [ ] **Step 5: Ejecutar los tests y comprobar que pasan**

Run: `pnpm exec vitest run src/lib/pdf`
Expected: PASS. `tsc` sigue rojo en `useWorkspace.ts` y los componentes: lo cierran las tareas 7 y 8.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdf src/app/api/pdf
git commit -m "feat: el PDF del pedido se arma con las líneas, guardadas o no"
```

---

### Task 7: El workspace persiste, elimina y completa

**Files:**
- Modify: `src/components/workspace/useWorkspace.ts`
- Modify: `src/components/workspace/useRegistrosPedido.ts` (solo si `tsc` lo pide)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces (lo que devuelve el hook y consumen los componentes de la Task 8):
  ```ts
  {
    estado, materiales, params,
    lineaActiva: LineaPedido | null,
    estadosLinea: Record<string, EstadoLinea>,   // por versión
    input: LonaInput | BaquetonInput | null,
    resLona, resBaq, erroresVisibles, progresoPdf, medidasSuficientes,
    pedidoRpsVisible, origenRpsActivo, estadoRpsVisible, materialRpsAplicado, busy,
    cambiarNumeroPedido, cambiarClientePedido, cambiarInput,
    seleccionarLinea: (version: string) => void,
    eliminarLinea: (version: string) => Promise<void>,
    nuevaLinea: (tipo: TipoPlanteamiento) => void,
    aplicarPedidoRps, abrirSelectorRps, reintentarRps,
    marcarCampoTocado,
    previsualizarPdf: () => Promise<void>,
    completarPedido: () => Promise<void>,
    registrarSnapshot,
  }
  ```

- [ ] **Step 1: Quitar lo que el modelo de lista deja sin sentido**

En `src/components/workspace/useWorkspace.ts`, **borrar**:

- la función `conRecienGuardado` y el `recienGuardadoRef` (existían para
  puentear el hueco entre guardar y ver el registro en la lista; con las líneas
  en el estado no hay hueco),
- `doGuardar`, `guardar`, `confirmarDescarte`, `puedeCambiarElemento`,
  `confirmarSalida` y la llamada a `useAvisoSalida` (nada se pierde al cambiar de
  línea ni al salir: los borradores están en el navegador),
- `solicitarPdf` y `generarPdf` en su forma actual,
- los imports que queden sin uso: `useAvisoSalida`, `hayCambiosSinGuardar`, `inputActivo`.

`src/components/workspace/useAvisoSalida.ts` se queda en el repo sin usar solo si
algún otro fichero lo importa; comprobarlo con `grep -rn useAvisoSalida src/` y,
si no lo usa nadie, borrarlo junto con su test si lo tuviera.

Y actualizar la llamada al reducer, que ya no recibe las entradas vacías:

```ts
  const [estado, despachar] = useReducer(
    reducirWorkspace, undefined, () => estadoInicial(inicial),
  );
```

- [ ] **Step 2: Recuperar y persistir los borradores**

Añadir al hook, después de los `useRef` existentes:

```ts
  const almacen = typeof window === "undefined" ? null : window.localStorage;
  // Un pedido cuyos borradores ya se recuperaron; evita recuperarlos otra vez
  // por encima de lo que el usuario esté escribiendo.
  const recuperados = useRef<string>("");
  const avisoBorradores = useRef(false);

  useEffect(() => {
    const clave = normalizarNumeroPedidoRps(numeroPedido);
    if (!clave || recuperados.current === clave) return;
    recuperados.current = clave;
    const lineas = leerBorradores(almacen, numeroPedido);
    if (lineas.length > 0) despachar({ tipo: "BORRADORES_RECUPERADOS", lineas });
  }, [almacen, numeroPedido]);

  useEffect(() => {
    if (!normalizarNumeroPedidoRps(numeroPedido)) return;
    const guardado = guardarBorradores(almacen, numeroPedido, lineas);
    // Si el navegador no deja escribir, el trabajo solo vive en memoria y hay
    // que decirlo: es exactamente lo que este bloque prometía evitar.
    if (!guardado && lineas.length > 0 && !avisoBorradores.current) {
      avisoBorradores.current = true;
      avisar("error", "Este navegador no permite guardar borradores: no cierres la pestaña sin completar el pedido.");
    }
  }, [almacen, avisar, lineas, numeroPedido]);
```

Con los imports correspondientes:

```ts
import { useEffect } from "react";   // añadir a la lista que ya se importa de react
import { guardarBorradores, leerBorradores, limpiarBorradores } from "@/lib/workspace/borradores-locales";
import { estadoLinea, nombreLinea, siguienteVersion, type LineaPedido } from "@/lib/workspace/lineas";
import { impedimentosCompletar, mensajeImpedimentos } from "@/lib/workspace/completar-pedido";
import { lineaActiva as calcularLineaActiva } from "@/lib/workspace/selectores";
```

- [ ] **Step 3: Derivados y manejadores de la lista**

Sustituir los derivados que dependían de `tipo`/`lona`/`baq` por:

```ts
  const { numeroPedido, cliente: clientePedido, lineas, versionActiva, rps, accion } = estado;
  const activa = calcularLineaActiva(estado);
  const input = activa?.input ?? null;
  const tipo = activa?.tipo ?? "lona";
  const lona = (activa?.tipo === "lona" ? activa.input : emptyLona()) as LonaInput;
  const baq = (activa?.tipo === "baqueton" ? activa.input : emptyBaqueton()) as BaquetonInput;
  const resLona = useMemo(() => calcLona(lona, params), [lona, params]);
  const resBaq = useMemo(() => calcBaqueton(baq, params), [baq, params]);
  const erroresActuales = useMemo(
    () => (input ? erroresPlanteamiento(input) : []),
    [input],
  );
  const erroresVisibles = calcularErroresVisibles(erroresActuales, validacionIntentada, camposTocados);
  const medidasSuficientes = input ? calcularMedidasSuficientes(input) : false;
  const estadosLinea = useMemo(
    () => Object.fromEntries(lineas.map((linea) => [linea.version, estadoLinea(linea)])),
    [lineas],
  );
```

`emptyLona()`/`emptyBaqueton()` como respaldo mantienen los `useMemo` con un
objeto del tipo correcto cuando no hay línea abierta; la escena no se pinta en
ese caso (Task 8).

Manejadores nuevos:

```ts
  /** El dibujo de la línea que se deja se guarda antes de abrir otra. */
  const capturarSnapshot = useCallback(() => {
    if (!versionActiva) return;
    despachar({
      tipo: "SNAPSHOT_CAPTURADO",
      version: versionActiva,
      svg: snapshotRef.current?.() ?? null,
    });
  }, [versionActiva]);

  const seleccionarLinea = useCallback((version: string) => {
    if (version === versionActiva) return;
    capturarSnapshot();
    despachar({ tipo: "LINEA_SELECCIONADA", version });
  }, [capturarSnapshot, versionActiva]);

  const nuevaLinea = useCallback((nuevoTipo: TipoPlanteamiento) => {
    if (!numeroPedido.trim()) {
      avisar("info", "Introduce primero el número de pedido.");
      return;
    }
    capturarSnapshot();
    const plantilla = nuevoTipo === "lona" ? emptyLona() : emptyBaqueton();
    const version = siguienteVersion(lineas);
    const linea: LineaPedido = {
      version,
      tipo: nuevoTipo,
      input: {
        ...plantilla,
        cabecera: {
          ...plantilla.cabecera,
          numeroPedido, cliente: clientePedido, version,
          realizadoPor: input?.cabecera.realizadoPor ?? "",
          revision: input?.cabecera.revision ?? "",
        },
      },
    };
    despachar({ tipo: "LINEA_ANADIDA", linea });
    avisar("info", `${nombreLinea(linea)} añadido al pedido. Completa sus datos.`);
  }, [avisar, capturarSnapshot, clientePedido, input, lineas, numeroPedido]);

  const eliminarLinea = useCallback(async (version: string) => {
    const linea = lineas.find((item) => item.version === version);
    if (!linea) return;
    const clave = await confirmar({
      titulo: `Eliminar ${nombreLinea(linea)}`,
      mensaje: linea.id
        ? `Se quitará del pedido y se borrará también su planteamiento guardado. No se puede deshacer.`
        : `Se quitará del pedido. Todavía no está guardado, así que no queda rastro.`,
      acciones: [
        { clave: "eliminar", etiqueta: "Eliminar", tono: "peligro" },
        { clave: "cancelar", etiqueta: "Cancelar", tono: "neutro" },
      ],
    });
    if (clave !== "eliminar") return;
    if (linea.id) {
      const respuesta = await fetch(`/api/planteamientos/${encodeURIComponent(linea.id)}`, {
        method: "DELETE",
      }).catch(() => null);
      // Un 404 es que ya no estaba: el objetivo se cumple igual.
      if (respuesta && !respuesta.ok && respuesta.status !== 404) {
        avisar("error", `No se pudo borrar ${nombreLinea(linea)} de la base de datos.`);
        return;
      }
      if (!respuesta) {
        avisar("error", "Error de red al borrar el planteamiento guardado.");
        return;
      }
    }
    despachar({ tipo: "LINEA_ELIMINADA", version });
    avisar("exito", `${nombreLinea(linea)} eliminado del pedido.`);
  }, [avisar, confirmar, lineas]);
```

`aplicarPedidoRps` pasa a construir una línea completa y despachar `LINEA_ANADIDA`:

```ts
  const aplicarPedidoRps = useCallback((
    pedido: PedidoRps,
    lineaRps: LineaPedidoRps,
    catalogoMateriales: Material[] = materialesRef.current,
  ) => {
    const indice = pedido.lineas.findIndex((item) => item.idLinea === lineaRps.idLinea);
    const creado = crearInputDesdeRps(
      pedido, lineaRps, Math.max(indice, 0), catalogoMateriales, params,
      input?.cabecera.realizadoPor ?? "",
    );
    capturarSnapshot();
    // La versión la fija `crearInputDesdeRps` a partir del índice de la línea
    // en RPS, así que reimportar la misma línea sustituye la suya y no añade
    // un duplicado. Si ya existe con id, lo conserva.
    const version = creado.input.cabecera.version;
    const existente = lineas.find((item) => item.version === version);
    despachar({
      tipo: "LINEA_ANADIDA",
      linea: {
        version,
        tipo: creado.tipo,
        input: creado.input,
        id: existente?.id,
        snapshotSvg: null,
        origenRps: {
          numeroPedido: pedido.numero,
          numeroLinea: lineaRps.numeroLinea,
          idLinea: lineaRps.idLinea,
          ordenFabricacion: lineaRps.ordenFabricacion,
          importadoEn: new Date().toISOString(),
        },
      },
    });
    avisar("info", `Línea ${lineaRps.numeroLinea} de RPS aplicada. Todos los campos siguen siendo editables.`);
  }, [avisar, capturarSnapshot, input, lineas, materialesRef, params]);
```

- [ ] **Step 4: Completar el pedido y la vista previa**

```ts
  /** Guarda todas las líneas y devuelve los registros, o null si algo falló. */
  const guardarTodas = useCallback(async (
    aGuardar: LineaPedido[],
  ): Promise<PlanteamientoRecord[] | null> => {
    const guardados: PlanteamientoRecord[] = [];
    for (const linea of aGuardar) {
      const respuesta = await fetch("/api/planteamientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: linea.id, tipo: linea.tipo, input: linea.input,
          snapshotSvg: linea.snapshotSvg ?? null,
        }),
      }).catch(() => null);
      if (!respuesta || !respuesta.ok) {
        avisar("error", `No se pudo guardar ${nombreLinea(linea)}. El pedido no se ha completado.`);
        return null;
      }
      guardados.push(await respuesta.json() as PlanteamientoRecord);
    }
    return guardados;
  }, [avisar]);

  async function completarPedido() {
    if (busy) return;
    capturarSnapshot();
    const impedimentos = impedimentosCompletar(lineas);
    if (impedimentos.length > 0) {
      // Decir cuál y qué le falta, en vez de omitirla en silencio.
      avisar("info", mensajeImpedimentos(impedimentos));
      const primera = impedimentos[0].version;
      if (primera) despachar({ tipo: "LINEA_SELECCIONADA", version: primera });
      despachar({ tipo: "VALIDACION_INTENTADA" });
      return;
    }
    despachar({ tipo: "ACCION_INICIADA", accion: "completar" });
    try {
      const guardados = await guardarTodas(lineas);
      if (!guardados) return;
      despachar({ tipo: "PEDIDO_COMPLETADO", registros: guardados });
      const conIds = lineas.map((linea) => ({
        ...linea,
        id: guardados.find((registro) => registro.version === linea.version)?.id ?? linea.id,
      }));
      const resultado = await orquestarPdf(
        { numeroPedido, archivar: true, lineas: conIds },
        {
          fetch: (entrada, init) => fetch(entrada, init),
          rasterizar: (svg) => rasterizarSvg(svg, { monocromo: SALIDA_MONOCROMA }),
          onProgreso: (hecho, total) => setProgresoPdf({ hecho, total }),
        },
      );
      if (!resultado.ok) {
        avisar("error", `Las líneas se han guardado, pero el PDF falló: ${resultado.mensaje}`);
        return;
      }
      const destinos = Number(resultado.respuesta.headers.get("X-Pdf-Destinos") ?? 0);
      const anio = resultado.respuesta.headers.get("X-Pdf-Anio") ?? "el año correspondiente";
      // Ya están en la base de datos: los borradores locales sobran.
      limpiarBorradores(almacen, numeroPedido);
      if (destinos === 2) {
        avisar("exito", `Pedido completado. PDF archivado en ESCÁNER/PLANTEAMIENTOS y OFICINA TÉCNICA/${anio}.`);
      } else {
        descargar(await resultado.respuesta.blob(), resultado.nombre);
        avisar("exito", `Pedido completado y PDF descargado (${resultado.nombre}). Configura las rutas del servidor para archivarlo automáticamente.`);
      }
    } catch {
      avisar("error", "Error de red al completar el pedido.");
    } finally {
      setProgresoPdf(null);
      despachar({ tipo: "ACCION_TERMINADA" });
    }
  }
```

`previsualizarPdf` conserva su ventana emergente y su manejo de errores, y solo
cambia la llamada, que ya no guarda nada:

```ts
      capturarSnapshot();
      const resultado = await orquestarPdf(
        { numeroPedido, archivar: false, lineas },
        {
          fetch: (entrada, init) => fetch(entrada, init),
          rasterizar: (svg) => rasterizarSvg(svg, { monocromo: SALIDA_MONOCROMA }),
          onProgreso: (hecho, total) => setProgresoPdf({ hecho, total }),
        },
      );
```

manteniendo el aviso de omitidos que ya existe:
`` `Vista previa abierta: ${resultado.nombre}. No se ha archivado todavía.` + (resultado.omitidos ? ` Se han omitido ${resultado.omitidos} líneas incompletas.` : "") ``

**Cuidado con `capturarSnapshot` dentro de `previsualizarPdf`:** despacha, y el
`lineas` que se pasa a `orquestarPdf` es el del render actual, sin ese snapshot.
Para no perder el dibujo de la línea abierta, calcularlo a mano en vez de
depender del despacho:

```ts
      const svgActual = snapshotRef.current?.() ?? null;
      const lineasParaPdf = lineas.map((linea) => (linea.version === versionActiva
        ? { ...linea, snapshotSvg: svgActual ?? linea.snapshotSvg }
        : linea));
```

y pasar `lineasParaPdf`. Hacer lo mismo en `completarPedido`, tanto para
`guardarTodas` como para `orquestarPdf`.

- [ ] **Step 5: Devolver lo nuevo**

Actualizar el objeto de retorno con la lista de la sección **Produces** de esta
tarea, quitando `hayCambiosSinGuardar`, `guardar`, `generarPdf`,
`seleccionarRegistro`, `nuevoElemento` y `puedeCambiarElemento`.

- [ ] **Step 6: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: los tests en verde. `tsc` solo debe quejarse ya de `Workspace.tsx` y
`PedidoActivo.tsx`, que cierra la Task 8.

- [ ] **Step 7: Commit**

```bash
git add src/components/workspace
git commit -m "feat: el pedido se completa de una vez, y una línea se puede eliminar"
```

---

### Task 8: La lista en pantalla

**Files:**
- Modify: `src/components/workspace/PedidoActivo.tsx`
- Modify: `src/components/workspace/Workspace.tsx`

- [ ] **Step 1: La lista con estado, abrir y eliminar**

En `src/components/workspace/PedidoActivo.tsx`, sustituir las props
`registros`, `idActivo`, `borrador`, `onSeleccionar`, `onNuevo` y `onGenerar` por:

```tsx
  lineas: LineaPedido[];
  estadosLinea: Record<string, EstadoLinea>;
  versionActiva: string | null;
  accion: "preview" | "completar" | null;
  onSeleccionar: (version: string) => void;
  onEliminar: (version: string) => void;
  onNuevo: (tipo: TipoPlanteamiento) => void;
  onPreview: () => void;
  onCompletar: () => void;
```

y el bloque de las tarjetas por uno que pinte una por línea, con su estado y su
botón de eliminar. El botón de eliminar va **fuera** del botón de abrir —anidar
botones no es HTML válido— así que la tarjeta es un `div` con dos botones dentro:

```tsx
        {lineas.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {lineas.map((linea) => {
              const activa = linea.version === versionActiva;
              const estado = estadosLinea[linea.version];
              return (
                <div
                  key={linea.version}
                  className={`group flex min-w-[210px] items-center gap-2 rounded-xl border px-2 py-2 transition ${activa ? "border-gold bg-gold text-deep shadow-[0_6px_20px_rgb(0_0_0/0.18)]" : "border-white/12 bg-white/[0.055] text-white hover:border-white/28 hover:bg-white/[0.1]"}`}
                >
                  <button
                    type="button"
                    aria-pressed={activa}
                    onClick={() => onSeleccionar(linea.version)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20"
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${activa ? "bg-deep/12" : "bg-white/8 text-gold"}`}>
                      <IconoElemento tipo={linea.tipo} />
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-[12px] font-extrabold">
                        {nombreLinea(linea)}
                      </strong>
                      <span
                        title={estado?.falta ?? undefined}
                        className={`mt-0.5 block truncate text-[9px] font-extrabold uppercase tracking-wide ${
                          estado?.lista
                            ? activa ? "text-deep/65" : "text-emerald-300"
                            : activa ? "text-deep/70" : "text-gold"
                        }`}
                      >
                        {estado?.lista ? "Listo" : `Falta: ${estado?.falta ?? "completar datos"}`}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminar(linea.version)}
                    aria-label={`Eliminar ${nombreLinea(linea)} del pedido`}
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[15px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400/25 ${activa ? "text-deep/45 hover:bg-deep/10 hover:text-deep" : "text-white/35 hover:bg-white/10 hover:text-red-300"}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : ( … el mensaje vacío que ya existe … )}
```

El contador de arriba pasa a `const total = lineas.length;` y el botón de
archivar pasa a ser el de completar:

```tsx
            <button
              type="button"
              onClick={onCompletar}
              disabled={!hayPedido || total === 0 || ocupado}
              className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold text-deep transition hover:-translate-y-px hover:bg-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {accion === "completar" ? (avance ?? "Completando…") : "Completar pedido"}
            </button>
```

Añadir junto al contador un resumen de cuántas están listas, que es lo que se
mira antes de completar:

```tsx
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-white/75">
              {cargando ? "Cargando…" : `${listas} de ${total} listas`}
            </span>
```

con `const listas = lineas.filter((l) => estadosLinea[l.version]?.lista).length;`.

- [ ] **Step 2: Enganchar el workspace**

En `src/components/workspace/Workspace.tsx`:

- desestructurar `lineas`, `versionActiva`, `numeroPedido`, `cliente`,
  `cargandoPedido`, `rps` y `accion` del estado, y `lineaActiva`, `estadosLinea`
  e `input` del hook;
- pasar a `PedidoActivo` las props nuevas (`lineas`, `estadosLinea`,
  `versionActiva`, `onSeleccionar={ws.seleccionarLinea}`,
  `onEliminar={ws.eliminarLinea}`, `onNuevo={ws.nuevaLinea}`,
  `onCompletar={ws.completarPedido}`);
- sustituir la condición `editorActivo ?` por `lineaActiva ?`, y dentro usar
  `lineaActiva.tipo` y `lineaActiva.input` donde antes iban `tipo`, `lona` y `baq`;
- **quitar el botón «Guardar»** y la insignia de «Cambios sin guardar»: ya no hay
  guardado por elemento ni cambios que perder. En su lugar, bajo el formulario,
  el estado calculado de la línea:

```tsx
            <p className={`mt-2.5 rounded-xl px-4 py-2.5 text-center text-[12px] font-extrabold ${
              ws.estadosLinea[lineaActiva.version]?.lista
                ? "bg-deep/8 text-deep"
                : "bg-gold/12 text-gold-2"
            }`}>
              {ws.estadosLinea[lineaActiva.version]?.lista
                ? "Listo. Se guardará al completar el pedido."
                : `Falta: ${ws.estadosLinea[lineaActiva.version]?.falta}`}
            </p>
```

- el `onAplicar` del `ImportadorRps` ya no necesita `puedeCambiarElemento`:

```tsx
      onAplicar={(linea) => {
        if (pedidoRpsVisible) ws.aplicarPedidoRps(pedidoRpsVisible, linea);
      }}
```

- [ ] **Step 3: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde y `tsc` limpio por fin.

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace
git commit -m "feat: el pedido se ve como una lista de líneas con su estado"
```

---

### Task 9: Comprobación de Iván

**Esta tarea la ejecuta Iván.** Ningún test dice si el flujo se usa bien.

- [ ] **Step 1: Varias líneas a la vez**

Arrancar `pnpm dev`, abrir un pedido de RPS con varias líneas, importar dos y
dejar una a medias.

- [ ] **Step 2: Saltar sin perder nada**

Ir a la otra, editarla y volver a la primera: debe conservar lo que se dejó, con
su dibujo.

- [ ] **Step 3: Recargar**

Recargar la página. Las dos líneas siguen ahí, con lo que se llevaba escrito.

- [ ] **Step 4: Eliminar**

Añadir una tercera por error y eliminarla. Debe pedir confirmación nombrándola.

- [ ] **Step 5: Completar con una línea a medias**

Intentar completar el pedido con una línea sin el modo de ollaos elegido: debe
negarse, decir cuál y qué le falta, y abrir esa línea.

- [ ] **Step 6: Completar de verdad**

Elegirlo y completar: se guardan todas, sale el PDF con una página por línea —con
su dibujo— y el historial las muestra.

- [ ] **Step 7: Volver sobre un pedido cerrado**

Abrir ese pedido desde el historial, añadir un remolque más y completarlo otra
vez. No debe duplicar los anteriores.

---

## Estado final esperado

| Fichero | Testeado |
|---|---|
| `src/lib/workspace/lineas.ts` | Sí: nombre, estado, conversión, fusión, numeración |
| `src/lib/workspace/borradores-locales.ts` | Sí: ida y vuelta, corrupto, sin almacén, limpieza |
| `src/lib/workspace/completar-pedido.ts` | Sí: qué impide completar y cómo se cuenta |
| `src/lib/workspace/estado.ts` | Sí: todas las transiciones de la lista |
| `src/lib/workspace/selectores.ts` | Sí: línea activa y origen de RPS |
| `src/lib/store/*` y la ruta DELETE | Sí: borra lo suyo y solo lo suyo |
| `src/lib/pdf/orquestar-pdf.ts` | Sí: páginas, dibujos, omitidos, errores |
| `useWorkspace.ts`, `PedidoActivo.tsx`, `Workspace.tsx`, `/api/pdf` | No (comprobación de Iván) |
