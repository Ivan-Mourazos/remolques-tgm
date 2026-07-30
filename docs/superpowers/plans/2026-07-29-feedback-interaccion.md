# Capa de feedback e interacción — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un solo sistema de feedback para toda la aplicación: avisos tipados y apilados, diálogos propios que ofrecen «Guardar y continuar», validación al salir del campo y progreso real al generar el PDF.

**Architecture:** Un `<ProveedorFeedback>` en el layout expone `useAvisos()` y `useConfirmar()`. La lógica de la pila vive en un reducer puro (`src/lib/feedback/avisos.ts`) testeable en node; el proveedor solo añade temporizadores y render. El diálogo usa `<dialog>` nativo y se resuelve por promesa. El workspace deja de guardar `aviso` en su reducer y gana `camposTocados`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4, Vitest 4 (`environment: "node"`, `include: ["src/**/*.test.ts"]`).

## Global Constraints

- **Sin dependencias nuevas.** En particular, no jsdom ni testing-library.
- Código, nombres, comentarios y textos de UI en **español**, como el resto del repo.
- Los tests solo pueden ser `*.test.ts` (no `.tsx`) y ejecutarse en `environment: "node"`: nada que toque el DOM ni renderice React. El proveedor, el diálogo, la pila y el cableado del blur quedan deliberadamente sin tests automáticos; su red es `tsc`, `lint` y el recorrido manual final.
- **A diferencia del bloque anterior, aquí se cambia comportamiento a propósito.** No hay contrato de equivalencia que defender.
- Los textos de los 16 mensajes existentes **no cambian**; solo se les asigna severidad.
- El aviso de `beforeunload` sigue siendo el nativo del navegador: no se sustituye.
- Tras cada tarea: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`. Los tres deben pasar antes de commitear.
- Commits en español al estilo del repo (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- No tocar `src/lib/calc`, `src/lib/geometry`, ni el formato del PDF.
- Este proyecto usa una versión de Next.js con cambios de ruptura. Antes de escribir código de navegación, consultar `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`.

---

### Task 1: Tipos y reducer puro de la pila de avisos

**Files:**
- Create: `src/lib/feedback/tipos.ts`
- Create: `src/lib/feedback/avisos.ts`
- Create: `src/lib/feedback/__tests__/avisos.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  ```ts
  export type Severidad = "error" | "exito" | "info";
  export interface Aviso { id: string; severidad: Severidad; texto: string }
  export interface AccionConfirmacion {
    clave: string; etiqueta: string;
    tono?: "primario" | "peligro" | "neutro";
    deshabilitada?: string;
  }
  export interface OpcionesConfirmacion {
    titulo: string; mensaje: string; acciones: AccionConfirmacion[];
  }
  export const DURACION_AVISO: Record<Severidad, number | null>;
  export const TOPE_AVISOS: number;
  export function agregarAviso(pila: Aviso[], alta: Aviso): Aviso[];
  export function descartarAviso(pila: Aviso[], id: string): Aviso[];
  export function avisoDuplicado(pila: Aviso[], severidad: Severidad, texto: string): Aviso | undefined;
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/feedback/__tests__/avisos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { agregarAviso, avisoDuplicado, descartarAviso } from "@/lib/feedback/avisos";
import { TOPE_AVISOS, type Aviso, type Severidad } from "@/lib/feedback/tipos";

const aviso = (id: string, severidad: Severidad, texto: string): Aviso => ({ id, severidad, texto });

describe("agregarAviso", () => {
  it("apila en orden de llegada", () => {
    const pila = agregarAviso(agregarAviso([], aviso("1", "info", "Uno")), aviso("2", "exito", "Dos"));
    expect(pila.map((a) => a.id)).toEqual(["1", "2"]);
  });

  it("no apila dos veces el mismo texto con la misma severidad", () => {
    const pila = agregarAviso(agregarAviso([], aviso("1", "error", "Falló")), aviso("2", "error", "Falló"));
    expect(pila).toHaveLength(1);
    expect(pila[0].id).toBe("1");
  });

  it("sí apila el mismo texto con severidad distinta", () => {
    const pila = agregarAviso(agregarAviso([], aviso("1", "info", "Listo")), aviso("2", "exito", "Listo"));
    expect(pila).toHaveLength(2);
  });

  it("al desbordar el tope desaloja el más antiguo que no sea error", () => {
    let pila: Aviso[] = [];
    pila = agregarAviso(pila, aviso("e1", "error", "Error viejo"));
    pila = agregarAviso(pila, aviso("i1", "info", "Info vieja"));
    pila = agregarAviso(pila, aviso("i2", "info", "Info nueva"));
    pila = agregarAviso(pila, aviso("x1", "exito", "Éxito"));
    expect(pila).toHaveLength(TOPE_AVISOS);
    pila = agregarAviso(pila, aviso("i3", "info", "La que desborda"));
    expect(pila).toHaveLength(TOPE_AVISOS);
    // El error sobrevive; se va la info más antigua.
    expect(pila.map((a) => a.id)).toEqual(["e1", "i2", "x1", "i3"]);
  });

  it("solo desaloja un error cuando no queda nada más", () => {
    let pila: Aviso[] = [];
    for (const n of [1, 2, 3, 4]) pila = agregarAviso(pila, aviso(`e${n}`, "error", `Error ${n}`));
    pila = agregarAviso(pila, aviso("e5", "error", "Error 5"));
    expect(pila.map((a) => a.id)).toEqual(["e2", "e3", "e4", "e5"]);
  });
});

describe("descartarAviso", () => {
  it("quita solo el id indicado", () => {
    const pila = [aviso("1", "info", "Uno"), aviso("2", "error", "Dos")];
    expect(descartarAviso(pila, "1").map((a) => a.id)).toEqual(["2"]);
  });

  it("no falla con un id que no está", () => {
    expect(descartarAviso([aviso("1", "info", "Uno")], "9")).toHaveLength(1);
  });
});

describe("avisoDuplicado", () => {
  it("encuentra el aviso equivalente para poder reiniciar su temporizador", () => {
    const pila = [aviso("1", "exito", "Guardado")];
    expect(avisoDuplicado(pila, "exito", "Guardado")?.id).toBe("1");
    expect(avisoDuplicado(pila, "info", "Guardado")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/feedback/__tests__/avisos.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/feedback/avisos"`.

- [ ] **Step 3: Escribir los tipos**

Crear `src/lib/feedback/tipos.ts`:

```ts
export type Severidad = "error" | "exito" | "info";

export interface Aviso {
  id: string;
  severidad: Severidad;
  texto: string;
}

export interface AccionConfirmacion {
  clave: string;
  etiqueta: string;
  tono?: "primario" | "peligro" | "neutro";
  /** Si viene, el botón se desactiva y muestra este motivo. */
  deshabilitada?: string;
}

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  acciones: AccionConfirmacion[];
}

/** Milisegundos hasta el descarte automático. Los errores no se van solos. */
export const DURACION_AVISO: Record<Severidad, number | null> = {
  error: null,
  exito: 6000,
  info: 10000,
};

export const TOPE_AVISOS = 4;
```

- [ ] **Step 4: Escribir el reducer**

Crear `src/lib/feedback/avisos.ts`:

```ts
import { TOPE_AVISOS, type Aviso, type Severidad } from "@/lib/feedback/tipos";

/**
 * Deja la pila en el tope desalojando primero lo prescindible: un error solo
 * cede su sitio cuando ya no queda ningún aviso de otra severidad.
 */
function recortar(pila: Aviso[]): Aviso[] {
  const restante = [...pila];
  while (restante.length > TOPE_AVISOS) {
    const indice = restante.findIndex((a) => a.severidad !== "error");
    restante.splice(indice === -1 ? 0 : indice, 1);
  }
  return restante;
}

/** El equivalente ya presente en la pila, si lo hay. */
export function avisoDuplicado(
  pila: Aviso[],
  severidad: Severidad,
  texto: string,
): Aviso | undefined {
  return pila.find((a) => a.severidad === severidad && a.texto === texto);
}

/**
 * Añade un aviso. Un mensaje idéntico no se apila dos veces: se conserva el
 * que ya estaba, y el proveedor reinicia su temporizador.
 */
export function agregarAviso(pila: Aviso[], alta: Aviso): Aviso[] {
  if (avisoDuplicado(pila, alta.severidad, alta.texto)) return pila;
  return recortar([...pila, alta]);
}

export function descartarAviso(pila: Aviso[], id: string): Aviso[] {
  return pila.filter((a) => a.id !== id);
}
```

- [ ] **Step 5: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/feedback/__tests__/avisos.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 6: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 7: Commit**

```bash
git add src/lib/feedback
git commit -m "feat: reducer puro de la pila de avisos"
```

---

### Task 2: Proveedor, aviso, pila flotante y diálogo

Sin tests automáticos: es React y el proyecto no puede ejecutarlo bajo vitest. La verificación es `tsc`, `lint` y el recorrido manual final.

El diálogo entra en esta misma tarea y no en una aparte porque el proveedor lo importa: separarlos dejaría una tarea que no compila sola.

**Files:**
- Create: `src/components/feedback/Aviso.tsx`
- Create: `src/components/feedback/PilaAvisos.tsx`
- Create: `src/components/feedback/DialogoConfirmacion.tsx`
- Create: `src/components/feedback/ProveedorFeedback.tsx`
- Create: `src/components/feedback/useFeedback.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `agregarAviso`, `descartarAviso`, `avisoDuplicado`, `DURACION_AVISO`, `Aviso`, `Severidad`, `OpcionesConfirmacion` (Task 1).
- Produces:
  ```ts
  // useFeedback.ts
  export interface Feedback {
    /** Devuelve el id del aviso, para poder descartarlo luego. */
    mostrar: (severidad: Severidad, texto: string) => string;
    descartar: (id: string) => void;
    confirmar: (opciones: OpcionesConfirmacion) => Promise<string>;
  }
  export function useFeedback(): Feedback;
  /** Función estable: segura como dependencia de useEffect/useCallback. */
  export function useAvisos(): (severidad: Severidad, texto: string) => string;
  /** Función estable. */
  export function useConfirmar(): (opciones: OpcionesConfirmacion) => Promise<string>;
  // Aviso.tsx
  export function Aviso(props: {
    severidad: Severidad; texto: string;
    onDescartar?: () => void; children?: ReactNode;
    /** Un ancestro ya declara la región viva; el aviso omite la suya. */
    enRegionViva?: boolean;
  }): ReactElement;
  // DialogoConfirmacion.tsx
  export function DialogoConfirmacion(props: {
    opciones: OpcionesConfirmacion | null;
    onResponder: (clave: string) => void;
  }): ReactElement | null;
  ```

- [ ] **Step 1: Crear el componente de presentación**

Crear `src/components/feedback/Aviso.tsx`. Es el único sitio donde se decide cómo se ve cada severidad, y se usa tanto dentro de la pila flotante como en línea:

```tsx
import type { ReactNode } from "react";
import type { Severidad } from "@/lib/feedback/tipos";

const estilos: Record<Severidad, string> = {
  error: "border-red-500/40 bg-red-50/90 text-red-900",
  exito: "border-deep/25 bg-deep/8 text-deep",
  info: "border-gold/35 bg-gold/8 text-ink-2",
};

const iconos: Record<Severidad, string> = { error: "!", exito: "✓", info: "i" };

/**
 * Un fallo interrumpe al lector de pantalla; lo demás espera su turno.
 */
export function Aviso({
  severidad, texto, onDescartar, children,
}: {
  severidad: Severidad;
  texto: string;
  onDescartar?: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      role={severidad === "error" ? "alert" : "status"}
      aria-live={severidad === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm ${estilos[severidad]}`}
    >
      <span aria-hidden className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border border-current text-[9px] font-extrabold">
        {iconos[severidad]}
      </span>
      <span className="min-w-0 flex-1 leading-5">{texto}</span>
      {children}
      {onDescartar && (
        <button
          type="button"
          onClick={onDescartar}
          aria-label="Descartar aviso"
          className="-mr-1 shrink-0 rounded-md px-1.5 text-sm font-bold opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear la pila flotante**

Crear `src/components/feedback/PilaAvisos.tsx`:

```tsx
"use client";
import { Aviso } from "@/components/feedback/Aviso";
import type { Aviso as TipoAviso } from "@/lib/feedback/tipos";

export function PilaAvisos({
  avisos, onDescartar,
}: {
  avisos: TipoAviso[];
  onDescartar: (id: string) => void;
}) {
  if (avisos.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-[min(26rem,calc(100vw-2rem))]">
      {avisos.map((aviso) => (
        <div key={aviso.id} className="pointer-events-auto">
          <Aviso
            severidad={aviso.severidad}
            texto={aviso.texto}
            onDescartar={() => onDescartar(aviso.id)}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Crear el diálogo de confirmación**

Crear `src/components/feedback/DialogoConfirmacion.tsx`:

```tsx
"use client";
import { useEffect, useRef } from "react";
import type { AccionConfirmacion, OpcionesConfirmacion } from "@/lib/feedback/tipos";

const tonos: Record<NonNullable<AccionConfirmacion["tono"]>, string> = {
  primario: "bg-deep text-white hover:bg-deep-2 focus-visible:ring-deep-2/25",
  peligro: "border border-red-500/45 bg-white text-red-800 hover:bg-red-50 focus-visible:ring-red-500/25",
  neutro: "border border-line-2 bg-surface text-ink-2 hover:border-line focus-visible:ring-gold/20",
};

export function DialogoConfirmacion({
  opciones, onResponder,
}: {
  opciones: OpcionesConfirmacion | null;
  onResponder: (clave: string) => void;
}) {
  const referencia = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (opciones && !dialogo.open) dialogo.showModal();
    if (!opciones && dialogo.open) dialogo.close();
  }, [opciones]);

  if (!opciones) return null;

  const motivo = opciones.acciones.find((accion) => accion.deshabilitada)?.deshabilitada;

  return (
    <dialog
      ref={referencia}
      aria-labelledby="titulo-confirmacion"
      // Escape y clic en el fondo resuelven «cancelar»: la salida segura es
      // siempre la que no destruye trabajo.
      onCancel={(evento) => { evento.preventDefault(); onResponder("cancelar"); }}
      onClick={(evento) => { if (evento.target === referencia.current) onResponder("cancelar"); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_60px_rgb(9_39_44/0.28)] backdrop:bg-deep/35 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-4">
        <h2 id="titulo-confirmacion" className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
          {opciones.titulo}
        </h2>
        <p className="mt-1.5 text-xs font-medium leading-5 text-muted">{opciones.mensaje}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {opciones.acciones.map((accion) => (
            <button
              key={accion.clave}
              type="button"
              disabled={Boolean(accion.deshabilitada)}
              onClick={() => onResponder(accion.clave)}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-45 ${tonos[accion.tono ?? "neutro"]}`}
            >
              {accion.etiqueta}
            </button>
          ))}
        </div>
        {motivo && (
          <p className="mt-2 text-right text-[10px] font-bold text-muted-2">{motivo}</p>
        )}
      </div>
    </dialog>
  );
}
```

El motivo por el que una acción está desactivada se muestra como texto, no en un `title`: un `title` no se ve ni en táctil ni con teclado.

- [ ] **Step 4: Crear el contexto y sus hooks**

Crear `src/components/feedback/useFeedback.ts`:

```ts
"use client";
import { createContext, useContext } from "react";
import type { OpcionesConfirmacion, Severidad } from "@/lib/feedback/tipos";

export interface Feedback {
  mostrar: (severidad: Severidad, texto: string) => void;
  descartar: (id: string) => void;
  confirmar: (opciones: OpcionesConfirmacion) => Promise<string>;
}

export const ContextoFeedback = createContext<Feedback | null>(null);

export function useFeedback(): Feedback {
  const feedback = useContext(ContextoFeedback);
  if (!feedback) throw new Error("useFeedback se ha usado fuera de <ProveedorFeedback>.");
  return feedback;
}

/** Devuelve una función estable: puede ir en un array de dependencias. */
export function useAvisos() {
  return useFeedback().mostrar;
}

/** Devuelve una función estable. */
export function useConfirmar() {
  return useFeedback().confirmar;
}
```

- [ ] **Step 5: Crear el proveedor**

Crear `src/components/feedback/ProveedorFeedback.tsx`. Los temporizadores viven en un ref para que las tres funciones expuestas sean estables:

```tsx
"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { agregarAviso, avisoDuplicado, descartarAviso } from "@/lib/feedback/avisos";
import { DURACION_AVISO, type Aviso, type OpcionesConfirmacion, type Severidad } from "@/lib/feedback/tipos";
import { ContextoFeedback, type Feedback } from "@/components/feedback/useFeedback";
import { PilaAvisos } from "@/components/feedback/PilaAvisos";
import { DialogoConfirmacion } from "@/components/feedback/DialogoConfirmacion";

export function ProveedorFeedback({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [opcionesDialogo, setOpcionesDialogo] = useState<OpcionesConfirmacion | null>(null);
  const temporizadores = useRef(new Map<string, number>());
  const resolver = useRef<((clave: string) => void) | null>(null);

  const descartar = useCallback((id: string) => {
    const pendiente = temporizadores.current.get(id);
    if (pendiente !== undefined) {
      window.clearTimeout(pendiente);
      temporizadores.current.delete(id);
    }
    setAvisos((pila) => descartarAviso(pila, id));
  }, []);

  const programarDescarte = useCallback((id: string, severidad: Severidad) => {
    const duracion = DURACION_AVISO[severidad];
    if (duracion === null) return;
    const anterior = temporizadores.current.get(id);
    if (anterior !== undefined) window.clearTimeout(anterior);
    temporizadores.current.set(id, window.setTimeout(() => descartar(id), duracion));
  }, [descartar]);

  const mostrar = useCallback((severidad: Severidad, texto: string) => {
    setAvisos((pila) => {
      // Repetir un mensaje no lo apila: le devuelve su tiempo completo.
      const yaEsta = avisoDuplicado(pila, severidad, texto);
      const id = yaEsta?.id ?? crypto.randomUUID();
      programarDescarte(id, severidad);
      return yaEsta ? pila : agregarAviso(pila, { id, severidad, texto });
    });
  }, [programarDescarte]);

  const confirmar = useCallback((opciones: OpcionesConfirmacion) => (
    new Promise<string>((resuelve) => {
      resolver.current = resuelve;
      setOpcionesDialogo(opciones);
    })
  ), []);

  const responder = useCallback((clave: string) => {
    setOpcionesDialogo(null);
    const pendiente = resolver.current;
    resolver.current = null;
    pendiente?.(clave);
  }, []);

  useEffect(() => {
    const pendientes = temporizadores.current;
    return () => {
      for (const id of pendientes.values()) window.clearTimeout(id);
      pendientes.clear();
    };
  }, []);

  const valor = useMemo<Feedback>(
    () => ({ mostrar, descartar, confirmar }),
    [confirmar, descartar, mostrar],
  );

  return (
    <ContextoFeedback.Provider value={valor}>
      {children}
      <PilaAvisos avisos={avisos} onDescartar={descartar} />
      <DialogoConfirmacion opciones={opcionesDialogo} onResponder={responder} />
    </ContextoFeedback.Provider>
  );
}
```

`programarDescarte` se llama dentro del actualizador de `setAvisos`. Eso es deliberado —necesita saber si el aviso ya existía para reutilizar su id—, pero significa que en modo estricto puede ejecutarse dos veces; por eso limpia siempre el temporizador anterior antes de crear el nuevo, y repetirlo es inofensivo.

- [ ] **Step 6: Enganchar el proveedor en el layout**

Modificar `src/app/layout.tsx`: importar `ProveedorFeedback` y envolver `AppShell`:

```tsx
      <body className="min-h-full font-sans">
        <ProveedorFeedback>
          <AppShell>{children}</AppShell>
        </ProveedorFeedback>
      </body>
```

- [ ] **Step 7: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde. Nada consume todavía el proveedor: esta tarea solo lo pone en su sitio.

- [ ] **Step 8: Commit**

```bash
git add src/components/feedback src/app/layout.tsx
git commit -m "feat: proveedor de feedback con avisos apilados y diálogo propio"
```

---

### Task 3: El workspace adopta los avisos y el diálogo

**Files:**
- Modify: `src/lib/workspace/estado.ts`
- Modify: `src/lib/workspace/__tests__/estado.test.ts`
- Modify: `src/components/workspace/useWorkspace.ts`
- Modify: `src/components/workspace/useAvisoSalida.ts`
- Modify: `src/components/workspace/Workspace.tsx`

**Interfaces:**
- Consumes: `useAvisos()`, `useConfirmar()` (Task 2).
- Produces:
  ```ts
  // useAvisoSalida.ts — nueva firma
  export function useAvisoSalida(opciones: {
    activo: boolean;
    /** Resuelve true si se puede abandonar la página. */
    confirmarSalida: () => Promise<boolean>;
  }): void;
  ```

- [ ] **Step 1: Sacar `aviso` del reducer**

En `src/lib/workspace/estado.ts`:

- Borrar `aviso: string | null` de `EstadoWorkspace` y de `estadoInicial`.
- Borrar la acción `AVISO_MOSTRADO` y su `case`.
- Quitar el campo `aviso` de los payloads de `ELEMENTO_ANADIDO`, `RPS_APLICADO` y `GUARDADO_OK`, y sus asignaciones en los `case`.
- `VALIDACION_INTENTADA` pierde su payload: pasa a `{ tipo: "VALIDACION_INTENTADA" }` y su `case` a `return { ...estado, validacionIntentada: true };`.
- En el `case "PEDIDO_CAMBIADO"` y en `case "REGISTRO_SELECCIONADO"`, borrar `aviso: null`.

- [ ] **Step 2: Ajustar los tests del reducer**

En `src/lib/workspace/__tests__/estado.test.ts`, quitar `aviso` de los objetos esperados y de los payloads, y borrar el test que comprobaba que `VALIDACION_INTENTADA` respetaba el aviso previo — ya no hay aviso en el estado. El resto de aserciones de estado completo se mantienen.

- [ ] **Step 3: Ejecutar los tests del reducer**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/estado.test.ts`
Expected: PASS. Anota el número de tests resultante en el informe.

- [ ] **Step 4: Cablear `useWorkspace` a los avisos**

En `src/components/workspace/useWorkspace.ts`, añadir `const avisar = useAvisos();` y `const confirmar = useConfirmar();`, y sustituir cada despacho de aviso por una llamada con su severidad. El reparto, con los textos **sin cambiar**:

| Texto | Severidad |
|---|---|
| `Error al guardar: ${detalle}` | `error` |
| `Error de red al guardar` | `error` |
| `Error al generar PDF: ${mensaje}` | `error` |
| `Error de red al generar PDF` | `error` |
| `Error de red al generar la vista previa del PDF.` | `error` |
| `El navegador ha bloqueado la vista previa. Permite ventanas emergentes para esta aplicación.` | `error` |
| `${nombreElementoPedido(...)} guardado dentro del pedido.` | `exito` |
| `PDF archivado en ESCÁNER/PLANTEAMIENTOS y OFICINA TÉCNICA/${anio}.` (+ sufijo de omitidos) | `exito` |
| `PDF descargado (${nombre})...` | `exito` |
| `Introduce primero el número de pedido.` | `info` |
| `Selecciona o añade un elemento antes de guardar.` | `info` |
| `El pedido todavía no contiene ningún elemento válido para generar el PDF.` | `info` |
| `Revisa los campos marcados. ${mensaje}` | `info` |
| `${nombreElementoPedido(...)} añadido al pedido. Completa sus datos y guárdalo.` | `info` |
| `Línea ${n} de RPS aplicada. Todos los campos siguen siendo editables.` | `info` |
| `Vista previa abierta: ${nombre}. No se ha archivado todavía.` (+ sufijo de omitidos) | `info` |

`validarYEnfocar` pasa a despachar `{ tipo: "VALIDACION_INTENTADA" }` y, si hay error, llamar a `avisar("info", ...)`.

- [ ] **Step 5: Sustituir los dos `window.confirm` del workspace**

Añadir a `useWorkspace.ts` un ayudante único, porque los dos casos solo difieren en el mensaje:

```ts
  /** Devuelve true si se puede continuar descartando o guardando el borrador. */
  const confirmarDescarte = useCallback(async (mensaje: string): Promise<boolean> => {
    const primerError = erroresActuales[0]?.mensaje;
    const clave = await confirmar({
      titulo: "Cambios sin guardar",
      mensaje,
      acciones: [
        {
          clave: "guardar",
          etiqueta: "Guardar y continuar",
          tono: "primario",
          deshabilitada: primerError
            ? `No se puede guardar todavía: ${primerError}`
            : undefined,
        },
        { clave: "descartar", etiqueta: "Descartar cambios", tono: "peligro" },
        { clave: "cancelar", etiqueta: "Cancelar", tono: "neutro" },
      ],
    });
    if (clave === "guardar") return Boolean(await doGuardar());
    return clave === "descartar";
  }, [confirmar, doGuardar, erroresActuales]);
```

`puedeCambiarElemento()` pasa a ser asíncrona:

```ts
  const puedeCambiarElemento = useCallback(async (): Promise<boolean> => (
    !hayCambiosSinGuardar
    || confirmarDescarte("El elemento actual todavía no está guardado. Puedes guardarlo antes de continuar.")
  ), [confirmarDescarte, hayCambiosSinGuardar]);
```

Ojo: `!hayCambiosSinGuardar || promesa` devuelve `true` o la promesa, y el tipo declarado `Promise<boolean>` los unifica. Escríbelo con un `if` explícito si el lint se queja.

`cambiarNumeroPedido`, `seleccionarRegistro`, `nuevoElemento` y el `onAplicar` del panel de RPS pasan a `async` y usan `await`. En `cambiarNumeroPedido`, el mensaje es `"Vas a cambiar de pedido y este elemento tiene cambios sin guardar."`.

- [ ] **Step 6: Reescribir `useAvisoSalida`**

Sustituir el contenido de `src/components/workspace/useAvisoSalida.ts`:

```ts
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Avisa antes de abandonar la página con cambios sin guardar.
 *
 * El de recargar o cerrar la pestaña sigue siendo el cuadro nativo: los
 * navegadores no permiten otra cosa. El de los enlaces internos sí es propio,
 * y por eso cancela siempre la navegación y navega por código después de que
 * el usuario responda.
 */
export function useAvisoSalida({
  activo, confirmarSalida,
}: {
  activo: boolean;
  confirmarSalida: () => Promise<boolean>;
}) {
  const router = useRouter();

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
      event.preventDefault();
      event.stopPropagation();
      // Solo la parte interna de la URL. Nunca el href crudo: la documentación
      // de Next avisa de que router.push ejecuta las URL «javascript:».
      const ruta = `${destino.pathname}${destino.search}${destino.hash}`;
      void confirmarSalida().then((puedeSalir) => {
        if (puedeSalir) router.push(ruta);
      });
    };
    window.addEventListener("beforeunload", antesDeSalir);
    document.addEventListener("click", interceptarEnlace, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeSalir);
      document.removeEventListener("click", interceptarEnlace, true);
    };
  }, [activo, confirmarSalida, router]);
}
```

Y en `useWorkspace.ts`:

```ts
  const confirmarSalida = useCallback(
    () => confirmarDescarte("Vas a salir de esta página y el elemento tiene cambios sin guardar."),
    [confirmarDescarte],
  );
  useAvisoSalida({ activo: hayCambiosSinGuardar, confirmarSalida });
```

- [ ] **Step 7: Quitar el párrafo de aviso del render**

En `src/components/workspace/Workspace.tsx`, borrar el bloque `{aviso && (<p role="status" …>{aviso}</p>)}` y la lectura de `aviso` del estado. Los mensajes salen ahora por la pila flotante.

- [ ] **Step 8: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde. Vigila los avisos de `react-hooks/exhaustive-deps`: al volver asíncronas varias funciones es fácil perder una dependencia. Arregla la causa, nunca silencies la regla.

- [ ] **Step 9: Commit**

```bash
git add src/lib/workspace src/components/workspace
git commit -m "feat: el workspace usa avisos tipados y diálogo propio"
```

---

### Task 4: Validación al salir del campo

**Files:**
- Modify: `src/lib/workspace/estado.ts`
- Modify: `src/lib/workspace/selectores.ts`
- Modify: `src/lib/workspace/__tests__/estado.test.ts`
- Modify: `src/lib/workspace/__tests__/selectores.test.ts`
- Modify: `src/components/workspace/campos.tsx`
- Modify: `src/components/workspace/FormularioLona.tsx`
- Modify: `src/components/workspace/FormularioBaqueton.tsx`
- Modify: `src/components/workspace/useWorkspace.ts`
- Modify: `src/components/workspace/Workspace.tsx`

**Interfaces:**
- Produces:
  ```ts
  // estado.ts
  camposTocados: string[];                       // en EstadoWorkspace
  | { tipo: "CAMPO_TOCADO"; campo: string }      // en AccionWorkspace
  // selectores.ts
  export function erroresVisibles(
    errores: ErrorPlanteamiento[],
    validacionIntentada: boolean,
    camposTocados: string[],
  ): Record<string, string>;
  ```

- [ ] **Step 1: Escribir los tests que fallan**

Añadir a `src/lib/workspace/__tests__/selectores.test.ts`:

```ts
describe("erroresVisibles con campos tocados", () => {
  const errores = [
    { campo: "largo", mensaje: "Introduce el largo del remolque." },
    { campo: "ancho", mensaje: "Introduce el ancho del remolque." },
  ];

  it("no muestra nada sin validar y sin campos tocados", () => {
    expect(erroresVisibles(errores, false, [])).toEqual({});
  });

  it("muestra solo el error de los campos que se han tocado", () => {
    expect(erroresVisibles(errores, false, ["largo"])).toEqual({
      largo: "Introduce el largo del remolque.",
    });
  });

  it("al intentar validar muestra todos, tocados o no", () => {
    expect(Object.keys(erroresVisibles(errores, true, []))).toEqual(["largo", "ancho"]);
  });
});
```

Añadir a `src/lib/workspace/__tests__/estado.test.ts`:

```ts
describe("CAMPO_TOCADO", () => {
  it("acumula campos sin repetirlos", () => {
    const uno = reducirWorkspace(conPedidoAbierto(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    const dos = reducirWorkspace(uno, { tipo: "CAMPO_TOCADO", campo: "ancho" });
    const repetido = reducirWorkspace(dos, { tipo: "CAMPO_TOCADO", campo: "largo" });
    expect(repetido.camposTocados).toEqual(["largo", "ancho"]);
  });

  it("devuelve el mismo estado si el campo ya estaba", () => {
    const uno = reducirWorkspace(conPedidoAbierto(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    expect(reducirWorkspace(uno, { tipo: "CAMPO_TOCADO", campo: "largo" })).toBe(uno);
  });

  it("se limpia al cambiar de pedido y al seleccionar otro registro", () => {
    const tocado = reducirWorkspace(conPedidoAbierto(), { tipo: "CAMPO_TOCADO", campo: "largo" });
    expect(reducirWorkspace(tocado, { tipo: "PEDIDO_CAMBIADO", valor: "AR2604000" }).camposTocados).toEqual([]);
    expect(reducirWorkspace(tocado, {
      tipo: "REGISTRO_SELECCIONADO", registro: registro("a", "10"),
    }).camposTocados).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/`
Expected: FAIL — `erroresVisibles` acepta 2 argumentos, y `CAMPO_TOCADO` no existe en la unión.

- [ ] **Step 3: Implementar en el reducer y el selector**

En `src/lib/workspace/estado.ts`: añadir `camposTocados: string[]` a `EstadoWorkspace`, inicializado a `[]` en `estadoInicial`; añadir la acción y su `case`:

```ts
    case "CAMPO_TOCADO":
      return estado.camposTocados.includes(accion.campo)
        ? estado
        : { ...estado, camposTocados: [...estado.camposTocados, accion.campo] };
```

Añadir `camposTocados: []` a las mismas ramas donde hoy se pone `validacionIntentada: false`: `PEDIDO_CAMBIADO` (rama de pedido distinto), `REGISTRO_SELECCIONADO`, `ELEMENTO_ANADIDO`, `RPS_APLICADO` y `GUARDADO_OK`.

En `src/lib/workspace/selectores.ts`:

```ts
/** Errores indexados por campo: los de campos ya visitados, y todos al validar. */
export function erroresVisibles(
  errores: ErrorPlanteamiento[],
  validacionIntentada: boolean,
  camposTocados: string[],
): Record<string, string> {
  const visibles = validacionIntentada
    ? errores
    : errores.filter((error) => camposTocados.includes(error.campo));
  return Object.fromEntries(visibles.map((error) => [error.campo, error.mensaje]));
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasan**

Run: `pnpm exec vitest run src/lib/workspace/__tests__/`
Expected: PASS.

- [ ] **Step 5: Cablear el blur por delegación**

Los campos ya llevan `data-campo`, así que no hace falta tocar cada uno: el `onBlur` de React usa `focusout`, que **sí** burbujea, y basta un handler en el contenedor del formulario.

Primero, comprobar en `src/components/workspace/campos.tsx` que **todos** los controles enfocables llevan `data-campo={props.name}`: `CampoNum` y `CampoTexto` ya lo tienen; revisar `CampoSelect` y cualquier otro control del fichero y añadirlo donde falte, en el elemento que recibe el foco.

Después, en `FormularioLona.tsx` y `FormularioBaqueton.tsx`, añadir la prop `onCampoTocado: (campo: string) => void` y envolver el contenido en el handler:

```tsx
    <div
      onBlur={(evento) => {
        const campo = (evento.target as HTMLElement).dataset.campo;
        if (campo) onCampoTocado(campo);
      }}
    >
      {/* contenido actual del formulario */}
    </div>
```

Si el formulario ya devuelve un elemento contenedor, pon el `onBlur` en él en vez de añadir otro `div`.

- [ ] **Step 6: Conectar el handler**

En `useWorkspace.ts`, exponer:

```ts
  const marcarCampoTocado = useCallback(
    (campo: string) => despachar({ tipo: "CAMPO_TOCADO", campo }),
    [],
  );
```

y añadirlo al objeto de retorno. Actualizar la llamada a `erroresVisibles(erroresActuales, validacionIntentada, camposTocados)`. En `Workspace.tsx`, pasar `onCampoTocado={ws.marcarCampoTocado}` a los dos formularios.

- [ ] **Step 7: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 8: Commit**

```bash
git add src/lib/workspace src/components/workspace
git commit -m "feat: los campos marcan su error al perder el foco"
```

---

### Task 5: Progreso real al generar el PDF

**Files:**
- Modify: `src/lib/pdf/orquestar-pdf.ts`
- Modify: `src/lib/pdf/__tests__/orquestar-pdf.test.ts`
- Modify: `src/components/workspace/useWorkspace.ts`
- Modify: `src/components/workspace/Workspace.tsx`, `src/components/workspace/PedidoActivo.tsx`

**Interfaces:**
- Produces:
  ```ts
  // orquestar-pdf.ts — DependenciasPdf gana:
  onProgreso?: (hecho: number, total: number) => void;
  // useWorkspace — en el objeto de retorno:
  progresoPdf: { hecho: number; total: number } | null;
  ```

- [ ] **Step 1: Escribir el test que falla**

Añadir a `src/lib/pdf/__tests__/orquestar-pdf.test.ts`:

```ts
  it("informa del progreso una vez por dibujo rasterizado", async () => {
    const { doble } = fetchFalso([
      registro("a", "10", lonaValida("10")),
      registro("b", "11", lonaValida("11")),
    ]);
    const pasos: Array<[number, number]> = [];
    const resultado = await orquestarPdf(opciones(), {
      ...deps(doble),
      onProgreso: (hecho, total) => pasos.push([hecho, total]),
    });
    expect(resultado.ok).toBe(true);
    expect(pasos).toEqual([[1, 2], [2, 2]]);
  });

  it("cuenta también el dibujo del elemento en edición", async () => {
    const { doble } = fetchFalso([registro("a", "10", lonaValida("10"))]);
    const pasos: Array<[number, number]> = [];
    await orquestarPdf(
      opciones({ archivar: false, editorActivo: true, input: lonaValida("11") }),
      { ...deps(doble), onProgreso: (hecho, total) => pasos.push([hecho, total]) },
    );
    expect(pasos).toEqual([[1, 2], [2, 2]]);
  });
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm exec vitest run src/lib/pdf/__tests__/orquestar-pdf.test.ts`
Expected: FAIL — `onProgreso` no existe en `DependenciasPdf`.

- [ ] **Step 3: Implementar**

En `src/lib/pdf/orquestar-pdf.ts`, añadir a `DependenciasPdf`:

```ts
  /** Se llama una vez por dibujo rasterizado, para poder mostrar el avance. */
  onProgreso?: (hecho: number, total: number) => void;
```

Y en el cuerpo, sustituir el bucle de snapshots por una versión que cuente. El total incluye el dibujo del elemento en edición cuando toca añadirlo:

```ts
  const necesitaDibujoActual = editorActivo
    && !paginas.some((r) => r.id === (idGuardado ?? idBorrador));
  const total = paginas.length + (necesitaDibujoActual ? 1 : 0);
  let hechos = 0;
  const avanzar = () => deps.onProgreso?.(++hechos, total);

  const snapshots: Record<string, string | null> = {};
  for (const r of paginas) {
    snapshots[r.id] = r.snapshotSvg ? await deps.rasterizar(r.snapshotSvg) : null;
    avanzar();
  }
  if (necesitaDibujoActual) {
    snapshots[idGuardado ?? idBorrador] = await deps.rasterizar(opciones.svgActual ?? "");
    avanzar();
  }
```

Comprueba que esto conserva el comportamiento anterior: antes la condición era `if (editorActivo) { const id = idGuardado ?? idBorrador; if (!(id in snapshots)) … }`. `necesitaDibujoActual` dice lo mismo, calculado antes del bucle.

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/pdf/__tests__/orquestar-pdf.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Mostrar el avance**

En `useWorkspace.ts`, añadir estado local (es presentación efímera, no va al reducer):

```ts
  const [progresoPdf, setProgresoPdf] = useState<{ hecho: number; total: number } | null>(null);
```

Pasar `onProgreso: (hecho, total) => setProgresoPdf({ hecho, total })` en las dependencias de `orquestarPdf`, y `setProgresoPdf(null)` en el `finally` de `previsualizarPdf` y `generarPdf`. Devolver `progresoPdf`.

En `PedidoActivo.tsx`, los botones de vista previa y de generar muestran, cuando `progresoPdf` no es nulo y su acción está en curso:
`Preparando dibujo ${progresoPdf.hecho} de ${progresoPdf.total}…`, y cuando es nulo pero la acción sigue en curso, el texto que ya tienen hoy. Añade la prop `progresoPdf` a `PedidoActivo` y pásala desde `Workspace.tsx`.

- [ ] **Step 6: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pdf src/components/workspace
git commit -m "feat: el PDF informa de su avance al preparar los dibujos"
```

---

### Task 6: RPS, historial y parámetros adoptan el sistema

**Files:**
- Modify: `src/components/workspace/ImportadorRps.tsx`
- Modify: `src/app/historial/page.tsx`
- Modify: `src/app/parametros/page.tsx`

**Interfaces:**
- Consumes: `<Aviso>` (Task 2), `useAvisos()` (Task 2).

- [ ] **Step 1: Unificar el aspecto de los estados de RPS**

En `src/components/workspace/ImportadorRps.tsx`, sustituir el bloque de `estado === "error" || estado === "no-encontrado"` (hoy una caja dorada para ambos) por dos usos de `<Aviso>` con la severidad que le corresponde a cada uno. «No encontrado» no es un fallo: es información. El botón Reintentar se conserva y va como `children`:

```tsx
  if (estado === "error" || estado === "no-encontrado") {
    const reintentar = (
      <button
        type="button"
        onClick={onReintentar}
        className="shrink-0 rounded-lg border border-current/35 bg-surface px-2.5 py-1 text-[11px] font-extrabold transition hover:border-current focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20"
      >
        Reintentar
      </button>
    );
    return estado === "no-encontrado"
      ? (
        <Aviso severidad="info" texto="RPS no encontró este pedido; puedes seguir manualmente.">
          {reintentar}
        </Aviso>
      )
      : (
        <Aviso severidad="error" texto={error ?? "No se pudo consultar RPS."}>
          {reintentar}
        </Aviso>
      );
  }
```

El estado `buscando` **no cambia**: es un indicador de progreso, no un mensaje.

- [ ] **Step 2: Unificar el error del historial**

En `src/app/historial/page.tsx`, la celda que hoy imprime `"No se pudo cargar el historial"` pasa a renderizar `<Aviso severidad="error" texto="No se pudo cargar el historial." />`. Los textos `"Cargando…"` y `"Sin resultados"` se quedan como están: son estados de la tabla, no avisos.

- [ ] **Step 3: Migrar parámetros**

En `src/app/parametros/page.tsx`, borrar el `useState` de `aviso` y el `<p role=…>` del final, y usar el sistema compartido:

```tsx
  const avisar = useAvisos();
```

con este reparto, conservando los textos:

| Texto | Severidad |
|---|---|
| `No se pudieron cargar los parámetros.` | `error` |
| `No se guardó: ${detalle}` | `error` |
| `Error de red al guardar.` | `error` |
| `Parámetros guardados.` | `exito` |

- [ ] **Step 4: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 5: Comprobar que no queda feedback ad-hoc**

Run: `grep -rn 'role="status"\|role="alert"\|window\.confirm' src --include=*.tsx --include=*.ts`
Expected: exactamente una línea — el indicador `role="status"` de «Consultando el pedido en RPS…» en `ImportadorRps.tsx`, que es un estado de progreso y se queda. **Ningún** `window.confirm`. El `role` de `Aviso.tsx` no aparece porque es una expresión (`role={…}`), no un literal. Cualquier otra línea es feedback ad-hoc sin migrar.

- [ ] **Step 6: Commit**

```bash
git add src/components/workspace/ImportadorRps.tsx src/app/historial/page.tsx src/app/parametros/page.tsx
git commit -m "feat: RPS, historial y parámetros usan el sistema de avisos"
```

---

## Recorrido manual (lo hace Iván)

Sin jsdom no hay forma de testear el proveedor, el diálogo, la pila, el blur ni la interceptación de enlaces. Estos seis puntos son la única evidencia de extremo a extremo:

1. Con un elemento completo y cambios sin guardar, pulsar «Historial» en el menú: aparece el diálogo con «Guardar y continuar» activo. Cancelar no navega; descartar navega perdiendo los cambios; guardar navega conservándolos.
2. Lo mismo con un elemento **incompleto**: «Guardar y continuar» sale desactivado y con el motivo debajo.
3. Cambiar el número de pedido y cambiar de elemento con cambios sin guardar: mismo diálogo, mensaje distinto.
4. Provocar un error (por ejemplo parando el servidor y pulsando Guardar): el aviso se queda hasta cerrarlo. Guardar bien: el aviso verde se va solo a los 6 s. Pulsar Guardar dos veces seguidas: no se apilan dos avisos iguales.
5. Generar el PDF de un pedido con varios remolques: el botón cuenta «Preparando dibujo N de M…».
6. Tabular por un campo obligatorio vacío y salir: se pone rojo ahí mismo. Cambiar de pedido: se limpia.
