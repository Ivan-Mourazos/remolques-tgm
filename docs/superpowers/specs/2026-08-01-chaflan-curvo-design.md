# Chaflán con aristas curvadas — Diseño

**Fecha:** 2026-08-01
**Bloque:** A de los tres pendientes (A · chaflán curvo, B · flujo del pedido, y
la calibración impresa del bloque 3a).

## Contexto

En una pieza real (pedido AR.26.03714, TIPO 04) Iván corrige el contorno a mano:
escribe 293,81 donde la aplicación calcula 285,5. La diferencia es de 8,31 cm.

La investigación sobre el CAD de oficina técnica destapó que la causa **no es la
curva**, sino que el campo «Chaflán esquina» significa una cosa distinta de la
que se mide.

### Lo que dice el CAD

El acotado de la esquina lleva cuatro números:

- **13,2** — la cara del chaflán entre los dos **vértices virtuales**: donde se
  cortarían las rectas si no hubiera curvas.
- **17,5** — la cuerda entre los dos **puntos de tangencia**: desde donde la
  pared deja de ser recta hasta donde el techo empieza a serlo.
- **R7** — radio de la curva contra la pared (abajo).
- **R7,5** — radio de la curva contra el techo (arriba).

El chaflán es de 45°, simétrico.

### La causa

`perfilForma` y `contornoCalculado` usan hoy `chaflan` como la **pata** —lo que
baja por la pared, igual a lo que entra por el techo—. Iván introducía 17,5, que
es la cuerda.

| | Pata | Contorno |
|---|---|---|
| Lo que entiende la aplicación con 17,5 | 17,5 | 285,5 |
| La pieza real | 9,33 | 293,8 |

El chaflán que dibuja la aplicación es casi el doble de profundo que el del
remolque, así que **no solo fallaba el contorno: el dibujo que llega al taller
también estaba mal**.

Las curvas son de segundo orden: recortan 1,25 cm de los 8,31 que faltaban. Cada
esquina recorta `2·r·tan(22,5°) − r·45°` = 0,043·r, unos 2 mm entre las cuatro
con radio 5.

### La comprobación

Con la cara entre vértices virtuales como parámetro:

```
cara = 13,2  →  pata = 13,2/√2 = 9,3338
tangente = radio · tan(22,5°):  abajo 7 → 2,8995   arriba 7,5 → 3,1066
contorno = 2·(90 − 9,3338) + 2·13,2 + (126 − 18,6676)
           − 2·[(2·2,8995 − 7·45°) + (2·3,1066 − 7,5·45°)]
         = 295,0648 − 1,2478
         = 293,817
```

El valor de la pieza es **293,81**. El modelo queda confirmado.

## Decisiones tomadas

- **El campo `chaflan` pasa a ser la cara entre vértices virtuales.** Es lo que
  el CAD acota directamente y la convención estándar de «chaflán teórico más
  radios tangentes», la misma que el TIPO 03 ya usa con cumbrera y hombros.
- **No se usa la cuerda entre tangencias (17,5) como parámetro**, aunque fuera
  la primera medida disponible: esa cuerda **depende de los radios**. Cambiar un
  radio obligaría a re-medir la misma pieza. La cara entre vértices virtuales es
  independiente y describe el chaflán aunque los radios cambien.
- **Dos radios distintos**, uno contra la pared y otro contra el techo, porque
  así viene la pieza.
- **Sin migración de datos.** Iván confirma que no ha usado la aplicación para
  planteamientos reales. Los registros antiguos cambian de forma y da igual.
- Español en código, nombres y textos. Sin dependencias nuevas.

## Arquitectura

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `src/lib/geometry/chaflan.ts` | Crear | Geometría de la esquina: pata, tangentes y acotado de radios. Puro. Único sitio del que beben perfil y contorno. |
| `src/lib/geometry/__tests__/chaflan.test.ts` | Crear | Pata, acotado en los tres frentes, radio cero. |
| `src/lib/geometry/perfil.ts` | Modificar | TIPO 04 inserta los dos arcos tangentes, como ya hace el TIPO 03. |
| `src/lib/geometry/contorno.ts` | Modificar | TIPO 04 descuenta los cuatro recortes. |
| `src/lib/calc/lona.ts` | Modificar | `LonaInput` gana `radioChaflanAbajo` y `radioChaflanArriba`. |
| `src/components/workspace/entradas-vacias.ts` | Modificar | Los dos radios a 0 por defecto. |
| `src/components/workspace/FormularioLona.tsx` | Modificar | Dos campos de radio, solo en TIPO 04; la etiqueta del chaflán deja claro qué se mide. |
| `src/lib/pdf/datos-geometria.ts` | Modificar | La línea de GEOMETRÍA muestra chaflán y radios. |

**La geometría de la esquina sale a su propio módulo** en vez de duplicarse
entre `perfil.ts` y `contorno.ts`. Hoy el TIPO 03 tiene esa duplicación —el
mismo acotado de radios escrito dos veces— y no conviene repetir el patrón. El
TIPO 03 no se toca.

## Las fórmulas

```
pata       = mín(chaflán / √2,  ancho/2,  alto)
cara       = pata · √2            ← la efectiva, tras acotar la pata
giro       = 45° en las dos esquinas  (π/4 radianes)
tangente   = radio · tan(22,5°)
cara recta = cara − tangenteAbajo − tangenteArriba
```

**`cara` es la efectiva, no el dato de entrada.** Si la pata se acota porque el
chaflán no cabe en el ancho o el alto, la cara se recalcula desde la pata
acotada. Todo lo que sigue —contorno, tangencias, perfil— usa `cara`, nunca el
`chaflán` crudo, o el contorno saldría más largo que la pieza.

**Acotado de los radios**, en tres frentes:

1. La tangente de abajo cabe en la pared: `tAbajo ≤ alto − pata`.
2. La tangente de arriba cabe en el techo: `tArriba ≤ ancho/2 − pata`.
3. Entre las dos no se comen la cara: `tAbajo + tArriba ≤ cara`.

Si no caben, se reducen proporcionalmente. Nunca se produce geometría imposible.

**Contorno** (los ángulos, en radianes: 45° = π/4):

```
contorno = 2·(alto − pata) + 2·cara + (ancho − 2·pata)
           − 2·[ (2·tAbajo − rAbajo·π/4) + (2·tArriba − rArriba·π/4) ]
```

**Perfil:** los centros de los arcos salen directos —el de abajo a distancia
`rAbajo` de la pared, el de arriba a `rArriba` del techo— y los arcos se
discretizan en puntos, como los del TIPO 03. Las aristas del dibujo van en las
tangencias, no en los vértices virtuales, también como el TIPO 03.

Comprobado con la pieza real, los puntos de tangencia caen sobre la recta del
chaflán (`y = x + 80,666`):

```
tangencia inferior (2,050 · 82,716)   →  82,716 = 2,050 + 80,666
tangencia superior (7,137 · 87,803)   →  87,803 = 7,137 + 80,666
tramo recto entre ambas = 7,194 = 13,2 − 2,900 − 3,107
```

## Verificación

El test que manda es la pieza real: ancho 126, alto 90, chaflán 13,2, radios 7 y
7,5 → contorno **293,81**. Si alguien toca esta geometría y ese número se mueve,
el test lo para.

Alrededor de él:

- Con radios a cero, la fórmula da exactamente la cerrada de siempre
  (`2(alto−pata) + 2·chaflán + (ancho−2·pata)`).
- Los radios que no caben se acotan: geometría válida, nunca `NaN` ni perfil
  cruzado.
- Los puntos de tangencia del perfil caen sobre la recta del chaflán, para
  cualquier combinación de radios.
- La pata nunca supera medio ancho ni el alto.

Lo que ningún test dice es si el dibujo *parece* la pieza. El criterio es de
Iván: introducir 13,2 con radios 7 y 7,5 y ver que el contorno calculado sale
293,81 **sin corregirlo a mano**.

## Consecuencia asumida

Al cambiar el significado del campo, **el dibujo de los TIPO 04 cambia de
forma**: el chaflán pasa a ser bastante menos profundo. No es un efecto
secundario, es la corrección.

## Fuera de alcance

- El flujo del pedido (bloque B).
- La calibración impresa del bloque 3a.
- El TIPO 03 y su duplicación de acotado de radios.
- Cualquier cambio en `src/lib/calc` más allá de los dos campos nuevos en
  `LonaInput`.
