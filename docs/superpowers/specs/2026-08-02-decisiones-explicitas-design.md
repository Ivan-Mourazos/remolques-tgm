# Decisiones explícitas — Diseño

**Fecha:** 2026-08-02
**Bloque:** B1. Va antes que B2 (el flujo del pedido), porque la verificación al
completar un pedido no vale gran cosa si los campos que comprueba se aprueban
solos.

## El fallo

Un campo de decisión que arranca en un valor **que además es válido**. La
validación lo aprueba sin que nadie haya decidido, y la hoja llega al taller
diciendo algo que nadie afirmó.

Lo detectó Iván sobre los ollaos: `modoOllaos` nace en `"REPARTIDOS"` con un paso
por defecto, así que un remolque recién creado pasa la validación de ollaos sin
que nadie los haya mirado. La auditoría de `emptyLona()` y `emptyBaqueton()`
contra `erroresPlanteamiento` encontró la misma forma en más sitios.

Los campos que fallan bien —largo, ancho, alto, material, contorno y las medidas
que exige cada perfil— arrancan en 0 o en vacío, así que avisan. Estos no:

| Campo | Arranca en | Si se olvida |
|---|---|---|
| `tipoPerfil` | `TIPO 01` (recto) | **El más grave.** Un TIPO 01 no pide ningún dato extra, así que pasa la validación entera. Si la lona era de dos aguas o con chaflán, salen mal la forma, el contorno y el dibujo. |
| `modoOllaos` | `REPARTIDOS` | Reparto que nadie ha confirmado. |
| `ventana` | `false` | No se piden sus medidas; el operario hace la lona sin ventana. |
| `recogeDelante`, `recogeAtras` | `NO` | Cierre equivocado. RPS lo trae al importar; a mano, no. |
| `rotulacion` | `false` | Sale sin rotular. |
| `bastillaEnfundar` | `false` | Sin el refuerzo perimetral. |

Hay un precedente en el propio código que respalda el arreglo: `LineaPedidoRps`
declara `rotulacion: boolean | null` con el comentario «true/false si RPS lo dice
explícitamente; null si no aporta el dato». **El dominio ya distingue entre «no»
y «nadie lo ha dicho»**, y esa distinción se pierde en cuanto el dato entra en el
formulario.

## La regla

Ningún campo de decisión arranca en un valor válido. Todos nacen **sin elegir**, y
una línea no está lista hasta que se ha decidido.

«Sin elegir» no es una opción del desplegable: es la ausencia de elección.

## Cómo se representa

- `tipoPerfil`, `modoOllaos`, `recogeDelante`, `recogeAtras`: admiten `""`.
- `ventana`, `rotulacion`, `bastillaEnfundar`: pasan de `boolean` a
  `boolean | null`, con `null` como sin elegir.

`emptyLona()` y `emptyBaqueton()` arrancan todos sin elegir.
`erroresPlanteamiento` exige que estén decididos, con un mensaje que diga cuál.

**Los registros ya guardados traen valores reales**, así que abrir un
planteamiento antiguo no produce campos sin elegir.

## Consecuencias en el dibujo y la hoja

**Sin modo de ollaos elegido no se dibuja ningún ollao y la tabla sale vacía.** No
se enseña un reparto plausible que nadie ha confirmado: si no se ha decidido, la
hoja no finge que sí, y eso se ve en el dibujo antes incluso de leer el estado.

**Sin tipo de perfil elegido no hay dibujo.** No se puede dibujar una forma que
nadie ha escogido; el hueco muestra que falta el dato, como ya hace cuando faltan
las medidas.

Los demás campos sin elegir no dibujan su elemento: sin decidir la ventana no hay
ventana, sin decidir la bastilla no hay banda.

## Los controles

Una casilla de verificación no sabe decir «sin elegir»: marcada o no, siempre
afirma algo. Los tres booleanos pasan a un control de **Sí / No que arranca
vacío**, `CampoSiNo`, nuevo en `campos.tsx` y con el mismo aspecto que el resto.

Los desplegables (`tipoPerfil`, las recogidas, el modo de ollaos) arrancan sin
selección en vez de con la primera opción.

## La importación de RPS

`crearInputDesdeRps` **resuelve lo que RPS sabe y deja sin elegir lo que no**. Es
donde la distinción `boolean | null` de `LineaPedidoRps` por fin llega hasta el
final en vez de aplanarse:

- `recogidaDelante` y `recogidaAtras` son booleanos: RPS siempre se moja, así que
  se resuelven.
- `ventana` es booleano: se resuelve.
- `rotulacion` es `boolean | null`: se resuelve cuando RPS lo dice y **se deja sin
  elegir cuando devuelve `null`**.
- `tipoPerfil`, `modoOllaos` y `bastillaEnfundar` no vienen de RPS: se quedan sin
  elegir, y el usuario decide.

Hoy una línea importada llega con el perfil en TIPO 01 y los ollaos repartidos sin
que RPS haya dicho nada de ninguno de los dos.

## Arquitectura

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `src/lib/calc/lona.ts` | Modificar | `tipoPerfil`, `modoOllaos`, las recogidas admiten `""`; `ventana`, `rotulacion`, `bastillaEnfundar` pasan a `boolean \| null`. Sin modo de ollaos, el reparto sale vacío. |
| `src/lib/calc/baqueton.ts` | Modificar | Ídem para `modoOllaos` y `rotulacion`. |
| `src/lib/pedidos/validar-planteamiento.ts` | Modificar | Exigir que cada decisión esté tomada, con su mensaje. |
| `src/components/workspace/entradas-vacias.ts` | Modificar | Arrancar todo sin elegir. |
| `src/components/workspace/campos.tsx` | Modificar | `CampoSiNo`: Sí / No que arranca vacío. |
| `src/components/workspace/FormularioLona.tsx`, `FormularioBaqueton.tsx` | Modificar | Usar `CampoSiNo`; desplegables sin selección inicial. |
| `src/lib/rps/aplicar-linea.ts` | Modificar | Resolver lo que RPS sabe, dejar sin elegir lo que no. |
| `src/components/workspace/Escena3D.tsx` | Modificar | Sin perfil elegido, sin dibujo; sin modo de ollaos, sin ollaos. |
| `src/lib/pdf/PlanteamientoPdf.tsx`, `datos-geometria.ts` | Modificar | Tolerar el valor sin elegir; no imprimir «NO» donde nadie ha dicho que no. |

## Verificación

Se testea lo puro: que `emptyLona()` y `emptyBaqueton()` no pasen
`erroresPlanteamiento` por ninguno de los seis campos; que cada decisión tomada
retire su error; que el reparto salga vacío sin modo elegido; y que
`crearInputDesdeRps` resuelva lo que RPS sabe y deje sin elegir `rotulacion`
cuando RPS devuelve `null`.

Un test cierra el fallo de raíz: **una entrada vacía no puede estar completa**.
Hoy lo está en cuanto se rellenan las medidas y el material.

No se puede testear el formulario. La red es `tsc`, `lint` y un recorrido:

1. Crear un remolque nuevo: el tipo de perfil, la ventana, las recogidas, la
   rotulación, la bastilla y los ollaos salen sin elegir, y no hay dibujo.
2. Rellenar medidas y material: sigue sin poder guardarse, y dice qué falta.
3. Elegir el perfil: aparece el dibujo, todavía sin ollaos.
4. Elegir el modo de ollaos: aparecen los ollaos y la tabla.
5. Importar una línea de RPS: llegan resueltas las recogidas y la ventana; el
   perfil y los ollaos siguen sin elegir.
6. Abrir un planteamiento antiguo del historial: todo con sus valores, sin campos
   sin elegir.

## Fuera de alcance

- El flujo del pedido: la lista, los borradores, eliminar y completar (B2).
- `cantidad`, que arranca en 1: es lo normal y RPS lo trae.
- `clienteEspecifico` del baquetón, que arranca en `GENERAL`: entra en el
  cálculo, pero es el caso corriente y no se ha pedido.
- `anchoAtras` y `altoAtras` en 0, que significan «igual que delante» por
  convención documentada, no una decisión sin tomar.
