"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Punto2D } from "@/lib/geometry/curva";
import { perfilForma } from "@/lib/geometry/perfil";
import {
  aristaLongitudinalVisible,
  recortarFueraDePoligono,
} from "@/lib/geometry/visibilidad";
import { calcularVentanaFrontal } from "@/lib/geometry/ventana";
import { coloresMaterial } from "@/lib/geometry/color-lona";
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
 */
function franjasCubierta(
  frente: Punto[], fondo: Punto[], picoTecho: number, conCumbrera: boolean,
): Array<{ puntos: Punto[]; lado: "izq" | "dcha" }> {
  const franjas: Array<{ puntos: Punto[]; lado: "izq" | "dcha" }> = [];
  const tramos = Math.min(frente.length, fondo.length) - 1;
  for (let i = 0; i < tramos; i += 1) {
    franjas.push({
      puntos: [frente[i], frente[i + 1], fondo[i + 1], fondo[i]],
      lado: conCumbrera && i >= picoTecho ? "dcha" : "izq",
    });
  }
  return franjas;
}

/* Colores propios del plano (inline: el snapshot SVG debe verse igual sin CSS). */
const FUENTE_PLANO = "'Plus Jakarta Sans','Segoe UI',Arial,sans-serif";
const COLOR_COTA = "#6b7f83";
const COLOR_TEXTO_COTA = "#33484d";
const COLOR_GUIA = "#a3b4b6";
const COLOR_RECOGIDA = "#17383e";
const ANCHO_PANEL = 780;

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
        stroke={COLOR_COTA} strokeWidth="1" markerStart="url(#cota)" markerEnd="url(#cota)"
      />
      <text
        x={cx} y={cy} textAnchor="middle" fontSize="13" fontWeight="800"
        fontFamily={FUENTE_PLANO}
        fill={COLOR_TEXTO_COTA} stroke="#ffffff" strokeWidth="6" paintOrder="stroke"
        strokeLinejoin="round" transform={`rotate(${rotacion} ${cx} ${cy})`}
      >
        {texto}
      </text>
    </g>
  );
}

interface Costura { x: number; yBase: number; yTop: number }

/** Símbolo de la recogida sobre la costura vertical paño–contorno. */
function SimboloRecogida({ costura, tipo }: { costura: Costura; tipo: string }) {
  const { x, yBase, yTop } = costura;
  const alto = yBase - yTop;
  if (alto < 14 || tipo === "NO" || !tipo) return null;

  if (tipo === "GOMA") {
    // cuerda elástica en zigzag a lo largo de la costura
    const paso = 13;
    const n = Math.max(2, Math.floor(alto / paso));
    let d = `M ${x.toFixed(1)} ${yBase.toFixed(1)}`;
    for (let i = 1; i <= n; i += 1) {
      const y = yBase - (alto * i) / n;
      const dx = i % 2 === 1 ? 5 : -5;
      d += ` L ${(x + dx).toFixed(1)} ${y.toFixed(1)}`;
    }
    return <path d={d} fill="none" stroke={COLOR_RECOGIDA} strokeWidth="1.6" strokeLinejoin="round" />;
  }

  if (tipo === "CREMALLERA") {
    // doble línea con dientes
    const dientes: Punto[] = [];
    for (let y = yBase - 6; y > yTop + 4; y -= 8) dientes.push({ x, y });
    return (
      <g stroke={COLOR_RECOGIDA} strokeWidth="1.3">
        <line x1={x - 3} y1={yBase} x2={x - 3} y2={yTop} />
        <line x1={x + 3} y1={yBase} x2={x + 3} y2={yTop} />
        {dientes.map((p, i) => (
          <line key={i} x1={p.x - 3} y1={p.y} x2={p.x + 3} y2={p.y} />
        ))}
      </g>
    );
  }

  if (tipo === "VELCRO") {
    // franja rayada pegada a la costura
    const rayas: number[] = [];
    for (let y = yBase - 4; y > yTop + 3; y -= 7) rayas.push(y);
    return (
      <g stroke={COLOR_RECOGIDA} strokeWidth="1.2">
        <rect x={x - 4} y={yTop} width={8} height={alto} fill="none" strokeWidth="1" />
        {rayas.map((y, i) => (
          <line key={i} x1={x - 4} y1={y} x2={x + 4} y2={y - 4} />
        ))}
      </g>
    );
  }

  if (tipo.startsWith("PUENTES")) {
    // trabillas repartidas por la costura
    const trabillas: number[] = [];
    for (let y = yBase - 12; y > yTop + 6; y -= 22) trabillas.push(y);
    return (
      <g stroke={COLOR_RECOGIDA} strokeWidth="1.5" fill="#ffffff">
        {trabillas.map((y, i) => (
          <rect key={i} x={x - 4.5} y={y - 4} width={9} height={9} rx={2} />
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
  conVentana: boolean;
  ventanaAncho: number;
  ventanaAlto: number;
  ollaosNear: number[];
  ollaosLaterales: number[];
  /** true en la vista delantera: los laterales se cuentan desde el fondo (atrás). */
  lateralesDesdeFar: boolean;
}

function calcularVista(o: OpcionesVista) {
  const perfil = o.modo === "baqueton" ? "TIPO 01" : o.tipoPerfil;
  const opts = (ancho: number, alto: number) => ({
    ancho,
    altoDelante: alto,
    alturaPico: o.aguas,
    radioCumbrera: o.radioCumbrera,
    radioHombro: o.radioHombro,
    chaflan: o.chaflan,
    radio: o.radioEsquina,
  });
  const forma = perfilForma(perfil, opts(o.anchoNear, o.altoNear));
  const near = forma.puntos;
  const far = perfilForma(perfil, opts(o.anchoFar, o.altoFar)).puntos;
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
  const cubierta = franjasCubierta(techoFrente, techoFondo, picoTechoFrente, tieneCumbrera);
  const lateralDcha = [frente.at(-2)!, frente.at(-1)!, fondo.at(-1)!, fondo.at(-2)!];
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
    const anchoDentro = baseY - bordeInferior < 30 && alto >= 34;
    const altoDentro = x - origenX < 32 && ancho >= 34;
    const yCotaAncho = anchoDentro ? bordeInferior - 12 : bordeInferior + 18;
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
  // Marcas de ollaos sobre las aristas de base visibles (la trasera de esta
  // vista queda oculta tras el faldón).
  const interpola = (a: Punto, b: Punto, t: number): Punto => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const enTramo = (posiciones: number[], medida: number, desde: Punto, hasta: Punto) =>
    medida > 0
      ? posiciones.filter((p) => p >= 0 && p <= medida).map((p) => interpola(desde, hasta, p / medida))
      : [];
  const lateralDesde = o.lateralesDesdeFar ? fondo.at(-1)! : frente.at(-1)!;
  const lateralHasta = o.lateralesDesdeFar ? frente.at(-1)! : fondo.at(-1)!;
  // Normal del borde lateral, apuntando hacia dentro de la lona.
  const largoLateral = Math.hypot(fondo.at(-1)!.x - frente.at(-1)!.x, fondo.at(-1)!.y - frente.at(-1)!.y);
  const normalLateral = {
    x: ((fondo.at(-1)!.y - frente.at(-1)!.y) / largoLateral) * 6,
    y: (-(fondo.at(-1)!.x - frente.at(-1)!.x) / largoLateral) * 6,
  };
  // Los ollaos van por dentro de la lona, no sobre el borde.
  const marcasOllaos = [
    ...enTramo(o.ollaosNear, o.anchoNear, frente[0], frente.at(-1)!)
      .map((p) => ({ x: p.x, y: p.y - 5 })),
    ...enTramo(o.ollaosLaterales, o.largo, lateralDesde, lateralHasta)
      .map((p) => ({ x: p.x + normalLateral.x * 0.8, y: p.y + normalLateral.y * 0.8 })),
  ];
  // Costuras verticales paño–contorno («el alto de los lados»): donde va la recogida.
  const costuraIzq: Costura = { x: frente[0].x, yBase: frente[0].y, yTop: frente[1].y };
  const costuraDcha: Costura = { x: frente.at(-1)!.x, yBase: frente.at(-1)!.y, yTop: frente.at(-2)!.y };
  // Bastilla de enfundar: banda paralela a los bordes de base visibles.
  const bastillaBorde = `M ${puntoSvg(frente[0])} L ${puntoSvg(frente.at(-1)!)} L ${puntoSvg(fondo.at(-1)!)}`;
  const bastillaInterior = `M ${puntoSvg({ x: frente[0].x, y: frente[0].y - 6 })}`
    + ` L ${puntoSvg({ x: frente.at(-1)!.x, y: frente.at(-1)!.y - 6 })}`
    + ` L ${puntoSvg({ x: fondo.at(-1)!.x + normalLateral.x, y: fondo.at(-1)!.y + normalLateral.y })}`;
  const chaflanCota = o.modo === "lona" && o.tipoPerfil === "TIPO 04" && o.chaflan > 0
    ? (() => {
        const inicio = frente.at(-3)!;
        const fin = frente.at(-2)!;
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
    frente, fondo, lateralDcha, aristasLongitudinales, contornoFrente,
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
  recogida, bastilla, modo,
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
}) {
  const hayRecogida = recogida !== "" && recogida !== "NO";
  return (
    <g>
      <text
        x={40} y={45} fontSize="12" fontWeight="800" letterSpacing="2"
        fontFamily={FUENTE_PLANO} fill="#71878a"
      >
        {titulo}
      </text>
      {/* Techo y lateral muestran el color de lona; la cara cercana queda abierta. */}
      <g filter="url(#sombraLona)">
        {/* El pinche (paño delantero o trasero) cubre la cara cercana. */}
        <path d={`${d.contornoFrente} Z`} fill="url(#pinche)" stroke="none" />
        {d.cubierta.map((franja, indice) => (
          <polygon
            key={indice}
            points={puntosSvg(franja.puntos)}
            fill={franja.lado === "dcha" ? "url(#cubiertaDerecha)" : "url(#cubiertaIzquierda)"}
            stroke={franja.lado === "dcha" ? "url(#cubiertaDerecha)" : "url(#cubiertaIzquierda)"}
            strokeWidth="1"
          />
        ))}
        <polygon points={puntosSvg(d.lateralDcha)} fill="url(#lateral)" stroke="none" />
      </g>

      {d.ventana && (
        <g>
          {/* A través de la ventana se intuye el interior en penumbra. */}
          <rect
            x={d.ventana.x} y={d.ventana.y}
            width={d.ventana.ancho} height={d.ventana.alto}
            rx={d.ventana.radio}
            fill="#0e2a2f" fillOpacity="0.38"
          />
          <rect
            x={d.ventana.x} y={d.ventana.y}
            width={d.ventana.ancho} height={d.ventana.alto}
            rx={d.ventana.radio}
            fill="none" stroke="#0f766e" strokeWidth="1.8"
          />
          {d.ventana.cotas && (
            <g>
              {d.ventana.cotas.ancho.guias.map((guia, indice) => (
                <line key={`ancho-${indice}`} x1={guia.desde.x} y1={guia.desde.y}
                  x2={guia.hasta.x} y2={guia.hasta.y} stroke={COLOR_GUIA} strokeWidth="1" />
              ))}
              <Cota desde={d.ventana.cotas.ancho.desde} hasta={d.ventana.cotas.ancho.hasta}
                texto={d.ventana.cotas.ancho.texto} />
              {d.ventana.cotas.alto.guias.map((guia, indice) => (
                <line key={`alto-${indice}`} x1={guia.desde.x} y1={guia.desde.y}
                  x2={guia.hasta.x} y2={guia.hasta.y} stroke={COLOR_GUIA} strokeWidth="1" />
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
          stroke="#4c6468" strokeWidth="1.3" strokeLinecap="round"
        />
      ))}
      <path d={d.contornoFrente} fill="none" stroke="#122d32" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bastilla de enfundar: refuerzo perimetral inferior, donde los ollaos →
          banda de doble línea a lo largo de los bordes de base visibles. */}
      {bastilla && (
        <>
          <path d={d.bastillaBorde} fill="none" stroke="#122d32" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d.bastillaInterior} fill="none" stroke="#122d32" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {d.marcasOllaos.map((marca, indice) => (
        <circle
          key={indice}
          cx={marca.x} cy={marca.y} r="2"
          fill="#ffffff" stroke="#4c6468" strokeWidth="1"
        />
      ))}
      {modo === "baqueton" && (
        <path
          d={d.contornoFrente} fill="none" stroke="#d3a024"
          strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        />
      )}

      {/* Recogida: unión del paño de contorno con el paño de esta cara. */}
      {hayRecogida && (
        <g>
          <SimboloRecogida costura={d.costuraIzq} tipo={recogida} />
          <SimboloRecogida costura={d.costuraDcha} tipo={recogida} />
          <text
            x={d.costuraDcha.x - 10}
            y={(d.costuraDcha.yBase + d.costuraDcha.yTop) / 2}
            textAnchor="end"
            fontSize={recogida.length > 16 ? 9 : 11}
            fontWeight="800"
            fontFamily={FUENTE_PLANO}
            fill={COLOR_TEXTO_COTA}
            stroke="#ffffff" strokeWidth="5" paintOrder="stroke" strokeLinejoin="round"
          >
            {recogida}
          </text>
        </g>
      )}
      {bastilla && (
        <text
          x={(d.frente[0].x + d.frente.at(-1)!.x) / 2}
          y={d.baseY + 16}
          textAnchor="middle" fontSize="9" fontWeight="800" fontFamily={FUENTE_PLANO}
          fill="#8a6410" stroke="#ffffff" strokeWidth="5" paintOrder="stroke" strokeLinejoin="round"
        >
          BASTILLA ENFUNDAR
        </text>
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

      <line x1={d.frente[0].x} y1={d.baseY + 5} x2={d.frente[0].x} y2={d.baseY + 42} stroke={COLOR_GUIA} />
      <line x1={d.frente.at(-1)!.x} y1={d.baseY + 5} x2={d.frente.at(-1)!.x} y2={d.baseY + 42} stroke={COLOR_GUIA} />
      <Cota desde={d.anchoDesde} hasta={d.anchoHasta} texto={`${etiquetaAncho} ${fmt(ancho)}`} textoDy={22} />

      <line x1={d.frente[0].x - 5} y1={d.altoDesde.y} x2={d.altoDesde.x - 7} y2={d.altoDesde.y} stroke={COLOR_GUIA} />
      <line x1={d.frente[0].x - 5} y1={d.altoHasta.y} x2={d.altoHasta.x - 7} y2={d.altoHasta.y} stroke={COLOR_GUIA} />
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
            stroke={COLOR_GUIA} strokeWidth="1"
          />
          <line
            x1={d.aguasGuiaPico.desde.x} y1={d.aguasGuiaPico.desde.y}
            x2={d.aguasGuiaPico.hasta.x} y2={d.aguasGuiaPico.hasta.y}
            stroke={COLOR_GUIA} strokeWidth="1"
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
      ventanaAncho: props.ventanaAncho ?? 0,
      ventanaAlto: props.ventanaAlto ?? 0,
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
    props.ventana, props.ventanaAncho, props.ventanaAlto, props.ollaos, altoDelante, altoAtras, anchoAtras,
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
  const bastilla = props.modo === "lona" && (props.bastillaEnfundar ?? false);

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
            <linearGradient id="lienzo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fcfdfc" />
              <stop offset="0.55" stopColor="#f4f8f6" />
              <stop offset="1" stopColor="#ecf2ef" />
            </linearGradient>
            <linearGradient id="lateral" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={colores.lateralClaro} />
              <stop offset="1" stopColor={colores.lateral} />
            </linearGradient>
            {/* Paño delantero/trasero (pinche): plano frontal, más luminoso que el faldón. */}
            <linearGradient id="pinche" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colores.techoClaro} />
              <stop offset="1" stopColor={colores.lateralClaro} />
            </linearGradient>
            {/* En coordenadas de usuario: las franjas de cubierta comparten un
                sombreado continuo aunque sean polígonos independientes. */}
            <linearGradient id="cubiertaIzquierda" gradientUnits="userSpaceOnUse" x1="145" y1="250" x2="640" y2="100">
              <stop offset="0" stopColor={colores.techoClaro} />
              <stop offset="1" stopColor={colores.techo} />
            </linearGradient>
            <linearGradient id="cubiertaDerecha" gradientUnits="userSpaceOnUse" x1="145" y1="100" x2="640" y2="250">
              <stop offset="0" stopColor={colores.techo} />
              <stop offset="1" stopColor={colores.lateralClaro} />
            </linearGradient>
            <marker id="cota" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
              <path d="M 7 0 L 0 3.5 L 7 7 z" fill="#6b7f83" />
            </marker>
            <filter id="sombraLona" x="-25%" y="-25%" width="160%" height="180%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0e2a2f" floodOpacity="0.16" />
            </filter>
          </defs>
          <rect width="1560" height="440" fill="url(#lienzo)" />
          <rect x="18" y="18" width="744" height="400" rx="18" fill="#ffffff" fillOpacity="0.64" stroke="#ffffff" />
          <rect x="798" y="18" width="744" height="400" rx="18" fill="#ffffff" fillOpacity="0.64" stroke="#ffffff" />
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
