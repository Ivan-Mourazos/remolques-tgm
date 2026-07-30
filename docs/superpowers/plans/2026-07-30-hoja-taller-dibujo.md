# La hoja de taller y el dibujo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el operario vea el remolque como va a quedar, con las medidas sin ambigüedad, impreso en blanco y negro.

**Architecture:** El valor de cada cara se decide a propósito y el color del material se aplica encima conservándolo, de modo que el paso a gris deje de ser un residuo y el color futuro no obligue a rehacer nada. La lógica pura —luminancia, escala de valores, descuelgue de la tela y tamaño de los símbolos— sale a `src/lib/geometry` y se testea; `Escena3D` queda dibujando.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, SVG escrito a mano, @react-pdf/renderer, Vitest 4 (`environment: "node"`).

## Global Constraints

- **Sin dependencias nuevas**, incluidas tipografías. No hay motor 3D.
- Español en código, nombres, comentarios y textos de UI.
- **El contenido de la hoja no cambia.** Paños, medidas, reparto de ollaos y textos están validados contra el Excel histórico. Este plan cambia cómo se presenta, nunca qué dice. Si algo obliga a cambiar un dato, parar y preguntar.
- **Lo que se acota va a escala. Lo que se identifica va exagerado.** El remolque y la ventana, a escala fiel. Cierres, cremalleras, recogidas, bastilla y ollaos, exagerados. De los ollaos se exagera el **símbolo**, nunca la **posición**: las posiciones vienen del reparto calculado y están listadas en la tabla del pie de la hoja.
- Los tests solo pueden ser `*.test.ts` (no `.tsx`) y ejecutarse en `environment: "node"`. `Escena3D` y el componente del PDF no pueden tener tests automáticos; su red es `tsc`, `lint` y la prueba impresa.
- Tras cada tarea: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`.
- Commits en español al estilo del repo (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- No tocar `src/lib/calc`.

## Aviso sobre la verificación

Las tareas 4 y 6 cambian cómo se ve el dibujo y la hoja, y **nadie que las implemente puede comprobar el resultado**: no hay forma de mirar el render desde aquí. Los tests cubren la matemática; el aspecto lo juzga el ojo de Iván sobre papel impreso. Por eso la Task 7 no es opcional y por eso las constantes de la Task 1 y la Task 3 están pensadas para tocarse en esa calibración.

---

### Task 1: Luminancia y escala de valores

El cimiento: poder fijar el gris que tendrá una cara, sea cual sea el color del material.

**Files:**
- Create: `src/lib/geometry/tono.ts`
- Create: `src/lib/geometry/__tests__/tono.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  ```ts
  export function luminancia(hex: string): number;                    // 0..1
  export function mezcla(hex: string, destino: string, proporcion: number): string;
  export function aplicarValor(hex: string, valor: number): string;
  export const VALOR_CARA: {
    readonly techoClaro: number; readonly techo: number;
    readonly lateralClaro: number; readonly lateral: number;
  };
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/geometry/__tests__/tono.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aplicarValor, luminancia, mezcla, VALOR_CARA } from "@/lib/geometry/tono";

/** Colores muy distintos en tono y en claridad. */
const MATERIALES = ["#2874b2", "#008351", "#1d2025", "#f4f4f0", "#b82b2f"];

describe("luminancia", () => {
  it("va de 0 en negro a 1 en blanco", () => {
    expect(luminancia("#000000")).toBeCloseTo(0, 5);
    expect(luminancia("#ffffff")).toBeCloseTo(1, 5);
  });

  it("pesa el verde más que el rojo y el rojo más que el azul", () => {
    expect(luminancia("#00ff00")).toBeGreaterThan(luminancia("#ff0000"));
    expect(luminancia("#ff0000")).toBeGreaterThan(luminancia("#0000ff"));
  });
});

describe("mezcla", () => {
  it("interpola linealmente entre los dos colores", () => {
    expect(mezcla("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mezcla("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mezcla("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("aplicarValor", () => {
  it("deja el color con exactamente la luminancia pedida, venga de donde venga", () => {
    for (const material of MATERIALES) {
      for (const valor of [0.2, 0.4, 0.6, 0.85]) {
        expect(luminancia(aplicarValor(material, valor))).toBeCloseTo(valor, 2);
      }
    }
  });

  it("dos materiales distintos dan el mismo gris en la misma cara", () => {
    // El valor codifica la cara, no el material: si no coincidieran, la
    // cubierta de una lona azul se leería como el lateral de una verde.
    const azul = aplicarValor("#2874b2", VALOR_CARA.techo);
    const verde = aplicarValor("#008351", VALOR_CARA.techo);
    expect(luminancia(azul)).toBeCloseTo(luminancia(verde), 2);
  });

  it("conserva el tono, para que el día que haya color siga siendo azul", () => {
    const azulClaro = aplicarValor("#2874b2", 0.8);
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(azulClaro.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it("no se sale del rango aunque le pidan valores imposibles", () => {
    expect(luminancia(aplicarValor("#2874b2", 0))).toBeCloseTo(0, 2);
    expect(luminancia(aplicarValor("#2874b2", 1))).toBeCloseTo(1, 2);
  });
});

describe("VALOR_CARA", () => {
  it("ordena las caras de la más clara a la más oscura", () => {
    expect(VALOR_CARA.techoClaro).toBeGreaterThan(VALOR_CARA.techo);
    expect(VALOR_CARA.techo).toBeGreaterThan(VALOR_CARA.lateralClaro);
    expect(VALOR_CARA.lateralClaro).toBeGreaterThan(VALOR_CARA.lateral);
  });

  it("separa las caras lo bastante para que aguanten una fotocopia", () => {
    const valores = [
      VALOR_CARA.techoClaro, VALOR_CARA.techo,
      VALOR_CARA.lateralClaro, VALOR_CARA.lateral,
    ];
    for (let i = 1; i < valores.length; i++) {
      expect(valores[i - 1] - valores[i]).toBeGreaterThanOrEqual(0.12);
    }
  });

  it("evita los extremos: ni negro empastado ni blanco que desaparece", () => {
    expect(VALOR_CARA.lateral).toBeGreaterThan(0.2);
    expect(VALOR_CARA.techoClaro).toBeLessThan(0.95);
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/tono.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/geometry/tono"`.

- [ ] **Step 3: Escribir la implementación**

Crear `src/lib/geometry/tono.ts`:

```ts
/**
 * El dibujo se imprime en blanco y negro, así que el gris de cada cara se
 * elige a propósito en vez de heredarlo del color del material. El material
 * aporta el tono; la cara aporta el valor. El día que haya impresora en color
 * se apaga el monocromo y el mismo dibujo sale en color con el volumen intacto.
 */

/** Pesos de luma de la matriz que aplica `grayscale(1)`. */
const PESO_ROJO = 0.2126;
const PESO_VERDE = 0.7152;
const PESO_AZUL = 0.0722;

const canal = (hex: string, offset: number) =>
  Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;

/** Claridad percibida del color, de 0 (negro) a 1 (blanco). */
export function luminancia(hex: string): number {
  return canal(hex, 1) * PESO_ROJO + canal(hex, 3) * PESO_VERDE + canal(hex, 5) * PESO_AZUL;
}

export function mezcla(hex: string, destino: string, proporcion: number): string {
  const componentes = [1, 3, 5].map((offset) => Math.round(
    (canal(hex, offset) * (1 - proporcion) + canal(destino, offset) * proporcion) * 255,
  ));
  return `#${componentes.map((valor) => valor.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Devuelve el color con la luminancia pedida, conservando su tono.
 *
 * La mezcla es lineal en RGB y la luminancia es una combinación lineal de RGB,
 * así que mezclar con blanco o con negro mueve la luminancia de forma exacta y
 * la proporción necesaria se despeja sin buscar.
 */
export function aplicarValor(hex: string, valor: number): string {
  const objetivo = Math.min(Math.max(valor, 0), 1);
  const actual = luminancia(hex);
  if (Math.abs(objetivo - actual) < 1e-6) return hex;
  return objetivo > actual
    ? mezcla(hex, "#ffffff", (objetivo - actual) / (1 - actual))
    : mezcla(hex, "#000000", (actual - objetivo) / actual);
}

/**
 * Una sola dirección de luz para todo el dibujo. Los valores están separados
 * al menos 0,12 para que sobrevivan a una fotocopia, y lejos de los extremos
 * para que el negro no se empaste ni el blanco desaparezca.
 *
 * Estos cuatro números son los que se retocan en la calibración impresa.
 */
export const VALOR_CARA = {
  techoClaro: 0.88,
  techo: 0.72,
  lateralClaro: 0.54,
  lateral: 0.36,
} as const;
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/tono.test.ts`
Expected: PASS — 10 tests.

- [ ] **Step 5: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 6: Commit**

```bash
git add src/lib/geometry/tono.ts src/lib/geometry/__tests__/tono.test.ts
git commit -m "feat: escala de valores por cara independiente del color del material"
```

---

### Task 2: El color del material pasa por la escala de valores

**Files:**
- Modify: `src/lib/geometry/color-lona.ts`
- Create: `src/lib/geometry/__tests__/color-lona.test.ts`

**Interfaces:**
- Consumes: `aplicarValor`, `luminancia`, `VALOR_CARA` (Task 1).
- Produces: `coloresMaterial(material: string): ColoresLona` conserva su firma y su tipo; cambia cómo calcula.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/geometry/__tests__/color-lona.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { colorBaseMaterial, coloresMaterial } from "@/lib/geometry/color-lona";
import { luminancia, VALOR_CARA } from "@/lib/geometry/tono";

describe("colorBaseMaterial", () => {
  it("reconoce el código RAL dentro del texto del material", () => {
    expect(colorBaseMaterial("LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)")).toBe("#2874b2");
  });

  it("cae al nombre cuando no hay RAL", () => {
    expect(colorBaseMaterial("LONA VERDE 680")).toBe("#147a52");
  });
});

describe("coloresMaterial", () => {
  const MATERIALES = ["AZUL 5015", "VERDE 6024", "NEGRO 9005", "BLANCO 9010", "ROJO"];

  it("da a cada cara exactamente su valor, con cualquier material", () => {
    for (const material of MATERIALES) {
      const c = coloresMaterial(material);
      expect(luminancia(c.techoClaro)).toBeCloseTo(VALOR_CARA.techoClaro, 2);
      expect(luminancia(c.techo)).toBeCloseTo(VALOR_CARA.techo, 2);
      expect(luminancia(c.lateralClaro)).toBeCloseTo(VALOR_CARA.lateralClaro, 2);
      expect(luminancia(c.lateral)).toBeCloseTo(VALOR_CARA.lateral, 2);
    }
  });

  it("mantiene el orden de claridad entre caras aunque el material sea muy oscuro o muy claro", () => {
    // Es lo que el sistema anterior no garantizaba: con una lona negra, el
    // «techo claro» salía más oscuro que el «lateral» de una lona blanca.
    for (const material of ["NEGRO 9005", "BLANCO 9010"]) {
      const c = coloresMaterial(material);
      expect(luminancia(c.techoClaro)).toBeGreaterThan(luminancia(c.techo));
      expect(luminancia(c.techo)).toBeGreaterThan(luminancia(c.lateralClaro));
      expect(luminancia(c.lateralClaro)).toBeGreaterThan(luminancia(c.lateral));
    }
  });

  it("la cubierta de una lona negra es más clara que el lateral de una blanca", () => {
    expect(luminancia(coloresMaterial("NEGRO 9005").techoClaro))
      .toBeGreaterThan(luminancia(coloresMaterial("BLANCO 9010").lateral));
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/color-lona.test.ts`
Expected: FAIL — las luminancias no coinciden con `VALOR_CARA`, y el último test falla porque hoy el color del material manda sobre el valor de la cara.

- [ ] **Step 3: Escribir la implementación**

En `src/lib/geometry/color-lona.ts`, borrar la función local `mezcla` y sustituir `coloresMaterial`:

```ts
import { aplicarValor, VALOR_CARA } from "@/lib/geometry/tono";
```

```ts
/**
 * El material aporta el tono; la cara aporta el valor. Antes se mezclaba el
 * color base con blanco o negro en proporciones fijas, así que la claridad
 * final dependía del material: una lona negra salía oscura entera y el volumen
 * se perdía al imprimir en gris.
 */
export function coloresMaterial(material: string): ColoresLona {
  const base = colorBaseMaterial(material);
  return {
    techoClaro: aplicarValor(base, VALOR_CARA.techoClaro),
    techo: aplicarValor(base, VALOR_CARA.techo),
    lateralClaro: aplicarValor(base, VALOR_CARA.lateralClaro),
    lateral: aplicarValor(base, VALOR_CARA.lateral),
  };
}
```

Dejar `COLORES_RAL`, `COLORES_NOMBRE`, `NEUTRO` y `colorBaseMaterial` como están.

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/color-lona.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 6: Commit**

```bash
git add src/lib/geometry
git commit -m "feat: el color del material pasa por la escala de valores"
```

---

### Task 3: Descuelgue de la tela y tamaño de los símbolos

Dos reglas puras: cuánto cede un borde libre, y cuánto se agranda un elemento que se identifica en vez de medirse.

**Files:**
- Create: `src/lib/geometry/caida.ts`
- Create: `src/lib/geometry/__tests__/caida.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  ```ts
  export interface Punto { x: number; y: number }
  export function flechaDescuelgue(vano: number): number;
  export function controlDescuelgue(a: Punto, b: Punto): Punto;
  export function tamanoSimbolo(tamanoBase: number): number;
  export const MINIMO_SIMBOLO: number;
  ```

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/geometry/__tests__/caida.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  controlDescuelgue, flechaDescuelgue, MINIMO_SIMBOLO, tamanoSimbolo,
} from "@/lib/geometry/caida";

describe("flechaDescuelgue", () => {
  it("crece con el vano", () => {
    expect(flechaDescuelgue(200)).toBeGreaterThan(flechaDescuelgue(100));
  });

  it("no descuelga nada en un vano nulo o negativo", () => {
    expect(flechaDescuelgue(0)).toBe(0);
    expect(flechaDescuelgue(-50)).toBe(0);
  });

  it("está acotada: una lona va tensada, no es una sábana", () => {
    // Sin tope, un remolque largo saldría con una panza de caricatura que
    // además confundiría sobre la forma real.
    expect(flechaDescuelgue(10000)).toBeLessThanOrEqual(12);
  });

  it("se mantiene discreta en los vanos habituales", () => {
    expect(flechaDescuelgue(300)).toBeLessThan(300 * 0.03);
  });
});

describe("controlDescuelgue", () => {
  it("deja el punto de control por debajo del centro del tramo", () => {
    const control = controlDescuelgue({ x: 0, y: 100 }, { x: 200, y: 100 });
    expect(control.x).toBeCloseTo(100, 5);
    expect(control.y).toBeGreaterThan(100);
  });

  it("descuelga perpendicular al tramo, también si está inclinado", () => {
    const control = controlDescuelgue({ x: 0, y: 0 }, { x: 100, y: 100 });
    // La normal de un tramo a 45° reparte el descuelgue entre las dos
    // coordenadas, así que ninguna se queda en el punto medio exacto.
    expect(control.x).not.toBeCloseTo(50, 3);
    expect(control.y).not.toBeCloseTo(50, 3);
  });

  it("no mueve nada cuando los dos extremos coinciden", () => {
    const control = controlDescuelgue({ x: 40, y: 40 }, { x: 40, y: 40 });
    expect(control).toEqual({ x: 40, y: 40 });
  });
});

describe("tamanoSimbolo", () => {
  it("agranda lo que se identifica", () => {
    expect(tamanoSimbolo(10)).toBeGreaterThan(10);
  });

  it("nunca baja del mínimo legible, por pequeño que sea el remolque", () => {
    expect(tamanoSimbolo(0.2)).toBeGreaterThanOrEqual(MINIMO_SIMBOLO);
  });

  it("sigue creciendo con el tamaño real por encima del mínimo", () => {
    expect(tamanoSimbolo(40)).toBeGreaterThan(tamanoSimbolo(20));
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/caida.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/geometry/caida"`.

- [ ] **Step 3: Escribir la implementación**

Crear `src/lib/geometry/caida.ts`:

```ts
/**
 * Lo que distingue una lona de una chapa: los bordes que no van sujetos ceden
 * un poco. Y lo que pidieron los operarios: los elementos que se identifican
 * —cierres, recogidas, ollaos— tienen que verse, aunque el remolque sea
 * pequeño. Nada de esto se aplica a lo que lleva cota.
 */

export interface Punto { x: number; y: number }

/** Proporción del vano que cede un borde libre. */
const FACTOR_DESCUELGUE = 0.014;
/** Tope, en unidades del dibujo. Una lona va tensada. */
const MAXIMO_DESCUELGUE = 12;

/** Cuánto ha caído el centro de un borde libre de longitud `vano`. */
export function flechaDescuelgue(vano: number): number {
  if (vano <= 0) return 0;
  return Math.min(vano * FACTOR_DESCUELGUE, MAXIMO_DESCUELGUE);
}

/**
 * Punto de control de una curva cuadrática que hace ceder el tramo `a`–`b`.
 * Se desplaza sobre la normal del tramo, así que funciona igual en tramos
 * horizontales que inclinados. El control va al doble de la flecha porque una
 * cuadrática pasa por la mitad de la distancia a su control.
 */
export function controlDescuelgue(a: Punto, b: Punto): Punto {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy);
  const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (largo === 0) return medio;
  const flecha = flechaDescuelgue(largo) * 2;
  // Normal (dy, -dx) normalizada, orientada hacia abajo en pantalla.
  const nx = dy / largo;
  const ny = -dx / largo;
  const sentido = ny < 0 ? -1 : 1;
  return { x: medio.x + nx * flecha * sentido, y: medio.y + ny * flecha * sentido };
}

/** Aumento de los símbolos que se identifican. */
const FACTOR_SIMBOLO = 1.7;
/** Por debajo de esto un símbolo deja de reconocerse impreso. */
export const MINIMO_SIMBOLO = 7;

/**
 * Exageración esquemática: la de los manuales de despiece. Un cierre a escala
 * real en un remolque de seis metros es una mota. Solo para elementos que se
 * reconocen; jamás para nada que lleve cota.
 */
export function tamanoSimbolo(tamanoBase: number): number {
  return Math.max(tamanoBase * FACTOR_SIMBOLO, MINIMO_SIMBOLO);
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/lib/geometry/__tests__/caida.test.ts`
Expected: PASS — 10 tests.

- [ ] **Step 5: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 6: Commit**

```bash
git add src/lib/geometry/caida.ts src/lib/geometry/__tests__/caida.test.ts
git commit -m "feat: descuelgue de bordes libres y exageración de símbolos"
```

---

### Task 4: El dibujo deja de parecer una interfaz

Sin tests automáticos: es SVG dentro de un componente React y el proyecto no puede ejecutarlo bajo vitest. La red es `tsc`, `lint` y la prueba impresa de la Task 7.

**Files:**
- Modify: `src/components/workspace/Escena3D.tsx`

**Interfaces:**
- Consumes: `coloresMaterial` (Task 2, firma intacta); `flechaDescuelgue`, `controlDescuelgue`, `tamanoSimbolo` (Task 3).

- [ ] **Step 1: Quitar lo que delata la interfaz web**

Tres cosas, todas localizables por búsqueda en el fichero:

1. **Las dos tarjetas de fondo.** Los `<rect ... rx="18" fill="#ffffff" fill-opacity="0.64" stroke="#ffffff"/>`, uno por vista. Borrarlos enteros. Una hoja de taller no tiene tarjetas, y ese blanco al 64 % es lo que se come el contraste al pasar a gris.
2. **La sombra.** El `<filter id="sombraLona">` y todos los `filter="url(#sombraLona)"` que lo usan.
3. **Los degradados decorativos.** Los `<linearGradient>`/`<radialGradient>` cuyo único fin es dar brillo. Los rellenos pasan a ser planos, con el color que ya devuelve `coloresMaterial` —que desde la Task 2 lleva el valor correcto—.

Cuidado con uno: si algún degradado se usa para insinuar la **curvatura** de la cubierta (no para dar brillo), ese aporta forma y se conserva. La regla para distinguirlos: si al quitarlo la cara sigue leyéndose como esa cara, era decoración.

- [ ] **Step 2: Tres pesos de línea y no más**

Hoy conviven siete valores de `stroke-width`: `1`, `1.3`, `1.6`, `1.8`, `2.4`, `5`, `6`. Reducirlos a tres constantes declaradas arriba del fichero:

```tsx
/** Contorno exterior: es lo que define la silueta y debe ganar a todo. */
const TRAZO_SILUETA = 2.6;
/** Aristas estructurales: cambios de plano dentro del objeto. */
const TRAZO_ARISTA = 1.4;
/** Detalle, anotación y cotas: presente pero nunca compitiendo. */
const TRAZO_FINO = 0.9;
```

Reasignar cada uso actual al que le corresponde por su papel, no por su grosor de hoy. Las líneas ocultas conservan su discontinuidad y usan `TRAZO_FINO`.

- [ ] **Step 3: Hacer ceder los bordes libres**

Para cada borde de la lona que **no** va sujeto —el faldón inferior cuando no hay recogida, y los laterales libres—, sustituir el tramo recto por una cuadrática:

```tsx
import { controlDescuelgue } from "@/lib/geometry/caida";

const control = controlDescuelgue(a, b);
// …en el path: `M ${a.x} ${a.y} Q ${control.x} ${control.y} ${b.x} ${b.y}`
```

Donde la lona **sí** va sujeta —bastilla enfundada, recogida, borde contra el arco— la línea sigue recta. Ese contraste entre lo tenso y lo que cede es justo lo que hace que se lea como tela.

- [ ] **Step 4: Agrandar lo que se identifica**

Aplicar `tamanoSimbolo()` al tamaño con que se dibujan los ollaos, las marcas de cremallera, las de recogida y las de bastilla:

```tsx
import { tamanoSimbolo } from "@/lib/geometry/caida";

const radioOllao = tamanoSimbolo(radioOllaoBase) / 2;
```

**No aplicarlo** al remolque ni a la ventana: llevan cota y van a escala. **En los ollaos se agranda el símbolo y nunca su posición**, que viene del reparto calculado y está listada en la tabla del pie de la hoja.

- [ ] **Step 5: Anotaciones con línea de referencia**

Cada texto que nombra un elemento —`CREMALLERA`, `BASTILLA ENFUNDAR`, y la medida de la ventana— gana un trazo fino desde la etiqueta hasta el elemento, con `TRAZO_FINO`. Hoy flotan cerca de lo que nombran y hay que adivinar a qué se refieren.

Los títulos `VISTA DELANTERA` y `VISTA TRASERA` no llevan línea: nombran la vista entera, no un elemento.

- [ ] **Step 6: Separar la tipografía del dibujo de la de la aplicación**

Hoy el dibujo usa `'Plus Jakarta Sans','Segoe UI',Arial,sans-serif`, la misma familia que la web, y por eso parece una captura de pantalla metida en una hoja técnica. Lo convencional sería una grotesca condensada, pero añadir una fuente rompería la regla de no meter dependencias, así que la distinción se consigue con lo que ya hay. Declarar arriba del fichero y usarlo en los `<text>`:

```tsx
/**
 * El dibujo no debe parecer una captura de la aplicación. Sin poder añadir una
 * fuente, la distinción se consigue con caja, espaciado y cifras tabulares.
 */
const TEXTO_ANOTACION = {
  fontFamily: "'Segoe UI Semibold','Segoe UI',Arial,sans-serif",
  letterSpacing: 0.6,
  textTransform: "uppercase",
} as const;
const TEXTO_COTA = {
  fontFamily: "'Segoe UI',Arial,sans-serif",
  fontVariantNumeric: "tabular-nums",
} as const;
```

Las anotaciones (`CREMALLERA`, `BASTILLA ENFUNDAR`, los títulos de vista) van con `TEXTO_ANOTACION`; las cotas y la medida de la ventana, con `TEXTO_COTA`. Las cifras tabulares importan porque con cifras proporcionales un `111` y un `999` ocupan distinto y las cotas bailan.

Ojo: `textTransform` en SVG no lo soportan todos los motores de rasterizado. Si al comprobar el SVG generado los textos no salen en mayúsculas, pasarlos a mayúsculas en el propio contenido en vez de por estilo.

- [ ] **Step 7: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde. Los tests no comprueban el aspecto; comprueban que no se ha roto nada de lo que sí está cubierto.

- [ ] **Step 8: Comprobar que el SVG ya no contiene lo eliminado**

Run: `pnpm dev`, abrir un planteamiento con medidas y guardarlo, y después:

```bash
node -e '
const fs=require("fs");
const regs=JSON.parse(fs.readFileSync("data/planteamientos.json","utf8"));
const s=[...regs].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0].snapshotSvg;
const n=(re)=>(s.match(re)||[]).length;
console.log("tarjetas rx=18:", n(/rx="18"/g), "| filtros:", n(/<filter/g), "| degradados:", n(/<(linear|radial)Gradient/g), "| grosores:", [...new Set(s.match(/stroke-width="[^"]+"/g)||[])].join(" "));
'
```

Expected: `tarjetas rx=18: 0`, `filtros: 0`, y como mucho tres valores distintos de `stroke-width`.

- [ ] **Step 9: Commit**

```bash
git add src/components/workspace/Escena3D.tsx
git commit -m "feat: el dibujo pierde el aire de interfaz y gana caída de tela"
```

---

### Task 5: El monocromo deja de estar clavado en el código

**Files:**
- Create: `src/lib/pdf/salida.ts`
- Modify: `src/components/workspace/useWorkspace.ts`

**Interfaces:**
- Produces: `export const SALIDA_MONOCROMA: boolean;`

- [ ] **Step 1: Crear la constante**

Crear `src/lib/pdf/salida.ts`:

```ts
/**
 * La impresora del taller es monocroma, así que la conversión a gris la
 * hacemos nosotros: si mandásemos color a una impresora en blanco y negro, la
 * conversión la decidiría el driver y saldría peor que controlándola aquí.
 *
 * El dibujo está autorado por valor (ver `src/lib/geometry/tono.ts`), así que
 * el día que llegue una impresora en color basta con poner esto a `false` y el
 * mismo dibujo sale en color con el volumen intacto.
 *
 * No es una preferencia del usuario ni va en variable de entorno: es una
 * propiedad del taller, y hasta que cambie la impresora nadie debería poder
 * cambiarla por accidente.
 */
export const SALIDA_MONOCROMA = true;
```

- [ ] **Step 2: Usarla en el único sitio que decide hoy**

En `src/components/workspace/useWorkspace.ts`, sustituir el literal:

```ts
import { SALIDA_MONOCROMA } from "@/lib/pdf/salida";
```

```ts
      rasterizar: (svg) => rasterizarSvg(svg, { monocromo: SALIDA_MONOCROMA }),
```

- [ ] **Step 3: Verificar que no queda ningún monocromo literal**

Run: `grep -rn "monocromo" src --include=*.ts --include=*.tsx`
Expected: la definición de la opción en `src/lib/svg/rasterizar.ts`, su uso interno allí, la constante nueva, y la única llamada en `useWorkspace.ts`. Ningún otro `monocromo: true` escrito a mano.

- [ ] **Step 4: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/salida.ts src/components/workspace/useWorkspace.ts
git commit -m "refactor: el monocromo se decide en un solo sitio"
```

---

### Task 6: La hoja cede espacio al dibujo

Sin tests automáticos: es un componente de @react-pdf/renderer.

**Files:**
- Modify: `src/lib/pdf/PlanteamientoPdf.tsx`

- [ ] **Step 1: Estrechar y densificar la columna de datos**

En los estilos, `datos` mide hoy `width: 250` y `etiqueta` lleva `textDecoration: "underline"`.

```tsx
  datos: { width: 176, paddingRight: 8, justifyContent: "flex-start" },
```

y quitar `textDecoration: "underline"` de `etiqueta`. Los subrayados son de máquina de escribir: la jerarquía la da el peso, que ya está en `Helvetica-Bold`.

- [ ] **Step 2: Agrupar los datos por lo que se busca junto**

Reordenar los `<Dato>` de la lona en tres grupos, con un pequeño espacio entre ellos y **sin cambiar ni una etiqueta ni un valor**:

1. **Qué cortar** — `PAÑOS A CORTAR`, `MEDIDA LONA HECHA`. Es lo primero que necesita el operario.
2. **Cómo es** — `ARCO`, `PERFIL`, `RECOGE DELANTE`, `RECOGE ATRÁS`, `VENTANA`, `ROTULACIÓN`, `OLLAOS`.
3. **Con qué** — `MATERIAL`.

`ARCO` muestra el cliente y **es correcto**: es paridad con el Excel histórico y está decidido. No tocarlo.

- [ ] **Step 3: Dar al dibujo el espacio recuperado**

`foto` tiene hoy `height: 240` fijo. El SVG es muy apaisado (1560×440), así que lo que le limita es el ancho, no el alto: los 74 puntos que suelta la columna de datos van directos a agrandarlo. Cambiar la altura fija por que ocupe lo disponible:

```tsx
  foto: { width: "100%", flex: 1, objectFit: "contain" },
```

y asegurarse de que su contenedor tiene `flex: 1` para que el hueco entre la cabecera y la tabla de ollaos se reparta a favor del dibujo.

- [ ] **Step 4: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde.

- [ ] **Step 5: Generar una hoja y comprobar que no se ha roto la maquetación**

Arrancar `pnpm dev`, abrir un pedido con dos remolques, «Vista previa». Comprobar: la cabecera intacta, la tabla de ollaos completa y legible, el dibujo visiblemente mayor que antes, y **ningún dato perdido** respecto a la hoja anterior. Comparar contra `output/pdf/AR2603456-10.pdf`, que es una hoja del formato viejo.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdf/PlanteamientoPdf.tsx
git commit -m "feat: la columna de datos se compacta y el dibujo crece"
```

---

### Task 7: Calibración sobre papel impreso

**Esta tarea la ejecuta Iván, no un implementador.** Ninguna de las anteriores puede darse por buena sin ella: los valores que se leen perfectos en un monitor retroiluminado se empastan en papel con tóner, y es la única forma de saber si la escala tonal funciona.

- [ ] **Step 1: Generar una hoja real**

Abrir un pedido conocido con la lona más oscura que se fabrique habitualmente (una negra o azul marino es el caso difícil), generar el PDF e imprimirlo **en la impresora del taller**, en blanco y negro, tamaño real.

- [ ] **Step 2: Mirarla en papel y juzgar cinco cosas**

1. ¿Se distinguen las cuatro caras del remolque, o hay dos que se confunden?
2. ¿La silueta destaca sobre las aristas interiores?
3. ¿Se reconocen los cierres, las recogidas y los ollaos de un vistazo?
4. ¿Las cotas se leen sin acercarse?
5. ¿Parece una lona, o parece una caja?

- [ ] **Step 3: Ajustar las constantes según lo que diga el papel**

Los cuatro valores de `VALOR_CARA` en `src/lib/geometry/tono.ts` son lo que se retoca si las caras se confunden. `FACTOR_DESCUELGUE` y `MAXIMO_DESCUELGUE` en `src/lib/geometry/caida.ts`, si parece caja o parece sábana. `FACTOR_SIMBOLO` y `MINIMO_SIMBOLO`, si los elementos no se reconocen.

Repetir hasta que las cinco respuestas sean buenas. Los tests de las tareas 1 y 3 acotan los rangos aceptables, así que si un ajuste rompe un test es que se ha ido demasiado lejos: los tests están para eso.

- [ ] **Step 4: Commit de la calibración**

```bash
git add src/lib/geometry
git commit -m "fix: calibra la escala tonal contra impresión real"
```

---

## Estado final esperado

| Fichero | Testeado |
|---|---|
| `src/lib/geometry/tono.ts` | Sí, 10 tests |
| `src/lib/geometry/caida.ts` | Sí, 10 tests |
| `src/lib/geometry/color-lona.ts` | Sí, 5 tests |
| `src/lib/pdf/salida.ts` | No hace falta: una constante |
| `src/components/workspace/Escena3D.tsx` | No (prueba impresa) |
| `src/lib/pdf/PlanteamientoPdf.tsx` | No (prueba impresa) |
