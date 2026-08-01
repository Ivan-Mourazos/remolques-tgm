# Chaflán con aristas curvadas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un TIPO 04 con las aristas del chaflán curvadas dé el contorno correcto sin corregirlo a mano, y que su dibujo tenga la profundidad real.

**Architecture:** Un módulo puro `src/lib/geometry/chaflan.ts` resuelve la geometría de la esquina —pata, tangentes y acotado de radios— y de él beben tanto `perfil.ts` como `contorno.ts`, que hoy duplicarían la cuenta. El campo `chaflan` pasa a significar la cara entre vértices virtuales, que es lo que acota el CAD.

**Tech Stack:** TypeScript 5, Vitest 4 (`environment: "node"`), React 19 para el formulario, @react-pdf/renderer para la hoja.

## Global Constraints

- Rama de trabajo: `feature/hoja-taller-dibujo`, encima del bloque 3a. No se crea rama nueva.
- **Sin dependencias nuevas.** Español en código, nombres, comentarios y textos de UI.
- **`chaflan` pasa a ser la cara entre los dos vértices virtuales**, no la pata. Es lo que el CAD acota y lo único independiente de los radios.
- **`cara` es siempre la efectiva**, recalculada desde la pata acotada. Nunca se usa el `chaflan` crudo en el contorno ni en el perfil, o saldría más largo que la pieza.
- Los ángulos, en radianes: el giro de cada esquina es `Math.PI / 4`.
- **Sin migración de datos.** Iván confirma que no ha usado la aplicación para planteamientos reales.
- Tras cada tarea: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`.
- Commits en español al estilo del repo (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- No tocar el TIPO 03 ni su duplicación de acotado de radios.

---

### Task 1: La geometría de la esquina

El cimiento. Un solo sitio que resuelve pata, tangentes y acotado, para que perfil y contorno no lo calculen cada uno por su cuenta.

**Files:**
- Create: `src/lib/geometry/chaflan.ts`
- Create: `src/lib/geometry/__tests__/chaflan.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  ```ts
  export interface EsquinaChaflan {
    pata: number;
    cara: number;
    radioAbajo: number;
    radioArriba: number;
    tangenteAbajo: number;
    tangenteArriba: number;
    caraRecta: number;
  }
  export const GIRO_CHAFLAN: number;   // Math.PI / 4
  export function esquinaChaflan(opciones: {
    ancho: number; alto: number; chaflan: number;
    radioAbajo?: number; radioArriba?: number;
  }): EsquinaChaflan | null;
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/geometry/__tests__/chaflan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { esquinaChaflan, GIRO_CHAFLAN } from "@/lib/geometry/chaflan";

/** La pieza real de Iván: pedido AR.26.03714, sobre la lona hecha. */
const PIEZA = { ancho: 126, alto: 90, chaflan: 13.2, radioAbajo: 7, radioArriba: 7.5 };

describe("esquinaChaflan", () => {
  it("deriva la pata dividiendo la cara entre raíz de dos", () => {
    const e = esquinaChaflan(PIEZA)!;
    expect(e.pata).toBeCloseTo(9.3338, 3);
    expect(e.cara).toBeCloseTo(13.2, 3);
  });

  it("calcula la tangente de cada radio sobre las rectas que une", () => {
    const e = esquinaChaflan(PIEZA)!;
    expect(e.tangenteAbajo).toBeCloseTo(2.8995, 3);
    expect(e.tangenteArriba).toBeCloseTo(3.1066, 3);
  });

  it("deja el tramo recto que queda del chaflán tras los dos arcos", () => {
    const e = esquinaChaflan(PIEZA)!;
    expect(e.caraRecta).toBeCloseTo(13.2 - 2.8995 - 3.1066, 3);
  });

  it("con radios a cero no recorta nada: la cara entera es recta", () => {
    const e = esquinaChaflan({ ancho: 126, alto: 90, chaflan: 13.2 })!;
    expect(e.tangenteAbajo).toBe(0);
    expect(e.tangenteArriba).toBe(0);
    expect(e.caraRecta).toBeCloseTo(13.2, 5);
  });

  it("no devuelve esquina sin chaflán", () => {
    expect(esquinaChaflan({ ancho: 126, alto: 90, chaflan: 0 })).toBeNull();
    expect(esquinaChaflan({ ancho: 126, alto: 90, chaflan: -5 })).toBeNull();
  });

  it("acota la pata al alto y a medio ancho, y recalcula la cara desde ella", () => {
    // Una cara enorme no puede producir una pata que no cabe en la pieza:
    // el contorno saldría más largo que el remolque.
    const e = esquinaChaflan({ ancho: 20, alto: 90, chaflan: 400 })!;
    expect(e.pata).toBeCloseTo(10, 5);
    expect(e.cara).toBeCloseTo(10 * Math.SQRT2, 5);
  });

  it("acota el radio de abajo para que su tangente quepa en la pared", () => {
    const e = esquinaChaflan({ ancho: 400, alto: 20, chaflan: 14.14, radioAbajo: 999 })!;
    expect(e.tangenteAbajo).toBeLessThanOrEqual(20 - e.pata + 1e-9);
  });

  it("acota el radio de arriba para que su tangente quepa en el techo", () => {
    const e = esquinaChaflan({ ancho: 30, alto: 400, chaflan: 14.14, radioArriba: 999 })!;
    expect(e.tangenteArriba).toBeLessThanOrEqual(30 / 2 - e.pata + 1e-9);
  });

  it("reduce los dos radios a la vez si entre ambos se comen la cara", () => {
    const e = esquinaChaflan({ ancho: 400, alto: 400, chaflan: 10, radioAbajo: 50, radioArriba: 50 })!;
    expect(e.tangenteAbajo + e.tangenteArriba).toBeLessThanOrEqual(e.cara + 1e-9);
    expect(e.caraRecta).toBeGreaterThanOrEqual(0);
    // Reducción proporcional: partiendo de radios iguales, siguen iguales.
    expect(e.radioAbajo).toBeCloseTo(e.radioArriba, 6);
  });

  it("nunca produce tramo recto negativo ni valores no finitos", () => {
    for (const chaflan of [0.1, 1, 13.2, 50]) {
      for (const radio of [0, 1, 20, 500]) {
        const e = esquinaChaflan({ ancho: 126, alto: 90, chaflan, radioAbajo: radio, radioArriba: radio });
        if (!e) continue;
        expect(Number.isFinite(e.pata)).toBe(true);
        expect(Number.isFinite(e.caraRecta)).toBe(true);
        expect(e.caraRecta).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it("el giro de cada esquina es de 45 grados", () => {
    expect(GIRO_CHAFLAN).toBeCloseTo(Math.PI / 4, 10);
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/chaflan.test.ts`
Expected: FAIL — `Cannot find package '@/lib/geometry/chaflan'`.

- [ ] **Step 3: Escribir la implementación**

Crear `src/lib/geometry/chaflan.ts`:

```ts
/**
 * La esquina achaflanada del TIPO 04, con las dos aristas curvadas.
 *
 * `chaflan` es la cara entre los dos **vértices virtuales**: donde se
 * cortarían las rectas si no hubiera curvas. Es lo que acota el CAD de oficina
 * técnica y lo único independiente de los radios — la cuerda entre tangencias
 * cambia al cambiar un radio, así que no sirve como parámetro.
 *
 * De aquí beben `perfil.ts` y `contorno.ts`, para no repetir la cuenta en dos
 * sitios como le pasa hoy al TIPO 03.
 */

/** El chaflán es simétrico: las dos esquinas giran 45°. */
export const GIRO_CHAFLAN = Math.PI / 4;

const TANGENTE_MEDIA = Math.tan(GIRO_CHAFLAN / 2);

export interface EsquinaChaflan {
  /** Cuánto baja por la pared, igual a cuánto entra por el techo. */
  pata: number;
  /** Cara entre vértices virtuales, ya efectiva tras acotar la pata. */
  cara: number;
  radioAbajo: number;
  radioArriba: number;
  /** Lo que cada arco consume sobre las rectas que une. */
  tangenteAbajo: number;
  tangenteArriba: number;
  /** Tramo recto que queda del chaflán entre los dos arcos. */
  caraRecta: number;
}

export function esquinaChaflan({
  ancho, alto, chaflan, radioAbajo = 0, radioArriba = 0,
}: {
  ancho: number; alto: number; chaflan: number;
  radioAbajo?: number; radioArriba?: number;
}): EsquinaChaflan | null {
  if (!(chaflan > 0) || !(ancho > 0) || !(alto > 0)) return null;

  // La pata se acota a la pieza y la cara se recalcula desde ella: usar el
  // chaflán crudo daría un contorno más largo que el remolque.
  const pata = Math.min(chaflan / Math.SQRT2, ancho / 2, alto);
  const cara = pata * Math.SQRT2;

  // Cada arco necesita su tangente en la recta que toca.
  let rAbajo = Math.max(radioAbajo, 0);
  if (TANGENTE_MEDIA > 0) rAbajo = Math.min(rAbajo, (alto - pata) / TANGENTE_MEDIA);
  let rArriba = Math.max(radioArriba, 0);
  if (TANGENTE_MEDIA > 0) rArriba = Math.min(rArriba, (ancho / 2 - pata) / TANGENTE_MEDIA);

  // Y entre los dos no pueden comerse la cara del chaflán.
  const ocupado = (rAbajo + rArriba) * TANGENTE_MEDIA;
  if (ocupado > cara && ocupado > 0) {
    const factor = cara / ocupado;
    rAbajo *= factor;
    rArriba *= factor;
  }

  const tangenteAbajo = rAbajo * TANGENTE_MEDIA;
  const tangenteArriba = rArriba * TANGENTE_MEDIA;
  return {
    pata,
    cara,
    radioAbajo: rAbajo,
    radioArriba: rArriba,
    tangenteAbajo,
    tangenteArriba,
    caraRecta: Math.max(cara - tangenteAbajo - tangenteArriba, 0),
  };
}

/** Lo que una esquina redondeada recorta frente a la misma esquina viva. */
export function recorteEsquina(radio: number, tangente: number): number {
  return 2 * tangente - radio * GIRO_CHAFLAN;
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/chaflan.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 5: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 6: Commit**

```bash
git add src/lib/geometry/chaflan.ts src/lib/geometry/__tests__/chaflan.test.ts
git commit -m "feat: geometría de la esquina achaflanada con aristas curvadas"
```

---

### Task 2: El contorno del TIPO 04

Aquí está la prueba que manda: el número de la pieza real.

**Files:**
- Modify: `src/lib/geometry/contorno.ts`
- Modify: `src/lib/geometry/__tests__/contorno.test.ts`

**Interfaces:**
- Consumes: `esquinaChaflan`, `recorteEsquina`, `GIRO_CHAFLAN` (Task 1).
- Produces: `MedidasContorno` gana `radioChaflanAbajo?: number` y `radioChaflanArriba?: number`.

- [ ] **Step 1: Escribir el test que falla**

Añadir a `src/lib/geometry/__tests__/contorno.test.ts`:

```ts
describe("TIPO 04 con las aristas del chaflán curvadas", () => {
  /**
   * La pieza real: pedido AR.26.03714. Ancho 126 es la lona hecha (125 + 1 de
   * demasía), que es donde se desarrolla el contorno. Si este número se mueve,
   * el corte sale mal.
   */
  it("reproduce el contorno medido en el CAD", () => {
    expect(contornoCalculado("TIPO 04", {
      ancho: 126, alto: 90, chaflan: 13.2,
      radioChaflanAbajo: 7, radioChaflanArriba: 7.5,
    })).toBeCloseTo(293.81, 1);
  });

  it("sin radios da la fórmula del chaflán vivo", () => {
    const pata = 13.2 / Math.SQRT2;
    expect(contornoCalculado("TIPO 04", { ancho: 126, alto: 90, chaflan: 13.2 }))
      .toBeCloseTo(2 * (90 - pata) + 2 * 13.2 + (126 - 2 * pata), 6);
  });

  it("redondear las aristas acorta el contorno, nunca lo alarga", () => {
    const vivo = contornoCalculado("TIPO 04", { ancho: 126, alto: 90, chaflan: 13.2 })!;
    const curvo = contornoCalculado("TIPO 04", {
      ancho: 126, alto: 90, chaflan: 13.2, radioChaflanAbajo: 7, radioChaflanArriba: 7.5,
    })!;
    expect(curvo).toBeLessThan(vivo);
    // Y muy poco: el grueso del contorno lo pone el chaflán, no las curvas.
    expect(vivo - curvo).toBeLessThan(2);
  });

  it("sigue exigiendo el chaflán", () => {
    expect(contornoCalculado("TIPO 04", { ancho: 126, alto: 90 })).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/contorno.test.ts`
Expected: FAIL — el primer test da 285,5 en vez de 293,81, porque `chaflan` se sigue usando como pata.

- [ ] **Step 3: Escribir la implementación**

En `src/lib/geometry/contorno.ts`, añadir el import y los dos campos, y sustituir la rama del TIPO 04:

```ts
import { esquinaChaflan, recorteEsquina } from "@/lib/geometry/chaflan";
```

En `MedidasContorno`, junto a `chaflan`:

```ts
  /** Radio de la arista del chaflán contra la pared (TIPO 04); 0 = viva. */
  radioChaflanAbajo?: number;
  /** Radio de la arista del chaflán contra el techo (TIPO 04); 0 = viva. */
  radioChaflanArriba?: number;
```

Y la rama:

```ts
    case "TIPO 04": {
      // `chaflan` es la cara entre vértices virtuales, no la pata.
      const e = esquinaChaflan({
        ancho: w, alto: h, chaflan: m.chaflan ?? 0,
        radioAbajo: m.radioChaflanAbajo, radioArriba: m.radioChaflanArriba,
      });
      if (!e) return null;
      const recorte = recorteEsquina(e.radioAbajo, e.tangenteAbajo)
        + recorteEsquina(e.radioArriba, e.tangenteArriba);
      return 2 * (h - e.pata) + 2 * e.cara + (w - 2 * e.pata) - 2 * recorte;
    }
```

Actualizar también el comentario de `chaflan` en `MedidasContorno`, que hoy dice
«Chaflán real de las esquinas superiores», para que diga que es la cara entre
vértices virtuales.

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/contorno.test.ts`
Expected: PASS. Si algún test antiguo del TIPO 04 falla, es porque comprobaba la fórmula con `chaflan` como pata: hay que reescribirlo con el significado nuevo, no adaptarlo a medias.

- [ ] **Step 5: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 6: Commit**

```bash
git add src/lib/geometry
git commit -m "fix: el contorno del TIPO 04 usa la cara entre vértices y los radios"
```

---

### Task 3: El perfil dibuja los dos arcos

**Files:**
- Modify: `src/lib/geometry/perfil.ts`
- Modify: `src/lib/geometry/__tests__/perfil.test.ts`

**Interfaces:**
- Consumes: `esquinaChaflan`, `GIRO_CHAFLAN` (Task 1).
- Produces: `PerfilOpts` gana `radioChaflanAbajo?: number` y `radioChaflanArriba?: number`.

- [ ] **Step 1: Escribir el test que falla**

Añadir a `src/lib/geometry/__tests__/perfil.test.ts`:

```ts
describe("TIPO 04 con las aristas del chaflán curvadas", () => {
  const OPTS = {
    ancho: 126, alto: 90, altoDelante: 90, chaflan: 13.2,
    radioChaflanAbajo: 7, radioChaflanArriba: 7.5,
  };

  it("mantiene las bases y la altura del perfil", () => {
    const { puntos } = perfilForma("TIPO 04", OPTS);
    expect(puntos[0]).toEqual([0, 0]);
    expect(puntos.at(-1)).toEqual([126, 0]);
    expect(Math.max(...puntos.map(([, y]) => y))).toBeCloseTo(90, 6);
  });

  it("empieza a curvar donde la pared deja de ser recta", () => {
    const { puntos } = perfilForma("TIPO 04", OPTS);
    // pata 9,3338 + tangente de abajo 2,8995
    expect(puntos[1]).toEqual([0, expect.closeTo(90 - 9.3338 - 2.8995, 3)]);
  });

  it("deja los puntos de tangencia sobre la recta del chaflán", () => {
    // La recta del chaflán izquierdo pasa por el vértice virtual (0, alto−pata)
    // con pendiente 1: y = x + (alto − pata).
    const { puntos } = perfilForma("TIPO 04", OPTS);
    const pata = 13.2 / Math.SQRT2;
    const enLaRecta = puntos.filter(([x, y]) => Math.abs(y - (x + 90 - pata)) < 1e-6);
    // Las dos tangencias del chaflán izquierdo, y el tramo recto entre ellas.
    expect(enLaRecta.length).toBeGreaterThanOrEqual(2);
  });

  it("es simétrico respecto al centro", () => {
    const { puntos } = perfilForma("TIPO 04", OPTS);
    for (const [x, y] of puntos) {
      expect(puntos.some(([sx, sy]) => (
        Math.abs(sx - (126 - x)) < 1e-6 && Math.abs(sy - y) < 1e-6
      ))).toBe(true);
    }
  });

  it("con radios a cero da el chaflán vivo de seis puntos", () => {
    const { puntos } = perfilForma("TIPO 04", { ancho: 126, alto: 90, altoDelante: 90, chaflan: 13.2 });
    const pata = 13.2 / Math.SQRT2;
    expect(puntos).toHaveLength(6);
    expect(puntos[1][1]).toBeCloseTo(90 - pata, 6);
    expect(puntos[2][0]).toBeCloseTo(pata, 6);
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/perfil.test.ts`
Expected: FAIL — hoy el perfil usa `chaflan` como pata y no genera arcos.

- [ ] **Step 3: Escribir la implementación**

En `src/lib/geometry/perfil.ts`, añadir el import y los dos campos a `PerfilOpts`:

```ts
import { esquinaChaflan, GIRO_CHAFLAN } from "@/lib/geometry/chaflan";
```

```ts
  /** Radio de la arista del chaflán contra la pared (TIPO 04); 0 = viva. */
  radioChaflanAbajo?: number;
  /** Radio de la arista del chaflán contra el techo (TIPO 04); 0 = viva. */
  radioChaflanArriba?: number;
```

Y sustituir la rama del TIPO 04:

```ts
    case "TIPO 04": {
      // `chaflan` es la cara entre vértices virtuales, no la pata.
      const e = esquinaChaflan({
        ancho: w, alto: h, chaflan: opts.chaflan ?? 0,
        radioAbajo: opts.radioChaflanAbajo, radioArriba: opts.radioChaflanArriba,
      });
      if (!e) return { puntos: [[0, 0], [0, h], [w, h], [w, 0]], aristas: [1, 2] };
      if (e.radioAbajo === 0 && e.radioArriba === 0) {
        return {
          puntos: [[0, 0], [0, h - e.pata], [e.pata, h], [w - e.pata, h], [w, h - e.pata], [w, 0]],
          aristas: [1, 2, 3, 4],
        };
      }
      // Centros: el de abajo a `radioAbajo` de la pared, el de arriba a
      // `radioArriba` del techo. Las aristas van en las tangencias, no en los
      // vértices virtuales: los arcos son superficie lisa, igual que el TIPO 03.
      const yTangenteAbajo = h - e.pata - e.tangenteAbajo;
      const xTangenteArriba = e.pata + e.tangenteArriba;

      // Se construye solo el lado izquierdo, de la tangencia con la pared a la
      // tangencia con el techo, y el derecho sale de reflejarlo.
      const izquierda: Pt[] = [[0, yTangenteAbajo]];
      const aristasIzquierda: number[] = [0];
      // Arco de abajo: de 180° a 135°, girando 45°. Su primer punto ya está.
      izquierda.push(
        ...arco(e.radioAbajo, yTangenteAbajo, e.radioAbajo, Math.PI, Math.PI - GIRO_CHAFLAN, 5).slice(1),
      );
      aristasIzquierda.push(izquierda.length - 1);
      // Arco de arriba: de 135° a 90°. Su primer punto cierra el tramo recto.
      const inicioArcoArriba = izquierda.length;
      izquierda.push(
        ...arco(xTangenteArriba, h - e.radioArriba, e.radioArriba, Math.PI - GIRO_CHAFLAN, Math.PI / 2, 5),
      );
      aristasIzquierda.push(inicioArcoArriba, izquierda.length - 1);

      const derecha = [...izquierda].reverse().map(([x, y]) => [w - x, y] as Pt);
      const puntos: Pt[] = [[0, 0], ...izquierda, ...derecha, [w, 0]];
      // El punto i de la izquierda queda reflejado en 1 + L + (L − 1 − i).
      const L = izquierda.length;
      const aristas = [
        ...aristasIzquierda.map((i) => 1 + i),
        ...aristasIzquierda.map((i) => 1 + L + (L - 1 - i)).reverse(),
      ];
      return { puntos, aristas };
    }
```

El montaje es deliberadamente explícito: `[0,0]`, el lado izquierdo, su reflejo
en orden inverso y `[w,0]`. Así los índices de las aristas se calculan con una
fórmula comprobable en vez de con aritmética sobre un array que va mutando, que
es donde se cuelan los fallos.

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/perfil.test.ts`
Expected: PASS.

- [ ] **Step 5: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde. Los tests de `visibilidad` y `contorno` que usan TIPO 04 pueden necesitar ajuste por el cambio de significado; revisarlos, no silenciarlos.

- [ ] **Step 6: Commit**

```bash
git add src/lib/geometry
git commit -m "feat: el perfil del TIPO 04 dibuja las aristas curvadas del chaflán"
```

---

### Task 4: Los dos radios llegan desde el formulario

**Files:**
- Modify: `src/lib/calc/lona.ts`
- Modify: `src/components/workspace/entradas-vacias.ts`
- Modify: `src/components/workspace/FormularioLona.tsx`
- Modify: `src/components/workspace/Escena3D.tsx`
- Modify: `src/lib/pdf/datos-geometria.ts`

**Interfaces:**
- Consumes: `PerfilOpts` y `MedidasContorno` con sus dos campos nuevos (Tasks 2 y 3).
- Produces: `LonaInput` gana `radioChaflanAbajo?: number` y `radioChaflanArriba?: number`.

- [ ] **Step 1: Añadir los campos al modelo**

En `src/lib/calc/lona.ts`, junto a `chaflan`:

```ts
  /** Radio de la arista del chaflán contra la pared (TIPO 04); 0 = viva. */
  radioChaflanAbajo?: number;
  /** Radio de la arista del chaflán contra el techo (TIPO 04); 0 = viva. */
  radioChaflanArriba?: number;
```

Y actualizar el comentario de `chaflan` para que diga que es la cara entre
vértices virtuales, no la pata.

En `src/components/workspace/entradas-vacias.ts`, dentro de `emptyLona()`, junto a `chaflan: 0`:

```ts
    radioChaflanAbajo: 0, radioChaflanArriba: 0,
```

- [ ] **Step 2: Pasar los radios al cálculo del contorno sugerido**

En `src/components/workspace/FormularioLona.tsx`, la llamada a `contornoCalculado` recibe hoy `chaflan: input.chaflan`. Añadir:

```ts
    radioChaflanAbajo: input.radioChaflanAbajo,
    radioChaflanArriba: input.radioChaflanArriba,
```

- [ ] **Step 3: Añadir los dos campos, solo en TIPO 04**

Sustituir el bloque del TIPO 04 en `FormularioLona.tsx`:

```tsx
          {input.tipoPerfil === "TIPO 04" && (
            <>
              <CampoNum name="chaflan" error={errores.chaflan} label="Chaflán · entre vértices"
                value={input.chaflan ?? 0} onChange={(v) => set("chaflan", v)} />
              <CampoNum name="radioChaflanAbajo" label="Radio abajo"
                value={input.radioChaflanAbajo ?? 0} onChange={(v) => set("radioChaflanAbajo", v)} />
              <CampoNum name="radioChaflanArriba" label="Radio arriba"
                value={input.radioChaflanArriba ?? 0} onChange={(v) => set("radioChaflanArriba", v)} />
            </>
          )}
```

La etiqueta «Chaflán · entre vértices» es deliberada: el número que se mide es
el de los vértices virtuales, y confundirlo con la cuerda entre tangencias es
exactamente el error que provocó todo esto.

- [ ] **Step 4: Pasar los radios al dibujo**

En `src/components/workspace/Escena3D.tsx`, `Escena3DProps` gana:

```ts
  /** Radio de la arista del chaflán contra la pared (TIPO 04); 0 = viva. */
  radioChaflanAbajo?: number;
  /** Radio de la arista del chaflán contra el techo (TIPO 04); 0 = viva. */
  radioChaflanArriba?: number;
```

`OpcionesVista` gana los mismos dos campos; `calcularVista` los pasa a las dos
llamadas de `perfilForma` dentro de `opts()`; y el `base` del `useMemo` los toma
de `props`, añadiéndolos también al array de dependencias.

En `src/components/workspace/Workspace.tsx`, la `<Escena3D>` de lona pasa
`radioChaflanAbajo={lona.radioChaflanAbajo}` y `radioChaflanArriba={lona.radioChaflanArriba}`.

- [ ] **Step 5: Mostrarlos en la hoja**

En `src/lib/pdf/datos-geometria.ts`, la rama del TIPO 04:

```ts
    case "TIPO 04": {
      const lineas = [`CHAFLÁN ${fmt(input.chaflan)} CM`];
      if ((input.radioChaflanAbajo ?? 0) > 0 || (input.radioChaflanArriba ?? 0) > 0) {
        lineas.push(`RADIOS ${fmt(input.radioChaflanAbajo)} / ${fmt(input.radioChaflanArriba)} CM`);
      }
      return lineas;
    }
```

- [ ] **Step 6: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde, y ningún aviso nuevo de `react-hooks/exhaustive-deps`. Si aparece uno, es que los radios no entraron en las dependencias del `useMemo` de las vistas: arreglar la causa.

- [ ] **Step 7: Commit**

```bash
git add src/lib src/components
git commit -m "feat: los radios del chaflán llegan al cálculo, al dibujo y a la hoja"
```

---

### Task 5: Comprobación de extremo a extremo

**Esta tarea la ejecuta Iván.** Ningún test dice si el dibujo parece la pieza.

- [ ] **Step 1: Meter la pieza real**

Arrancar `pnpm dev`, abrir un planteamiento TIPO 04 con ancho 125, alto 90,
largo 200, chaflán **13,2**, radio abajo **7**, radio arriba **7,5**.

- [ ] **Step 2: Comprobar el contorno**

El contorno calculado que ofrece la aplicación debe ser **293,81**, sin
corregirlo a mano. Ese es el criterio de que la geometría está bien.

- [ ] **Step 3: Mirar el dibujo**

El chaflán debe salir bastante menos profundo que antes —esa es la corrección— y
las dos aristas, redondeadas. Comparar contra el CAD.

- [ ] **Step 4: Imprimir**

Aprovechar esta hoja para la calibración pendiente del bloque 3a: imprimirla en
la impresora del taller, en blanco y negro, y juzgar la escala tonal.

---

## Estado final esperado

| Fichero | Testeado |
|---|---|
| `src/lib/geometry/chaflan.ts` | Sí, 11 tests |
| `src/lib/geometry/contorno.ts` | Sí, incluida la pieza real (293,81) |
| `src/lib/geometry/perfil.ts` | Sí, tangencias y simetría |
| `src/lib/calc/lona.ts` | Solo tipos |
| `FormularioLona.tsx`, `Escena3D.tsx`, `datos-geometria.ts` | No (comprobación de Iván) |
