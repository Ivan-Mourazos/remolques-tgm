# La hoja de taller y el dibujo — Diseño

**Fecha:** 2026-07-30
**Bloque:** 3a de los cuatro del «salto de calidad». Los bloques 1 (núcleo del
workspace) y 2 (feedback e interacción) ya están fusionados.

## Contexto

El dibujo técnico es el entregable real: se imprime y llega al taller. Hoy
parece un widget de web pegado en una hoja técnica.

Medido sobre el SVG guardado más reciente (2026-07-22, vista doble 1560×440):

- Dos **tarjetas redondeadas** de fondo, una por vista
  (`rect rx="18" fill="#ffffff" fill-opacity="0.64"`).
- **45 rellenos con degradado** y un filtro de desenfoque, `sombraLona`.
- La ventana como **rectángulo redondeado** (`rx="9"`) relleno al 38%.
- **Siete grosores de línea** distintos conviviendo sin criterio.
- Tipografía Plus Jakarta Sans, la misma de la aplicación.

Lo que ya está resuelto y **no** hay que rehacer: los ollaos se dibujan (23
círculos), las cotas son cotas de verdad con su marcador de flecha, y existe la
vista doble delantera y trasera.

La causa de fondo del mal resultado impreso: **el dibujo se diseña en color y
después se aplasta a gris**. El rasterizado aplica `grayscale(1) contrast(1.22)`
antes de componer el PDF. Nadie ha elegido esos grises: son lo que queda. Un
azul RAL 5015 y un verde 6024 acaban en grises casi iguales, y las tarjetas
blancas al 64 % se comen el contraste.

## Objetivo

Que el operario vea el remolque como va a quedar, con las medidas sin
ambigüedad, impreso en blanco y negro.

## Restricciones y decisiones

- **Impresión en blanco y negro sobre papel**, hoy. Iván prevé color o pantalla
  en el futuro, así que el diseño no puede quedar atado al gris.
- **Realismo fotográfico no es alcanzable** y no se promete: el dibujo se genera
  como SVG escrito a mano, no con un motor 3D. Un motor 3D exigiría dependencias
  nuevas y no se rasteriza limpio para el PDF.
- **Sin dependencias nuevas**, incluidas tipografías.
- **El contenido no cambia.** Paños, medidas, reparto de ollaos y textos están
  validados contra el Excel histórico. Este bloque cambia cómo se presenta,
  nunca qué dice.
- Español en código, nombres, comentarios y textos.

### El principio: autoría por valor, color como capa

Cada cara tiene una claridad decidida a propósito, con una única dirección de
luz para todo el dibujo: cubierta la más clara, lateral intermedio, frontal y
trasera más oscuros, caras ocultas al fondo de la escala. El RAL del material se
aplica **conservando ese valor** —se sustituye la luminosidad, se mantienen tono
y saturación—.

Consecuencia doble:

- **Hoy**, el paso a gris no destruye nada: los grises que salen son los
  elegidos, y el volumen se lee impreso.
- **Cuando llegue el color**, se apaga el filtro y el mismo dibujo sale en azul
  5015 o verde 6024 con el volumen intacto. Sin rehacer nada.

Es lo contrario de lo que hay ahora, donde el color se elige primero y el gris
es el residuo.

**Dos materiales distintos deben producir el mismo gris en la misma cara.** El
valor codifica la cara, no el material. Si un azul y un verde dieran grises
distintos, la cubierta de una lona azul se leería como el lateral de una verde y
el volumen dejaría de ser fiable. Cuál es el material lo dice el texto de la
hoja.

### La regla de la exageración

Viene de los operarios: cuanto más grandes y visibles los elementos, mejor;
«las variaciones de los cierres, algo exageradas para verse mejor, pero sin
pasarse». Es exageración esquemática, la misma de los manuales de despiece: un
cierre a escala real en un remolque de seis metros es una mota.

**Lo que se acota va a escala. Lo que se identifica va exagerado.**

- **El remolque** —largo, ancho, altos, aguas, chaflán, radios— a escala fiel,
  sin excepción. Es lo que lleva cotas.
- **La ventana, a escala**, porque lleva su cota (50 × 35).
- **Cierres, cremalleras, recogidas, bastilla y ollaos**, exagerados hasta
  distinguirse de un vistazo. No llevan cota: se identifican.

Así nadie puede medir mal, porque lo exagerado nunca es lo acotado.

**Precisión importante sobre los ollaos:** se exagera el **tamaño del símbolo**,
nunca su **posición**. Las posiciones vienen del reparto calculado y aparecen
listadas en la tabla del pie de la hoja; moverlas para que «quepan» mejor
convertiría el dibujo en una mentira contra su propia tabla. El símbolo crece;
el sitio donde va, no se toca.

## Arquitectura

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `src/lib/geometry/tono.ts` | Crear | Escala de valores por cara, dirección de luz y `aplicarValor(hex, valor)`. Puro. |
| `src/lib/geometry/__tests__/tono.test.ts` | Crear | Orden de valores estable con cualquier RAL; gris resultante igual al elegido. |
| `src/lib/geometry/caida.ts` | Crear | Descuelgue de bordes libres y pliegues desde puntos de tensión. Puro. |
| `src/lib/geometry/__tests__/caida.test.ts` | Crear | Magnitudes proporcionales al vano y acotadas; sin descuelgue donde la lona va sujeta. |
| `src/lib/geometry/color-lona.ts` | Modificar | Devuelve color por valor en vez de cuatro colores sueltos. |
| `src/components/workspace/Escena3D.tsx` | Modificar | Fuera tarjetas, sombra y degradados decorativos; tres pesos de línea; anotaciones con línea de referencia; elementos exagerados. |
| `src/lib/pdf/PlanteamientoPdf.tsx` | Modificar | Columna de datos reorganizada; el dibujo gana el espacio recuperado. |
| `src/lib/svg/rasterizar.ts` | Modificar | El monocromo deja de decidirse en la llamada; ver abajo. |

**Dónde vive la decisión del monocromo.** Hoy `rasterizarSvg(svg, { monocromo: true })`
está escrito literal en `useWorkspace`. Pasa a una constante única y exportada,
`SALIDA_MONOCROMA`, en `src/lib/pdf/`, que es lo que leen todas las llamadas. El
día que llegue la impresora en color se cambia ese valor en un sitio y ya está.
No se lee de variable de entorno ni se expone en la interfaz: no es una
preferencia del usuario, es una propiedad del taller, y hasta que cambie la
impresora no debe poder cambiarla nadie por accidente.

`Escena3D` tiene 775 líneas. Este bloque le saca la lógica pura —tono y
caída— a módulos testeables y deja el componente dibujando. No se reescribe
entero: solo lo que este bloque toca.

## El dibujo

**La silueta: tres pesos y no más.** Contorno exterior el más grueso, aristas
estructurales intermedio, detalle y anotación el más fino. Líneas ocultas,
discontinuas y finas. Hoy hay siete pesos sin criterio, que es tanto ruido como
no tener ninguno.

**La caída.** Tres señales, todas discretas:

- Los **bordes libres descuelgan**: donde la lona no está sujeta, la línea toma
  una curva muy suave. Es lo que más distingue tela de chapa.
- **Pliegues desde los puntos de tensión**: trazos cortos desde esquinas y
  ollaos perimetrales, siguiendo la superficie.
- **Cumbrera y hombro** siguen su curva real, que ya funciona y se conserva.

Advertencia de oficio: una lona de remolque va tensada, no es una sábana. Un
descuelgue excesivo deja de parecer realista, parece caricatura y confunde sobre
la forma real. Las magnitudes van proporcionales al vano libre y acotadas.

**Anotaciones con línea de referencia.** Cada palabra —CREMALLERA, BASTILLA
ENFUNDAR, la ventana— se une con un trazo fino al elemento que nombra, en vez de
flotar cerca. La capa de anotación va más fina y clara que el objeto, para no
competir con él.

**Se elimina** todo lo que delata la interfaz web: las dos tarjetas redondeadas,
el filtro `sombraLona` y los degradados decorativos.

**Tipografía.** Lo convencional sería una grotesca condensada, que se lee mejor
en cuerpos pequeños, pero añadir una fuente rompería la regla de no meter
dependencias. Se trabaja con lo disponible: mayúsculas espaciadas en
anotaciones, cifras tabulares en cotas, y un peso distinto del que usa la
aplicación, para que el dibujo no parezca una captura de pantalla.

## La hoja

En la hoja actual el dibujo ocupa poco más de la mitad de su hueco y a su
izquierda queda un vacío grande: la columna de datos se apelotona arriba, con
etiquetas subrayadas, y deja medio folio en blanco.

Reorganizar esa columna no es cosmética: **es de donde sale el espacio para
agrandar el dibujo**, que es lo que piden los operarios.

La columna pasa a una rejilla compacta de etiqueta y valor, sin subrayados,
agrupada por lo que se busca junto:

1. **Qué cortar** — paños y medida de lona hecha. Lo primero que necesita.
2. **Cómo es** — perfil, recogidas, ventana, rotulación.
3. **Con qué** — material.

Todo el ancho y alto recuperados van al dibujo.

## Verificación

Se testea lo puro: la escala de valores (orden entre caras estable con cualquier
RAL, gris resultante igual al elegido), la geometría de la caída (proporcional
al vano, acotada, ausente donde la lona va sujeta) y el factor de exageración
(que no se aplique a nada acotado).

Lo que ningún test puede decir es si *parece* un remolque. El criterio real es
el ojo, y la prueba obligatoria antes de dar el bloque por bueno es:

**Generar la hoja de un pedido conocido, imprimirla en la impresora del taller
en blanco y negro, y mirarla en papel.** No en pantalla: los valores que se leen
perfectos en un monitor se empastan con tóner. Es la única forma de calibrar la
escala tonal, y sin esa prueba el bloque no está terminado.

## Fuera de alcance

- Historial, acabado general y coherencia entre páginas (bloque 3b).
- Memoización de `Escena3D`, cálculo perezoso y rasterizado en paralelo
  (bloque 4).
- Cualquier cambio en `src/lib/calc` o en el contenido de la hoja.
- Un motor 3D real, y añadir tipografías.
