# Revisión del pedido y paso a producción — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que ningún pedido llegue al taller sin que un segundo par de ojos haya mirado los datos introducidos, y que generar y archivar el PDF sea un acto aparte y con nombre.

**Architecture:** El estado vive en su propia tabla, indexado por el número de pedido normalizado, y nunca reescribe las líneas. Todo lo que decide —transiciones y estado visible— es una función pura en `src/lib/pedidos/estado-pedido.ts` de la que beben la API, la bandeja y la ficha. El render y el archivado que hoy están dentro de `/api/pdf` se extraen a `generarPdfPedido()` para que la ruta de producción no los duplique.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4, Vitest 4 (`environment: "node"`), @react-pdf/renderer, mssql.

## Global Constraints

- **Sin dependencias npm nuevas.** `package.json` y `pnpm-lock.yaml` no se tocan.
- **Español en código, nombres de función, comentarios y textos.**
- Los tests son `src/**/*.test.ts` en `environment: "node"`: **solo módulos puros**. Ningún test de componente ni de JSX.
- **El estado es del pedido, no de cada línea**, y **vive en su propio sitio**: no se añade ninguna columna a `Planteamientos`.
- **Los rechazos no llevan motivo.** Se guarda quién y cuándo, y nada más.
- **La aprobación se calcula, no se marca**: es válida mientras nadie toque los datos después.
- **La puerta es la primera revisión, no la aprobación.**
- **Los opcionales vacíos salen como «—», no desaparecen.**
- La clave del pedido es siempre `normalizarNumeroPedido(...)`: `AR.26.0123` y `AR260123` son el mismo pedido.
- Spec: `docs/superpowers/specs/2026-09-03-revision-y-produccion-design.md`.

## Alcance

Este plan cubre el flujo entero: estado, almacén, API, bandeja, ficha y el cambio del botón del workspace. **La ficha de revisión en PDF queda fuera** y tendrá su propio plan: es a demanda, no se archiva en ninguna carpeta y solo reutiliza `seccionesRevision`, que sí se construye aquí (Task 6) porque la ficha web ya la necesita.

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/lib/pedidos/estado-pedido.ts` | **Nuevo.** Puro. Tipos, transiciones y `estadoVisiblePedido`. |
| `src/lib/store/pedidos-types.ts` | **Nuevo.** La interfaz `PedidosStore`. |
| `src/lib/store/pedidos-file-store.ts` | **Nuevo.** Driver de fichero (`data/pedidos.json`). |
| `src/lib/store/pedidos-mssql-store.ts` | **Nuevo.** Driver de SQL Server. |
| `src/lib/store/pedidos.ts` | **Nuevo.** `getPedidosStore()`, con el mismo interruptor `DATASOURCE` que `getStore()`. |
| `src/lib/revision/datos-revision.ts` | **Nuevo.** Puro. `seccionesRevision(linea)`. |
| `src/lib/pdf/generar-pdf-pedido.ts` | **Nuevo.** Render + archivado, extraído de `/api/pdf`. |
| `src/app/api/pedidos/route.ts` | **Nuevo.** GET: la bandeja. |
| `src/app/api/pedidos/[pedido]/route.ts` | **Nuevo.** GET: la ficha de un pedido. |
| `src/app/api/pedidos/[pedido]/revision/route.ts` | **Nuevo.** POST: guardar para revisión, aprobar, no aprobar. |
| `src/app/api/pedidos/[pedido]/produccion/route.ts` | **Nuevo.** POST: generar, archivar y anotar. |
| `src/app/revision/page.tsx` | **Nuevo.** La bandeja. |
| `src/app/revision/[pedido]/page.tsx` | **Nuevo.** La ficha. |
| `src/components/revision/FichaPedido.tsx` | **Nuevo.** La ficha, con sus botones. |
| `src/app/api/pdf/route.tsx` | Adelgaza: llama a `generarPdfPedido`. |
| `src/components/workspace/useWorkspace.ts` | `completarPedido` pasa a `guardarParaRevision`: guarda y marca, **no archiva**. |
| `src/components/workspace/PedidoActivo.tsx` | El botón nuevo y el aviso sobre pedido aprobado. |
| `src/lib/calc/params.ts`, `validar-params.ts`, `/parametros` | La lista de técnicos. |
| `src/components/workspace/opciones-formulario.ts` | `TECNICOS` deja de estar a mano. |
| `src/components/layout/AppNav.tsx` | Entrada «Revisión». |
| `db/schema.sql` | Tabla `PedidosRevision`. |

---

### Task 1: Los técnicos salen de Parámetros

Hoy `TECNICOS` está escrito a mano en `opciones-formulario.ts`. La misma lista tiene que servir para *realizado por*, para aprobar y para pasar a producción, así que se muda a `CalcParams`, que ya se edita desde `/parametros`.

**Files:**
- Modify: `src/lib/calc/params.ts` (interfaz `CalcParams` y `DEFAULT_PARAMS`)
- Modify: `src/lib/calc/validar-params.ts`
- Modify: `src/components/workspace/opciones-formulario.ts`
- Modify: `src/components/workspace/FormularioLona.tsx`, `FormularioBaqueton.tsx`
- Modify: `src/app/parametros/page.tsx`
- Test: `src/lib/store/__tests__/params-store.test.ts`

**Interfaces:**
- Produces:
  - `CalcParams.tecnicos: string[]` — nombres en mayúsculas, tal y como se guardan hoy en `cabecera.realizadoPor`.
  - `opcionesTecnicos(tecnicos: string[]): OpcionFormulario[]` en `opciones-formulario.ts` — antepone `{ value: "", label: "Sin asignar" }`.

- [ ] **Step 1: Escribe los tests que fallan**

Añade a `src/lib/store/__tests__/params-store.test.ts`:

```ts
import { normalizarParams, validarParams } from "@/lib/calc/validar-params";
import { DEFAULT_PARAMS } from "@/lib/calc/params";

describe("la lista de técnicos", () => {
  it("completa la lista cuando los parámetros guardados son de antes", () => {
    const { tecnicos } = normalizarParams({ demasiaAlto: 3 });
    expect(tecnicos).toEqual(DEFAULT_PARAMS.tecnicos);
    expect(tecnicos).toContain("IVAN");
  });

  it("conserva la lista guardada cuando la hay", () => {
    expect(normalizarParams({ tecnicos: ["ANA", "LUIS"] }).tecnicos).toEqual(["ANA", "LUIS"]);
  });

  it("no acepta guardar una lista vacía: sin técnicos no se puede aprobar nada", () => {
    const resultado = validarParams({ ...DEFAULT_PARAMS, tecnicos: [] });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.errores.join(" ")).toContain("técnico");
  });

  it("no acepta nombres en blanco", () => {
    const resultado = validarParams({ ...DEFAULT_PARAMS, tecnicos: ["IVAN", "  "] });
    expect(resultado.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecuta los tests y comprueba que fallan**

Run: `pnpm vitest run src/lib/store/__tests__/params-store.test.ts`
Expected: FAIL, «expected undefined to equal [...]» en el primero.

- [ ] **Step 3: Añade el campo a los parámetros**

En `src/lib/calc/params.ts`, dentro de `interface CalcParams`, tras `clientesBaqueton: ClienteBaqueton[];`:

```ts
  /** Quién puede figurar como técnico: en la cabecera, al aprobar y al producir.
   *  Vive aquí y no a mano en el formulario porque tres sitios usan la misma
   *  lista y una de ellas decide quién firma una revisión. */
  tecnicos: string[];
```

Y en `DEFAULT_PARAMS`, junto a los demás campos:

```ts
  tecnicos: ["IVAN", "ADRIAN", "JAIME", "TAMARA", "ALBERTO", "ANGEL"],
```

- [ ] **Step 4: Enséñale el campo a la validación**

En `src/lib/calc/validar-params.ts`, dentro de `normalizarParams`, antes del `return`:

```ts
  if (Array.isArray(p.tecnicos) && p.tecnicos.length > 0) {
    resultado.tecnicos = (p.tecnicos as unknown[]).filter(
      (t): t is string => typeof t === "string",
    );
  }
```

Y dentro de `validarParams`, junto a las demás comprobaciones de lista:

```ts
  const tecnicos = p.tecnicos;
  if (!Array.isArray(tecnicos) || tecnicos.length === 0) {
    errores.push("«tecnicos» debe tener al menos un técnico");
  } else if (tecnicos.some((t) => typeof t !== "string" || t.trim() === "")) {
    errores.push("cada técnico debe tener nombre");
  }
```

- [ ] **Step 5: Ejecuta los tests y comprueba que pasan**

Run: `pnpm vitest run src/lib/store/__tests__/params-store.test.ts`
Expected: PASS.

- [ ] **Step 6: Que los formularios beban de los parámetros**

En `src/components/workspace/opciones-formulario.ts`, **borra** la constante `TECNICOS` entera y pon en su lugar:

```ts
/** «Sin asignar» va primero: un desplegable que arranca en un nombre concreto
 *  convierte en decisión lo que nadie ha decidido. */
export function opcionesTecnicos(tecnicos: string[]): OpcionFormulario[] {
  return [{ value: "", label: "Sin asignar" }, ...opcionesConEtiqueta(tecnicos)];
}
```

En `src/components/workspace/FormularioLona.tsx` y `FormularioBaqueton.tsx`, cambia el import de `TECNICOS` por `opcionesTecnicos` y sustituye **las dos apariciones de `opciones={TECNICOS}` de cada fichero** (las de «Realizado por» y «Revisión») por:

```tsx
opciones={opcionesTecnicos((params ?? DEFAULT_PARAMS).tecnicos)}
```

Los dos formularios reciben `params?: CalcParams` y ya resuelven así el resto de listas (`(params ?? DEFAULT_PARAMS).recogidas`, `.clientesBaqueton`), y los dos importan ya `DEFAULT_PARAMS`.

- [ ] **Step 7: Que se pueda editar en Parámetros**

En `src/app/parametros/page.tsx`, tras la sección `Constantes de lona` y antes de la de recogidas:

```tsx
      <section className="mb-4 rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
        <h2 className="mb-1 text-sm font-extrabold text-ink-2">Técnicos</h2>
        <p className="mb-3 text-xs text-muted-2">
          Uno por línea. Es la lista de «Realizado por» y la de quien aprueba y pasa a producción.
        </p>
        <textarea
          className="min-h-32 w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-xs text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30"
          value={p.tecnicos.join("\n")}
          onChange={(e) => setP({
            ...p,
            tecnicos: e.target.value.split("\n").map((t) => t.trim()).filter(Boolean),
          })}
        />
      </section>
```

- [ ] **Step 8: Comprueba que todo sigue en pie**

```bash
pnpm test && pnpm exec tsc --noEmit && pnpm lint
```

Expected: todo en verde. Si `tsc` se queja de `TECNICOS` en algún sitio, es una importación que quedó sin cambiar: `grep -rn TECNICOS src`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: la lista de técnicos se edita en Parámetros"
```

---

### Task 2: El estado del pedido: tipos y transiciones

**Files:**
- Create: `src/lib/pedidos/estado-pedido.ts`
- Test: `src/lib/pedidos/__tests__/estado-pedido.test.ts`

**Interfaces:**
- Consumes: `normalizarNumeroPedido` de `@/lib/pedidos/numero-pedido`.
- Produces:
  - `type EstadoRevision = "EN_REVISION" | "APROBADO" | "NO_APROBADO"`
  - `interface Decision { estado: EstadoRevision; por: string; en: string }`
  - `interface DecisionFirme { estado: "APROBADO" | "NO_APROBADO"; por: string; en: string }`
  - `interface Produccion { por: string; en: string; nombrePdf: string; rutas: string[] }`
  - `interface EstadoPedido { pedido: string; numeroPedido: string; revision: Decision; ultimaDecision: DecisionFirme | null; produccion: Produccion | null; updatedAt: string }`
  - `type Transicion = { ok: true; estado: EstadoPedido } | { ok: false; motivo: string }`
  - `guardadoParaRevision(previo: EstadoPedido | null, datos: { numeroPedido: string; por: string; en: string }): EstadoPedido`
  - `decidido(previo: EstadoPedido | null, decision: DecisionFirme): Transicion`
  - `producido(previo: EstadoPedido | null, datos: { numeroPedido: string; por: string; en: string; nombrePdf: string; rutas: string[] }): Transicion`

- [ ] **Step 1: Escribe los tests que fallan**

Crea `src/lib/pedidos/__tests__/estado-pedido.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  decidido, guardadoParaRevision, producido, type EstadoPedido,
} from "@/lib/pedidos/estado-pedido";

const enRevision = (): EstadoPedido => guardadoParaRevision(null, {
  numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-01T08:00:00.000Z",
});

describe("guardar para revisión", () => {
  it("deja el pedido esperando a un compañero, con la clave normalizada", () => {
    const estado = enRevision();
    expect(estado.pedido).toBe("AR260123");
    expect(estado.numeroPedido).toBe("AR.26.0123");
    expect(estado.revision).toEqual({
      estado: "EN_REVISION", por: "IVAN", en: "2026-09-01T08:00:00.000Z",
    });
    expect(estado.ultimaDecision).toBeNull();
    expect(estado.produccion).toBeNull();
  });

  it("sobre un pedido ya producido lo devuelve a revisión sin borrar lo producido", () => {
    const aprobado = decidido(enRevision(), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!aprobado.ok) throw new Error("debería haber aprobado");
    const producidoYa = producido(aprobado.estado, {
      numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-03T08:00:00.000Z",
      nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/AR.26.0123-10.pdf"],
    });
    if (!producidoYa.ok) throw new Error("debería haber producido");

    const reabierto = guardadoParaRevision(producidoYa.estado, {
      numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-04T08:00:00.000Z",
    });
    expect(reabierto.revision.estado).toBe("EN_REVISION");
    expect(reabierto.produccion?.nombrePdf).toBe("AR.26.0123-10.pdf");
    expect(reabierto.ultimaDecision?.estado).toBe("APROBADO");
  });
});

describe("aprobar y no aprobar", () => {
  it("aprueba desde EN_REVISION y deja constancia de quién y cuándo", () => {
    const resultado = decidido(enRevision(), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.estado.revision.estado).toBe("APROBADO");
    expect(resultado.estado.revision.por).toBe("JAIME");
    expect(resultado.estado.ultimaDecision).toEqual({
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
  });

  it("no aprueba dos veces: sobre un pedido ya decidido se rechaza", () => {
    const aprobado = decidido(enRevision(), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!aprobado.ok) throw new Error("debería haber aprobado");
    const otraVez = decidido(aprobado.estado, {
      estado: "NO_APROBADO", por: "ADRIAN", en: "2026-09-02T09:00:00.000Z",
    });
    expect(otraVez.ok).toBe(false);
    if (!otraVez.ok) expect(otraVez.motivo).toContain("ya");
  });

  it("no se puede decidir sobre un pedido sin registro", () => {
    const resultado = decidido(null, {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    expect(resultado.ok).toBe(false);
  });
});

describe("pasar a producción", () => {
  const datos = {
    numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-03T08:00:00.000Z",
    nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/x.pdf", "/b/x.pdf"],
  };

  it("se rechaza mientras nadie haya mirado el pedido nunca", () => {
    const resultado = producido(enRevision(), datos);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toContain("primera revisión");
  });

  it("vale desde aprobado y desde no aprobado", () => {
    for (const decision of ["APROBADO", "NO_APROBADO"] as const) {
      const decidida = decidido(enRevision(), {
        estado: decision, por: "JAIME", en: "2026-09-02T08:00:00.000Z",
      });
      if (!decidida.ok) throw new Error("debería haber decidido");
      const resultado = producido(decidida.estado, datos);
      expect(resultado.ok).toBe(true);
      if (resultado.ok) expect(resultado.estado.produccion?.rutas).toHaveLength(2);
    }
  });

  it("vale en un pedido devuelto a revisión que ya se miró una vez", () => {
    const noAprobado = decidido(enRevision(), {
      estado: "NO_APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!noAprobado.ok) throw new Error("debería haber decidido");
    const devuelto = guardadoParaRevision(noAprobado.estado, {
      numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-02T10:00:00.000Z",
    });
    expect(devuelto.revision.estado).toBe("EN_REVISION");
    expect(producido(devuelto, datos).ok).toBe(true);
  });

  it("vale en un pedido histórico, sin registro ninguno", () => {
    expect(producido(null, datos).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecuta los tests y comprueba que fallan**

Run: `pnpm vitest run src/lib/pedidos/__tests__/estado-pedido.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/pedidos/estado-pedido"».

- [ ] **Step 3: Escribe la implementación**

Crea `src/lib/pedidos/estado-pedido.ts`:

```ts
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";

export type EstadoRevision = "EN_REVISION" | "APROBADO" | "NO_APROBADO";

export interface Decision { estado: EstadoRevision; por: string; en: string }
export interface DecisionFirme { estado: "APROBADO" | "NO_APROBADO"; por: string; en: string }
export interface Produccion { por: string; en: string; nombrePdf: string; rutas: string[] }

export interface EstadoPedido {
  /** Clave normalizada: AR.26.0123 y AR260123 son el mismo pedido. */
  pedido: string;
  /** Tal y como se escribió, para enseñarlo. */
  numeroPedido: string;
  revision: Decision;
  /**
   * La última vez que alguien se pronunció. Sobrevive a volver a mandarlo a
   * revisión, y es lo único que no se deduce del estado actual: cuando un
   * pedido vuelve a EN_REVISION, el estado deja de contar que ya se miró una
   * vez, y sin esto la app volvería a cerrarle la puerta de producción.
   */
  ultimaDecision: DecisionFirme | null;
  produccion: Produccion | null;
  updatedAt: string;
}

export type Transicion =
  | { ok: true; estado: EstadoPedido }
  | { ok: false; motivo: string };

/**
 * Guardar deja el pedido esperando a un compañero, venga de donde venga: de
 * cero, de un rechazo o de estar ya producido. Lo producido no se borra —el
 * PDF sigue en la carpeta y hay que saber quién lo puso ahí— y `ultimaDecision`
 * tampoco, que es lo que mantiene abierta la puerta de producción.
 */
export function guardadoParaRevision(
  previo: EstadoPedido | null,
  datos: { numeroPedido: string; por: string; en: string },
): EstadoPedido {
  return {
    pedido: normalizarNumeroPedido(datos.numeroPedido),
    numeroPedido: datos.numeroPedido,
    revision: { estado: "EN_REVISION", por: datos.por, en: datos.en },
    ultimaDecision: previo?.ultimaDecision ?? null,
    produccion: previo?.produccion ?? null,
    updatedAt: datos.en,
  };
}

/** Aprobar o no aprobar. Solo desde EN_REVISION: pisar la decisión de otro no. */
export function decidido(previo: EstadoPedido | null, decision: DecisionFirme): Transicion {
  if (!previo) {
    return { ok: false, motivo: "Este pedido no está en revisión." };
  }
  if (previo.revision.estado !== "EN_REVISION") {
    return {
      ok: false,
      motivo: `Este pedido ya lo revisó ${previo.revision.por}.`,
    };
  }
  return {
    ok: true,
    estado: {
      ...previo,
      revision: decision,
      ultimaDecision: decision,
      updatedAt: decision.en,
    },
  };
}

/**
 * La puerta es la primera revisión, no la aprobación: en cuanto un compañero se
 * pronuncia una vez, producir vuelve a ser decisión de quien lleva el pedido.
 * Los pedidos sin registro son de antes de este bloque: su PDF ya está
 * archivado, así que se dan por revisados.
 */
export function producido(
  previo: EstadoPedido | null,
  datos: { numeroPedido: string; por: string; en: string; nombrePdf: string; rutas: string[] },
): Transicion {
  if (previo && previo.revision.estado === "EN_REVISION" && previo.ultimaDecision === null) {
    return {
      ok: false,
      motivo: "Este pedido todavía está pendiente de su primera revisión.",
    };
  }
  const produccion: Produccion = {
    por: datos.por, en: datos.en, nombrePdf: datos.nombrePdf, rutas: datos.rutas,
  };
  return {
    ok: true,
    estado: previo
      ? { ...previo, produccion, updatedAt: datos.en }
      : {
          pedido: normalizarNumeroPedido(datos.numeroPedido),
          numeroPedido: datos.numeroPedido,
          // Un histórico que se vuelve a producir no inventa quién lo revisó:
          // queda a nombre de quien lo produce, que es lo único que se sabe.
          revision: { estado: "APROBADO", por: datos.por, en: datos.en },
          ultimaDecision: { estado: "APROBADO", por: datos.por, en: datos.en },
          produccion,
          updatedAt: datos.en,
        },
  };
}
```

- [ ] **Step 4: Ejecuta los tests y comprueba que pasan**

Run: `pnpm vitest run src/lib/pedidos/__tests__/estado-pedido.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pedidos/estado-pedido.ts src/lib/pedidos/__tests__/estado-pedido.test.ts
git commit -m "feat: los estados del pedido y sus transiciones"
```

---

### Task 3: El estado que se enseña

Lo guardado a secas no basta: hay que decir «aprobado, con cambios posteriores» comparando fechas, marcar los históricos, y decir si se puede producir y por qué no. El botón y su explicación salen del mismo sitio para que no puedan contradecirse.

**Files:**
- Modify: `src/lib/pedidos/estado-pedido.ts`
- Test: `src/lib/pedidos/__tests__/estado-pedido.test.ts`

**Interfaces:**
- Consumes: los tipos de la Task 2.
- Produces:
  - `type Situacion = "HISTORICO" | "EN_REVISION" | "APROBADO" | "APROBADO_CON_CAMBIOS" | "NO_APROBADO" | "EN_PRODUCCION"`
  - `interface EstadoVisible { situacion: Situacion; etiqueta: string; puedeProducir: boolean; impedimento: string }`
  - `estadoVisiblePedido(estado: EstadoPedido | null, registros: Array<{ updatedAt: string }>): EstadoVisible`

- [ ] **Step 1: Escribe los tests que fallan**

Añade a `src/lib/pedidos/__tests__/estado-pedido.test.ts` (y amplía el import del módulo con `estadoVisiblePedido`):

```ts
describe("el estado que se enseña", () => {
  const linea = (updatedAt: string) => [{ updatedAt }];

  it("un pedido sin registro pero con líneas guardadas es un histórico, y se puede producir", () => {
    const visible = estadoVisiblePedido(null, linea("2026-01-05T08:00:00.000Z"));
    expect(visible.situacion).toBe("HISTORICO");
    expect(visible.puedeProducir).toBe(true);
    expect(visible.impedimento).toBe("");
  });

  it("un pedido que nadie ha mirado no se puede producir, y dice por qué", () => {
    const visible = estadoVisiblePedido(enRevision(), linea("2026-09-01T08:00:00.000Z"));
    expect(visible.situacion).toBe("EN_REVISION");
    expect(visible.puedeProducir).toBe(false);
    expect(visible.impedimento).toContain("primera revisión");
  });

  it("una línea tocada después de aprobar avisa, pero no cierra la puerta", () => {
    const aprobado = decidido(enRevision(), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!aprobado.ok) throw new Error("debería haber aprobado");

    const limpio = estadoVisiblePedido(aprobado.estado, linea("2026-09-02T07:00:00.000Z"));
    expect(limpio.situacion).toBe("APROBADO");

    const tocado = estadoVisiblePedido(aprobado.estado, linea("2026-09-02T09:00:00.000Z"));
    expect(tocado.situacion).toBe("APROBADO_CON_CAMBIOS");
    expect(tocado.etiqueta).toContain("cambios posteriores");
    expect(tocado.puedeProducir).toBe(true);
  });

  it("un pedido ya producido lo dice, y se puede volver a producir", () => {
    const aprobado = decidido(enRevision(), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!aprobado.ok) throw new Error("debería haber aprobado");
    const enProduccion = producido(aprobado.estado, {
      numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-03T08:00:00.000Z",
      nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/x.pdf"],
    });
    if (!enProduccion.ok) throw new Error("debería haber producido");
    const visible = estadoVisiblePedido(enProduccion.estado, linea("2026-09-02T07:00:00.000Z"));
    expect(visible.situacion).toBe("EN_PRODUCCION");
    expect(visible.puedeProducir).toBe(true);
  });

  it("un no aprobado se puede producir sin volver a pasar por revisión", () => {
    const rechazado = decidido(enRevision(), {
      estado: "NO_APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!rechazado.ok) throw new Error("debería haber decidido");
    const visible = estadoVisiblePedido(rechazado.estado, linea("2026-09-01T08:00:00.000Z"));
    expect(visible.situacion).toBe("NO_APROBADO");
    expect(visible.puedeProducir).toBe(true);
  });

  it("un pedido en revisión que ya se miró antes sí se puede producir", () => {
    const rechazado = decidido(enRevision(), {
      estado: "NO_APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!rechazado.ok) throw new Error("debería haber decidido");
    const devuelto = guardadoParaRevision(rechazado.estado, {
      numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-02T10:00:00.000Z",
    });
    const visible = estadoVisiblePedido(devuelto, linea("2026-09-02T10:00:00.000Z"));
    expect(visible.situacion).toBe("EN_REVISION");
    expect(visible.puedeProducir).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecuta los tests y comprueba que fallan**

Run: `pnpm vitest run src/lib/pedidos/__tests__/estado-pedido.test.ts`
Expected: FAIL, «estadoVisiblePedido is not a function».

- [ ] **Step 3: Escribe la implementación**

Añade al final de `src/lib/pedidos/estado-pedido.ts`:

```ts
export type Situacion =
  | "HISTORICO"
  | "EN_REVISION"
  | "APROBADO"
  | "APROBADO_CON_CAMBIOS"
  | "NO_APROBADO"
  | "EN_PRODUCCION";

export interface EstadoVisible {
  situacion: Situacion;
  /** Lo que se lee en la ficha y en la bandeja. */
  etiqueta: string;
  puedeProducir: boolean;
  /** Por qué no; cadena vacía cuando sí se puede. */
  impedimento: string;
  /** Alguien tocó las líneas después de la última decisión. Lo usa la bandeja
   *  para no seguir enseñando como pendiente un rechazo que ya se está
   *  arreglando. */
  conCambiosPosteriores: boolean;
}

const PENDIENTE_DE_LA_PRIMERA =
  "Este pedido todavía está pendiente de su primera revisión.";

/**
 * El estado que se enseña no es el guardado a secas: mete lo de «aprobado con
 * cambios posteriores» y lo de «histórico» comparando fechas, y devuelve además
 * si se puede producir y por qué no, para que el botón y su explicación salgan
 * del mismo sitio y no puedan contradecirse.
 */
export function estadoVisiblePedido(
  estado: EstadoPedido | null,
  registros: Array<{ updatedAt: string }>,
): EstadoVisible {
  // Sin registro es un pedido anterior a este bloque: su PDF ya está archivado
  // y no se inventa quién lo hizo. Se da por revisado.
  if (!estado) {
    return {
      situacion: "HISTORICO",
      etiqueta: "Histórico · anterior a la revisión",
      puedeProducir: true,
      impedimento: "",
      conCambiosPosteriores: false,
    };
  }

  const ultimoCambio = registros.reduce(
    (maximo, registro) => (registro.updatedAt > maximo ? registro.updatedAt : maximo),
    "",
  );
  const nuncaRevisado =
    estado.revision.estado === "EN_REVISION" && estado.ultimaDecision === null;
  const puedeProducir = !nuncaRevisado;
  const impedimento = nuncaRevisado ? PENDIENTE_DE_LA_PRIMERA : "";
  // Se compara con la última vez que alguien se pronunció, no con la revisión
  // actual: un pedido devuelto a revisión tiene la fecha recién puesta y
  // parecería intacto siempre.
  const conCambiosPosteriores = estado.ultimaDecision !== null
    && ultimoCambio > estado.ultimaDecision.en;

  if (estado.produccion && estado.revision.estado !== "EN_REVISION") {
    return {
      situacion: "EN_PRODUCCION",
      etiqueta: `En producción · ${estado.produccion.por}`,
      puedeProducir,
      impedimento,
      conCambiosPosteriores,
    };
  }
  if (estado.revision.estado === "APROBADO") {
    return {
      situacion: conCambiosPosteriores ? "APROBADO_CON_CAMBIOS" : "APROBADO",
      etiqueta: conCambiosPosteriores
        ? `Aprobado por ${estado.revision.por}, con cambios posteriores`
        : `Aprobado por ${estado.revision.por}`,
      puedeProducir,
      impedimento,
      conCambiosPosteriores,
    };
  }
  if (estado.revision.estado === "NO_APROBADO") {
    return {
      situacion: "NO_APROBADO",
      etiqueta: `No aprobado por ${estado.revision.por}`,
      puedeProducir,
      impedimento,
      conCambiosPosteriores,
    };
  }
  return {
    situacion: "EN_REVISION",
    etiqueta: nuncaRevisado
      ? `En revisión · guardado por ${estado.revision.por}`
      : `En revisión otra vez · guardado por ${estado.revision.por}`,
    puedeProducir,
    impedimento,
    conCambiosPosteriores,
  };
}
```

- [ ] **Step 4: Ejecuta los tests y comprueba que pasan**

Run: `pnpm vitest run src/lib/pedidos/__tests__/estado-pedido.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pedidos/estado-pedido.ts src/lib/pedidos/__tests__/estado-pedido.test.ts
git commit -m "feat: estadoVisiblePedido decide qué se enseña y si se puede producir"
```

---

### Task 4: El almacén de pedidos, driver de fichero

**Files:**
- Create: `src/lib/store/pedidos-types.ts`
- Create: `src/lib/store/pedidos-file-store.ts`
- Create: `src/lib/store/pedidos.ts`
- Test: `src/lib/store/__tests__/pedidos-file-store.test.ts`

**Interfaces:**
- Consumes: `EstadoPedido` de `@/lib/pedidos/estado-pedido`; `normalizarNumeroPedido`.
- Produces:
  - `interface PedidosStore { get(pedido: string): Promise<EstadoPedido | null>; list(): Promise<EstadoPedido[]>; save(estado: EstadoPedido): Promise<EstadoPedido> }`
  - `class PedidosFileStore implements PedidosStore` — constructor `(dir: string)`, escribe `pedidos.json` en ese directorio.
  - `getPedidosStore(): PedidosStore` en `src/lib/store/pedidos.ts`.

- [ ] **Step 1: Escribe los tests que fallan**

Crea `src/lib/store/__tests__/pedidos-file-store.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PedidosFileStore } from "@/lib/store/pedidos-file-store";
import { guardadoParaRevision } from "@/lib/pedidos/estado-pedido";

const dirs: string[] = [];
function almacen() {
  const dir = mkdtempSync(path.join(tmpdir(), "tgm-pedidos-"));
  dirs.push(dir);
  return new PedidosFileStore(dir);
}
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

const estado = (numeroPedido: string, en = "2026-09-01T08:00:00.000Z") =>
  guardadoParaRevision(null, { numeroPedido, por: "IVAN", en });

describe("almacén de pedidos en fichero", () => {
  it("no encuentra nada en un directorio vacío", async () => {
    const store = almacen();
    expect(await store.get("AR260123")).toBeNull();
    expect(await store.list()).toEqual([]);
  });

  it("guarda y lee por la clave normalizada", async () => {
    const store = almacen();
    await store.save(estado("AR.26.0123"));
    // Se escribió con puntos y se busca sin ellos: es el mismo pedido.
    expect((await store.get("AR260123"))?.numeroPedido).toBe("AR.26.0123");
    expect((await store.get("ar.26.0123"))?.numeroPedido).toBe("AR.26.0123");
  });

  it("sustituye el estado del mismo pedido en vez de acumular filas", async () => {
    const store = almacen();
    await store.save(estado("AR.26.0123"));
    await store.save(estado("AR260123", "2026-09-02T08:00:00.000Z"));
    const todos = await store.list();
    expect(todos).toHaveLength(1);
    expect(todos[0].updatedAt).toBe("2026-09-02T08:00:00.000Z");
  });

  it("lista lo más reciente primero", async () => {
    const store = almacen();
    await store.save(estado("AR.26.0001", "2026-09-01T08:00:00.000Z"));
    await store.save(estado("AR.26.0002", "2026-09-03T08:00:00.000Z"));
    await store.save(estado("AR.26.0003", "2026-09-02T08:00:00.000Z"));
    expect((await store.list()).map((e) => e.pedido))
      .toEqual(["AR260002", "AR260003", "AR260001"]);
  });
});
```

- [ ] **Step 2: Ejecuta los tests y comprueba que fallan**

Run: `pnpm vitest run src/lib/store/__tests__/pedidos-file-store.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/store/pedidos-file-store"».

- [ ] **Step 3: Escribe la interfaz**

Crea `src/lib/store/pedidos-types.ts`:

```ts
import type { EstadoPedido } from "@/lib/pedidos/estado-pedido";

/**
 * El estado de revisión vive en su propio sitio, no en una columna de
 * `Planteamientos`: aprobar un pedido no debe reescribir sus líneas, y las
 * líneas no tienen por qué cargar con un campo que no es suyo.
 */
export interface PedidosStore {
  /** Acepta el número tal cual se escribió; normaliza por dentro. */
  get(pedido: string): Promise<EstadoPedido | null>;
  /** Todos, del más reciente al más antiguo. */
  list(): Promise<EstadoPedido[]>;
  save(estado: EstadoPedido): Promise<EstadoPedido>;
}
```

- [ ] **Step 4: Escribe el driver de fichero**

Crea `src/lib/store/pedidos-file-store.ts`:

```ts
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { EstadoPedido } from "@/lib/pedidos/estado-pedido";
import type { PedidosStore } from "@/lib/store/pedidos-types";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";

/** Driver de desarrollo: un fichero JSON en `data/`, como `FileStore`. */
export class PedidosFileStore implements PedidosStore {
  constructor(private readonly dir: string) {}

  private file() { return path.join(this.dir, "pedidos.json"); }

  private leer(): EstadoPedido[] {
    if (!existsSync(this.file())) return [];
    return JSON.parse(readFileSync(this.file(), "utf8")) as EstadoPedido[];
  }

  private escribir(estados: EstadoPedido[]) {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.file(), JSON.stringify(estados, null, 1), "utf8");
  }

  async get(pedido: string): Promise<EstadoPedido | null> {
    const clave = normalizarNumeroPedido(pedido);
    return this.leer().find((estado) => estado.pedido === clave) ?? null;
  }

  async list(): Promise<EstadoPedido[]> {
    return this.leer().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async save(estado: EstadoPedido): Promise<EstadoPedido> {
    // La clave manda sobre lo que traiga el objeto: un estado construido a mano
    // con el número sin normalizar duplicaría la fila del mismo pedido.
    const guardado: EstadoPedido = {
      ...estado,
      pedido: normalizarNumeroPedido(estado.pedido || estado.numeroPedido),
    };
    const otros = this.leer().filter((previo) => previo.pedido !== guardado.pedido);
    this.escribir([...otros, guardado]);
    return guardado;
  }
}
```

- [ ] **Step 5: Escribe la fábrica**

Crea `src/lib/store/pedidos.ts`:

```ts
import path from "node:path";
import { PedidosFileStore } from "@/lib/store/pedidos-file-store";
import { PedidosMssqlStore } from "@/lib/store/pedidos-mssql-store";
import type { PedidosStore } from "@/lib/store/pedidos-types";

let store: PedidosStore | null = null;

/** El mismo interruptor que `getStore()`: los dos almacenes van juntos. */
export function getPedidosStore(): PedidosStore {
  if (!store) {
    store =
      process.env.DATASOURCE === "mssql"
        ? new PedidosMssqlStore()
        : new PedidosFileStore(path.join(process.cwd(), "data"));
  }
  return store;
}
```

`PedidosMssqlStore` todavía no existe: la Task 5 lo crea. Hasta entonces `tsc` se quejará de ese import; es lo esperado y se cierra en la tarea siguiente. Si prefieres no dejar el árbol roto entre tareas, haz las tasks 4 y 5 seguidas antes de ejecutar `tsc`.

- [ ] **Step 6: Ejecuta los tests y comprueba que pasan**

Run: `pnpm vitest run src/lib/store/__tests__/pedidos-file-store.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/store/pedidos-types.ts src/lib/store/pedidos-file-store.ts src/lib/store/pedidos.ts src/lib/store/__tests__/pedidos-file-store.test.ts
git commit -m "feat: almacén del estado de los pedidos en fichero"
```

---

### Task 5: El driver de SQL Server y su tabla

La migración es una tabla nueva; `Planteamientos` no se toca. Como en `MssqlStore`, lo único que se puede probar sin base de datos es el mapeo de fila, así que eso se extrae a una función exportada y se testea, igual que `rowToRecord`.

**Files:**
- Create: `src/lib/store/pedidos-mssql-store.ts`
- Modify: `db/schema.sql`
- Test: `src/lib/store/__tests__/pedidos-mssql-store.test.ts`

**Interfaces:**
- Consumes: `PedidosStore` y `EstadoPedido` de las tasks 2 y 4.
- Produces:
  - `filaAEstado(row: any): EstadoPedido` — exportada solo para el test.
  - `class PedidosMssqlStore implements PedidosStore`

- [ ] **Step 1: Escribe el test que falla**

Crea `src/lib/store/__tests__/pedidos-mssql-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filaAEstado } from "@/lib/store/pedidos-mssql-store";

describe("mapeo de la fila de PedidosRevision", () => {
  it("desempaqueta el JSON y normaliza las fechas a ISO", () => {
    const estado = filaAEstado({
      Pedido: "AR260123",
      NumeroPedido: "AR.26.0123",
      RevisionEstado: "APROBADO",
      RevisionPor: "JAIME",
      RevisionEn: new Date("2026-09-02T08:00:00.000Z"),
      UltimaDecisionJson: JSON.stringify({
        estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
      }),
      ProduccionJson: JSON.stringify({
        por: "IVAN", en: "2026-09-03T08:00:00.000Z",
        nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/x.pdf", "/b/x.pdf"],
      }),
      UpdatedAt: new Date("2026-09-03T08:00:00.000Z"),
    });
    expect(estado.pedido).toBe("AR260123");
    expect(estado.revision).toEqual({
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    expect(estado.produccion?.rutas).toHaveLength(2);
    expect(estado.updatedAt).toBe("2026-09-03T08:00:00.000Z");
  });

  it("deja en null lo que la fila no trae, sin reventar", () => {
    const estado = filaAEstado({
      Pedido: "AR260123", NumeroPedido: "AR.26.0123",
      RevisionEstado: "EN_REVISION", RevisionPor: "IVAN",
      RevisionEn: new Date("2026-09-01T08:00:00.000Z"),
      UltimaDecisionJson: null, ProduccionJson: null,
      UpdatedAt: new Date("2026-09-01T08:00:00.000Z"),
    });
    expect(estado.ultimaDecision).toBeNull();
    expect(estado.produccion).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecuta el test y comprueba que falla**

Run: `pnpm vitest run src/lib/store/__tests__/pedidos-mssql-store.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/store/pedidos-mssql-store"».

- [ ] **Step 3: Escribe el driver**

Crea `src/lib/store/pedidos-mssql-store.ts`:

```ts
import sql from "mssql";
import type {
  DecisionFirme, EstadoPedido, EstadoRevision, Produccion,
} from "@/lib/pedidos/estado-pedido";
import type { PedidosStore } from "@/lib/store/pedidos-types";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filaAEstado(row: any): EstadoPedido {
  return {
    pedido: row.Pedido,
    numeroPedido: row.NumeroPedido,
    revision: {
      estado: row.RevisionEstado as EstadoRevision,
      por: row.RevisionPor,
      en: new Date(row.RevisionEn).toISOString(),
    },
    ultimaDecision: row.UltimaDecisionJson
      ? (JSON.parse(row.UltimaDecisionJson) as DecisionFirme)
      : null,
    produccion: row.ProduccionJson
      ? (JSON.parse(row.ProduccionJson) as Produccion)
      : null,
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

export class PedidosMssqlStore implements PedidosStore {
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

  async get(pedido: string): Promise<EstadoPedido | null> {
    const pool = await this.getPool();
    const res = await pool.request()
      .input("pedido", sql.VarChar, normalizarNumeroPedido(pedido))
      .query("SELECT * FROM dbo.PedidosRevision WHERE Pedido = @pedido");
    return res.recordset[0] ? filaAEstado(res.recordset[0]) : null;
  }

  async list(): Promise<EstadoPedido[]> {
    const pool = await this.getPool();
    const res = await pool.request()
      .query("SELECT * FROM dbo.PedidosRevision ORDER BY UpdatedAt DESC");
    return res.recordset.map(filaAEstado);
  }

  async save(estado: EstadoPedido): Promise<EstadoPedido> {
    const pool = await this.getPool();
    const clave = normalizarNumeroPedido(estado.pedido || estado.numeroPedido);
    const res = await pool.request()
      .input("pedido", sql.VarChar, clave)
      .input("numeroPedido", sql.VarChar, estado.numeroPedido)
      .input("revisionEstado", sql.VarChar, estado.revision.estado)
      .input("revisionPor", sql.NVarChar, estado.revision.por)
      .input("revisionEn", sql.DateTime2, new Date(estado.revision.en))
      .input("ultimaDecision", sql.NVarChar,
        estado.ultimaDecision ? JSON.stringify(estado.ultimaDecision) : null)
      .input("produccion", sql.NVarChar,
        estado.produccion ? JSON.stringify(estado.produccion) : null)
      .input("updatedAt", sql.DateTime2, new Date(estado.updatedAt))
      .query(`
        MERGE dbo.PedidosRevision AS t
        USING (SELECT @pedido AS Pedido) AS s ON t.Pedido = s.Pedido
        WHEN MATCHED THEN UPDATE SET NumeroPedido=@numeroPedido,
          RevisionEstado=@revisionEstado, RevisionPor=@revisionPor, RevisionEn=@revisionEn,
          UltimaDecisionJson=@ultimaDecision, ProduccionJson=@produccion, UpdatedAt=@updatedAt
        WHEN NOT MATCHED THEN INSERT
          (Pedido, NumeroPedido, RevisionEstado, RevisionPor, RevisionEn,
           UltimaDecisionJson, ProduccionJson, UpdatedAt)
          VALUES (s.Pedido, @numeroPedido, @revisionEstado, @revisionPor, @revisionEn,
            @ultimaDecision, @produccion, @updatedAt)
        OUTPUT inserted.*;`);
    return filaAEstado(res.recordset[0]);
  }
}
```

- [ ] **Step 4: Añade la tabla al esquema**

Al final de `db/schema.sql`:

```sql

-- Estado de revisión y producción, uno por pedido. Vive aparte de
-- Planteamientos a propósito: aprobar un pedido no reescribe sus líneas.
CREATE TABLE dbo.PedidosRevision (
  Pedido VARCHAR(50) NOT NULL PRIMARY KEY,      -- número normalizado (AR260123)
  NumeroPedido VARCHAR(50) NOT NULL,            -- tal y como se escribió
  RevisionEstado VARCHAR(20) NOT NULL
    CHECK (RevisionEstado IN ('EN_REVISION','APROBADO','NO_APROBADO')),
  RevisionPor NVARCHAR(100) NOT NULL DEFAULT '',
  RevisionEn DATETIME2 NOT NULL,
  UltimaDecisionJson NVARCHAR(MAX) NULL,        -- la última vez que alguien se pronunció
  ProduccionJson NVARCHAR(MAX) NULL,            -- quién produjo, cuándo, nombre y rutas
  UpdatedAt DATETIME2 NOT NULL
);
CREATE INDEX IX_PedidosRevision_UpdatedAt ON dbo.PedidosRevision (UpdatedAt DESC);
```

- [ ] **Step 5: Ejecuta el test y comprueba que pasa**

Run: `pnpm vitest run src/lib/store/__tests__/pedidos-mssql-store.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Comprueba que el árbol vuelve a compilar**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

Expected: limpio. El import de `PedidosMssqlStore` que la Task 4 dejó colgando ya resuelve.

- [ ] **Step 7: Commit**

```bash
git add src/lib/store/pedidos-mssql-store.ts src/lib/store/__tests__/pedidos-mssql-store.test.ts db/schema.sql
git commit -m "feat: el estado de los pedidos en SQL Server"
```

---

### Task 6: Una sola lista de campos

La ficha web y —más adelante— el PDF de revisión enseñan lo mismo: los datos **tal y como se teclearon**. Si cada uno arma su lista, un campo nuevo del formulario se olvida en uno de los dos. Aquí se arma una vez.

**Files:**
- Create: `src/lib/revision/datos-revision.ts`
- Test: `src/lib/revision/__tests__/datos-revision.test.ts`

**Interfaces:**
- Consumes: `LonaInput`, `BaquetonInput`, `TipoPlanteamiento`, `nombrePerfil`.
- Produces:
  - `interface CampoRevision { etiqueta: string; valor: string }`
  - `interface SeccionRevision { titulo: string; campos: CampoRevision[] }`
  - `seccionesRevision(linea: { tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput }): SeccionRevision[]`

- [ ] **Step 1: Escribe los tests que fallan**

Crea `src/lib/revision/__tests__/datos-revision.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { seccionesRevision } from "@/lib/revision/datos-revision";
import { emptyLona, emptyBaqueton } from "@/components/workspace/entradas-vacias";
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";

const lona = (extra: Partial<LonaInput> = {}) => seccionesRevision({
  tipo: "lona",
  input: {
    ...emptyLona(),
    cantidad: 1, largo: 300, ancho: 157, altoDelante: 120,
    tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
    recogeDelante: "NO", recogeAtras: "GOMA", bastillaEnfundar: false,
    ventana: true, ventanaAncho: 148, ventanaAlto: 35, rotulacion: true,
    modoOllaos: "REPARTIDOS", material: "LONA ALPHA", observaciones: "NADA",
    ...extra,
  },
});

const baqueton = (extra: Partial<BaquetonInput> = {}) => seccionesRevision({
  tipo: "baqueton",
  input: {
    ...emptyBaqueton(),
    cantidad: 2, largo: 300, ancho: 157, baqueton: 12,
    clienteEspecifico: "GENERAL", rotulacion: false,
    modoOllaos: "REPARTIDOS", material: "LONA ALPHA", observaciones: "",
    ...extra,
  },
});

/** Busca un campo por etiqueta en todas las secciones. */
const valor = (secciones: ReturnType<typeof seccionesRevision>, etiqueta: string) =>
  secciones.flatMap((s) => s.campos).find((c) => c.etiqueta === etiqueta)?.valor;

const etiquetas = (secciones: ReturnType<typeof seccionesRevision>) =>
  secciones.flatMap((s) => s.campos.map((c) => c.etiqueta));

describe("secciones de revisión de una lona", () => {
  it("agrupa como el formulario", () => {
    expect(lona().map((s) => s.titulo))
      .toEqual(["Pedido", "Medidas", "Perfil", "Acabados", "Ollaos", "Material y observaciones"]);
  });

  it("saca del perfil solo lo que ese tipo usa", () => {
    const t04 = lona({
      tipoPerfil: "TIPO 04", chaflan: 25, radioChaflanAbajo: 7, radioChaflanArriba: 7.5,
      radioEsquina: 0,
    });
    expect(valor(t04, "Chaflán")).toBe("25");
    expect(etiquetas(t04)).not.toContain("Radio de cumbrera");
    expect(etiquetas(t04)).not.toContain("Radio de esquina");

    const t03 = lona({ tipoPerfil: "TIPO 03", aguas: 35, radioCumbrera: 20, radioHombro: 18 });
    expect(valor(t03, "Radio de cumbrera")).toBe("20");
    expect(etiquetas(t03)).not.toContain("Chaflán");
  });

  it("enseña los opcionales vacíos como raya en vez de esconderlos", () => {
    const vacia = lona({
      anchoAtras: 0, altoAtras: 0, ventana: null, rotulacion: null,
      bastillaEnfundar: null, recogeDelante: "", recogeAtras: "",
      material: "", observaciones: "",
    });
    expect(valor(vacia, "Ancho detrás")).toBe("—");
    expect(valor(vacia, "Alto detrás")).toBe("—");
    expect(valor(vacia, "Ventana")).toBe("—");
    expect(valor(vacia, "Rotulación")).toBe("—");
    expect(valor(vacia, "Bastilla de enfundar")).toBe("—");
    expect(valor(vacia, "Recoge delante")).toBe("—");
    expect(valor(vacia, "Material")).toBe("—");
    expect(valor(vacia, "Observaciones")).toBe("—");
  });

  it("solo lista las posiciones cuando los ollaos son a medida", () => {
    expect(etiquetas(lona())).not.toContain("Posiciones laterales");
    const aMedida = lona({
      modoOllaos: "SEGUN SE INDICA",
      ollaosManuales: { laterales: [2.5, 50, 100], atras: [2.5, 80], delante: [2.5] },
    });
    expect(valor(aMedida, "Posiciones laterales")).toBe("2,5 · 50 · 100");
    expect(valor(aMedida, "Posiciones delante")).toBe("2,5");
  });

  it("da la ventana con sus medidas cuando las tiene", () => {
    expect(valor(lona(), "Ventana")).toBe("Sí · 148 × 35 cm");
    expect(valor(lona({ ventana: false }), "Ventana")).toBe("No");
    expect(valor(lona({ ventanaAncho: 0, ventanaAlto: 0 }), "Ventana")).toBe("Sí · medidas pendientes");
  });
});

describe("secciones de revisión de un baquetón", () => {
  it("no arrastra ni un campo de lona", () => {
    const secciones = baqueton();
    expect(secciones.map((s) => s.titulo))
      .toEqual(["Pedido", "Medidas", "Ollaos", "Material y observaciones"]);
    const todas = etiquetas(secciones);
    expect(todas).toContain("Baquetón");
    expect(todas).toContain("Cliente específico");
    expect(todas).not.toContain("Perfil");
    expect(todas).not.toContain("Ventana");
    expect(todas).not.toContain("Recoge delante");
    expect(todas).not.toContain("Contorno");
  });
});
```

- [ ] **Step 2: Ejecuta los tests y comprueba que fallan**

Run: `pnpm vitest run src/lib/revision/__tests__/datos-revision.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/revision/datos-revision"».

- [ ] **Step 3: Escribe la implementación**

Crea `src/lib/revision/datos-revision.ts`:

```ts
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { CabeceraInput } from "@/lib/calc/lona";
import type { TipoPlanteamiento } from "@/lib/store/types";
import { nombrePerfil } from "@/lib/calc/params";

export interface CampoRevision { etiqueta: string; valor: string }
export interface SeccionRevision { titulo: string; campos: CampoRevision[] }

const RAYA = "—";

const num = (n: number | null | undefined): string => (
  n == null || !Number.isFinite(n) || n === 0
    ? RAYA
    : n.toLocaleString("es-ES", { maximumFractionDigits: 2 })
);
/** Un cero que sí significa algo (una cantidad, un paso) no es una raya. */
const numCero = (n: number | null | undefined): string => (
  n == null || !Number.isFinite(n) ? RAYA : n.toLocaleString("es-ES", { maximumFractionDigits: 2 })
);
const texto = (v: string | null | undefined): string => (v?.trim() ? v : RAYA);
const siNo = (v: boolean | null | undefined): string => (v == null ? RAYA : v ? "Sí" : "No");
const lista = (posiciones: number[]): string => (
  posiciones.length === 0 ? RAYA : posiciones.map((p) => numCero(p)).join(" · ")
);

function ventana(i: LonaInput): string {
  if (i.ventana == null) return RAYA;
  if (!i.ventana) return "No";
  return (i.ventanaAncho ?? 0) > 0 && (i.ventanaAlto ?? 0) > 0
    ? `Sí · ${num(i.ventanaAncho)} × ${num(i.ventanaAlto)} cm`
    : "Sí · medidas pendientes";
}

function seccionPedido(cabecera: CabeceraInput, version: string): SeccionRevision {
  return {
    titulo: "Pedido",
    campos: [
      { etiqueta: "Nº de pedido", valor: texto(cabecera.numeroPedido) },
      { etiqueta: "Remolque", valor: texto(version) },
      { etiqueta: "Cliente", valor: texto(cabecera.cliente) },
      { etiqueta: "Revisión", valor: texto(cabecera.revision) },
      { etiqueta: "Realizado por", valor: texto(cabecera.realizadoPor) },
      { etiqueta: "Fecha", valor: texto(cabecera.fecha) },
      { etiqueta: "Fecha de salida", valor: texto(cabecera.fechaSalida) },
      { etiqueta: "O.F.", valor: texto(cabecera.ordenFabricacion) },
    ],
  };
}

/** El modo manda: el paso y el primer ollao no significan nada a medida, y las
 *  posiciones no significan nada repartidas. */
function seccionOllaos(i: LonaInput | BaquetonInput): SeccionRevision {
  const campos: CampoRevision[] = [
    { etiqueta: "Modo", valor: texto(i.modoOllaos) },
  ];
  if (i.modoOllaos === "SEGUN SE INDICA") {
    campos.push(
      { etiqueta: "Posiciones laterales", valor: lista(i.ollaosManuales.laterales) },
      { etiqueta: "Posiciones atrás", valor: lista(i.ollaosManuales.atras) },
      { etiqueta: "Posiciones delante", valor: lista(i.ollaosManuales.delante) },
    );
  } else {
    campos.push(
      { etiqueta: "Paso", valor: num(i.pasoOllaos) },
      { etiqueta: "Primer ollao", valor: num(i.primerOllao) },
    );
  }
  return { titulo: "Ollaos", campos };
}

function seccionMaterial(i: LonaInput | BaquetonInput): SeccionRevision {
  return {
    titulo: "Material y observaciones",
    campos: [
      { etiqueta: "Material", valor: texto(i.material) },
      { etiqueta: "Observaciones", valor: texto(i.observaciones) },
    ],
  };
}

function seccionPerfil(i: LonaInput): SeccionRevision {
  const campos: CampoRevision[] = [
    { etiqueta: "Perfil", valor: i.tipoPerfil ? nombrePerfil(i.tipoPerfil) : RAYA },
  ];
  // Solo lo que ese tipo usa: un radio de cumbrera en un TIPO 04 sería un dato
  // que el revisor tendría que aprender a ignorar.
  if (i.tipoPerfil === "TIPO 03") {
    campos.push(
      { etiqueta: "Radio de cumbrera", valor: num(i.radioCumbrera) },
      { etiqueta: "Radio de hombro", valor: num(i.radioHombro) },
    );
  }
  if (i.tipoPerfil === "TIPO 04") {
    campos.push(
      { etiqueta: "Chaflán", valor: num(i.chaflan) },
      { etiqueta: "Radio del chaflán abajo", valor: num(i.radioChaflanAbajo) },
      { etiqueta: "Radio del chaflán arriba", valor: num(i.radioChaflanArriba) },
    );
  }
  if (i.tipoPerfil === "TIPO 05") {
    campos.push({ etiqueta: "Radio de esquina", valor: num(i.radioEsquina) });
  }
  return { titulo: "Perfil", campos };
}

function seccionesLona(i: LonaInput, version: string): SeccionRevision[] {
  return [
    seccionPedido(i.cabecera, version),
    {
      titulo: "Medidas",
      campos: [
        { etiqueta: "Cantidad", valor: numCero(i.cantidad) },
        { etiqueta: "Largo", valor: num(i.largo) },
        { etiqueta: "Ancho", valor: num(i.ancho) },
        { etiqueta: "Ancho detrás", valor: num(i.anchoAtras) },
        { etiqueta: "Alto delante", valor: num(i.altoDelante) },
        { etiqueta: "Alto detrás", valor: num(i.altoAtras) },
        { etiqueta: "Aguas", valor: num(i.aguas) },
        { etiqueta: "Contorno", valor: num(i.contorno) },
      ],
    },
    seccionPerfil(i),
    {
      titulo: "Acabados",
      campos: [
        { etiqueta: "Recoge delante", valor: texto(i.recogeDelante) },
        { etiqueta: "Recoge atrás", valor: texto(i.recogeAtras) },
        { etiqueta: "Bastilla de enfundar", valor: siNo(i.bastillaEnfundar) },
        { etiqueta: "Ventana", valor: ventana(i) },
        { etiqueta: "Rotulación", valor: siNo(i.rotulacion) },
      ],
    },
    seccionOllaos(i),
    seccionMaterial(i),
  ];
}

function seccionesBaqueton(i: BaquetonInput, version: string): SeccionRevision[] {
  return [
    seccionPedido(i.cabecera, version),
    {
      titulo: "Medidas",
      campos: [
        { etiqueta: "Cantidad", valor: numCero(i.cantidad) },
        { etiqueta: "Largo", valor: num(i.largo) },
        { etiqueta: "Ancho", valor: num(i.ancho) },
        { etiqueta: "Baquetón", valor: num(i.baqueton) },
        { etiqueta: "Cliente específico", valor: texto(i.clienteEspecifico) },
        { etiqueta: "Rotulación", valor: siNo(i.rotulacion) },
      ],
    },
    seccionOllaos(i),
    seccionMaterial(i),
  ];
}

/**
 * Los datos tal y como se teclearon, agrupados igual que el formulario. Una
 * sola lista para la ficha web y para la ficha en papel: un campo nuevo se
 * añade en un sitio y aparece en los dos.
 */
export function seccionesRevision(linea: {
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
  version?: string;
}): SeccionRevision[] {
  const version = linea.version ?? linea.input.cabecera.version;
  return linea.tipo === "lona"
    ? seccionesLona(linea.input as LonaInput, version)
    : seccionesBaqueton(linea.input as BaquetonInput, version);
}
```

- [ ] **Step 4: Ejecuta los tests y comprueba que pasan**

Run: `pnpm vitest run src/lib/revision/__tests__/datos-revision.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/revision src/lib/revision/__tests__
git commit -m "feat: una sola lista de campos para la revisión"
```

---

### Task 7: `generarPdfPedido`, extraído de `/api/pdf`

Hoy el render y el archivado viven dentro de la ruta. La ruta de producción necesita exactamente lo mismo, y duplicarlo acabaría con dos formas distintas de nombrar el fichero.

**Files:**
- Create: `src/lib/pdf/generar-pdf-pedido.ts`
- Modify: `src/app/api/pdf/route.tsx`
- Test: `src/lib/pdf/__tests__/generar-pdf-pedido.test.ts`

**Interfaces:**
- Consumes: `nombrePdf`, `anioDelPlanteamiento`, `guardarPdfDuplicado`, `buildRecord`, `remolquesUnicos`, `errorPlanteamientoIncompleto`, `planteamientoGenerable`, `PlanteamientoPdf`.
- Produces:
  - `interface PaginaPedidoPdf { clave: string; id?: string; tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput }`
  - `interface DependenciasPdfPedido { store: PlanteamientoStore; render: (paginas, logo) => Promise<Uint8Array>; archivar: (bytes: Uint8Array, nombre: string, anio: number) => Promise<string[]>; logo: string | null; ahora: string }`
  - `type ResultadoGenerar = { ok: true; bytes: Uint8Array; nombre: string; anio: number; destinos: string[]; omitidos: number } | { ok: false; mensaje: string }`
  - `generarPdfPedido(opciones: { paginas: PaginaPedidoPdf[]; snapshots: Record<string, string | null>; archivar: boolean }, deps: DependenciasPdfPedido): Promise<ResultadoGenerar>`

**Por qué las dependencias se inyectan:** el render de `@react-pdf` y la escritura en la unidad de red no se pueden ejecutar en un test, pero **el orden sí importa** —no se marca producido si el archivado falla— y ese orden es lo que hay que probar.

- [ ] **Step 1: Escribe los tests que fallan**

Crea `src/lib/pdf/__tests__/generar-pdf-pedido.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { generarPdfPedido, type DependenciasPdfPedido } from "@/lib/pdf/generar-pdf-pedido";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import type { LonaInput } from "@/lib/calc/lona";
import type { PlanteamientoStore } from "@/lib/store/types";

const completa = (): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR.26.0123", fecha: "2026-09-01" },
  cantidad: 1, largo: 300, ancho: 157, altoDelante: 120,
  tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
  recogeDelante: "NO", recogeAtras: "GOMA", bastillaEnfundar: false,
  ventana: false, rotulacion: false,
  modoOllaos: "REPARTIDOS", material: "LONA ALPHA",
});

const store = {
  get: async () => null,
  getParams: async () => DEFAULT_PARAMS,
} as unknown as PlanteamientoStore;

const deps = (extra: Partial<DependenciasPdfPedido> = {}): DependenciasPdfPedido => ({
  store,
  render: async () => new Uint8Array([37, 80, 68, 70]),
  archivar: async () => ["/a/x.pdf", "/b/x.pdf"],
  logo: null,
  ahora: "2026-09-03T08:00:00.000Z",
  ...extra,
});

describe("generar el PDF de un pedido", () => {
  it("nombra el fichero y calcula el año como siempre", async () => {
    const resultado = await generarPdfPedido(
      { paginas: [{ clave: "a", tipo: "lona", input: completa() }], snapshots: {}, archivar: true },
      deps(),
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.nombre).toBe("AR.26.0123-10.pdf");
    expect(resultado.anio).toBe(2026);
    expect(resultado.destinos).toHaveLength(2);
  });

  it("no archiva nada cuando no se le pide", async () => {
    const archivar = vi.fn(async () => ["/a/x.pdf"]);
    const resultado = await generarPdfPedido(
      { paginas: [{ clave: "a", tipo: "lona", input: completa() }], snapshots: {}, archivar: false },
      deps({ archivar }),
    );
    expect(archivar).not.toHaveBeenCalled();
    if (resultado.ok) expect(resultado.destinos).toEqual([]);
  });

  it("rechaza una línea incompleta sin llegar a renderizar", async () => {
    const render = vi.fn(async () => new Uint8Array());
    const resultado = await generarPdfPedido(
      {
        paginas: [{ clave: "a", tipo: "lona", input: { ...completa(), tipoPerfil: "" } }],
        snapshots: {}, archivar: true,
      },
      deps({ render }),
    );
    expect(resultado.ok).toBe(false);
    expect(render).not.toHaveBeenCalled();
  });

  it("sin ninguna página no inventa un PDF vacío", async () => {
    const resultado = await generarPdfPedido(
      { paginas: [], snapshots: {}, archivar: true }, deps(),
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toContain("completo");
  });

  it("si el archivado falla, el error sube: no hay PDF dado por bueno", async () => {
    await expect(generarPdfPedido(
      { paginas: [{ clave: "a", tipo: "lona", input: completa() }], snapshots: {}, archivar: true },
      deps({ archivar: async () => { throw new Error("la unidad de red no contesta"); } }),
    )).rejects.toThrow("no contesta");
  });
});
```

- [ ] **Step 2: Ejecuta los tests y comprueba que fallan**

Run: `pnpm vitest run src/lib/pdf/__tests__/generar-pdf-pedido.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/pdf/generar-pdf-pedido"».

- [ ] **Step 3: Escribe el módulo**

Crea `src/lib/pdf/generar-pdf-pedido.ts`:

```ts
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { PlanteamientoRecord, PlanteamientoStore, TipoPlanteamiento } from "@/lib/store/types";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { anioDelPlanteamiento } from "@/lib/pdf/archivo-pdf";
import { buildRecord } from "@/app/api/planteamientos/build-record";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { errorPlanteamientoIncompleto, planteamientoGenerable } from "@/lib/pedidos/validar-planteamiento";

export interface PaginaPedidoPdf {
  clave: string;
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export interface DependenciasPdfPedido {
  store: PlanteamientoStore;
  /** El render de @react-pdf. Inyectado porque no se puede ejecutar en un test. */
  render: (
    paginas: Array<{ rec: PlanteamientoRecord; png: string | null }>,
    logo: string | null,
  ) => Promise<Uint8Array>;
  /** La escritura en la unidad de red. Si falla, lanza: no hay PDF dado por bueno. */
  archivar: (bytes: Uint8Array, nombre: string, anio: number) => Promise<string[]>;
  logo: string | null;
  ahora: string;
}

export type ResultadoGenerar =
  | {
      ok: true;
      bytes: Uint8Array;
      nombre: string;
      anio: number;
      destinos: string[];
      omitidos: number;
    }
  | { ok: false; mensaje: string };

/**
 * Genera el PDF de un pedido y, si se pide, lo archiva. Lo usan la vista previa
 * de `/api/pdf` y el paso a producción: el nombre del fichero y sus destinos se
 * deciden en un solo sitio para que no puedan divergir.
 */
export async function generarPdfPedido(
  opciones: {
    paginas: PaginaPedidoPdf[];
    snapshots: Record<string, string | null>;
    archivar: boolean;
  },
  deps: DependenciasPdfPedido,
): Promise<ResultadoGenerar> {
  const params = await deps.store.getParams();
  const recs: PlanteamientoRecord[] = [];
  for (const pagina of opciones.paginas) {
    const error = errorPlanteamientoIncompleto(pagina.input);
    if (error) return { ok: false, mensaje: error };
    const existente = pagina.id ? await deps.store.get(pagina.id) : null;
    const base = buildRecord(pagina.tipo, pagina.input, params, pagina.id, null);
    recs.push({
      ...base,
      id: pagina.clave,
      createdAt: existente?.createdAt ?? deps.ahora,
      updatedAt: deps.ahora,
    });
  }

  const paginas = remolquesUnicos(recs).filter((r) => planteamientoGenerable(r.input));
  const omitidos = recs.length - paginas.length;
  if (paginas.length === 0) {
    return { ok: false, mensaje: "No hay planteamientos completos para generar" };
  }

  const bytes = await deps.render(
    paginas.map((rec) => ({ rec, png: opciones.snapshots[rec.id] ?? null })),
    deps.logo,
  );
  const nombre = nombrePdf(paginas[0].numeroPedido);
  const anio = anioDelPlanteamiento(paginas[0].numeroPedido, paginas[0].input.cabecera.fecha);
  const destinos = opciones.archivar ? await deps.archivar(bytes, nombre, anio) : [];
  return { ok: true, bytes, nombre, anio, destinos, omitidos };
}
```

- [ ] **Step 4: Ejecuta los tests y comprueba que pasan**

Run: `pnpm vitest run src/lib/pdf/__tests__/generar-pdf-pedido.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Adelgaza `/api/pdf`**

Sustituye el cuerpo de `POST` en `src/app/api/pdf/route.tsx` por:

```tsx
export async function POST(req: NextRequest) {
  let paginas: PaginaPedidoPdf[];
  let snapshots: Record<string, string | null>;
  let archivar: boolean;
  try {
    const body = await req.json();
    paginas = Array.isArray(body.paginas) ? body.paginas : [];
    snapshots = body.snapshots ?? {};
    archivar = body.archivar === true;
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }

  let resultado: ResultadoGenerar;
  try {
    resultado = await generarPdfPedido({ paginas, snapshots, archivar }, {
      store: getStore(),
      render: async (pags, logo) => new Uint8Array(
        await renderToBuffer(<PlanteamientoPdf paginas={pags} logoTgm={logo} />),
      ),
      archivar: (bytes, nombre, anio) => guardarPdfDuplicado(bytes, nombre, anio),
      logo: getLogoTgmDataUri(),
      ahora: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo generar el PDF: ${(e as Error).message}` },
      { status: 500 },
    );
  }
  if (!resultado.ok) return NextResponse.json({ error: resultado.mensaje }, { status: 400 });

  return new NextResponse(resultado.bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "X-Nombre-Pdf": resultado.nombre,
      "X-Pdf-Destinos": String(resultado.destinos.length),
      "X-Pdf-Anio": String(resultado.anio),
      "X-Pdf-Omitidos": String(resultado.omitidos),
    },
  });
}
```

Y deja arriba solo estos imports:

```tsx
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { guardarPdfDuplicado } from "@/lib/pdf/archivo-pdf";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";
import { getLogoTgmDataUri } from "@/lib/assets/logo-tgm";
import {
  generarPdfPedido, type PaginaPedidoPdf, type ResultadoGenerar,
} from "@/lib/pdf/generar-pdf-pedido";

export const runtime = "nodejs";
```

- [ ] **Step 6: Comprueba que no se ha roto nada**

```bash
pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

Expected: todo en verde y el build con sus 14 páginas. `orquestar-pdf.test.ts` sigue pasando: el contrato de `/api/pdf` no ha cambiado, solo su interior.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pdf/generar-pdf-pedido.ts src/lib/pdf/__tests__/generar-pdf-pedido.test.ts src/app/api/pdf/route.tsx
git commit -m "refactor: el render y el archivado del PDF salen de la ruta"
```

---

### Task 8: La API de lectura: bandeja y ficha

Lo que se enseña se arma en módulos puros y las rutas solo sirven. Así la bandeja y la ficha se pueden probar, que es donde está la regla de qué cuenta como pendiente.

**Files:**
- Create: `src/lib/revision/bandeja.ts`
- Create: `src/lib/revision/ficha-pedido.ts`
- Create: `src/app/api/pedidos/route.ts`
- Create: `src/app/api/pedidos/[pedido]/route.ts`
- Test: `src/lib/revision/__tests__/bandeja.test.ts`
- Test: `src/lib/revision/__tests__/ficha-pedido.test.ts`

**Interfaces:**
- Consumes: `EstadoPedido`, `estadoVisiblePedido`, `Situacion`, `EstadoVisible`; `seccionesRevision`; `datosHoja` y `Celda` de `@/lib/pdf/datos-hoja`; `remolquesUnicos` y `nombreElementoPedido`.
- Produces:
  - `interface EntradaBandeja { pedido: string; numeroPedido: string; cliente: string; lineas: number; guardadoPor: string; guardadoEn: string; situacion: Situacion; etiqueta: string }`
  - `construirBandeja(estados: EstadoPedido[], registros: PlanteamientoRecord[]): EntradaBandeja[]`
  - `interface LineaFicha { id: string; version: string; tipo: TipoPlanteamiento; nombre: string; secciones: SeccionRevision[]; corte: Celda[]; snapshotSvg: string | null }`
  - `interface FichaPedido { pedido: string; numeroPedido: string; cliente: string; visible: EstadoVisible; estado: EstadoPedido | null; lineas: LineaFicha[] }`
  - `construirFicha(estado: EstadoPedido | null, registros: PlanteamientoRecord[]): FichaPedido`

- [ ] **Step 1: Escribe el test de la bandeja**

Crea `src/lib/revision/__tests__/bandeja.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { construirBandeja } from "@/lib/revision/bandeja";
import { decidido, guardadoParaRevision, type EstadoPedido } from "@/lib/pedidos/estado-pedido";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { PlanteamientoRecord } from "@/lib/store/types";

const registro = (numeroPedido: string, updatedAt: string, version = "10"): PlanteamientoRecord => ({
  id: `${numeroPedido}-${version}`, tipo: "lona", numeroPedido, version,
  cliente: "TALLERES CAL",
  input: { ...emptyLona(), cabecera: { ...emptyLona().cabecera, numeroPedido } },
  result: {} as PlanteamientoRecord["result"],
  paramsSnapshot: DEFAULT_PARAMS,
  createdAt: updatedAt, updatedAt,
});

const enRevision = (numeroPedido: string, en: string): EstadoPedido =>
  guardadoParaRevision(null, { numeroPedido, por: "IVAN", en });

const noAprobado = (numeroPedido: string, en: string): EstadoPedido => {
  const decision = decidido(enRevision(numeroPedido, en), {
    estado: "NO_APROBADO", por: "JAIME", en,
  });
  if (!decision.ok) throw new Error("debería haber decidido");
  return decision.estado;
};

describe("la bandeja de revisión", () => {
  it("cuenta las líneas de cada pedido y dice quién lo guardó", () => {
    const bandeja = construirBandeja(
      [enRevision("AR.26.0001", "2026-09-01T08:00:00.000Z")],
      [
        registro("AR.26.0001", "2026-09-01T08:00:00.000Z", "10"),
        registro("AR.26.0001", "2026-09-01T08:00:00.000Z", "11"),
      ],
    );
    expect(bandeja).toHaveLength(1);
    expect(bandeja[0].lineas).toBe(2);
    expect(bandeja[0].guardadoPor).toBe("IVAN");
    expect(bandeja[0].cliente).toBe("TALLERES CAL");
  });

  it("pone primero lo que espera respuesta y después los rechazos sin tocar", () => {
    const bandeja = construirBandeja(
      [
        noAprobado("AR.26.0002", "2026-09-03T08:00:00.000Z"),
        enRevision("AR.26.0001", "2026-09-01T08:00:00.000Z"),
      ],
      [
        registro("AR.26.0001", "2026-09-01T08:00:00.000Z"),
        registro("AR.26.0002", "2026-09-03T08:00:00.000Z"),
      ],
    );
    expect(bandeja.map((e) => e.pedido)).toEqual(["AR260001", "AR260002"]);
  });

  it("saca de la bandeja un rechazo que ya se está arreglando", () => {
    const bandeja = construirBandeja(
      [noAprobado("AR.26.0002", "2026-09-03T08:00:00.000Z")],
      // La línea se tocó después del rechazo: alguien está con ello.
      [registro("AR.26.0002", "2026-09-04T08:00:00.000Z")],
    );
    expect(bandeja).toEqual([]);
  });

  it("no lista lo aprobado ni lo que ya está en producción", () => {
    const aprobado = decidido(enRevision("AR.26.0003", "2026-09-01T08:00:00.000Z"), {
      estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
    });
    if (!aprobado.ok) throw new Error("debería haber aprobado");
    expect(construirBandeja([aprobado.estado], [registro("AR.26.0003", "2026-09-01T08:00:00.000Z")]))
      .toEqual([]);
  });

  it("no se cae con un estado cuyo pedido ya no tiene líneas", () => {
    const bandeja = construirBandeja([enRevision("AR.26.0009", "2026-09-01T08:00:00.000Z")], []);
    expect(bandeja[0].lineas).toBe(0);
    expect(bandeja[0].cliente).toBe("");
  });
});
```

- [ ] **Step 2: Ejecuta el test y comprueba que falla**

Run: `pnpm vitest run src/lib/revision/__tests__/bandeja.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/revision/bandeja"».

- [ ] **Step 3: Escribe la bandeja**

Crea `src/lib/revision/bandeja.ts`:

```ts
import type { EstadoPedido, Situacion } from "@/lib/pedidos/estado-pedido";
import { estadoVisiblePedido } from "@/lib/pedidos/estado-pedido";
import type { PlanteamientoRecord } from "@/lib/store/types";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";

export interface EntradaBandeja {
  pedido: string;
  numeroPedido: string;
  cliente: string;
  lineas: number;
  guardadoPor: string;
  guardadoEn: string;
  situacion: Situacion;
  etiqueta: string;
}

/** Lo que espera respuesta va primero; dentro de cada grupo, lo más reciente. */
const ORDEN: Partial<Record<Situacion, number>> = { EN_REVISION: 0, NO_APROBADO: 1 };

/**
 * Los pedidos que le tocan a alguien: los que esperan una primera respuesta y
 * los rechazos que nadie ha empezado a arreglar. Un rechazo con las líneas ya
 * tocadas no está esperando a nadie —quien lleva el pedido está con él— y
 * dejarlo en la bandeja solo enseñaría a no mirarla.
 */
export function construirBandeja(
  estados: EstadoPedido[],
  registros: PlanteamientoRecord[],
): EntradaBandeja[] {
  const porPedido = new Map<string, PlanteamientoRecord[]>();
  for (const registro of registros) {
    const clave = normalizarNumeroPedido(registro.numeroPedido);
    porPedido.set(clave, [...(porPedido.get(clave) ?? []), registro]);
  }

  return estados
    .map((estado) => {
      const lineas = remolquesUnicos(porPedido.get(estado.pedido) ?? []);
      const visible = estadoVisiblePedido(estado, lineas);
      return {
        pedido: estado.pedido,
        numeroPedido: estado.numeroPedido,
        cliente: lineas[0]?.cliente ?? "",
        lineas: lineas.length,
        guardadoPor: estado.revision.por,
        guardadoEn: estado.revision.en,
        situacion: visible.situacion,
        etiqueta: visible.etiqueta,
        conCambiosPosteriores: visible.conCambiosPosteriores,
      };
    })
    .filter((entrada) => (
      entrada.situacion === "EN_REVISION"
      || (entrada.situacion === "NO_APROBADO" && !entrada.conCambiosPosteriores)
    ))
    .map(({ conCambiosPosteriores: _ignorado, ...entrada }) => entrada)
    .sort((a, b) => (
      (ORDEN[a.situacion] ?? 9) - (ORDEN[b.situacion] ?? 9)
      || b.guardadoEn.localeCompare(a.guardadoEn)
    ));
}
```

- [ ] **Step 4: Ejecuta el test y comprueba que pasa**

Run: `pnpm vitest run src/lib/revision/__tests__/bandeja.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Escribe el test de la ficha**

Crea `src/lib/revision/__tests__/ficha-pedido.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { construirFicha } from "@/lib/revision/ficha-pedido";
import { guardadoParaRevision } from "@/lib/pedidos/estado-pedido";
import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { DEFAULT_PARAMS } from "@/lib/calc/params";
import { emptyLona } from "@/components/workspace/entradas-vacias";
import type { PlanteamientoRecord } from "@/lib/store/types";

const input = (): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR.26.0123", cliente: "TALLERES CAL" },
  cantidad: 1, largo: 300, ancho: 157, altoDelante: 120,
  tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
  recogeDelante: "NO", recogeAtras: "GOMA", bastillaEnfundar: false,
  ventana: false, rotulacion: false, modoOllaos: "REPARTIDOS", material: "LONA ALPHA",
});

const registro = (version: string, updatedAt: string): PlanteamientoRecord => {
  const i = input();
  return {
    id: `r-${version}`, tipo: "lona", numeroPedido: "AR.26.0123", version,
    cliente: "TALLERES CAL", input: i, result: calcLona(i, DEFAULT_PARAMS),
    paramsSnapshot: DEFAULT_PARAMS, snapshotSvg: "<svg/>",
    createdAt: updatedAt, updatedAt,
  };
};

describe("la ficha de un pedido", () => {
  it("da una línea por remolque, con sus secciones y su dibujo guardado", () => {
    const ficha = construirFicha(
      guardadoParaRevision(null, {
        numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-01T08:00:00.000Z",
      }),
      [registro("11", "2026-09-01T08:00:00.000Z"), registro("10", "2026-09-01T08:00:00.000Z")],
    );
    expect(ficha.numeroPedido).toBe("AR.26.0123");
    expect(ficha.cliente).toBe("TALLERES CAL");
    // En orden de remolque, no en el orden en que llegaron.
    expect(ficha.lineas.map((l) => l.version)).toEqual(["10", "11"]);
    expect(ficha.lineas[0].nombre).toBe("Remolque 1");
    expect(ficha.lineas[0].snapshotSvg).toBe("<svg/>");
    expect(ficha.lineas[0].secciones[0].titulo).toBe("Pedido");
  });

  it("lleva las medidas de corte como dato secundario", () => {
    const ficha = construirFicha(null, [registro("10", "2026-09-01T08:00:00.000Z")]);
    expect(ficha.lineas[0].corte.map((celda) => celda.titulo))
      .toEqual(["PAÑOS A CORTAR", "MEDIDA LONA HECHA", "CONTORNO DE CORTE"]);
  });

  it("un pedido sin estado es un histórico y lo dice", () => {
    const ficha = construirFicha(null, [registro("10", "2026-09-01T08:00:00.000Z")]);
    expect(ficha.visible.situacion).toBe("HISTORICO");
    expect(ficha.estado).toBeNull();
  });
});
```

- [ ] **Step 6: Ejecuta el test y comprueba que falla**

Run: `pnpm vitest run src/lib/revision/__tests__/ficha-pedido.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/revision/ficha-pedido"».

- [ ] **Step 7: Escribe la ficha**

Crea `src/lib/revision/ficha-pedido.ts`:

```ts
import type { EstadoPedido, EstadoVisible } from "@/lib/pedidos/estado-pedido";
import { estadoVisiblePedido } from "@/lib/pedidos/estado-pedido";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { nombreElementoPedido, remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { seccionesRevision, type SeccionRevision } from "@/lib/revision/datos-revision";
import { datosHoja, type Celda } from "@/lib/pdf/datos-hoja";

export interface LineaFicha {
  /** El del registro guardado: es la clave con la que viajan los dibujos al
   *  generar el PDF de producción. */
  id: string;
  version: string;
  tipo: TipoPlanteamiento;
  nombre: string;
  /** Los datos tal y como se teclearon. */
  secciones: SeccionRevision[];
  /** Las medidas de corte, como dato secundario: es lo calculado, no lo tecleado. */
  corte: Celda[];
  /** El dibujo guardado: no hace falta recalcularlo ni montar la escena 3D. */
  snapshotSvg: string | null;
}

export interface FichaPedido {
  pedido: string;
  numeroPedido: string;
  cliente: string;
  visible: EstadoVisible;
  estado: EstadoPedido | null;
  lineas: LineaFicha[];
}

export function construirFicha(
  estado: EstadoPedido | null,
  registros: PlanteamientoRecord[],
): FichaPedido {
  const lineas = remolquesUnicos(registros);
  return {
    pedido: estado?.pedido ?? "",
    numeroPedido: estado?.numeroPedido ?? lineas[0]?.numeroPedido ?? "",
    cliente: lineas[0]?.cliente ?? "",
    visible: estadoVisiblePedido(estado, lineas),
    estado,
    lineas: lineas.map((registro, indice) => ({
      id: registro.id,
      version: registro.version,
      tipo: registro.tipo,
      nombre: nombreElementoPedido(registro.version, registro.tipo),
      secciones: seccionesRevision({
        tipo: registro.tipo, input: registro.input, version: registro.version,
      }),
      corte: datosHoja(registro, indice, lineas.length).banda,
      snapshotSvg: registro.snapshotSvg ?? null,
    })),
  };
}
```

- [ ] **Step 8: Ejecuta el test y comprueba que pasa**

Run: `pnpm vitest run src/lib/revision/__tests__/ficha-pedido.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 9: Escribe las dos rutas**

Crea `src/app/api/pedidos/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { construirBandeja } from "@/lib/revision/bandeja";

export const runtime = "nodejs";

/** La bandeja: lo que espera a alguien. */
export async function GET() {
  const [estados, registros] = await Promise.all([
    getPedidosStore().list(),
    getStore().list({ limit: 2000 }),
  ]);
  return NextResponse.json({ pedidos: construirBandeja(estados, registros) });
}
```

Crea `src/app/api/pedidos/[pedido]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { construirFicha } from "@/lib/revision/ficha-pedido";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pedido: string }> },
) {
  const { pedido } = await params;
  const numero = decodeURIComponent(pedido);
  const [estado, registros] = await Promise.all([
    getPedidosStore().get(numero),
    getStore().list({ pedido: numero, limit: 200 }),
  ]);
  if (!estado && registros.length === 0) {
    return NextResponse.json({ error: "No hay ningún pedido con ese número." }, { status: 404 });
  }
  return NextResponse.json(construirFicha(estado, registros));
}
```

**Nota sobre `params`:** en esta versión de Next los parámetros de ruta llegan como promesa. Antes de escribir, lee `node_modules/next/dist/docs/` sobre route handlers y confirma la firma; si difiere, usa la que diga la documentación instalada, no la de aquí.

- [ ] **Step 10: Comprueba que todo sigue en pie**

```bash
pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

Expected: verde, y el build ahora con 16 páginas (las dos rutas nuevas).

- [ ] **Step 11: Commit**

```bash
git add src/lib/revision src/app/api/pedidos
git commit -m "feat: la API de lectura de la bandeja y de la ficha"
```

---

### Task 9: La API de la revisión

Aprobar, no aprobar y volver a mandar a revisión. El técnico sale de la lista de Parámetros: quien firma una revisión tiene que ser alguien de la casa.

**Files:**
- Create: `src/app/api/pedidos/[pedido]/revision/route.ts`

**Interfaces:**
- Consumes: `decidido`, `guardadoParaRevision` de `@/lib/pedidos/estado-pedido`; `getPedidosStore`; `getStore` (para la lista de técnicos).
- Produces: `POST /api/pedidos/<pedido>/revision` con cuerpo `{ accion: "aprobar" | "no-aprobar" | "revisar"; por: string }`. Devuelve `{ estado: EstadoPedido }` o `{ error }` con 400, 404 o 409.

**Sin test automático:** es una ruta, y en este proyecto los tests son de node sobre módulos puros. Todo lo que decide ya está probado en las tasks 2 y 3; aquí solo se ata. La comprobación es el recorrido del Step 3.

- [ ] **Step 1: Escribe la ruta**

Crea `src/app/api/pedidos/[pedido]/revision/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { decidido, guardadoParaRevision } from "@/lib/pedidos/estado-pedido";

export const runtime = "nodejs";

type Accion = "aprobar" | "no-aprobar" | "revisar";
const ACCIONES: Accion[] = ["aprobar", "no-aprobar", "revisar"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pedido: string }> },
) {
  const { pedido } = await params;
  const numeroPedido = decodeURIComponent(pedido);

  let accion: Accion;
  let por: string;
  try {
    const body = await req.json();
    accion = body.accion;
    por = String(body.por ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }
  if (!ACCIONES.includes(accion)) {
    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  }

  // Quien firma una revisión tiene que ser alguien de la lista: un nombre
  // escrito a mano convierte la firma en un campo de texto cualquiera.
  const { tecnicos } = await getStore().getParams();
  if (!tecnicos.includes(por)) {
    return NextResponse.json(
      { error: "Elige quién revisa de la lista de técnicos." },
      { status: 400 },
    );
  }

  const almacen = getPedidosStore();
  const previo = await almacen.get(numeroPedido);
  const ahora = new Date().toISOString();

  if (accion === "revisar") {
    const estado = await almacen.save(
      guardadoParaRevision(previo, { numeroPedido, por, en: ahora }),
    );
    return NextResponse.json({ estado });
  }

  if (!previo) {
    return NextResponse.json(
      { error: "Este pedido no está en revisión." },
      { status: 404 },
    );
  }
  const transicion = decidido(previo, {
    estado: accion === "aprobar" ? "APROBADO" : "NO_APROBADO", por, en: ahora,
  });
  if (!transicion.ok) {
    // 409: alguien se pronunció antes. La ficha se recarga y dice el estado
    // real, en vez de pisar la decisión de otro.
    return NextResponse.json({ error: transicion.motivo }, { status: 409 });
  }
  return NextResponse.json({ estado: await almacen.save(transicion.estado) });
}
```

- [ ] **Step 2: Comprueba que compila**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

Expected: verde, con una página más en el build.

- [ ] **Step 3: Recorrido a mano**

Con `pnpm dev` levantado y un pedido ya guardado (por ejemplo `AR.26.0123`):

```bash
# Mandarlo a revisión
curl -s -X POST localhost:3000/api/pedidos/AR.26.0123/revision \
  -H "Content-Type: application/json" -d '{"accion":"revisar","por":"IVAN"}'
# Aprobarlo
curl -s -X POST localhost:3000/api/pedidos/AR260123/revision \
  -H "Content-Type: application/json" -d '{"accion":"aprobar","por":"JAIME"}'
# Aprobarlo otra vez: tiene que dar 409
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/pedidos/AR260123/revision \
  -H "Content-Type: application/json" -d '{"accion":"aprobar","por":"ADRIAN"}'
# Un nombre que no está en la lista: 400
curl -s -X POST localhost:3000/api/pedidos/AR260123/revision \
  -H "Content-Type: application/json" -d '{"accion":"aprobar","por":"PEPE"}'
```

Expected: la primera y la segunda devuelven el estado; la tercera responde `409`; la cuarta, el aviso de la lista de técnicos. Fíjate en que la segunda usa el número **sin puntos** y encuentra el mismo pedido.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/pedidos
git commit -m "feat: aprobar, no aprobar y volver a mandar a revisión"
```

---

### Task 10: Pasar a producción

Un solo endpoint hace las tres cosas —generar, archivar y anotar— para que no pueda quedar un PDF en la carpeta sin registro de quién lo puso ahí. El orden importa, así que el orden es lo que se prueba.

**Files:**
- Create: `src/lib/pedidos/pasar-a-produccion.ts`
- Create: `src/app/api/pedidos/[pedido]/produccion/route.tsx`
- Test: `src/lib/pedidos/__tests__/pasar-a-produccion.test.ts`

**Interfaces:**
- Consumes: `EstadoPedido` y `producido` de `@/lib/pedidos/estado-pedido`.
- Produces:
  - `interface DependenciasProduccion { leerEstado: () => Promise<EstadoPedido | null>; guardarEstado: (estado: EstadoPedido) => Promise<EstadoPedido>; generar: () => Promise<{ bytes: Uint8Array; nombre: string; rutas: string[] }>; ahora: string }`
  - `type ResultadoProduccion = { ok: true; estado: EstadoPedido; bytes: Uint8Array; nombre: string } | { ok: false; motivo: string; requiereConfirmacion: boolean }`
  - `pasarAProduccion(datos: { numeroPedido: string; por: string; sustituir: boolean }, deps: DependenciasProduccion): Promise<ResultadoProduccion>`

- [ ] **Step 1: Escribe los tests que fallan**

Crea `src/lib/pedidos/__tests__/pasar-a-produccion.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { pasarAProduccion, type DependenciasProduccion } from "@/lib/pedidos/pasar-a-produccion";
import {
  decidido, guardadoParaRevision, producido, type EstadoPedido,
} from "@/lib/pedidos/estado-pedido";

const enRevision = (): EstadoPedido => guardadoParaRevision(null, {
  numeroPedido: "AR.26.0123", por: "IVAN", en: "2026-09-01T08:00:00.000Z",
});

const aprobado = (): EstadoPedido => {
  const decision = decidido(enRevision(), {
    estado: "APROBADO", por: "JAIME", en: "2026-09-02T08:00:00.000Z",
  });
  if (!decision.ok) throw new Error("debería haber aprobado");
  return decision.estado;
};

const yaProducido = (): EstadoPedido => {
  const paso = producido(aprobado(), {
    numeroPedido: "AR.26.0123", por: "ADRIAN", en: "2026-09-03T08:00:00.000Z",
    nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/x.pdf"],
  });
  if (!paso.ok) throw new Error("debería haber producido");
  return paso.estado;
};

const deps = (
  estado: EstadoPedido | null, extra: Partial<DependenciasProduccion> = {},
): DependenciasProduccion => ({
  leerEstado: async () => estado,
  guardarEstado: async (nuevo) => nuevo,
  generar: async () => ({
    bytes: new Uint8Array([37, 80, 68, 70]),
    nombre: "AR.26.0123-10.pdf",
    rutas: ["/a/x.pdf", "/b/x.pdf"],
  }),
  ahora: "2026-09-04T08:00:00.000Z",
  ...extra,
});

const datos = { numeroPedido: "AR.26.0123", por: "IVAN", sustituir: false };

describe("pasar un pedido a producción", () => {
  it("no genera nada mientras nadie haya mirado el pedido", async () => {
    const generar = vi.fn();
    const resultado = await pasarAProduccion(datos, deps(enRevision(), { generar }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toContain("primera revisión");
    expect(generar).not.toHaveBeenCalled();
  });

  it("genera, archiva y anota quién lo hizo", async () => {
    const resultado = await pasarAProduccion(datos, deps(aprobado()));
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.estado.produccion).toEqual({
      por: "IVAN", en: "2026-09-04T08:00:00.000Z",
      nombrePdf: "AR.26.0123-10.pdf", rutas: ["/a/x.pdf", "/b/x.pdf"],
    });
    expect(resultado.nombre).toBe("AR.26.0123-10.pdf");
  });

  it("avisa antes de pisar un PDF ya archivado, y no genera nada", async () => {
    const generar = vi.fn();
    const resultado = await pasarAProduccion(datos, deps(yaProducido(), { generar }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.requiereConfirmacion).toBe(true);
      expect(resultado.motivo).toContain("ADRIAN");
      expect(resultado.motivo).toContain("3/9/2026");
    }
    expect(generar).not.toHaveBeenCalled();
  });

  it("con la confirmación sí lo sustituye", async () => {
    const resultado = await pasarAProduccion(
      { ...datos, sustituir: true }, deps(yaProducido()),
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.estado.produccion?.por).toBe("IVAN");
  });

  it("si el archivado falla, el pedido no queda marcado como producido", async () => {
    const guardarEstado = vi.fn(async (estado: EstadoPedido) => estado);
    await expect(pasarAProduccion(datos, deps(aprobado(), {
      guardarEstado,
      generar: async () => { throw new Error("la unidad de red no contesta"); },
    }))).rejects.toThrow("no contesta");
    expect(guardarEstado).not.toHaveBeenCalled();
  });

  it("un pedido histórico se puede producir sin haber pasado por aquí nunca", async () => {
    const resultado = await pasarAProduccion(datos, deps(null));
    expect(resultado.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecuta los tests y comprueba que fallan**

Run: `pnpm vitest run src/lib/pedidos/__tests__/pasar-a-produccion.test.ts`
Expected: FAIL, «Failed to resolve import "@/lib/pedidos/pasar-a-produccion"».

- [ ] **Step 3: Escribe el orquestador**

Crea `src/lib/pedidos/pasar-a-produccion.ts`:

```ts
import { producido, type EstadoPedido } from "@/lib/pedidos/estado-pedido";

export interface DependenciasProduccion {
  leerEstado: () => Promise<EstadoPedido | null>;
  guardarEstado: (estado: EstadoPedido) => Promise<EstadoPedido>;
  /** Genera el PDF y lo archiva. Si la unidad de red no contesta, lanza. */
  generar: () => Promise<{ bytes: Uint8Array; nombre: string; rutas: string[] }>;
  ahora: string;
}

export type ResultadoProduccion =
  | { ok: true; estado: EstadoPedido; bytes: Uint8Array; nombre: string }
  | { ok: false; motivo: string; requiereConfirmacion: boolean };

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES");

/**
 * Generar, archivar y anotar, en ese orden y en un solo sitio: si el archivado
 * falla, la excepción sube y el pedido **no** queda marcado como producido, así
 * que se puede reintentar sin repetir nada. Al revés —anotar primero— dejaría
 * pedidos «en producción» sin PDF en la carpeta.
 */
export async function pasarAProduccion(
  datos: { numeroPedido: string; por: string; sustituir: boolean },
  deps: DependenciasProduccion,
): Promise<ResultadoProduccion> {
  const previo = await deps.leerEstado();

  // La puerta se comprueba antes de escribir nada.
  const puerta = producido(previo, {
    numeroPedido: datos.numeroPedido, por: datos.por, en: deps.ahora,
    nombrePdf: "", rutas: [],
  });
  if (!puerta.ok) {
    return { ok: false, motivo: puerta.motivo, requiereConfirmacion: false };
  }

  if (previo?.produccion && !datos.sustituir) {
    return {
      ok: false,
      motivo: `Ya hay un PDF archivado de este pedido, que pasó a producción ${previo.produccion.por} el ${fecha(previo.produccion.en)}. Se sustituirá.`,
      requiereConfirmacion: true,
    };
  }

  const { bytes, nombre, rutas } = await deps.generar();
  const transicion = producido(previo, {
    numeroPedido: datos.numeroPedido, por: datos.por, en: deps.ahora,
    nombrePdf: nombre, rutas,
  });
  if (!transicion.ok) {
    return { ok: false, motivo: transicion.motivo, requiereConfirmacion: false };
  }
  return {
    ok: true,
    estado: await deps.guardarEstado(transicion.estado),
    bytes,
    nombre,
  };
}
```

- [ ] **Step 4: Ejecuta los tests y comprueba que pasan**

Run: `pnpm vitest run src/lib/pedidos/__tests__/pasar-a-produccion.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Escribe la ruta**

Crea `src/app/api/pedidos/[pedido]/produccion/route.tsx`:

```tsx
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { guardarPdfDuplicado } from "@/lib/pdf/archivo-pdf";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";
import { getLogoTgmDataUri } from "@/lib/assets/logo-tgm";
import { generarPdfPedido } from "@/lib/pdf/generar-pdf-pedido";
import { pasarAProduccion } from "@/lib/pedidos/pasar-a-produccion";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pedido: string }> },
) {
  const { pedido } = await params;
  const numeroPedido = decodeURIComponent(pedido);

  let por: string;
  let sustituir: boolean;
  let snapshots: Record<string, string | null>;
  try {
    const body = await req.json();
    por = String(body.por ?? "").trim();
    sustituir = body.sustituir === true;
    snapshots = body.snapshots ?? {};
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }

  const store = getStore();
  const { tecnicos } = await store.getParams();
  if (!tecnicos.includes(por)) {
    return NextResponse.json(
      { error: "Elige quién pasa el pedido a producción de la lista de técnicos." },
      { status: 400 },
    );
  }

  const registros = remolquesUnicos(await store.list({ pedido: numeroPedido, limit: 200 }));
  if (registros.length === 0) {
    return NextResponse.json({ error: "Este pedido no tiene líneas guardadas." }, { status: 404 });
  }
  const ahora = new Date().toISOString();
  const almacen = getPedidosStore();

  let resultado;
  try {
    resultado = await pasarAProduccion({ numeroPedido, por, sustituir }, {
      leerEstado: () => almacen.get(numeroPedido),
      guardarEstado: (estado) => almacen.save(estado),
      ahora,
      generar: async () => {
        const generado = await generarPdfPedido(
          {
            // El dibujo sale de lo guardado: el cliente rasteriza los SVG y los
            // manda, igual que hace la vista previa.
            paginas: registros.map((registro) => ({
              clave: registro.id, id: registro.id,
              tipo: registro.tipo, input: registro.input,
            })),
            snapshots,
            archivar: true,
          },
          {
            store,
            render: async (pags, logo) => new Uint8Array(
              await renderToBuffer(<PlanteamientoPdf paginas={pags} logoTgm={logo} />),
            ),
            archivar: (bytes, nombre, anio) => guardarPdfDuplicado(bytes, nombre, anio),
            logo: getLogoTgmDataUri(),
            ahora,
          },
        );
        if (!generado.ok) throw new Error(generado.mensaje);
        return { bytes: generado.bytes, nombre: generado.nombre, rutas: generado.destinos };
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo pasar a producción: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.motivo, requiereConfirmacion: resultado.requiereConfirmacion },
      { status: 409 },
    );
  }
  return new NextResponse(resultado.bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "X-Nombre-Pdf": resultado.nombre,
      "X-Pdf-Destinos": String(resultado.estado.produccion?.rutas.length ?? 0),
    },
  });
}
```

- [ ] **Step 6: Comprueba que compila y que nada se ha roto**

```bash
pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

Expected: verde.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pedidos/pasar-a-produccion.ts src/lib/pedidos/__tests__/pasar-a-produccion.test.ts src/app/api/pedidos
git commit -m "feat: pasar a producción genera, archiva y anota en un solo paso"
```

---

### Task 11: La bandeja

**Files:**
- Create: `src/app/revision/page.tsx`
- Modify: `src/components/layout/AppNav.tsx`

**Interfaces:**
- Consumes: `GET /api/pedidos` de la Task 8, que devuelve `{ pedidos: EntradaBandeja[] }`.
- Produces: la ruta `/revision`, y desde cada fila un enlace a `/revision/<pedido>`.

**Sin test automático:** es una página. Se comprueba en el recorrido del Step 4.

- [ ] **Step 1: Escribe la página**

Crea `src/app/revision/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { EntradaBandeja } from "@/lib/revision/bandeja";
import { Aviso } from "@/components/feedback/Aviso";

const fecha = (iso: string) => (iso ? new Date(iso).toLocaleString("es-ES") : "—");

export default function RevisionPage() {
  const [pedidos, setPedidos] = useState<EntradaBandeja[]>([]);
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");

  useEffect(() => {
    fetch("/api/pedidos")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((datos) => { setPedidos(datos.pedidos); setEstado("ok"); })
      .catch(() => setEstado("error"));
  }, []);

  return (
    <div className="max-w-5xl">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">Oficina técnica</p>
      <h1 className="mb-1 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-ink">Pedidos por revisar</h1>
      <p className="mb-4 text-sm text-muted-2">
        Mira los datos introducidos y decide. Un pedido que nadie ha revisado todavía no puede pasar a producción.
      </p>

      {estado === "error" && <Aviso severidad="error" texto="No se pudo cargar la bandeja." />}
      {estado === "cargando" && <p className="text-sm text-muted-2">Cargando…</p>}

      {estado === "ok" && pedidos.length === 0 && (
        <p className="rounded-2xl border border-line bg-surface/95 p-6 text-center text-sm text-muted-2">
          No hay nada esperando. Cuando alguien guarde un pedido para revisión, aparecerá aquí.
        </p>
      )}

      {pedidos.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface/95 shadow-[0_10px_28px_rgb(14_45_49/0.045)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-3 text-left text-xs uppercase text-muted">
                <th className="px-3 py-2">Pedido</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Líneas</th>
                <th className="px-3 py-2">Guardado por</th>
                <th className="px-3 py-2">Cuándo</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.pedido} className="border-b border-line/70 last:border-0 hover:bg-surface-3/60">
                  <td className="px-3 py-2 font-extrabold text-ink">
                    <Link
                      href={`/revision/${encodeURIComponent(pedido.pedido)}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {pedido.numeroPedido}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{pedido.cliente || "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{pedido.lineas}</td>
                  <td className="px-3 py-2 text-ink-2">{pedido.guardadoPor || "—"}</td>
                  <td className="px-3 py-2 text-muted-2">{fecha(pedido.guardadoEn)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                      pedido.situacion === "EN_REVISION"
                        ? "bg-gold/15 text-gold-2"
                        : "bg-red-500/10 text-red-700"
                    }`}>
                      {pedido.etiqueta}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Añade la entrada al menú**

En `src/components/layout/AppNav.tsx`, en el array `links`, entre Planteamiento e Historial:

```ts
  { href: "/revision", label: "Revisión" },
```

- [ ] **Step 3: Comprueba que compila**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

Expected: verde, con `/revision` entre las rutas del build.

- [ ] **Step 4: Recorrido a mano**

Con `pnpm dev`, manda un pedido a revisión con el `curl` de la Task 9 y abre `http://localhost:3000/revision`. Tiene que salir el pedido con su cliente, cuántas líneas tiene y quién lo guardó. Apruébalo con `curl` y recarga: tiene que desaparecer de la bandeja.

- [ ] **Step 5: Commit**

```bash
git add src/app/revision src/components/layout/AppNav.tsx
git commit -m "feat: la bandeja de pedidos por revisar"
```

---

### Task 12: La ficha

Los datos tal y como se teclearon, el dibujo guardado, y los botones. Es la pantalla donde de verdad se revisa.

**Files:**
- Create: `src/app/revision/[pedido]/page.tsx`
- Create: `src/components/revision/FichaPedido.tsx`

**Interfaces:**
- Consumes: `GET /api/pedidos/<pedido>` (devuelve `FichaPedido`), `POST .../revision`, `POST .../produccion`; `rasterizarSvg` de `@/lib/svg/rasterizar`; `SALIDA_MONOCROMA`; `useAvisos`, `useConfirmar`.
- Produces: la ruta `/revision/<pedido>`.

**Falta un botón a propósito:** *Imprimir ficha de revisión* no está aquí. Es el otro plan, el del PDF de revisión, y se añadirá a esta misma barra.

- [ ] **Step 1: Escribe el componente de la ficha**

Crea `src/components/revision/FichaPedido.tsx`:

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { FichaPedido } from "@/lib/revision/ficha-pedido";
import type { CalcParams } from "@/lib/calc/params";
import { rasterizarSvg } from "@/lib/svg/rasterizar";
import { SALIDA_MONOCROMA } from "@/lib/pdf/salida";
import { Aviso } from "@/components/feedback/Aviso";
import { useAvisos, useConfirmar } from "@/components/feedback/useFeedback";

const descargar = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
};

export function FichaPedido({ pedido }: { pedido: string }) {
  const [ficha, setFicha] = useState<FichaPedido | null>(null);
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [quien, setQuien] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const avisar = useAvisos();
  const confirmar = useConfirmar();

  const cargar = useCallback(async () => {
    const respuesta = await fetch(`/api/pedidos/${encodeURIComponent(pedido)}`);
    if (!respuesta.ok) {
      setError("No se pudo cargar el pedido.");
      return;
    }
    setFicha(await respuesta.json());
  }, [pedido]);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => {
    fetch("/api/parametros")
      .then((r) => r.json())
      .then((params: CalcParams) => setTecnicos(params.tecnicos))
      .catch(() => setTecnicos([]));
  }, []);

  async function decidir(accion: "aprobar" | "no-aprobar") {
    if (!quien) {
      avisar("info", "Elige quién revisa antes de decidir.");
      return;
    }
    setOcupado(true);
    try {
      const respuesta = await fetch(`/api/pedidos/${encodeURIComponent(pedido)}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, por: quien }),
      });
      const datos = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        // 409: alguien se pronunció antes. Se recarga y se enseña el estado
        // real en vez de pisar su decisión.
        avisar("error", datos?.error ?? "No se pudo guardar la decisión.");
        await cargar();
        return;
      }
      avisar("exito", accion === "aprobar" ? "Pedido aprobado." : "Pedido no aprobado.");
      await cargar();
    } catch {
      avisar("error", "Error de red al guardar la decisión.");
    } finally {
      setOcupado(false);
    }
  }

  async function producir(sustituir = false) {
    if (!ficha) return;
    if (!quien) {
      avisar("info", "Elige quién pasa el pedido a producción.");
      return;
    }
    setOcupado(true);
    try {
      // Los dibujos se rasterizan aquí, como en la vista previa: @react-pdf no
      // dibuja SVG suelto.
      const snapshots: Record<string, string | null> = {};
      for (const linea of ficha.lineas) {
        snapshots[linea.id] = linea.snapshotSvg
          ? await rasterizarSvg(linea.snapshotSvg, { monocromo: SALIDA_MONOCROMA })
          : null;
      }
      const respuesta = await fetch(`/api/pedidos/${encodeURIComponent(pedido)}/produccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ por: quien, sustituir, snapshots }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        if (datos?.requiereConfirmacion) {
          const clave = await confirmar({
            titulo: "Ya hay un PDF de este pedido",
            mensaje: datos.error,
            acciones: [
              { clave: "sustituir", etiqueta: "Sustituirlo", tono: "peligro" },
              { clave: "cancelar", etiqueta: "Cancelar", tono: "neutro" },
            ],
          });
          if (clave === "sustituir") await producir(true);
          return;
        }
        avisar("error", datos?.error ?? "No se pudo pasar a producción.");
        await cargar();
        return;
      }
      const destinos = Number(respuesta.headers.get("X-Pdf-Destinos") ?? 0);
      const nombre = respuesta.headers.get("X-Nombre-Pdf") ?? "planteamiento.pdf";
      if (destinos === 0) {
        descargar(await respuesta.blob(), nombre);
        avisar("exito", `PDF generado (${nombre}). Configura las rutas del servidor para archivarlo.`);
      } else {
        avisar("exito", `Pedido en producción. PDF archivado en ${destinos} carpetas.`);
      }
      await cargar();
    } catch {
      avisar("error", "Error de red al pasar a producción.");
    } finally {
      setOcupado(false);
    }
  }

  if (error) return <Aviso severidad="error" texto={error} />;
  if (!ficha) return <p className="text-sm text-muted-2">Cargando…</p>;

  return (
    <div className="max-w-5xl">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">Revisión</p>
      <h1 className="mb-1 mt-0.5 text-[26px] font-extrabold tracking-[-0.045em] text-ink">
        {ficha.numeroPedido}
      </h1>
      <p className="mb-1 text-sm text-ink-2">{ficha.cliente || "—"}</p>
      <p className="mb-4 text-sm font-bold text-gold-2">{ficha.visible.etiqueta}</p>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3">
        <label className="text-xs font-bold text-muted" htmlFor="quien">Soy</label>
        <select
          id="quien"
          value={quien}
          onChange={(e) => setQuien(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
        >
          <option value="">Elige tu nombre</option>
          {tecnicos.map((tecnico) => <option key={tecnico} value={tecnico}>{tecnico}</option>)}
        </select>

        <button
          type="button"
          onClick={() => decidir("aprobar")}
          disabled={ocupado || ficha.visible.situacion === "HISTORICO"}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Aprobar
        </button>
        <button
          type="button"
          onClick={() => decidir("no-aprobar")}
          disabled={ocupado || ficha.visible.situacion === "HISTORICO"}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-35"
        >
          No aprobar
        </button>
        <button
          type="button"
          onClick={() => producir(false)}
          disabled={ocupado || !ficha.visible.puedeProducir}
          title={ficha.visible.impedimento || undefined}
          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-extrabold text-deep disabled:cursor-not-allowed disabled:opacity-35"
        >
          Pasar a producción
        </button>
        {ficha.lineas[0] && (
          <Link
            href={`/planteamiento?desde=${encodeURIComponent(ficha.lineas[0].id)}`}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold text-ink"
          >
            Abrir en Planteamiento
          </Link>
        )}
      </div>

      {ficha.visible.impedimento && (
        <div className="mb-4"><Aviso severidad="info" texto={ficha.visible.impedimento} /></div>
      )}

      {ficha.lineas.map((linea) => (
        <section
          key={linea.id}
          className="mb-4 rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_10px_28px_rgb(14_45_49/0.045)]"
        >
          <h2 className="mb-3 text-sm font-extrabold text-ink-2">{linea.nombre}</h2>

          {linea.snapshotSvg && (
            <div
              className="mb-4 overflow-hidden rounded-xl border border-line"
              // El dibujo ya está guardado como SVG en el registro: no hay que
              // recalcularlo ni volver a montar la escena.
              dangerouslySetInnerHTML={{ __html: linea.snapshotSvg }}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {linea.secciones.map((seccion) => (
              <div key={seccion.titulo}>
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
                  {seccion.titulo}
                </p>
                <dl className="text-xs">
                  {seccion.campos.map((campo) => (
                    <div key={campo.etiqueta} className="flex justify-between gap-3 border-b border-line/60 py-1 last:border-0">
                      <dt className="text-muted-2">{campo.etiqueta}</dt>
                      <dd className="text-right font-bold text-ink">{campo.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-4 border-t border-line pt-3 text-[11px] text-muted-2">
            {linea.corte.map((celda) => (
              <div key={celda.titulo}>
                <p className="font-extrabold uppercase tracking-wide">{celda.titulo}</p>
                {celda.lineas.map((texto) => <p key={texto}>{texto}</p>)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

**Sobre `dangerouslySetInnerHTML`:** el SVG lo generó esta misma aplicación y se guardó en su propia base de datos; no es contenido de fuera. Es la forma de enseñar el dibujo guardado sin volver a montar la escena 3D.

- [ ] **Step 2: Escribe la página**

Crea `src/app/revision/[pedido]/page.tsx`:

```tsx
import { FichaPedido } from "@/components/revision/FichaPedido";

export default async function FichaPedidoPage({
  params,
}: { params: Promise<{ pedido: string }> }) {
  const { pedido } = await params;
  return <FichaPedido pedido={decodeURIComponent(pedido)} />;
}
```

- [ ] **Step 3: Comprueba que compila**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

Expected: verde.

- [ ] **Step 4: Recorrido a mano**

Con un pedido en revisión, abre su ficha desde la bandeja y comprueba:
1. Salen todas las líneas, cada una con su dibujo y sus secciones.
2. Los campos sin poner salen como «—», no desaparecen.
3. *Pasar a producción* está apagado y al pasar el ratón dice por qué.
4. Al aprobar, la ficha se recarga y el botón se enciende.
5. *Abrir en Planteamiento* abre el pedido para editarlo.

- [ ] **Step 5: Commit**

```bash
git add src/app/revision src/components/revision
git commit -m "feat: la ficha de revisión con los datos tal y como se teclearon"
```

---

### Task 13: El workspace guarda para revisión

*Completar pedido* se parte en dos. Aquí se queda la primera mitad: guardar las líneas y marcar el pedido. **El PDF ya no se genera desde aquí.**

**Files:**
- Modify: `src/components/workspace/useWorkspace.ts`
- Modify: `src/components/workspace/PedidoActivo.tsx`
- Modify: `src/components/workspace/Workspace.tsx`

**Interfaces:**
- Consumes: `POST /api/pedidos/<pedido>/revision` con `{ accion: "revisar", por }`; `GET /api/pedidos/<pedido>` para saber si ya estaba aprobado.
- Produces: `useWorkspace()` devuelve `guardarParaRevision` en lugar de `completarPedido`; `PedidoActivo` recibe `onGuardarRevision`.

- [ ] **Step 1: Sustituye `completarPedido`**

En `src/components/workspace/useWorkspace.ts`, reemplaza la función `completarPedido` entera (de `async function completarPedido() {` hasta su cierre) por:

```ts
  /**
   * Guarda las líneas y deja el pedido esperando a un compañero. No genera
   * ningún PDF: eso es *Pasar a producción*, y va con nombre y apellidos desde
   * la ficha de revisión.
   */
  async function guardarParaRevision() {
    if (busy) return;
    const svgActual = leerSnapshot();
    capturarSnapshot(svgActual);
    const impedimentos = impedimentosCompletar(lineas);
    if (impedimentos.length > 0) {
      avisar("info", mensajeImpedimentos(impedimentos));
      const primera = impedimentos[0].version;
      const culpable = lineas.find((linea) => linea.version === primera);
      if (primera) despachar({ tipo: "LINEA_SELECCIONADA", version: primera });
      despachar({ tipo: "VALIDACION_INTENTADA" });
      const campo = culpable ? erroresPlanteamiento(culpable.input)[0]?.campo : undefined;
      if (campo) {
        window.setTimeout(() => {
          const nodo = document.querySelector<HTMLElement>(`[data-campo="${campo}"]`);
          nodo?.focus();
          nodo?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 0);
      }
      return;
    }

    // Quien guarda es el técnico de la cabecera: no se pregunta dos veces lo mismo.
    const por = lineas[0]?.input.cabecera.realizadoPor?.trim() ?? "";
    if (!por) {
      avisar("info", "Rellena «Realizado por» antes de mandar el pedido a revisión.");
      return;
    }

    // Guardar sobre un pedido ya revisado deja los cambios sin revisar. Se
    // puede seguir —es la escapatoria del arreglo sencillo— pero no por descuido.
    const ficha = await fetch(`/api/pedidos/${encodeURIComponent(numeroPedido)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    const situacion = ficha?.visible?.situacion;
    if (situacion === "APROBADO" || situacion === "APROBADO_CON_CAMBIOS" || situacion === "EN_PRODUCCION") {
      const clave = await confirmar({
        titulo: "Este pedido ya estaba revisado",
        mensaje: `${ficha.visible.etiqueta}. Si guardas, los cambios quedan sin revisar y el pedido vuelve a la bandeja.`,
        acciones: [
          { clave: "guardar", etiqueta: "Guardar igualmente", tono: "peligro" },
          { clave: "cancelar", etiqueta: "Cancelar", tono: "neutro" },
        ],
      });
      if (clave !== "guardar") return;
    }

    despachar({ tipo: "ACCION_INICIADA", accion: "completar" });
    try {
      const aGuardar = lineasConDibujoActual(svgActual);
      const guardados = await guardarTodas(aGuardar);
      if (!guardados) return;
      despachar({ tipo: "PEDIDO_COMPLETADO", numeroPedido, registros: guardados });

      const respuesta = await fetch(`/api/pedidos/${encodeURIComponent(numeroPedido)}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "revisar", por }),
      });
      if (!respuesta.ok) {
        const detalle = (await respuesta.json().catch(() => null))?.error ?? String(respuesta.status);
        avisar("error", `Las líneas se han guardado, pero el pedido no se marcó para revisión: ${detalle}`);
        return;
      }

      if (guardadoPendiente.current !== null) window.clearTimeout(guardadoPendiente.current);
      guardadoPendiente.current = null;
      pendienteRef.current = null;
      limpiarBorradores(almacen, numeroPedido);
      avisar("exito", "Pedido guardado para revisión. Avisa a un compañero para que lo mire.");
    } catch {
      avisar("error", "Error de red al guardar el pedido.");
    } finally {
      despachar({ tipo: "ACCION_TERMINADA" });
    }
  }
```

Y en el `return` del hook, cambia `completarPedido,` por `guardarParaRevision,`.

- [ ] **Step 2: Cambia el botón**

En `src/components/workspace/PedidoActivo.tsx`: renombra la prop `onCompletar` a `onGuardarRevision` (en la desestructuración y en el tipo), y sustituye el bloque del botón por:

```tsx
            <button
              type="button"
              onClick={onGuardarRevision}
              disabled={!hayPedido || total === 0 || ocupado}
              className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold text-deep transition hover:-translate-y-px hover:bg-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {accion === "completar" ? (avance ?? "Guardando…") : "Guardar para revisión"}
            </button>
```

En `src/components/workspace/Workspace.tsx`, cambia `onCompletar={ws.completarPedido}` por `onGuardarRevision={ws.guardarParaRevision}`.

- [ ] **Step 3: Comprueba que compila y que los tests siguen verdes**

```bash
pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

Expected: verde. `orquestar-pdf.test.ts` sigue pasando: la vista previa no se toca, solo se ha ido el archivado del workspace.

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace
git commit -m "feat: el pedido se guarda para revisión en vez de archivarse solo"
```

---

### Task 14: El recorrido completo

No hay nada que escribir: hay que usarlo de punta a punta, porque las piezas se han probado por separado y lo que falla son las junturas.

**Files:** ninguno, salvo los arreglos que salgan.

- [ ] **Step 1: Comprobación mecánica**

```bash
pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

Expected: todo verde; el build lista `/revision`, `/revision/[pedido]`, `/api/pedidos`, `/api/pedidos/[pedido]`, `/api/pedidos/[pedido]/revision` y `/api/pedidos/[pedido]/produccion`.

- [ ] **Step 2: El recorrido, con `pnpm dev`**

Uno por uno, y anota lo que falle:

1. **Guardar para revisión.** Crea un pedido con dos remolques y un baquetón, rellena «Realizado por», pulsa *Guardar para revisión*. Comprueba que **no se ha generado ningún PDF** en las carpetas de red y que el pedido aparece en `/revision`.
2. **La puerta.** Abre la ficha: *Pasar a producción* está apagado y explica por qué.
3. **Aprobar.** Apruébalo con otro nombre. El botón se enciende y la etiqueta dice quién aprobó.
4. **Producir.** Pásalo a producción y comprueba que el PDF está en ESCÁNER/PLANTEAMIENTOS y en OFICINA TÉCNICA/2026, con el nombre de siempre y `-10` al final.
5. **Volver a producir.** Púlsalo otra vez: tiene que avisar de que ya hay un PDF, con la fecha y el nombre de quien lo hizo, y pedir confirmación.
6. **Editar lo aprobado.** Abre el pedido en Planteamiento, cambia una medida y guarda: tiene que avisar de que estaba aprobado antes de dejarte, y al guardar vuelve a la bandeja.
7. **Recuperar mientras espera.** Con un pedido en revisión sin contestar, ábrelo desde la ficha, cambia algo y vuelve a guardar. Sigue en revisión, con la fecha nueva.
8. **No aprobar.** Recházalo y comprueba que sale en la bandeja como no aprobado, y que desaparece en cuanto tocas una línea.
9. **Un histórico.** Abre `/revision/<un pedido viejo>`: se lee como histórico y se puede producir sin pedir revisión.
10. **El número con puntos y sin ellos.** Entra a la ficha por `AR.26.0123` y por `AR260123`: tiene que ser el mismo pedido.

- [ ] **Step 3: Arregla lo que salga y haz commit**

```bash
git add -A
git commit -m "fix: arreglos del recorrido de revisión y producción"
```

Si el recorrido sale limpio, no hay commit que hacer.
