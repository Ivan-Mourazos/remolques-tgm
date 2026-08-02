"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Punto2D } from "@/lib/geometry/curva";
import { perfilForma } from "@/lib/geometry/perfil";
import { esquinaChaflan } from "@/lib/geometry/chaflan";
import {
  aristaLongitudinalVisible,
  caraExtrudidaVisible,
  recortarFueraDePoligono,
} from "@/lib/geometry/visibilidad";
import { calcularVentanaFrontal } from "@/lib/geometry/ventana";
import { coloresMaterial } from "@/lib/geometry/color-lona";
import { controlDescuelgue, flechaDescuelgue, tamanoSimbolo } from "@/lib/geometry/caida";
import type { TipoPerfil } from "@/lib/calc/params";

type Punto = Punto2D;

export interface Escena3DProps {
  modo: "lona" | "baqueton";
  largo: number;
  ancho: number;
  /** Ancho trasero si el remolque va sesgado; 0 o ausente = igual al delantero. */
  anchoAtras?: number;
  altoDelante: number;
  altoAtras: number;
  aguas?: number;
  /** Radio del arco de cumbrera (TIPO 03); 0 = pico vivo. */
  radioCumbrera?: number;
  /** Radio de los hombros (TIPO 03); 0 = esquina viva. */
  radioHombro?: number;
  /** Radio real de esquina (TIPO 05). */
  radioEsquina?: number;
  /** Chaflán real de esquina (TIPO 04). */
  chaflan?: number;
  /** Radio de la arista del chaflán contra la pared (TIPO 04); 0 = viva. */
  radioChaflanAbajo?: number;
  /** Radio de la arista del chaflán contra el techo (TIPO 04); 0 = viva. */
  radioChaflanArriba?: number;
  tipoPerfil: TipoPerfil;
  ventana?: boolean;
  ventanaAncho?: number;
  ventanaAlto?: number;
  /** Recogidas: unión vertical del paño de contorno con los paños delantero/trasero. */
  recogeDelante?: string;
  recogeAtras?: string;
  /** Refuerzo perimetral: se dibuja como contorno de doble línea. */
  bastillaEnfundar?: boolean;
  material?: string;
  observaciones?: string;
  onObservacionesChange?: (value: string) => void;
  baqueton?: number;
  /** Reparto de ollaos (cm desde el origen de cada tramo) para marcarlos en el dibujo. */
  ollaos?: { laterales: number[]; atras: number[]; delante: number[] };
  /** Entrega una función que devuelve el SVG serializado de la vista (o null). */
  onSnapshotReady?: (getSvg: (() => string | null) | null) => void;
}

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { maximumFractionDigits: 1 });

const puntosSvg = (puntos: Punto[]) =>
  puntos.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const puntoSvg = ({ x, y }: Punto) => `${x.toFixed(1)} ${y.toFixed(1)}`;

function caminoLineal(puntos: Punto[], mover = true): string {
  if (puntos.length === 0) return "";
  const inicio = mover ? `M ${puntoSvg(puntos[0])}` : "";
  return puntos.slice(1).reduce((camino, punto) => `${camino} L ${puntoSvg(punto)}`, inicio);
}

// Todos los perfiles se dibujan lineales: los arcos ya vienen discretizados
// en puntos densos y el pico del TIPO 03 con radio 0 debe quedar afilado.
function caminoPerfil(puntos: Punto[]): string {
  const baseIzquierda = puntos[0];
  const baseDerecha = puntos.at(-1)!;
  const cubierta = puntos.slice(1, -1);
  return `M ${puntoSvg(baseIzquierda)} L ${puntoSvg(cubierta[0])}${caminoLineal(cubierta, false)} L ${puntoSvg(baseDerecha)}`;
}

/**
 * La cubierta se rellena por franjas (un cuadrilátero por segmento del perfil):
 * un único polígono perfil-delantero→perfil-trasero deja sin cubrir las franjas
 * laterales cuando el cierre recto corta por debajo del chaflán o la vertiente.
 *
 * Solo se rellenan las que miran a la cámara. Las del lado oculto se proyectan
 * dentro del paño cercano y, al dibujarse después, lo tapan: el frente parecía
 * transparente y se veía asomar el chaflán del otro lado.
 *
 * `desplazamiento` es el índice del primer punto dentro del perfil completo,
 * porque aquí llegan los puntos del techo ya recortados.
 */
function franjasCubierta(
  frente: Punto[], fondo: Punto[], picoTecho: number, conCumbrera: boolean,
  perfilFrente: Punto[], perfilFondo: Punto[], desplazamiento: number,
): Array<{ puntos: Punto[]; lado: "izq" | "dcha" }> {
  const franjas: Array<{ puntos: Punto[]; lado: "izq" | "dcha" }> = [];
  const tramos = Math.min(frente.length, fondo.length) - 1;
  for (let i = 0; i < tramos; i += 1) {
    if (!caraExtrudidaVisible(perfilFrente, perfilFondo, i + desplazamiento)) continue;
    franjas.push({
      puntos: [frente[i], frente[i + 1], fondo[i + 1], fondo[i]],
      lado: conCumbrera && i >= picoTecho ? "dcha" : "izq",
    });
  }
  return franjas;
}

/* Colores propios del plano (inline: el snapshot SVG debe verse igual sin CSS).
   Neutros, no los de la interfaz: el dibujo es una hoja técnica, no una captura
   de la aplicación, y en gris un teal solo aporta un gris sin decidir. */
const COLOR_SILUETA = "#141414";
const COLOR_COTA = "#565656";
const COLOR_TEXTO_COTA = "#1f1f1f";
const COLOR_GUIA = "#9a9a9a";
const COLOR_RECOGIDA = "#1f1f1f";
const ANCHO_PANEL = 780;

/* La tipografía del dibujo se separa de la de la aplicación. Sin poder añadir
   una fuente, la distinción se consigue con familia, espaciado y cifras
   tabulares. Los textos ya vienen en mayúsculas en el contenido. */
const FUENTE_ANOTACION = "'Segoe UI Semibold','Segoe UI',Arial,sans-serif";
const FUENTE_COTA = "'Segoe UI',Arial,sans-serif";

/* Tres pesos de línea y no más: la silueta gana a todo, las aristas
   estructurales quedan en medio, y el detalle y la anotación nunca compiten.
   El halo blanco de los textos no es línea: es legibilidad sobre el dibujo. */
const TRAZO_SILUETA = 2.6;
const TRAZO_ARISTA = 1.4;
const TRAZO_FINO = 0.9;
const HALO_TEXTO = 4.5;

function Cota({
  desde, hasta, texto, rotacion = 0, textoDx = 0, textoDy = -7,
}: {
  desde: Punto; hasta: Punto; texto: string; rotacion?: number; textoDx?: number; textoDy?: number;
}) {
  const cx = (desde.x + hasta.x) / 2 + textoDx;
  const cy = (desde.y + hasta.y) / 2 + textoDy;
  return (
    <g>
      <line
        x1={desde.x} y1={desde.y} x2={hasta.x} y2={hasta.y}
        stroke={COLOR_COTA} strokeWidth={TRAZO_FINO} markerStart="url(#cota)" markerEnd="url(#cota)"
      />
      <text
        x={cx} y={cy} textAnchor="middle" fontSize="13" fontWeight="700"
        fontFamily={FUENTE_COTA} style={{ fontVariantNumeric: "tabular-nums" }}
        fill={COLOR_TEXTO_COTA} stroke="#ffffff" strokeWidth={HALO_TEXTO} paintOrder="stroke"
        strokeLinejoin="round" transform={`rotate(${rotacion} ${cx} ${cy})`}
      >
        {texto}
      </text>
    </g>
  );
}

interface Costura { x: number; yBase: number; yTop: number }

/**
 * Símbolo de la recogida sobre la costura vertical paño–contorno.
 *
 * Los cierres se identifican, no se miden: sus dimensiones pasan por
 * `tamanoSimbolo` para que las variaciones se distingan de un vistazo, tal
 * como pidieron los operarios. La posición de la costura no se toca.
 */
function SimboloRecogida({ costura, tipo }: { costura: Costura; tipo: string }) {
  const { x, yBase, yTop } = costura;
  const alto = yBase - yTop;
  if (alto < 14 || tipo === "NO" || !tipo) return null;

  if (tipo === "GOMA") {
    // cuerda elástica en zigzag a lo largo de la costura
    const amplitud = tamanoSimbolo(10) / 2;
    const paso = 13;
    const n = Math.max(2, Math.floor(alto / paso));
    let d = `M ${x.toFixed(1)} ${yBase.toFixed(1)}`;
    for (let i = 1; i <= n; i += 1) {
      const y = yBase - (alto * i) / n;
      const dx = i % 2 === 1 ? amplitud : -amplitud;
      d += ` L ${(x + dx).toFixed(1)} ${y.toFixed(1)}`;
    }
    return <path d={d} fill="none" stroke={COLOR_RECOGIDA} strokeWidth={TRAZO_ARISTA} strokeLinejoin="round" />;
  }

  if (tipo === "CREMALLERA") {
    // doble línea con dientes
    const medio = tamanoSimbolo(6) / 2;
    const dientes: Punto[] = [];
    for (let y = yBase - 6; y > yTop + 4; y -= 8) dientes.push({ x, y });
    return (
      <g stroke={COLOR_RECOGIDA} strokeWidth={TRAZO_ARISTA}>
        <line x1={x - medio} y1={yBase} x2={x - medio} y2={yTop} />
        <line x1={x + medio} y1={yBase} x2={x + medio} y2={yTop} />
        {dientes.map((p, i) => (
          <line key={i} x1={p.x - medio} y1={p.y} x2={p.x + medio} y2={p.y} />
        ))}
      </g>
    );
  }

  if (tipo === "VELCRO") {
    // franja rayada pegada a la costura
    const anchoFranja = tamanoSimbolo(8);
    const rayas: number[] = [];
    for (let y = yBase - 4; y > yTop + 3; y -= 7) rayas.push(y);
    return (
      <g stroke={COLOR_RECOGIDA} strokeWidth={TRAZO_ARISTA}>
        <rect x={x - anchoFranja / 2} y={yTop} width={anchoFranja} height={alto} fill="none" strokeWidth={TRAZO_FINO} />
        {rayas.map((y, i) => (
          <line key={i} x1={x - anchoFranja / 2} y1={y} x2={x + anchoFranja / 2} y2={y - 4} />
        ))}
      </g>
    );
  }

  if (tipo.startsWith("PUENTES")) {
    // trabillas repartidas por la costura
    const lado = tamanoSimbolo(9);
    const trabillas: number[] = [];
    for (let y = yBase - 12; y > yTop + 6; y -= 22) trabillas.push(y);
    return (
      <g stroke={COLOR_RECOGIDA} strokeWidth={TRAZO_ARISTA} fill="#ffffff">
        {trabillas.map((y, i) => (
          <rect key={i} x={x - lado / 2} y={y - lado / 2} width={lado} height={lado} rx={2} />
        ))}
      </g>
    );
  }

  return null;
}

interface OpcionesVista {
  modo: "lona" | "baqueton";
  tipoPerfil: TipoPerfil;
  largo: number;
  anchoNear: number;
  anchoFar: number;
  altoNear: number;
  altoFar: number;
  aguas: number;
  radioCumbrera: number;
  radioHombro: number;
  radioEsquina: number;
  chaflan: number;
  radioChaflanAbajo: number;
  radioChaflanArriba: number;
  conVentana: boolean;
  ventanaAncho: number;
  ventanaAlto: number;
  ollaosNear: number[];
  ollaosLaterales: number[];
  /** true en la vista delantera: los laterales se cuentan desde el fondo (atrás). */
  lateralesDesdeFar: boolean;
  /** Con bastilla de enfundar el dobladillo va sujeto: los bordes no ceden. */
  conBastilla: boolean;
}

/** Punto de una curva cuadrática en el parámetro t. */
const puntoEnCuadratica = (a: Punto, control: Punto, b: Punto, t: number): Punto => ({
  x: (1 - t) ** 2 * a.x + 2 * t * (1 - t) * control.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * t * (1 - t) * control.y + t ** 2 * b.y,
});

function calcularVista(o: OpcionesVista) {
  const perfil = o.modo === "baqueton" ? "TIPO 01" : o.tipoPerfil;
  const opts = (ancho: number, alto: number) => ({
    ancho,
    altoDelante: alto,
    alturaPico: o.aguas,
    radioCumbrera: o.radioCumbrera,
    radioHombro: o.radioHombro,
    chaflan: o.chaflan,
    radioChaflanAbajo: o.radioChaflanAbajo,
    radioChaflanArriba: o.radioChaflanArriba,
    radio: o.radioEsquina,
  });
  const forma = perfilForma(perfil, opts(o.anchoNear, o.altoNear));
  const near = forma.puntos;
  const farCalculado = perfilForma(perfil, opts(o.anchoFar, o.altoFar)).puntos;
  // Las dos caras se emparejan por índice para tejer las franjas y las aristas.
  // El número de puntos depende del acotado de radios, y ese acotado depende de
  // las medidas de cada cara: con un ancho o un alto trasero muy pequeño —algo
  // que pasa sin más al teclear medio número— la cara del fondo pierde arcos y
  // los índices dejarían de corresponderse, tejiendo un dibujo sin sentido.
  // Mientras no coincidan se usa la cercana también atrás: se ve un remolque
  // recto durante un instante, que es mucho mejor que basura geométrica.
  const far = farCalculado.length === near.length ? farCalculado : near;
  const maxY = Math.max(...near.map(([, y]) => y), ...far.map(([, y]) => y), 1);
  // Una única escala mantiene la proporción real ancho/alto. La profundidad
  // se comprime en perspectiva para que largos grandes sigan cabiendo en A4.
  const escala = Math.min(340 / Math.max(o.anchoNear, o.anchoFar, 1), 225 / maxY);
  const profundidadX = Math.min(220, Math.max(120, o.largo * escala * 0.48));
  const profundidadY = Math.min(100, Math.max(64, o.largo * escala * 0.24));
  const origenX = 100;
  const baseY = 344;
  const proyecta = (puntos: Array<[number, number]>, dx: number, dy: number) =>
    puntos.map(([x, y]) => ({
      x: origenX + x * escala + dx,
      y: baseY - y * escala - dy,
    }));
  const frente = proyecta(near, 0, 0);
  // El sesgado es simétrico: la cara del fondo se centra respecto a la cercana.
  const fondo = proyecta(far, profundidadX + ((o.anchoNear - o.anchoFar) / 2) * escala, profundidadY);
  const indicePicoFrente = near.reduce(
    (mejor, [, y], indice) => y > near[mejor][1] ? indice : mejor,
    0,
  );
  const techoFrente = frente.slice(1, -1);
  const techoFondo = fondo.slice(1, -1);
  const picoTechoFrente = indicePicoFrente - 1;
  const tieneCumbrera = o.modo === "lona"
    && o.aguas > 0
    && ["TIPO 02", "TIPO 03"].includes(o.tipoPerfil)
    && picoTechoFrente > 0
    && picoTechoFrente < techoFrente.length - 1;
  // `techoFrente` empieza en el índice 1 del perfil: de ahí el desplazamiento.
  const cubierta = franjasCubierta(
    techoFrente, techoFondo, picoTechoFrente, tieneCumbrera, frente, fondo, 1,
  );
  // Primero descartamos las aristas cuyas dos caras contiguas miran en
  // dirección opuesta a la cámara. Después, la cara cercana opaca recorta
  // cualquier tramo restante que se proyecte dentro de su contorno.
  const aristasLongitudinales = forma.aristas
    .filter((indice) => aristaLongitudinalVisible(frente, fondo, indice))
    .flatMap((indice) => (
      recortarFueraDePoligono({ desde: frente[indice], hasta: fondo[indice] }, frente)
    ));
  const contornoFrente = caminoPerfil(frente);
  const hombroDerecho = frente.at(-2)!;
  const picoFrente = frente[indicePicoFrente];
  const ventanaLocal = o.conVentana ? calcularVentanaFrontal(near, o.anchoNear, 5, {
    ancho: o.ventanaAncho,
    alto: o.ventanaAlto,
  }) : null;
  const ventana = ventanaLocal ? (() => {
    const x = origenX + ventanaLocal.x * escala;
    const y = baseY - (ventanaLocal.y + ventanaLocal.alto) * escala;
    const ancho = ventanaLocal.ancho * escala;
    const alto = ventanaLocal.alto * escala;
    const bordeInferior = y + alto;
    const hayMedidas = o.ventanaAncho > 0 && o.ventanaAlto > 0;
    // Normalmente las cotas quedan fuera: ancho debajo y alto a la izquierda.
    // En paños muy ajustados pasan dentro de la ventana para no pisar el contorno.
    const anchoDentro = baseY - bordeInferior < 44 && alto >= 44;
    const altoDentro = x - origenX < 32 && ancho >= 34;
    const yCotaAncho = anchoDentro ? bordeInferior - 25 : bordeInferior + 12;
    const xCotaAlto = altoDentro ? x + 12 : x - 18;
    return {
      x, y, ancho, alto,
      radio: Math.min(9, 4 * escala),
      cotas: hayMedidas ? {
        ancho: {
          desde: { x, y: yCotaAncho },
          hasta: { x: x + ancho, y: yCotaAncho },
          texto: fmt(o.ventanaAncho),
          guias: [
            { desde: { x, y: bordeInferior + (anchoDentro ? -3 : 3) }, hasta: { x, y: yCotaAncho + (anchoDentro ? 4 : 5) } },
            { desde: { x: x + ancho, y: bordeInferior + (anchoDentro ? -3 : 3) }, hasta: { x: x + ancho, y: yCotaAncho + (anchoDentro ? 4 : 5) } },
          ],
        },
        alto: {
          desde: { x: xCotaAlto, y },
          hasta: { x: xCotaAlto, y: y + alto },
          texto: fmt(o.ventanaAlto),
          guias: [
            { desde: { x: x + (altoDentro ? 3 : -3), y }, hasta: { x: xCotaAlto + (altoDentro ? -4 : -5), y } },
            { desde: { x: x + (altoDentro ? 3 : -3), y: y + alto }, hasta: { x: xCotaAlto + (altoDentro ? -4 : -5), y: y + alto } },
          ],
        },
      } : null,
    };
  })() : null;
  // Bordes inferiores: si la lona no va sujeta (sin bastilla de enfundar), el
  // dobladillo cede un poco. Es lo que distingue tela de chapa. El descuelgue
  // es una cuadrática cuyo control da `controlDescuelgue`.
  const bordeLibre = o.modo === "lona" && !o.conBastilla;
  const baseIzq = frente[0];
  const baseDcha = frente.at(-1)!;
  const fondoBase = fondo.at(-1)!;
  const ctrlFrente = bordeLibre ? controlDescuelgue(baseIzq, baseDcha) : null;
  const ctrlLateral = bordeLibre ? controlDescuelgue(baseDcha, fondoBase) : null;
  // Cierre del paño cercano para el relleno, y trazos de silueta del dobladillo.
  const cierrePinche = ctrlFrente
    ? ` Q ${puntoSvg(ctrlFrente)} ${puntoSvg(baseIzq)} Z`
    : " Z";
  const bordeInferiorFrente = ctrlFrente
    ? `M ${puntoSvg(baseIzq)} Q ${puntoSvg(ctrlFrente)} ${puntoSvg(baseDcha)}`
    : `M ${puntoSvg(baseIzq)} L ${puntoSvg(baseDcha)}`;
  const bordeInferiorLateral = ctrlLateral
    ? `M ${puntoSvg(baseDcha)} Q ${puntoSvg(ctrlLateral)} ${puntoSvg(fondoBase)}`
    : `M ${puntoSvg(baseDcha)} L ${puntoSvg(fondoBase)}`;
  // La cara lateral como camino, para que su borde inferior siga el descuelgue.
  const lateralCamino = `M ${puntoSvg(frente.at(-2)!)} L ${puntoSvg(baseDcha)}`
    + (ctrlLateral ? ` Q ${puntoSvg(ctrlLateral)} ${puntoSvg(fondoBase)}` : ` L ${puntoSvg(fondoBase)}`)
    + ` L ${puntoSvg(fondo.at(-2)!)} Z`;
  // Pliegues: la tela comprimida junto a las esquinas tensadas. Dos trazos
  // cortos por esquina, subiendo hacia el interior del paño.
  const largoPliegue = 2.2 * flechaDescuelgue(Math.abs(baseDcha.x - baseIzq.x));
  const pliegues = bordeLibre && largoPliegue > 4
    ? [baseIzq, baseDcha].flatMap((esquina, lado) => {
      const haciaCentro = lado === 0 ? 1 : -1;
      return [50, 70].map((angulo) => {
        const rad = (angulo * Math.PI) / 180;
        const desde = { x: esquina.x + haciaCentro * 4, y: esquina.y - 3 };
        const hasta = {
          x: desde.x + haciaCentro * Math.cos(rad) * largoPliegue,
          y: desde.y - Math.sin(rad) * largoPliegue,
        };
        return `M ${puntoSvg(desde)} L ${puntoSvg(hasta)}`;
      });
    })
    : [];
  // Marcas de ollaos sobre las aristas de base visibles (la trasera de esta
  // vista queda oculta tras el faldón). El símbolo va exagerado para que se
  // reconozca impreso; la posición sale del reparto calculado y no se toca.
  const radioOllao = tamanoSimbolo(4) / 2;
  const interpola = (a: Punto, b: Punto, t: number): Punto => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const enTramo = (
    posiciones: number[], medida: number, desde: Punto, hasta: Punto, control: Punto | null,
  ) =>
    medida > 0
      ? posiciones.filter((p) => p >= 0 && p <= medida).map((p) => (
        control
          ? puntoEnCuadratica(desde, control, hasta, p / medida)
          : interpola(desde, hasta, p / medida)
      ))
      : [];
  const lateralDesde = o.lateralesDesdeFar ? fondoBase : baseDcha;
  const lateralHasta = o.lateralesDesdeFar ? baseDcha : fondoBase;
  // Normal del borde lateral, apuntando hacia dentro de la lona.
  const largoLateral = Math.hypot(fondoBase.x - baseDcha.x, fondoBase.y - baseDcha.y);
  const normalLateral = {
    x: ((fondoBase.y - baseDcha.y) / largoLateral) * 6,
    y: (-(fondoBase.x - baseDcha.x) / largoLateral) * 6,
  };
  const insetOllao = radioOllao + 2.5;
  // Los ollaos van por dentro de la lona, no sobre el borde, y siguen el
  // dobladillo: si el borde cede, ellos ceden con él.
  const marcasOllaos = [
    ...enTramo(o.ollaosNear, o.anchoNear, baseIzq, baseDcha, ctrlFrente)
      .map((p) => ({ x: p.x, y: p.y - insetOllao })),
    ...enTramo(o.ollaosLaterales, o.largo, lateralDesde, lateralHasta, ctrlLateral)
      .map((p) => ({ x: p.x + normalLateral.x, y: p.y + normalLateral.y })),
  ];
  // Costuras verticales paño–contorno («el alto de los lados»): donde va la recogida.
  const costuraIzq: Costura = { x: frente[0].x, yBase: frente[0].y, yTop: frente[1].y };
  const costuraDcha: Costura = { x: frente.at(-1)!.x, yBase: frente.at(-1)!.y, yTop: frente.at(-2)!.y };
  // Bastilla de enfundar: banda paralela a los bordes de base visibles. Se
  // identifica, no se mide: su ancho pasa por la exageración de símbolos.
  const anchoBastilla = tamanoSimbolo(6);
  const bastillaBorde = `M ${puntoSvg(baseIzq)} L ${puntoSvg(baseDcha)} L ${puntoSvg(fondoBase)}`;
  const bastillaInterior = `M ${puntoSvg({ x: baseIzq.x, y: baseIzq.y - anchoBastilla })}`
    + ` L ${puntoSvg({ x: baseDcha.x, y: baseDcha.y - anchoBastilla })}`
    + ` L ${puntoSvg({
      x: fondoBase.x + normalLateral.x * (anchoBastilla / 6),
      y: fondoBase.y + normalLateral.y * (anchoBastilla / 6),
    })}`;
  const chaflanCota = o.modo === "lona" && o.tipoPerfil === "TIPO 04" && o.chaflan > 0
    ? (() => {
        // Los extremos de la cara no son siempre los vértices virtuales: cada
        // radio le consume `tangente·√½` a la recta del chaflán. No se leen de
        // frente.at(-3)/(-2): esos índices solo eran la cara cuando los dos
        // radios eran cero, porque cada arco curvado inserta puntos y desplaza
        // qué posición del array ocupa la cara.
        const esquina = esquinaChaflan({
          ancho: o.anchoNear, alto: o.altoNear, chaflan: o.chaflan,
          radioAbajo: o.radioChaflanAbajo, radioArriba: o.radioChaflanArriba,
        });
        if (!esquina) return null;
        // La cota va de vértice virtual a vértice virtual, que es exactamente
        // lo que mide el número escrito: la cara del chaflán. Acotar entre las
        // tangencias dibujaría una línea de la mitad de largo que su propia
        // cifra, y con radios que se comen la cara entera quedaría de longitud
        // cero. Que los arcos sobresalgan de la cota es lo normal en un plano.
        const { pata } = esquina;
        const [inicio, fin] = proyecta([
          [o.anchoNear - pata, o.altoNear],
          [o.anchoNear, o.altoNear - pata],
        ], 0, 0);
        const dx = fin.x - inicio.x;
        const dy = fin.y - inicio.y;
        const longitud = Math.hypot(dx, dy) || 1;
        const normalInterior = { x: -dy / longitud, y: dx / longitud };
        // La línea y su texto se separan de la arista siguiendo la perpendicular
        // del chaflán, para que la medida quede claramente dentro del paño.
        const desplaza = { x: normalInterior.x * 13, y: normalInterior.y * 13 };
        return {
          desde: { x: inicio.x + desplaza.x, y: inicio.y + desplaza.y },
          hasta: { x: fin.x + desplaza.x, y: fin.y + desplaza.y },
          angulo: Math.round(Math.atan2(dy, dx) * 180 / Math.PI * 100) / 100,
          texto: fmt(o.chaflan),
          textoDx: normalInterior.x * 11,
          textoDy: normalInterior.y * 11,
        };
      })()
    : null;
  const xCotaAguas = frente.at(-1)!.x + 34;
  const largoPerspectiva = Math.hypot(profundidadX, profundidadY) || 1;
  return {
    frente, fondo, aristasLongitudinales, contornoFrente,
    cierrePinche, bordeInferiorFrente, bordeInferiorLateral, lateralCamino,
    pliegues, radioOllao,
    cubierta, tieneCumbrera, ventana, marcasOllaos, costuraIzq, costuraDcha,
    bastillaBorde, bastillaInterior, chaflanCota,
    anchoDesde: { x: frente[0].x, y: baseY + 35 },
    anchoHasta: { x: frente.at(-1)!.x, y: baseY + 35 },
    altoDesde: { x: frente[0].x - 42, y: baseY },
    altoHasta: { x: frente[0].x - 42, y: baseY - o.altoNear * escala },
    largoDesde: { x: frente.at(-1)!.x + 20, y: frente.at(-1)!.y + 15 },
    largoHasta: { x: fondo.at(-1)!.x + 20, y: fondo.at(-1)!.y + 15 },
    largoTextoDx: (profundidadY / largoPerspectiva) * 15,
    largoTextoDy: (profundidadX / largoPerspectiva) * 15,
    // Redondeado: atan2 puede diferir en el último bit entre Node y navegador
    // y provocaría un aviso de hidratación en el atributo transform.
    anguloLargo: Math.round(Math.atan2(-profundidadY, profundidadX) * 180 / Math.PI * 100) / 100,
    aguasDesde: { x: xCotaAguas, y: baseY - (o.altoNear - o.aguas) * escala },
    aguasHasta: { x: xCotaAguas, y: baseY - o.altoNear * escala },
    aguasGuiaHombro: {
      desde: hombroDerecho,
      hasta: { x: xCotaAguas + 6, y: baseY - (o.altoNear - o.aguas) * escala },
    },
    aguasGuiaPico: { desde: picoFrente, hasta: { x: xCotaAguas + 6, y: baseY - o.altoNear * escala } },
    baseY,
  };
}

type VistaCalculada = ReturnType<typeof calcularVista>;

function PanelVista({
  d, titulo, etiquetaAlto, etiquetaAncho, altoNear, ancho, largo, mostrarLargo, mostrarAguas, aguas,
  recogida, bastilla, modo, colores,
}: {
  d: VistaCalculada;
  titulo: string;
  etiquetaAlto: string;
  etiquetaAncho: string;
  altoNear: number;
  ancho: number;
  largo: number;
  mostrarLargo: boolean;
  mostrarAguas: boolean;
  aguas: number;
  recogida: string;
  bastilla: boolean;
  modo: "lona" | "baqueton";
  colores: ReturnType<typeof coloresMaterial>;
}) {
  const hayRecogida = recogida !== "" && recogida !== "NO";
  return (
    <g>
      <text
        x={40} y={45} fontSize="12" fontWeight="700" letterSpacing="2"
        fontFamily={FUENTE_ANOTACION} fill="#4a4a4a"
      >
        {titulo}
      </text>
      {/* Tres planos visibles, tres valores propios: la cubierta mira arriba y
          recibe más luz, el frontal mira al observador y el lateral se va de
          la luz. El volumen sale de ese contraste, no de degradados que el
          paso a gris se comería. */}
      <g>
        {/* El pinche (paño delantero o trasero) cubre la cara cercana. */}
        <path d={`${d.contornoFrente}${d.cierrePinche}`} fill={colores.frontal} stroke="none" />
        {d.cubierta.map((franja, indice) => (
          <polygon
            key={indice}
            points={puntosSvg(franja.puntos)}
            fill={franja.lado === "dcha" ? colores.cubiertaLejana : colores.cubierta}
            stroke={franja.lado === "dcha" ? colores.cubiertaLejana : colores.cubierta}
            strokeWidth={TRAZO_FINO}
          />
        ))}
        <path d={d.lateralCamino} fill={colores.lateral} stroke="none" />
      </g>

      {d.ventana && (
        <g>
          {/* A través de la ventana se intuye el interior en penumbra. El
              redondeo es físico: las ventanas de lona llevan esquinas
              redondeadas. Va a escala porque lleva cota. */}
          <rect
            x={d.ventana.x} y={d.ventana.y}
            width={d.ventana.ancho} height={d.ventana.alto}
            rx={d.ventana.radio}
            fill="#1a1a1a" fillOpacity="0.35"
          />
          <rect
            x={d.ventana.x} y={d.ventana.y}
            width={d.ventana.ancho} height={d.ventana.alto}
            rx={d.ventana.radio}
            fill="none" stroke={COLOR_SILUETA} strokeWidth={TRAZO_ARISTA}
          />
          {d.ventana.cotas && (
            <g>
              {d.ventana.cotas.ancho.guias.map((guia, indice) => (
                <line key={`ancho-${indice}`} x1={guia.desde.x} y1={guia.desde.y}
                  x2={guia.hasta.x} y2={guia.hasta.y} stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO} />
              ))}
              <Cota desde={d.ventana.cotas.ancho.desde} hasta={d.ventana.cotas.ancho.hasta}
                texto={d.ventana.cotas.ancho.texto} textoDy={17} />
              {d.ventana.cotas.alto.guias.map((guia, indice) => (
                <line key={`alto-${indice}`} x1={guia.desde.x} y1={guia.desde.y}
                  x2={guia.hasta.x} y2={guia.hasta.y} stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO} />
              ))}
              <Cota desde={d.ventana.cotas.alto.desde} hasta={d.ventana.cotas.alto.hasta}
                texto={d.ventana.cotas.alto.texto} rotacion={-90} textoDx={-8} textoDy={0} />
            </g>
          )}
        </g>
      )}

      {d.aristasLongitudinales.map((arista, indice) => (
        <line
          key={indice}
          x1={arista.desde.x} y1={arista.desde.y}
          x2={arista.hasta.x} y2={arista.hasta.y}
          stroke="#3a3a3a" strokeWidth={TRAZO_ARISTA} strokeLinecap="round"
        />
      ))}
      {/* Pliegues: la tela comprimida junto a las esquinas tensadas. */}
      {d.pliegues.map((pliegue, indice) => (
        <path
          key={indice} d={pliegue} fill="none"
          stroke="#3a3a3a" strokeWidth={TRAZO_FINO} strokeLinecap="round" opacity="0.5"
        />
      ))}
      {/* La silueta completa —perfil y dobladillos— gana a todo lo demás. */}
      <path d={d.contornoFrente} fill="none" stroke={COLOR_SILUETA} strokeWidth={TRAZO_SILUETA} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d.bordeInferiorFrente} fill="none" stroke={COLOR_SILUETA} strokeWidth={TRAZO_SILUETA} strokeLinecap="round" />
      <path d={d.bordeInferiorLateral} fill="none" stroke={COLOR_SILUETA} strokeWidth={TRAZO_SILUETA} strokeLinecap="round" />
      {/* Bastilla de enfundar: refuerzo perimetral inferior, donde los ollaos →
          banda de doble línea a lo largo de los bordes de base visibles. */}
      {bastilla && (
        <>
          <path d={d.bastillaBorde} fill="none" stroke={COLOR_SILUETA} strokeWidth={TRAZO_ARISTA} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d.bastillaInterior} fill="none" stroke={COLOR_SILUETA} strokeWidth={TRAZO_FINO} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {d.marcasOllaos.map((marca, indice) => (
        <circle
          key={indice}
          cx={marca.x} cy={marca.y} r={d.radioOllao}
          fill="#ffffff" stroke={COLOR_SILUETA} strokeWidth={TRAZO_ARISTA}
        />
      ))}
      {/* El baquetón se destaca con más grosor, no con el dorado de la marca:
          ese oro pasado a gris queda más claro que la silueta negra sobre la
          que se dibuja, así que en la hoja impresa aparecía como una banda
          descolorida tapando el trazo bueno. */}
      {modo === "baqueton" && (
        <path
          d={d.contornoFrente} fill="none" stroke={COLOR_SILUETA}
          strokeWidth={TRAZO_SILUETA * 1.8} strokeLinecap="round" strokeLinejoin="round"
        />
      )}

      {/* Recogida: unión del paño de contorno con el paño de esta cara. */}
      {hayRecogida && (
        <g>
          <SimboloRecogida costura={d.costuraIzq} tipo={recogida} />
          <SimboloRecogida costura={d.costuraDcha} tipo={recogida} />
          {/* La anotación se une con un trazo a lo que nombra: sin línea de
              referencia, el nombre flota y hay que adivinar a qué se refiere. */}
          <line
            x1={d.costuraDcha.x - 14} y1={(d.costuraDcha.yBase + d.costuraDcha.yTop) / 2 - 4}
            x2={d.costuraDcha.x - 7} y2={(d.costuraDcha.yBase + d.costuraDcha.yTop) / 2 - 4}
            stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO}
          />
          <text
            x={d.costuraDcha.x - 16}
            y={(d.costuraDcha.yBase + d.costuraDcha.yTop) / 2}
            textAnchor="end"
            fontSize={recogida.length > 16 ? 9 : 11}
            fontWeight="700"
            fontFamily={FUENTE_ANOTACION}
            letterSpacing="0.6"
            fill={COLOR_TEXTO_COTA}
            stroke="#ffffff" strokeWidth={HALO_TEXTO} paintOrder="stroke" strokeLinejoin="round"
          >
            {recogida}
          </text>
        </g>
      )}
      {bastilla && (
        <g>
          <line
            x1={(d.frente[0].x + d.frente.at(-1)!.x) / 2} y1={d.baseY + 9}
            x2={(d.frente[0].x + d.frente.at(-1)!.x) / 2} y2={d.baseY + 1}
            stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO}
          />
          <text
            x={(d.frente[0].x + d.frente.at(-1)!.x) / 2}
            y={d.baseY + 19}
            textAnchor="middle" fontSize="9" fontWeight="700" fontFamily={FUENTE_ANOTACION}
            letterSpacing="0.6"
            fill={COLOR_RECOGIDA} stroke="#ffffff" strokeWidth={HALO_TEXTO} paintOrder="stroke" strokeLinejoin="round"
          >
            BASTILLA ENFUNDAR
          </text>
        </g>
      )}
      {d.chaflanCota && (
        <Cota
          desde={d.chaflanCota.desde}
          hasta={d.chaflanCota.hasta}
          texto={d.chaflanCota.texto}
          rotacion={d.chaflanCota.angulo}
          textoDx={d.chaflanCota.textoDx}
          textoDy={d.chaflanCota.textoDy}
        />
      )}

      <line x1={d.frente[0].x} y1={d.baseY + 5} x2={d.frente[0].x} y2={d.baseY + 42} stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO} />
      <line x1={d.frente.at(-1)!.x} y1={d.baseY + 5} x2={d.frente.at(-1)!.x} y2={d.baseY + 42} stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO} />
      <Cota desde={d.anchoDesde} hasta={d.anchoHasta} texto={`${etiquetaAncho} ${fmt(ancho)}`} textoDy={22} />

      <line x1={d.frente[0].x - 5} y1={d.altoDesde.y} x2={d.altoDesde.x - 7} y2={d.altoDesde.y} stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO} />
      <line x1={d.frente[0].x - 5} y1={d.altoHasta.y} x2={d.altoHasta.x - 7} y2={d.altoHasta.y} stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO} />
      <Cota
        desde={d.altoDesde} hasta={d.altoHasta}
        texto={`${etiquetaAlto} ${fmt(altoNear)}`}
        rotacion={-90} textoDx={-16} textoDy={0}
      />

      {mostrarLargo && (
        <Cota
          desde={d.largoDesde} hasta={d.largoHasta}
          texto={`LARGO ${fmt(largo)}`} rotacion={d.anguloLargo}
          textoDx={d.largoTextoDx} textoDy={d.largoTextoDy}
        />
      )}
      {mostrarAguas && (
        <g>
          <line
            x1={d.aguasGuiaHombro.desde.x} y1={d.aguasGuiaHombro.desde.y}
            x2={d.aguasGuiaHombro.hasta.x} y2={d.aguasGuiaHombro.hasta.y}
            stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO}
          />
          <line
            x1={d.aguasGuiaPico.desde.x} y1={d.aguasGuiaPico.desde.y}
            x2={d.aguasGuiaPico.hasta.x} y2={d.aguasGuiaPico.hasta.y}
            stroke={COLOR_GUIA} strokeWidth={TRAZO_FINO}
          />
          <Cota
            desde={d.aguasDesde} hasta={d.aguasHasta}
            texto={`AGUAS ${fmt(aguas)}`} rotacion={-90} textoDx={15} textoDy={0}
          />
        </g>
      )}
    </g>
  );
}

export function Escena3D(props: Escena3DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const colores = useMemo(() => coloresMaterial(props.material ?? ""), [props.material]);
  const onSnapshotReady = props.onSnapshotReady;
  const altoDelante = props.modo === "baqueton" ? (props.baqueton ?? 0) : props.altoDelante;
  const altoAtras = props.modo === "baqueton"
    ? (props.baqueton ?? 0)
    : (props.altoAtras > 0 ? props.altoAtras : props.altoDelante);
  const geometriaPerfilCompleta = props.modo === "baqueton"
    || (!["TIPO 02", "TIPO 03"].includes(props.tipoPerfil) || (props.aguas ?? 0) > 0)
      && (props.tipoPerfil !== "TIPO 04" || (props.chaflan ?? 0) > 0)
      && (props.tipoPerfil !== "TIPO 05" || (props.radioEsquina ?? 0) > 0);
  const valido = props.largo > 0 && props.ancho > 0 && altoDelante > 0 && geometriaPerfilCompleta;

  const anchoAtras = (props.anchoAtras ?? 0) > 0 ? props.anchoAtras! : props.ancho;
  const bastilla = props.modo === "lona" && (props.bastillaEnfundar ?? false);
  const vistas = useMemo(() => {
    if (!valido) return null;
    const base = {
      modo: props.modo,
      tipoPerfil: props.tipoPerfil,
      largo: props.largo,
      aguas: props.aguas ?? 0,
      radioCumbrera: props.radioCumbrera ?? 0,
      radioHombro: props.radioHombro ?? 0,
      radioEsquina: props.radioEsquina ?? 0,
      chaflan: props.chaflan ?? 0,
      radioChaflanAbajo: props.radioChaflanAbajo ?? 0,
      radioChaflanArriba: props.radioChaflanArriba ?? 0,
      ventanaAncho: props.ventanaAncho ?? 0,
      ventanaAlto: props.ventanaAlto ?? 0,
      conBastilla: bastilla,
    };
    const delantera = calcularVista({
      ...base,
      anchoNear: props.ancho,
      anchoFar: anchoAtras,
      altoNear: altoDelante,
      altoFar: altoAtras,
      conVentana: props.modo === "lona" && (props.ventana ?? false),
      ollaosNear: props.ollaos?.delante ?? [],
      ollaosLaterales: props.ollaos?.laterales ?? [],
      lateralesDesdeFar: true,
    });
    const trasera = calcularVista({
      ...base,
      anchoNear: anchoAtras,
      anchoFar: props.ancho,
      altoNear: altoAtras,
      altoFar: altoDelante,
      conVentana: false,
      ollaosNear: props.ollaos?.atras ?? [],
      ollaosLaterales: props.ollaos?.laterales ?? [],
      lateralesDesdeFar: false,
    });
    return { delantera, trasera };
  }, [
    valido, props.modo, props.tipoPerfil, props.ancho, props.largo,
    props.aguas, props.radioCumbrera, props.radioHombro, props.radioEsquina, props.chaflan,
    props.radioChaflanAbajo, props.radioChaflanArriba,
    props.ventana, props.ventanaAncho, props.ventanaAlto, props.ollaos, altoDelante, altoAtras, anchoAtras,
    bastilla,
  ]);

  useEffect(() => {
    if (!onSnapshotReady) return;
    onSnapshotReady(() => {
      const svg = svgRef.current;
      return svg ? new XMLSerializer().serializeToString(svg) : null;
    });
    return () => onSnapshotReady(null);
  }, [onSnapshotReady]);

  const mostrarAguas = props.modo === "lona"
    && (props.aguas ?? 0) > 0
    && ["TIPO 02", "TIPO 03"].includes(props.tipoPerfil);

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_50px_rgb(15_23_42/0.09),0_2px_8px_rgb(15_23_42/0.04)] ring-1 ring-line/70">
      <div className="flex h-16 shrink-0 items-center border-b border-line/60 bg-white/90 px-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold-2">
          Vista Técnica
        </p>
        <span className="mx-3 h-4 w-px bg-line" aria-hidden="true" />
        <p className="text-sm font-bold text-ink sm:text-base">Perspectiva fija · cotas en cm</p>
      </div>
      {vistas ? (
        <svg
          ref={svgRef}
          viewBox="0 0 1560 440"
          width={1560}
          height={440}
          className="block h-auto w-full"
          role="img"
          aria-label={`Perspectiva técnica de ${props.modo === "lona" ? "lona de remolque" : "baquetón"}: largo ${fmt(props.largo)}, ancho ${fmt(props.ancho)}`}
        >
          <title>Perspectiva técnica acotada (vistas delantera y trasera)</title>
          <defs>
            {/* Solo queda lo que un plano necesita: la flecha de cota. Las
                tarjetas, la sombra y los degradados eran interfaz, no dibujo,
                y al pasar a gris se comían el contraste. */}
            <marker id="cota" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
              <path d="M 7 0 L 0 3.5 L 7 7 z" fill={COLOR_COTA} />
            </marker>
          </defs>
          <rect width="1560" height="440" fill="#ffffff" />
          <PanelVista
            d={vistas.delantera}
            titulo="VISTA DELANTERA"
            etiquetaAlto={props.modo === "baqueton" ? "BAQUETÓN" : "ALTO DEL."}
            etiquetaAncho={anchoAtras !== props.ancho ? "ANCHO DEL." : "ANCHO"}
            altoNear={altoDelante}
            ancho={props.ancho}
            largo={props.largo}
            mostrarLargo
            mostrarAguas={mostrarAguas}
            aguas={props.aguas ?? 0}
            recogida={props.modo === "lona" ? (props.recogeDelante ?? "") : ""}
            bastilla={bastilla}
            modo={props.modo}
            colores={colores}
          />
          <g transform={`translate(${ANCHO_PANEL} 0)`}>
            <PanelVista
              d={vistas.trasera}
              titulo="VISTA TRASERA"
              etiquetaAlto={props.modo === "baqueton" ? "BAQUETÓN" : "ALTO TRAS."}
              etiquetaAncho={anchoAtras !== props.ancho ? "ANCHO TRAS." : "ANCHO"}
              altoNear={altoAtras}
              ancho={anchoAtras}
              largo={props.largo}
              mostrarLargo={false}
              mostrarAguas={false}
              aguas={props.aguas ?? 0}
              recogida={props.modo === "lona" ? (props.recogeAtras ?? "") : ""}
              bastilla={bastilla}
              modo={props.modo}
              colores={colores}
            />
          </g>
        </svg>
      ) : (
        <div className="flex min-h-80 flex-col items-center justify-center gap-2 px-6 text-center">
          <svg width="52" height="42" viewBox="0 0 52 42" aria-hidden="true" className="text-line-2">
            <path d="M4 37V15l22-10 22 10v22M4 15l22 10 22-10M26 25v12" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <p className="text-sm font-medium text-muted">
            {props.modo === "baqueton"
              ? "Introduce largo, ancho y baquetón para ver la perspectiva"
              : "Completa las medidas y la geometría del perfil para ver la perspectiva"}
          </p>
          <p className="text-xs text-muted-2">Las cotas aparecerán automáticamente en centímetros.</p>
        </div>
      )}
      {props.onObservacionesChange && (
        <div className="shrink-0 border-t border-line/70 bg-white/95 p-3">
          <label className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface/80 px-3 py-2 shadow-[0_3px_12px_rgb(14_45_49/0.05)]">
            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Observaciones</span>
            <input
              name="observaciones"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[12px] font-semibold text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/15"
              placeholder="Añadir indicaciones para producción…"
              value={props.observaciones ?? ""}
              onChange={(event) => props.onObservacionesChange?.(event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
