# La hoja de taller legible — Diseño

**Fecha:** 2026-09-07
**Bloque:** rediseño de `PlanteamientoPdf.tsx`. Va antes del bloque de revisión y
producción (`2026-09-03-revision-y-produccion-design.md`), que heredará estas
piezas para su ficha de revisión.

## El problema

La hoja de hoy es una cuadrícula: marco negro de 1 pt alrededor de todo, una
línea entre cada dato y una columna de datos de 200 pt fijos. En esa columna cae
todo, incluidas las observaciones, que salen partidas por la mitad —«DELANTE
VENTANA NOR-MAL»— mientras media página queda vacía por debajo del dibujo. El
tipo de letra es Helvetica, la única que trae `@react-pdf` de serie.

Dos cosas están mal a la vez: **lo que más se lee no tiene sitio** y **lo que hay
no se jerarquiza**. Los paños a cortar, que es lo que el operario hace con la
hoja, están en la misma letra y el mismo peso que la rotulación.

## La página

A4 apaisada (842 × 595 pt), margen de 20 pt —hoy son 10, por eso la hoja va tan
al borde—. Seis bandas de arriba abajo:

| Banda | Alto | Qué lleva |
|---|---|---|
| Cabecera | 52 pt | Logo · CLIENTE + revisión + realizado · Nº PEDIDO + O.F. + fecha |
| Identificación | 16 pt | `REMOLQUE · 1 DE 3` |
| A cortar | ~62 pt | Tres celdas a ancho completo: PAÑOS · LONA HECHA · CONTORNO |
| Cuerpo | elástico | Columna de datos de 230 pt + dibujo con el ancho restante |
| Material y observaciones | ~60 pt, crece | A ancho completo |
| Ollaos | ~78 pt | La tabla de siempre, reafinada |

**El cuerpo es la única banda elástica.** Todas las demás piden su alto y el
cuerpo se queda el resto. Así, unas observaciones largas le comen alto al dibujo
en vez de desbordar la página o perderse.

**Espacio de observaciones:** a ancho completo son 802 pt ≈ 150 caracteres por
línea a 9,5 pt. Cinco líneas —unos 750 caracteres— caben sin que el dibujo se
entere. Hoy caben unos 120.

## La banda «a cortar»

Sube arriba del todo y va en números grandes, porque es lo que el taller hace con
la hoja:

```
PAÑOS A CORTAR              LONA HECHA           CONTORNO DE CORTE
1 PAÑO DE 160 × 124,5       301 × 158            399,6
1 PAÑO DE 184 × 124,5       ALTO 120
1 PAÑO DE 303 × 399,6
```

Los anchos y altos distintos delante/detrás salen bajo su medida, en pequeño, en
vez de como filas sin etiqueta colgando de la lona hecha. En baquetón las tres
celdas son PAÑO A CORTAR · MEDIDA REMOLQUE · BAQUETÓN.

Dos arreglos que van de paso: el plural («2 PAÑOS DE», no «2 PAÑO DE») y la × de
multiplicar de verdad en lugar de la equis minúscula.

## El cuerpo

A la izquierda, 230 pt de datos en dos grupos separados por un filete, cada uno
con su rótulo pequeño en versalitas:

- **FORMA** — perfil y geometría (los radios o el chaflán que ese tipo use)
- **ACABADOS** — recoge delante, recoge atrás, ventana, rotulación

El modo de ollaos **sale de la columna**: ya lo dice el título de la tabla de
ollaos, y repetirlo era gastar una línea en decir dos veces lo mismo.

A la derecha, el dibujo con todo el ancho que quede. La imagen se ajusta al
contenedor (`objectFit: contain`), así que su tamaño lo decide la banda, no al
revés.

## Material y observaciones

Los dos a ancho completo, bajo el cuerpo, porque los dos son texto largo y en una
columna de 230 pt no caben. Material en una línea; observaciones debajo, a 9,5 pt
**Regular** con interlineado 1,35 —el texto largo en negrita se lee peor— y sin
límite de líneas: si crecen, crecen, y el dibujo cede.

**Los opcionales vacíos salen como «—», no desaparecen.** Es el mismo criterio ya
fijado para la ficha de revisión: que un dato no esté puesto es justo lo que hay
que poder ver.

## La banda de identificación

Donde hoy pone `REMOLQUES` en todas las páginas —también en las de baquetón—
pasa a poner `REMOLQUE · 1 DE 3` o `BAQUETÓN · 2 DE 3`. Deja de mentir, y quien
tiene tres hojas en la mano sabe cuál es cuál y si le falta alguna.

## Tipografía

**Inter**, incrustada en el repo en tres pesos (Regular 400, SemiBold 600, Bold
700) bajo `src/lib/assets/fuentes/`. Licencia SIL; son ficheros, no una
dependencia npm nueva. Se eligió por los números: a 8 pt su 1, su 7 y su 0 no se
confunden entre sí, que es lo único que importa en una hoja de medidas.

`src/lib/pdf/fuentes.ts` la registra una sola vez, leyendo los `.ttf` con
`readFileSync` igual que hace `logo-tgm.ts` con el logo. **Si el fichero faltase,
no se registra y la hoja sale en Helvetica**: un PDF no puede dejar de generarse
por una fuente.

Escala:

| Papel | Tamaño | Peso |
|---|---|---|
| Rótulo de grupo | 6,5 pt, espaciado 0,8 | SemiBold, gris |
| Etiqueta de dato | 7,5 pt | Regular, gris |
| Valor | 9,5 pt | SemiBold, negro |
| Números de «a cortar» | 15 pt | Bold |
| Nº de pedido y cliente | 12 pt | Bold |
| Observaciones | 9,5 pt, interlineado 1,35 | Regular |
| Tabla de ollaos | 7 pt cabecera / 8 pt celda | SemiBold / Regular |

## Acabado

Fuera el marco exterior y la cuadrícula. Las bandas se separan con filetes grises
de 0,5 pt. La tabla de ollaos **sí** conserva sus líneas, porque ahí sí hay filas
y columnas de verdad.

La hoja se imprime en la impresora monocroma del taller (`SALIDA_MONOCROMA`), así
que todo el diseño está pensado en grises: menos tinta compitiendo con los
números. Sin fondos grandes de fondo gris, que ensucian al fotocopiar.

## Qué se toca

| Archivo | Qué |
|---|---|
| `src/lib/pdf/datos-hoja.ts` | nuevo: celdas de la banda de corte, grupos etiqueta→valor, título de página, plural de paños |
| `src/lib/pdf/fuentes.ts` | nuevo: registro idempotente de Inter con caída a Helvetica |
| `src/lib/assets/fuentes/*.ttf` | nuevo: Inter Regular, SemiBold y Bold |
| `src/lib/pdf/PlanteamientoPdf.tsx` | reescrito: solo pinta |
| `src/app/api/pdf/route.tsx` | sin cambios |

`PlanteamientoPdf.tsx` se queda **solo pintando**. Lo que hoy decide dentro del
JSX —qué paños listar, qué geometría sacar, cómo se llama la página— sale a
`datos-hoja.ts`, puro y testeable en node, como manda el proyecto. `PaginaPlanteamiento`
recibe el índice y el total, que la ruta ya tiene en la mano.

`datosGeometriaPdf` se queda donde está y `datos-hoja.ts` la llama: ya está
testeada y no cambia.

## Tests

Vitest sobre módulos puros, `environment: "node"`:

- **`textoPanos`:** cantidad 1 da «1 PAÑO DE», cantidad 2 da «2 PAÑOS DE».
- **`bandaCorte`:** una lona con ancho o alto distintos delante/detrás saca las
  dos medidas; una recta saca una sola. Un baquetón saca sus tres celdas, no las
  de la lona.
- **`gruposLona` / `gruposBaqueton`:** los opcionales vacíos salen como «—» y no
  desaparecen; el modo de ollaos no está entre los grupos; el baquetón no
  arrastra campos de lona.
- **`tituloPagina`:** lona da «REMOLQUE · 1 DE 3»; baquetón da «BAQUETÓN · 2 DE 3».
- **`fuentes`:** registrar dos veces no duplica el registro; sin ficheros no
  lanza.

## Verificación

Los tests no ven una página. Antes de dar esto por hecho se renderiza el PDF y
**se mira**, con cuatro casos: el pedido AR.26.04329 que trajo el encargo, un
baquetón, un TIPO 04 con chaflán y radios, y uno con observaciones largas para
comprobar que el dibujo cede alto y nada se pierde.

## Fuera de alcance

El Excel, que tiene su propio diseño. La ficha de revisión en PDF, que es del
bloque siguiente y reutilizará `datos-hoja.ts`. El color: la impresora del taller
es monocroma y eso ya está decidido en `salida.ts`.
