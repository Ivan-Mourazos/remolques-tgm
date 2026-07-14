# Planteamientos de lonas de remolque y baquetones — Diseño

**Fecha:** 2026-07-13
**Estado:** aprobado por Iván (oficina técnica)
**Fuente de verdad del cálculo:** `Y:\PROGRAMAS CALCULO\REMOLQUE.G3M.FINAL.xlsb` (hojas MAES, TC, PAR, TIPOS, BAQUETÓN, LONA REMOLQUE, RPS)

## 1. Objetivo

Sustituir el Excel de cálculo de lonas de remolque altas y baquetones por una
web que:

1. Calcula paños, medidas hechas, ollaos y metros de tela **exactamente igual**
   que el Excel (verificado con tests contra casos reales).
2. Pinta en vivo un **dibujo 3D de la forma del remolque** mientras se teclean
   los datos (solo la forma: perfil, curva, alto, baquetón, pico, redondo…).
3. Genera un **PDF A4 apaisado** con el mismo contenido que los planteamientos
   actuales pero con diseño moderno, y lo guarda automáticamente en
   `\\FILESERVER\RPS\VENTAS\PLANTEAMIENTOS\<año>\<pedido>-<versión>.pdf`.
   **No** escribe nada en la base de datos de RPS.
4. Guarda un **historial** de planteamientos con posibilidad de **reutilizar**
   uno anterior como punto de partida.

Decisiones de alcance confirmadas:

- El **despiece** se sigue haciendo en ZWCAD: la web no genera archivos de corte.
- El **contorno** se introduce a mano (medida SCAD). Si el remolque es plano se
  usa la medida exacta; si lleva curva se le suman **1,5 cm**. Se redondea
  **hacia arriba al milímetro**.
- Sin subida a RPS (ni registros en BD ni adjuntos): solo el PDF en la carpeta.
- Reconstrucción por capas en este mismo repo (enfoque A). Las páginas y
  componentes actuales se retiran cuando la pantalla nueva los sustituya.

## 2. Arquitectura

Next.js 16 (App Router) en este repo, desplegado en un **servidor interno** con
acceso a la carpeta de PLANTEAMIENTOS.

| Capa | Contenido | Tecnología |
|---|---|---|
| Motor de cálculo | `src/lib/calc/` — funciones puras, sin React | TypeScript |
| Datos | Historial, materiales, parámetros | **SQL Server** (lo administra IT) vía `mssql`; driver alternativo de fichero JSON para desarrollo local |
| UI | Pantalla única `/planteamiento` con 3D en vivo | React + react-three-fiber (+ drei) |
| PDF | Generación en servidor y guardado en red | `@react-pdf/renderer` |

### Datos (SQL Server)

IT aprovisiona la base de datos; se le entrega un script `schema.sql` con:

- `Planteamientos`: id, tipo (`lona` \| `baqueton`), nº pedido, versión,
  cliente, JSON de entrada, JSON de resultado, usuario, fechas de creación y
  modificación, ruta del PDF generado.
- Materiales: se leen **directamente de RPS** (solo lectura, SQL Server
  `RPS_HOST/RPSNext`, usuario de solo lectura): artículos activos de la empresa
  001, subfamilia **PLASTICA (LONA)** (las lonas PVC, ~377), filtrando las
  variantes reales de bobina (descripción con patrón `:COLOR :ANCHO`). Caché
  de 1 hora en el servidor; si RPS no responde se usa la última caché o, en su
  defecto, las 50 lonas de la hoja **TC** del Excel como semilla de respaldo.
  (Decisión de Iván 2026-07-14: seleccionables todas las lonas PVC de RPS, no
  solo las del Excel.)
- `Parametros`: demasías y listas editables (contenido de la hoja **PAR**),
  versionadas por fecha para que un planteamiento antiguo conserve los valores
  con los que se calculó.

La capa de acceso se define como interfaz (`PlanteamientoStore`) con dos
implementaciones: `mssql` (producción) y fichero JSON local (desarrollo,
`DATASOURCE=file`), igual que el patrón usado en coordina-ot. Conexión por
variables de entorno (`DB_HOST`, `DB_DATABASE`, `DB_USER`…).

## 3. Motor de cálculo (réplica del Excel)

Unidades: **cm** en entradas y salidas, salvo indicación. Redondeos como el
Excel: `ROUND(x, 0)` para nº de ollaos, `ROUND(x, 1)` para distancias.
El contorno se redondea hacia arriba al mm.

### 3.1 Parámetros (hoja PAR — editables en ajustes)

Tipos de recogida (demasías en cm):

| Recogida | Delante | Atrás | Lateral solo atrás | Lateral solo delante |
|---|---|---|---|---|
| NO | 3 | 3 | — | — |
| GOMA | 27 | 27 | — | — |
| CREMALLERA | 3 | 3 | — | — |
| VELCRO | 27 | 27 | — | — |
| PUENTES ESVA | 21 | 21 | 19 | 19 |
| PUENTES LATERALES | 41 | 21 | 9 | 9 |
| PUENTES HIJOS DE PEDRO LOPEZ | 42,5 | 42,5 | 11,5 | 9 |

Constantes de lona remolque: demasía alto **4,5**; demasía en largo del paño
contorno **3** (normal) / **13** (bastilla de enfundar); demasía largo y ancho
de lona hecha **1**; paso de ollaos por defecto **35**; primer ollao a **2,5**;
aumento por curva de contorno **1,5**.

Demasías de baquetón por cliente específico (se **suman** a las generales):

| Concepto | GENERAL | HIJOS DE PEDRO LOPEZ | AYALA | GENERAL WOLDER |
|---|---|---|---|---|
| Largo p/ costura | 7 | +11 | +1 | −1 |
| Ancho p/ costura | 7 | +2 | +1 | −1 |
| Baquetón p/ costura | 2 | — | — | — |
| Baquetón en largo delante | — | +1 | 0 | −0,5 |
| Baquetón en largo detrás | — | +11 | 0 | −0,5 |
| Largo p/ medida final | 1 | 0 | +1 | 0 |
| Ancho p/ medida final | 1 | 0 | +1 | 0 |
| Baquetón trasero (HPL) | — | +10 | 0 | 0 |

Observaciones fijas GENERAL WOLDER (aparecen como notas): ollaos en alta
frecuencia; etiqueta en I.D. en la parte trasera entre los 2 ollaos más a la
derecha; mandar goma suelta.

Perfiles (hoja TIPOS): **TIPO 01** techo recto, **TIPO 02** dos aguas,
**TIPO 03** dos aguas redondeado, **TIPO 04** chaflán, **TIPO 05** esquinas en
curva. El croquis del tipo elegido aparece en el planteamiento.

### 3.2 Lona remolque

Entradas: cantidad, largo, ancho, alto delante, alto detrás, contorno SCAD,
perfil (TIPO 01–05), lleva curva (sí/no), recoge delante, recoge atrás,
bastilla de enfundar (sí/no), ventana, rotulación + texto, reparto de ollaos
(`REPARTIDOS` \| `SEGÚN SE INDICA` con hasta 12 posiciones manuales por lado;
en el Excel esta segunda opción aparece también como «A LA MEDIDA»),
paso de ollaos, material, más cabecera (pedido, cliente, revisión, realizado
por, fechas).

Salidas (fórmulas del Excel, celdas de referencia):

- **Lona hecha** (`C27`,`C28`): `largo + 1` × `ancho + 1`. Alto informativo.
- **Contorno ajustado**: `contornoSCAD (+ 1,5 si curva)`, redondeo ↑ al mm.
- **Paño delantero** (`G10`): `cantidad` paños de
  `ancho + recogida(delante).delante` × `altoDelante + 4,5`.
- **Paño trasero** (`G11`): `cantidad` paños de
  `ancho + recogida(atrás).delante` × `altoTrasero + 4,5`.
  ⚠️ El Excel usa la columna **DELANTE** también para el paño trasero (ver
  pendiente P1).
- **Paño contorno** (`G12`): `cantidad` paños de
  `largo + (13 si enfundar, si no 3) + recogida(delante).lateralSoloDelante +
  recogida(atrás).lateralSoloAtras` × `contornoAjustado`.
- **Ollaos** (`C36–C40`): `nLargo = ROUND(largo / paso, 0)`;
  `distLargo = ROUND(largo / nLargo, 1)`; ídem ancho sobre el **ancho hecho**
  (`C28`). Reparto: posición 1 = **2,5**, siguientes `+dist` hasta `n`
  posiciones (máx. 12). En modo `SEGÚN SE INDICA` las posiciones se teclean.
  Tres filas: laterales (de atrás a adelante), atrás y delante (de izquierda a
  derecha).
- **Metros de tela** (hoja RPS `D7`): suma de los anchos de los tres paños ×
  cantidad ÷ 100 → metros lineales de bobina. Se muestra junto al código de
  bobina del material (tabla TC).
- **Notas automáticas**: goma (orejas), ventana, curva +1,5, rotulación,
  observaciones de cliente.

### 3.3 Baquetón

Entradas: cantidad, largo, ancho, baquetón, cliente específico (GENERAL / HPL /
AYALA / GENERAL WOLDER), reparto de ollaos, paso, descripciones de ollaos
(delante/lados/atrás), rotulación + texto, material, cabecera.

Salidas:

- **Paño único** (`C26`,`C27`):
  `largo + 2×baquetón + 7 + extraCliente.largoCostura` ×
  `ancho + 2×baquetón + 7 + extraCliente.anchoCostura`.
- **Baquetón + costura** (`C28`): `baquetón + 2`. Esquinas del dibujo
  (`L10`/`AD10`): `baquetónCostura + extraCliente.baquetónLargoDetrás/Delante`.
- **Medidas remolque hecho** (`G21`,`G22`): `largo + 1 + extraCliente.largoFinal`
  × `ancho + 1 + extraCliente.anchoFinal`. Baquetón «EN LÍNEA»; para HPL además
  baquetón trasero `baquetón + 10` «NO EN LÍNEA» y nota «ABIERTO EN LA PARTE
  TRASERA (REFORZAR)».
- **Superficie**: `paño largo × paño ancho / 10000` m²/unidad.
- **Ollaos**: como en lona, pero sobre las **medidas hechas** (`G21`,`G22`).
- **Metros de tela** (RPS `D6`): `cantidad × paño largo / 100`.

### 3.4 Verificación

Tests (Vitest) del motor contra casos reales:

- Pedido **AR2602796** (planteamientos impresos en
  `R:\VENTAS\PLANTEAMIENTOS\2026\`): baquetón con paño 232×172, esquinas 24 y
  baquetón 22 «EN LÍNEA»; lona con paños 154×66,5 / 253×270 y lona hecha
  251×152. (Sus posiciones de ollaos impresas eran del modo «según se
  indica» —tecleadas a mano— y no sirven para verificar el reparto automático.)
- Casos sintéticos por cada recogida, bastilla, cliente de baquetón, perfil y
  el reparto automático de ollaos, con valores esperados calculados abriendo el
  Excel real.

Ningún cálculo se considera correcto sin cuadrar con el Excel.

## 4. Pantalla de trabajo (`/planteamiento`)

Una página con selector **Lona remolque / Baquetón**:

- **Izquierda — formulario** agrupado: cabecera, medidas, configuración
  (perfil con croquis, recogidas, bastilla, ventana, rotulación), ollaos,
  material (buscador sobre la tabla de materiales). Validación en vivo con
  avisos no bloqueantes.
- **Derecha arriba — 3D** (react-three-fiber): forma del remolque con el perfil
  elegido y proporciones reales; radio de curva visible; en baquetón, lona
  plana con baquetón perimetral. Órbita/zoom, luz de estudio, fondo neutro.
  Se actualiza con cada cambio del formulario.
- **Derecha abajo — resultados en vivo**: paños a cortar, lona hecha, metros de
  tela + código bobina, tabla de reparto de ollaos (12 posiciones × 3 filas),
  superficie m², notas automáticas.
- Acciones: **Guardar** (historial), **Generar PDF** (guarda en red y
  descarga), **Reutilizar** (desde `/historial`, carga los datos en el
  formulario como nueva versión).

## 5. PDF

- A4 **apaisado**, `@react-pdf/renderer` en el servidor. Contenido igual al
  planteamiento actual (cabecera TGM con pedido/OF/cliente/revisión/realizado/
  fecha; bloque de datos; croquis del perfil o paño de baquetón con esquinas y
  cotas; tabla de reparto de ollaos; material y observaciones) con tipografía y
  jerarquía modernas. Incluye instantánea de la vista 3D (capturada en el
  cliente como PNG y enviada al servidor).
- Guardado: **la app no escribe en red** (decisión de Iván 2026-07-14, tras un
  incidente de escritura accidental en producción durante el desarrollo). Al
  generar el PDF se abre el diálogo **«Guardar como»** del navegador (File
  System Access API con nombre sugerido `<pedido>-<versión>.pdf`; si el
  navegador no lo soporta, descarga normal con ese nombre). El usuario elige
  la carpeta — normalmente `R:\VENTAS\PLANTEAMIENTOS\<año>\`.

## 6. Manejo de errores

- Formulario: los campos incompletos no rompen el cálculo — los resultados que
  dependan de ellos se muestran vacíos (como el Excel con `IFERROR`).
- BD inaccesible: la pantalla de cálculo sigue funcionando (los parámetros se
  cachean); guardar/historial muestran error claro y reintentable.
- Fallo al generar el PDF: la web muestra un aviso claro y el planteamiento
  guardado no se ve afectado (el PDF se puede regenerar en cualquier momento).

## 7. Pendientes de confirmar

- **P1 — Demasía del paño trasero**: el Excel usa la columna DELANTE para ambos
  paños (solo difiere en PUENTES LATERALES: 41 vs 21). Iván lo consulta.
  Mientras tanto se replica el Excel tal cual, con la alternativa implementada
  tras una constante (`USAR_COLUMNA_ATRAS`) lista para activar.
- **P2 — Sufijo del nombre del PDF**: existen `-1`, `-2`, `-10`, `-20`
  (¿línea de pedido + versión?). Confirmar la regla exacta antes de implementar
  el guardado; el campo «versión» del formulario es editable en todo caso.
- **P3 — SQL Server**: IT debe aprovisionar BD y usuario de escritura; se le
  entrega `schema.sql`. Hasta entonces, desarrollo con driver de fichero local.

## 8. Fuera de alcance

- Escritura en la BD de RPS (registros, adjuntos, artículos).
- Archivos de corte / despiece (se sigue haciendo en ZWCAD).
- Otros productos del Excel de TESTAR u otros programas de cálculo.
- Gestión de usuarios/permisos (herramienta interna de oficina técnica).
