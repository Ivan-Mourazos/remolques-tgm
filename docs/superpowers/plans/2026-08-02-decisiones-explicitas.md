# Decisiones explícitas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que ningún campo de decisión arranque en un valor que además sea válido, para que la validación deje de aprobar lo que nadie ha decidido.

**Architecture:** Los seis campos afectados pasan a admitir un valor «sin elegir» —`""` en los de texto, `null` en los booleanos—, `erroresPlanteamiento` los exige, y el dibujo y la hoja dejan de fingir un valor que no se ha dado. La importación de RPS resuelve lo que RPS sabe y deja sin elegir lo que no, que es donde la distinción `boolean | null` de `LineaPedidoRps` por fin llega hasta el final.

**Tech Stack:** TypeScript 5, React 19, Vitest 4 (`environment: "node"`), @react-pdf/renderer.

## Global Constraints

- **Sin dependencias nuevas.** Español en código, nombres, comentarios y textos de UI.
- **Ningún campo de decisión arranca en un valor válido.** «Sin elegir» no es una opción del desplegable: es la ausencia de elección.
- Los seis campos: `tipoPerfil`, `modoOllaos`, `ventana`, `recogeDelante`, `recogeAtras`, `rotulacion`, `bastillaEnfundar`.
- **Los registros ya guardados traen valores reales**: abrir un planteamiento antiguo no puede producir campos sin elegir.
- Tests solo `*.test.ts` (no `.tsx`) bajo `environment: "node"`. Los componentes React no se pueden testear; su red es `tsc`, `lint` y el recorrido de Iván.
- Tras cada tarea: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`.
- Commits en español al estilo del repo.
- **Fuera de alcance:** `cantidad` (arranca en 1, que es lo normal y RPS lo trae), `clienteEspecifico` del baquetón, y `anchoAtras`/`altoAtras` en 0, que significan «igual que delante» por convención documentada.

---

### Task 1: Los tipos admiten «sin elegir»

Primero los tipos, para que el compilador señale cada sitio que hay que revisar. `tsc` fallará en varios ficheros al terminar esta tarea: es lo que se busca, y las tareas siguientes los van cerrando.

**Files:**
- Modify: `src/lib/calc/lona.ts`
- Modify: `src/lib/calc/baqueton.ts`
- Modify: `src/components/workspace/entradas-vacias.ts`

**Interfaces:**
- Produces:
  ```ts
  // lona.ts
  tipoPerfil: TipoPerfil | "";
  recogeDelante: string; recogeAtras: string;   // "" = sin elegir
  bastillaEnfundar: boolean | null;
  ventana: boolean | null;
  rotulacion: boolean | null;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA" | "";
  // baqueton.ts
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA" | "";
  rotulacion: boolean | null;
  ```

- [ ] **Step 1: Escribir el test que falla**

Añadir a `src/components/workspace/__tests__/entradas.test.ts`:

```ts
describe("una entrada vacía no puede estar completa", () => {
  it("la lona arranca con las seis decisiones sin tomar", () => {
    const lona = emptyLona();
    expect(lona.tipoPerfil).toBe("");
    expect(lona.modoOllaos).toBe("");
    expect(lona.recogeDelante).toBe("");
    expect(lona.recogeAtras).toBe("");
    expect(lona.ventana).toBeNull();
    expect(lona.rotulacion).toBeNull();
    expect(lona.bastillaEnfundar).toBeNull();
  });

  it("el baquetón arranca sin modo de ollaos ni rotulación", () => {
    const baqueton = emptyBaqueton();
    expect(baqueton.modoOllaos).toBe("");
    expect(baqueton.rotulacion).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `pnpm exec vitest run src/components/workspace/__tests__/entradas.test.ts`
Expected: FAIL — `tipoPerfil` es `"TIPO 01"`, `modoOllaos` es `"REPARTIDOS"`, las recogidas son `"NO"` y los tres booleanos son `false`.

- [ ] **Step 3: Ampliar los tipos**

En `src/lib/calc/lona.ts`, dentro de `LonaInput`:

```ts
  /** Sin elegir hasta que el usuario decide: un perfil recto por defecto pasaría
   *  la validación entera sin que nadie haya mirado la forma. */
  tipoPerfil: TipoPerfil | "";
  /** "" = sin elegir. "NO" es una respuesta, no la ausencia de una. */
  recogeDelante: string; recogeAtras: string;
  /** null = sin elegir. false es «no lleva», que es una decisión distinta. */
  bastillaEnfundar: boolean | null;
  ventana: boolean | null;
```

```ts
  /** Solo se indica si va rotulado; el contenido no forma parte del
   *  planteamiento. null = sin elegir. */
  rotulacion: boolean | null;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA" | "";
```

En `src/lib/calc/baqueton.ts`, dentro de `BaquetonInput`:

```ts
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA" | "";
```

```ts
  /** Solo se indica si va rotulado. null = sin elegir. */
  rotulacion: boolean | null;
```

- [ ] **Step 4: Arrancar las entradas vacías sin elegir**

En `src/components/workspace/entradas-vacias.ts`, en `emptyLona()`:

```ts
    contorno: 0, tipoPerfil: "",
    recogeDelante: "", recogeAtras: "",
    bastillaEnfundar: null, ventana: null, ventanaAncho: 0, ventanaAlto: 0, rotulacion: null,
    modoOllaos: "", pasoOllaos: DEFAULT_PARAMS.pasoOllaosDefecto,
```

Y en `emptyBaqueton()`:

```ts
    modoOllaos: "", pasoOllaos: DEFAULT_PARAMS.pasoOllaosDefecto,
```

```ts
    ollaosManuales: sinOllaos(), rotulacion: null,
```

- [ ] **Step 5: Ejecutar el test y comprobar que pasa**

Run: `pnpm exec vitest run src/components/workspace/__tests__/entradas.test.ts`
Expected: PASS los dos nuevos. Otros tests del fichero pueden fallar: los arregla la Task 2, que es donde el cálculo aprende a tratar el valor sin elegir.

- [ ] **Step 6: Commit**

`tsc` todavía no pasa: es el estado esperado al terminar esta tarea, y el commit lo dice.

```bash
git add src/lib/calc/lona.ts src/lib/calc/baqueton.ts src/components/workspace/entradas-vacias.ts src/components/workspace/__tests__/entradas.test.ts
git commit -m "feat: los campos de decisión admiten «sin elegir»"
```

---

### Task 2: El cálculo y la validación tratan «sin elegir»

**Files:**
- Modify: `src/lib/calc/lona.ts`
- Modify: `src/lib/calc/baqueton.ts`
- Modify: `src/lib/pedidos/validar-planteamiento.ts`
- Modify: `src/lib/pedidos/__tests__/validar-planteamiento.test.ts`

**Interfaces:**
- Consumes: los tipos ampliados de la Task 1.

- [ ] **Step 1: Escribir el test que falla**

Añadir a `src/lib/pedidos/__tests__/validar-planteamiento.test.ts`:

```ts
describe("las decisiones sin tomar son errores", () => {
  /** Una lona con todas las medidas puestas pero ninguna decisión tomada. */
  const conMedidas = () => ({
    ...emptyLona(),
    cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583" },
    largo: 600, ancho: 250, altoDelante: 220, contorno: 620,
    material: "PVC 580 AZUL",
  });

  const campos = (input: ReturnType<typeof conMedidas>) =>
    erroresPlanteamiento(input).map((error) => error.campo);

  it("no deja completar una lona sin ninguna decisión tomada", () => {
    expect(campos(conMedidas())).toEqual(expect.arrayContaining([
      "tipoPerfil", "modoOllaos", "recogeDelante", "recogeAtras",
      "ventana", "rotulacion", "bastillaEnfundar",
    ]));
  });

  it("cada decisión tomada retira su error", () => {
    const decidida = {
      ...conMedidas(),
      tipoPerfil: "TIPO 01" as const,
      recogeDelante: "NO", recogeAtras: "NO",
      ventana: false, rotulacion: false, bastillaEnfundar: false,
      modoOllaos: "REPARTIDOS" as const,
    };
    expect(erroresPlanteamiento(decidida)).toEqual([]);
  });

  it("decir que no es una decisión, y basta", () => {
    // El valor no importa: importa que se haya dicho algo.
    const conVentana = { ...conMedidas(), ventana: true, ventanaAncho: 50, ventanaAlto: 35 };
    expect(campos(conVentana)).not.toContain("ventana");
  });

  it("el baquetón también exige su modo de ollaos y su rotulación", () => {
    const baqueton = {
      ...emptyBaqueton(),
      cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR2603583" },
      largo: 600, ancho: 250, baqueton: 12, material: "PVC 580 AZUL",
    };
    const campos = erroresPlanteamiento(baqueton).map((error) => error.campo);
    expect(campos).toContain("modoOllaos");
    expect(campos).toContain("rotulacion");
  });
});
```

Añadir a `src/lib/calc/__tests__/lona.test.ts`:

```ts
describe("sin modo de ollaos elegido", () => {
  it("no reparte ningún ollao", () => {
    const sinElegir = {
      ...emptyLona(), largo: 600, ancho: 250, altoDelante: 220,
      tipoPerfil: "TIPO 01" as const, contorno: 620,
    };
    const res = calcLona(sinElegir, DEFAULT_PARAMS);
    expect(res.reparto.laterales).toEqual([]);
    expect(res.reparto.atras).toEqual([]);
    expect(res.reparto.delante).toEqual([]);
  });

  it("elegir repartidos sí produce reparto", () => {
    const elegida = {
      ...emptyLona(), largo: 600, ancho: 250, altoDelante: 220,
      tipoPerfil: "TIPO 01" as const, contorno: 620,
      modoOllaos: "REPARTIDOS" as const,
    };
    expect(calcLona(elegida, DEFAULT_PARAMS).reparto.laterales.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ejecutar los tests y comprobar que fallan**

Run: `pnpm exec vitest run src/lib/pedidos/__tests__/validar-planteamiento.test.ts src/lib/calc/__tests__/lona.test.ts`
Expected: FAIL — hoy no hay errores por decisión sin tomar, y sin modo elegido el cálculo cae en la rama de repartidos.

- [ ] **Step 3: Exigir las decisiones en la validación**

En `src/lib/pedidos/validar-planteamiento.ts`, dentro de `erroresPlanteamiento`, antes del bloque de ollaos:

```ts
  // Una decisión sin tomar no es un «no»: es que nadie ha mirado el dato.
  agregar(!input.modoOllaos, "modoOllaos", "Elige cómo van repartidos los ollaos.");
  agregar(input.rotulacion == null, "rotulacion", "Indica si lleva rotulación.");
```

Y dentro de la rama de lona (el `else` de `"baqueton" in input`):

```ts
  agregar(!input.tipoPerfil, "tipoPerfil", "Elige el tipo de perfil del remolque.");
  agregar(!input.recogeDelante, "recogeDelante", "Indica la recogida de delante.");
  agregar(!input.recogeAtras, "recogeAtras", "Indica la recogida de atrás.");
  agregar(input.ventana == null, "ventana", "Indica si lleva ventana.");
  agregar(input.bastillaEnfundar == null, "bastillaEnfundar", "Indica si lleva bastilla de enfundar.");
```

Cuidado con dos comprobaciones que ya existen y hoy dependen de estos campos: la de las medidas de la ventana usa `input.ventana`, que ahora puede ser `null` — al ser falsy sigue sin pedir medidas, que es lo correcto —, y las de `aguas`, `chaflan` y `radioEsquina` comparan `input.tipoPerfil` con un valor concreto, así que con `""` no piden nada. Correcto también: hasta que no se elige el perfil no se sabe qué medidas hacen falta, y el error de `tipoPerfil` ya está señalando el problema.

**Pero el tipo sí cambia.** `agregar` recibe `condicion: boolean`, y las cuatro
líneas que hoy pasan `input.ventana && …` ahora entregan `boolean | null`. Hay que
envolverlas —`Boolean(input.ventana) && …` o `input.ventana === true && …`— y esto
es un arreglo de tipos, no de lógica: el comportamiento no cambia. Lo señaló la
Task 1 al ver lo que `tsc` marcaba.

- [ ] **Step 4: Que el cálculo no reparta sin decisión**

En `src/lib/calc/lona.ts` el reparto es hoy un ternario de dos ramas, así que un
modo vacío cae en la de repartidos. Pasa a tres:

```ts
  // Sin modo elegido no se reparte nada: enseñar un reparto plausible que
  // nadie ha confirmado es justo el fallo que este bloque corrige, y aquí
  // acabaría dibujado en la hoja de taller.
  const reparto = input.modoOllaos === ""
    ? { laterales: [], atras: [], delante: [] }
    : input.modoOllaos === "SEGUN SE INDICA"
      ? input.ollaosManuales
      : {
          laterales: ollaos.largo.posiciones,
          atras: ollaos.anchoAtras.posiciones,
          delante: ollaos.ancho.posiciones,
        };
```

Y en `src/lib/calc/baqueton.ts`, que tiene la misma estructura con
`ollaos.ancho.posiciones` en las tres direcciones:

```ts
  const reparto = input.modoOllaos === ""
    ? { laterales: [], atras: [], delante: [] }
    : input.modoOllaos === "SEGUN SE INDICA"
      ? input.ollaosManuales
      : {
          laterales: ollaos.largo.posiciones,
          atras: ollaos.ancho.posiciones,
          delante: ollaos.ancho.posiciones,
        };
```

- [ ] **Step 5: Ejecutar los tests y comprobar que pasan**

Run: `pnpm test`
Expected: los nuevos en verde. Varios tests antiguos fallarán porque construyen entradas con `emptyLona()` y ahora les faltan decisiones: **arreglarlos añadiendo las decisiones que el caso necesite**, no relajando las comprobaciones. Si un test antiguo afirmaba algo que ya no es cierto, reescribirlo con el significado nuevo.

- [ ] **Step 6: Verificar el conjunto**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: `tsc` puede seguir fallando en los componentes; los cierra la Task 3.

- [ ] **Step 7: Commit**

```bash
git add src/lib
git commit -m "feat: una decisión sin tomar impide completar el planteamiento"
```

---

### Task 3: Los controles saben decir «sin elegir»

**Files:**
- Modify: `src/components/workspace/campos.tsx`
- Modify: `src/components/workspace/FormularioLona.tsx`
- Modify: `src/components/workspace/FormularioBaqueton.tsx`

**Interfaces:**
- Produces:
  ```ts
  export function CampoSiNo(props: {
    label: string; value: boolean | null; onChange: (v: boolean) => void;
    name?: string; error?: string; ancho?: boolean; span?: 1 | 2 | 3;
  }): ReactElement;
  ```

- [ ] **Step 1: Crear el control**

Una casilla de verificación no sabe decir «sin elegir»: marcada o no, siempre afirma algo. En `src/components/workspace/campos.tsx`, junto a `CampoCheck`:

```tsx
/**
 * Sí / No que arranca vacío. Una casilla no vale aquí: marcada o desmarcada
 * siempre afirma algo, y lo que hace falta es distinguir «no lleva» de «nadie
 * lo ha mirado».
 */
export function CampoSiNo(props: {
  label: string; value: boolean | null; onChange: (v: boolean) => void;
  name?: string; error?: string; ancho?: boolean; span?: 1 | 2 | 3;
}) {
  const errorId = useId();
  const opcion = (valor: boolean, texto: string) => (
    <button
      type="button"
      data-campo={valor === true ? props.name : undefined}
      aria-pressed={props.value === valor}
      onClick={() => props.onChange(valor)}
      className={`min-h-8 flex-1 rounded-lg border px-2 text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/15 ${
        props.value === valor
          ? "border-gold/60 bg-gold/10 text-ink"
          : "border-line bg-surface text-ink-2 hover:border-line-2"
      }`}
    >
      {texto}
    </button>
  );
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-[12px] ${columna(props.ancho, props.span)}`}>
      <span className="font-bold text-muted">{props.label}</span>
      <div className={`flex gap-1.5 ${props.error ? "rounded-lg ring-2 ring-red-500/40" : ""}`}>
        {opcion(true, "Sí")}
        {opcion(false, "No")}
      </div>
      <MensajeError id={errorId} mensaje={props.error} />
    </label>
  );
}
```

- [ ] **Step 2: Usarlo en los formularios**

En `src/components/workspace/FormularioLona.tsx`, sustituir los `CampoCheck` de ventana, rotulación y bastilla por `CampoSiNo`, pasando `error={errores.ventana}`, `error={errores.rotulacion}` y `error={errores.bastillaEnfundar}`.

En `src/components/workspace/FormularioBaqueton.tsx`, lo mismo con la rotulación.

- [ ] **Step 3: Que los desplegables arranquen sin selección**

`CampoSelect` calcula hoy la opción mostrada así:

```tsx
  const opcionActual = opciones.find((opcion) => opcion.value === props.value)
    ?? (props.value ? { value: props.value, label: props.value } : opciones[0]);
```

Ese `?? opciones[0]` final es el engaño: con el valor vacío enseña la primera
opción como si estuviera elegida. Añadir una prop `sinElegir?: string` y usarla
en su lugar:

```tsx
  const opcionActual = opciones.find((opcion) => opcion.value === props.value)
    ?? (props.value
      ? { value: props.value, label: props.value }
      : { value: "", label: props.sinElegir ?? opciones[0].label });
```

El texto de «sin elegir» se pinta más tenue que una opción real —`text-muted-2`—
para que se distinga de un valor escogido, y no entra en la lista desplegable:
solo se sale de él eligiendo algo.

Usarla en `tipoPerfil` (`sinElegir="Elige el perfil"`), en las dos recogidas
(`sinElegir="Elige la recogida"`) y en el modo de ollaos
(`sinElegir="Elige el reparto"`), pasándoles además su `error`.

- [ ] **Step 4: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde. Si `tsc` sigue quejándose, quedan consumidores por cerrar: son la Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace
git commit -m "feat: controles que distinguen «no» de «sin elegir»"
```

---

### Task 4: El dibujo, la hoja y la importación de RPS

**Files:**
- Modify: `src/lib/rps/aplicar-linea.ts`
- Modify: `src/components/workspace/Escena3D.tsx`
- Modify: `src/components/workspace/Workspace.tsx`
- Modify: `src/lib/pdf/PlanteamientoPdf.tsx`
- Modify: `src/lib/pdf/datos-geometria.ts`
- Modify: `src/lib/excel/planteamiento-excel.ts`
- Modify: `src/lib/rps/__tests__/aplicar-linea.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Añadir a `src/lib/rps/__tests__/aplicar-linea.test.ts`:

```ts
describe("RPS resuelve lo que sabe y deja sin elegir lo que no", () => {
  it("resuelve las recogidas y la ventana, que RPS siempre afirma", () => {
    const creado = crearInputDesdeRps(pedido, linea({
      recogidaDelante: true, recogidaAtras: false, ventana: true,
    }), 0, [], DEFAULT_PARAMS);
    const input = creado.input as LonaInput;
    expect(input.recogeDelante).not.toBe("");
    expect(input.recogeAtras).not.toBe("");
    expect(input.ventana).toBe(true);
  });

  it("deja la rotulación sin elegir cuando RPS no lo dice", () => {
    // LineaPedidoRps declara rotulacion: boolean | null, con null cuando RPS no
    // aporta el dato. Esa distinción tiene que llegar hasta el formulario.
    const creado = crearInputDesdeRps(pedido, linea({ rotulacion: null }), 0, [], DEFAULT_PARAMS);
    expect((creado.input as LonaInput).rotulacion).toBeNull();
  });

  it("la resuelve cuando RPS sí lo dice", () => {
    const creado = crearInputDesdeRps(pedido, linea({ rotulacion: true }), 0, [], DEFAULT_PARAMS);
    expect((creado.input as LonaInput).rotulacion).toBe(true);
  });

  it("no inventa el perfil ni el reparto de ollaos, que RPS no aporta", () => {
    const creado = crearInputDesdeRps(pedido, linea({}), 0, [], DEFAULT_PARAMS);
    const input = creado.input as LonaInput;
    expect(input.tipoPerfil).toBe("");
    expect(input.modoOllaos).toBe("");
  });
});
```

Los ayudantes `pedido` y `linea` ya existen en ese fichero de test; usar los que haya y ampliarlos con `Partial<LineaPedidoRps>` si hace falta.

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm exec vitest run src/lib/rps/__tests__/aplicar-linea.test.ts`
Expected: FAIL — hoy `crearInputDesdeRps` parte de `emptyLona()` y por tanto heredaba los valores por defecto; tras la Task 1 hereda los vacíos, así que las recogidas y la ventana tampoco se resuelven.

- [ ] **Step 3: Resolver en la importación**

En `src/lib/rps/aplicar-linea.ts`, al construir el input desde la línea:

```ts
    // RPS siempre se moja con las recogidas y la ventana.
    recogeDelante: linea.recogidaDelante ? "SEGUN SE INDICA" : "NO",
    recogeAtras: linea.recogidaAtras ? "SEGUN SE INDICA" : "NO",
    ventana: linea.ventana,
    // Pero la rotulación puede venir sin decidir, y así se queda.
    rotulacion: linea.rotulacion,
```

`tipoPerfil`, `modoOllaos` y `bastillaEnfundar` no vienen de RPS: se quedan como los deja `emptyLona()`, sin elegir. Revisar el código actual: si hoy asigna alguno de los tres, quitarlo — estaba inventando un dato que RPS no da.

El texto exacto de las recogidas debe ser el que ya usa el fichero hoy; no cambiarlo, solo conservarlo.

- [ ] **Step 4: Que el dibujo no finja**

En `src/components/workspace/Escena3D.tsx`, `Escena3DProps.tipoPerfil` pasa a
`TipoPerfil | ""`, y la condición de validez exige que se haya elegido. Sin
perfil no hay forma que dibujar, y la escena muestra su hueco igual que cuando
faltan las medidas:

```tsx
  // Un baquetón siempre se dibuja recto; una lona necesita que se haya elegido
  // el perfil, y que estén las medidas que ese perfil pide.
  const geometriaPerfilCompleta = props.modo === "baqueton"
    || props.tipoPerfil !== ""
      && (!["TIPO 02", "TIPO 03"].includes(props.tipoPerfil) || (props.aguas ?? 0) > 0)
      && (props.tipoPerfil !== "TIPO 04" || (props.chaflan ?? 0) > 0)
      && (props.tipoPerfil !== "TIPO 05" || (props.radioEsquina ?? 0) > 0);
```

`bastillaEnfundar` y `ventana` pasan a `boolean | null`. La línea
`const bastilla = props.modo === "lona" && (props.bastillaEnfundar ?? false);` ya
trata bien el `null`; comprobar que ninguna otra comparación use `=== false`, que
sí distinguiría mal.

En `src/components/workspace/Workspace.tsx`, ajustar el tipo de lo que se pasa a
la escena.

- [ ] **Step 5: Que la hoja no imprima un «NO» que nadie ha dicho**

En `src/lib/pdf/PlanteamientoPdf.tsx`, los tres booleanos se imprimen hoy con `i.rotulacion ? "SÍ" : "NO"`, que convierte «sin elegir» en «NO». Sustituir por un ayudante local que devuelva `"-"` cuando el valor es `null`, como ya hace `Dato` con los textos vacíos:

```tsx
const siNo = (valor: boolean | null | undefined) => (valor == null ? "-" : valor ? "SÍ" : "NO");
```

En `src/lib/pdf/datos-geometria.ts`, `tipoPerfil` puede ser `""`: devolver `["PERFIL SIN ELEGIR"]` en ese caso, en vez de dejar que `nombrePerfil` reciba un valor vacío.

**Y el mismo tratamiento en `src/lib/excel/planteamiento-excel.ts`**, que exporta la
misma hoja a Excel desde `/api/excel` y tiene el patrón idéntico: `siNo(i.bastillaEnfundar)`
y `siNo(i.rotulacion)` en las líneas 142 y 153, `i.rotulacion ? "SÍ" : "NO"` en la 178,
`nombrePerfil(i.tipoPerfil)` en la 140 y `i.modoOllaos` crudo en las 150, 177 y 313.
Su ayudante `siNo` acepta hoy solo `boolean`: ampliarlo a `boolean | null` devolviendo
`"-"`, igual que en el PDF.

Este fichero no estaba en el plan original y lo encontró la Task 1 al listar lo que
`tsc` señalaba. Es un exportador vivo, así que quedarse fuera habría dejado un camino
por el que «sin elegir» sale impreso como «NO».

En la práctica un pedido completado no llega aquí con nada sin elegir; esto es para que una vista previa a medias no mienta.

- [ ] **Step 6: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: todo en verde, y `tsc` limpio por fin.

- [ ] **Step 7: Commit**

```bash
git add src/lib src/components
git commit -m "feat: RPS resuelve lo que sabe y el dibujo no finge lo que falta"
```

---

### Task 5: Comprobación de Iván

**Esta tarea la ejecuta Iván.** Ningún test dice si el formulario se usa bien.

- [ ] **Step 1: Un remolque nuevo**

Arrancar `pnpm dev`, abrir un pedido y añadir un remolque. El tipo de perfil, la ventana, las dos recogidas, la rotulación, la bastilla y los ollaos deben salir **sin elegir**, y no debe haber dibujo.

- [ ] **Step 2: Rellenar solo medidas**

Poner largo, ancho, alto y material. Debe seguir sin poder guardarse, y decir qué falta.

- [ ] **Step 3: Ir decidiendo**

Elegir el perfil: aparece el dibujo, todavía sin ollaos. Elegir el modo de ollaos: aparecen los ollaos y su tabla.

- [ ] **Step 4: Importar de RPS**

Importar una línea. Deben llegar resueltas las recogidas y la ventana; el perfil y los ollaos siguen sin elegir. Si la línea de RPS no dice nada de rotulación, debe quedar sin elegir.

- [ ] **Step 5: Un planteamiento antiguo**

Abrirlo desde el historial. Todo con sus valores, ningún campo sin elegir.

---

## Estado final esperado

| Fichero | Testeado |
|---|---|
| `src/lib/calc/lona.ts`, `baqueton.ts` | Sí: sin modo elegido no hay reparto |
| `src/lib/pedidos/validar-planteamiento.ts` | Sí: las siete decisiones |
| `src/components/workspace/entradas-vacias.ts` | Sí: una entrada vacía no está completa |
| `src/lib/rps/aplicar-linea.ts` | Sí: resuelve lo que RPS sabe |
| `campos.tsx`, los formularios, `Escena3D.tsx`, la hoja | No (comprobación de Iván) |
