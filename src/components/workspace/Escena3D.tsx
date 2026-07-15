"use client";

import { useEffect, useMemo, useRef } from "react";
import { controlesCatmullRom, type Punto2D } from "@/lib/geometry/curva";
import { perfilPuntos } from "@/lib/geometry/perfil";
import { calcularVentanaFrontal } from "@/lib/geometry/ventana";
import { coloresMaterial } from "@/lib/geometry/color-lona";
import type { TipoPerfil } from "@/lib/calc/params";

type Punto = Punto2D;

export interface Escena3DProps {
  modo: "lona" | "baqueton";
  largo: number;
  ancho: number;
  altoDelante: number;
  altoAtras: number;
  aguas?: number;
  tipoPerfil: TipoPerfil;
  ventana?: boolean;
  material?: string;
  baqueton?: number;
  onSnapshotReady?: (getSnapshot: (() => Promise<string | null>) | null) => void;
}

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { maximumFractionDigits: 1 });

const puntosSvg = (puntos: Punto[]) =>
  puntos.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const puntoSvg = ({ x, y }: Punto) => `${x.toFixed(1)} ${y.toFixed(1)}`;

/** Curva Catmull-Rom convertida a Bézier, contenida y sin suavizar los laterales. */
function caminoCurvo(puntos: Punto[], mover = true): string {
  if (puntos.length === 0) return "";
  let d = mover ? `M ${puntoSvg(puntos[0])}` : "";
  if (puntos.length === 1) return d;
  for (let i = 0; i < puntos.length - 1; i += 1) {
    const p2 = puntos[i + 1];
    const { c1, c2 } = controlesCatmullRom(puntos, i);
    d += ` C ${puntoSvg(c1)} ${puntoSvg(c2)} ${puntoSvg(p2)}`;
  }
  return d;
}

function caminoLineal(puntos: Punto[], mover = true): string {
  if (puntos.length === 0) return "";
  const inicio = mover ? `M ${puntoSvg(puntos[0])}` : "";
  return puntos.slice(1).reduce((camino, punto) => `${camino} L ${puntoSvg(punto)}`, inicio);
}

function caminoTecho(puntos: Punto[], curvo: boolean, mover = true): string {
  return curvo ? caminoCurvo(puntos, mover) : caminoLineal(puntos, mover);
}

function caminoPerfil(puntos: Punto[], curvo: boolean): string {
  const baseIzquierda = puntos[0];
  const baseDerecha = puntos.at(-1)!;
  const cubierta = puntos.slice(1, -1);
  return `M ${puntoSvg(baseIzquierda)} L ${puntoSvg(cubierta[0])}${caminoTecho(cubierta, curvo, false)} L ${puntoSvg(baseDerecha)}`;
}

function superficieCubierta(frente: Punto[], fondo: Punto[], curvo: boolean): string {
  const fondoInverso = [...fondo].reverse();
  return `${caminoTecho(frente, curvo)} L ${puntoSvg(fondoInverso[0])}${caminoTecho(fondoInverso, curvo, false)} Z`;
}

function Cota({
  desde, hasta, texto, rotacion = 0, textoDx = 0, textoDy = -7,
}: {
  desde: Punto; hasta: Punto; texto: string; rotacion?: number; textoDx?: number; textoDy?: number;
}) {
  const cx = (desde.x + hasta.x) / 2 + textoDx;
  const cy = (desde.y + hasta.y) / 2 + textoDy;
  return (
    <g className="text-slate-600">
      <line
        x1={desde.x} y1={desde.y} x2={hasta.x} y2={hasta.y}
        stroke="currentColor" strokeWidth="1.2" markerStart="url(#cota)" markerEnd="url(#cota)"
      />
      <text
        x={cx} y={cy} textAnchor="middle" fontSize="13" fontWeight="800"
        fill="currentColor" stroke="#ffffff" strokeWidth="6" paintOrder="stroke"
        strokeLinejoin="round" transform={`rotate(${rotacion} ${cx} ${cy})`}
      >
        {texto}
      </text>
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
  const valido = props.largo > 0 && props.ancho > 0 && altoDelante > 0;

  const dibujo = useMemo(() => {
    if (!valido) return null;
    const perfil = props.modo === "baqueton" ? "TIPO 01" : props.tipoPerfil;
    const opts = (alto: number) => ({
      ancho: props.ancho,
      altoDelante: alto,
      alturaPico: props.aguas ?? 0,
      chaflan: Math.min(18, props.ancho * 0.1, alto * 0.25),
      radio: Math.min(18, props.ancho * 0.1, alto * 0.25),
    });
    const delantero = perfilPuntos(perfil, opts(altoDelante));
    const trasero = perfilPuntos(perfil, opts(altoAtras));
    const maxY = Math.max(...delantero.map(([, y]) => y), ...trasero.map(([, y]) => y), 1);
    // Una única escala mantiene la proporción real ancho/alto. La profundidad
    // se comprime en perspectiva para que largos grandes sigan cabiendo en A4.
    const escala = Math.min(290 / Math.max(props.ancho, 1), 205 / maxY);
    const profundidadX = Math.min(205, Math.max(110, props.largo * escala * 0.48));
    const profundidadY = Math.min(100, Math.max(62, props.largo * escala * 0.24));
    const origenX = 145;
    const baseY = 344;
    const proyecta = (puntos: Array<[number, number]>, dx: number, dy: number) =>
      puntos.map(([x, y]) => ({
        x: origenX + x * escala + dx,
        y: baseY - y * escala - dy,
      }));
    const frente = proyecta(delantero, 0, 0);
    const fondo = proyecta(trasero, profundidadX, profundidadY);
    const indicePicoFrente = delantero.reduce(
      (mejor, [, y], indice) => y > delantero[mejor][1] ? indice : mejor,
      0,
    );
    const indicePicoFondo = trasero.reduce(
      (mejor, [, y], indice) => y > trasero[mejor][1] ? indice : mejor,
      0,
    );
    const techoFrente = frente.slice(1, -1);
    const techoFondo = fondo.slice(1, -1);
    const picoTechoFrente = indicePicoFrente - 1;
    const picoTechoFondo = indicePicoFondo - 1;
    const tieneCumbrera = props.modo === "lona"
      && (props.aguas ?? 0) > 0
      && ["TIPO 02", "TIPO 03"].includes(props.tipoPerfil)
      && picoTechoFrente > 0
      && picoTechoFrente < techoFrente.length - 1;
    const usaCurvas = perfil === "TIPO 03" || perfil === "TIPO 05";
    const cubiertaCompleta = superficieCubierta(techoFrente, techoFondo, usaCurvas);
    const cubiertaIzquierda = tieneCumbrera
      ? superficieCubierta(
        techoFrente.slice(0, picoTechoFrente + 1),
        techoFondo.slice(0, picoTechoFondo + 1),
        usaCurvas,
      )
      : null;
    const cubiertaDerecha = tieneCumbrera
      ? superficieCubierta(
        techoFrente.slice(picoTechoFrente),
        techoFondo.slice(picoTechoFondo),
        usaCurvas,
      )
      : null;
    const lateralIzq = [frente[1], frente[0], fondo[0], fondo[1]];
    const lateralDcha = [frente.at(-2)!, frente.at(-1)!, fondo.at(-1)!, fondo.at(-2)!];
    const indicesAristas = perfil === "TIPO 02"
      ? [1, 2, 3]
      : perfil === "TIPO 03"
        ? [1, indicePicoFrente, delantero.length - 2]
        : perfil === "TIPO 04"
          ? [1, 2, 3, 4]
          : perfil === "TIPO 05"
            ? [1, 9, 10, delantero.length - 2]
            : [1, delantero.length - 2];
    const aristasLongitudinales = indicesAristas.map((indice) => ({
      desde: frente[indice],
      hasta: fondo[indice],
    }));
    const contornoFrente = caminoPerfil(frente, usaCurvas);
    const coronacionFondo = caminoTecho(techoFondo, usaCurvas);
    const hombroDerecho = frente.at(-2)!;
    const picoFrente = frente[indicePicoFrente];
    const picoFondo = fondo[indicePicoFondo];
    const ventanaLocal = props.modo === "lona" && props.ventana
      ? calcularVentanaFrontal(delantero, props.ancho)
      : null;
    const ventana = ventanaLocal ? {
      x: origenX + ventanaLocal.x * escala,
      y: baseY - (ventanaLocal.y + ventanaLocal.alto) * escala,
      ancho: ventanaLocal.ancho * escala,
      alto: ventanaLocal.alto * escala,
      radio: Math.min(9, 4 * escala),
    } : null;
    const xCotaAguas = frente.at(-1)!.x + 34;
    return {
      frente, fondo, lateralIzq, lateralDcha, aristasLongitudinales, contornoFrente, coronacionFondo,
      cubiertaCompleta, cubiertaIzquierda, cubiertaDerecha,
      tieneCumbrera, picoFrente, picoFondo, ventana,
      anchoDesde: { x: frente[0].x, y: baseY + 35 },
      anchoHasta: { x: frente.at(-1)!.x, y: baseY + 35 },
      altoDesde: { x: frente[0].x - 42, y: baseY },
      altoHasta: { x: frente[0].x - 42, y: baseY - altoDelante * escala },
      largoDesde: { x: frente.at(-1)!.x + 20, y: frente.at(-1)!.y + 15 },
      largoHasta: { x: fondo.at(-1)!.x + 20, y: fondo.at(-1)!.y + 15 },
      anguloLargo: Math.atan2(-profundidadY, profundidadX) * 180 / Math.PI,
      aguasDesde: {
        x: xCotaAguas,
        y: baseY - (altoDelante - (props.aguas ?? 0)) * escala,
      },
      aguasHasta: {
        x: xCotaAguas,
        y: baseY - altoDelante * escala,
      },
      aguasGuiaHombro: { desde: hombroDerecho, hasta: { x: xCotaAguas + 6, y: baseY - (altoDelante - (props.aguas ?? 0)) * escala } },
      aguasGuiaPico: { desde: picoFrente, hasta: { x: xCotaAguas + 6, y: baseY - altoDelante * escala } },
      baseY,
    };
  }, [
    valido, props.modo, props.tipoPerfil, props.ancho, props.largo,
    props.aguas, props.ventana, altoDelante, altoAtras,
  ]);

  useEffect(() => {
    if (!onSnapshotReady) return;
    onSnapshotReady(async () => {
      const svg = svgRef.current;
      if (!svg) return null;
      const xml = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 1520;
        canvas.height = 880;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/png");
      } finally {
        URL.revokeObjectURL(url);
      }
    });
    return () => onSnapshotReady(null);
  }, [onSnapshotReady]);

  return (
    <div className="relative h-[clamp(380px,43vw,540px)] w-full overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_50px_rgb(15_23_42/0.09),0_2px_8px_rgb(15_23_42/0.04)] ring-1 ring-slate-200/70">
      <div className="absolute left-6 top-5 z-10 rounded-2xl border border-white/80 bg-white/80 px-3.5 py-2.5 shadow-[0_8px_24px_rgb(15_23_42/0.06)] backdrop-blur-md">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-600">
          Vista Técnica
        </p>
        <p className="text-base font-bold text-slate-900">Perspectiva fija · cotas en cm</p>
      </div>
      {dibujo ? (
        <svg
          ref={svgRef}
          viewBox="0 0 760 440"
          className="h-full w-full"
          role="img"
          aria-label={`Perspectiva técnica de ${props.modo === "lona" ? "lona de remolque" : "baquetón"}: largo ${fmt(props.largo)}, ancho ${fmt(props.ancho)}`}
        >
          <title>Perspectiva técnica acotada</title>
          <defs>
            <linearGradient id="lienzo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fbfcfd" />
              <stop offset="0.55" stopColor="#f5f7f9" />
              <stop offset="1" stopColor="#eef2f5" />
            </linearGradient>
            <linearGradient id="lateral" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={colores.lateralClaro} />
              <stop offset="1" stopColor={colores.lateral} />
            </linearGradient>
            <linearGradient id="lateralInterior" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colores.techoClaro} />
              <stop offset="1" stopColor={colores.lateralClaro} />
            </linearGradient>
            <linearGradient id="cubiertaIzquierda" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor={colores.techoClaro} />
              <stop offset="1" stopColor={colores.techo} />
            </linearGradient>
            <linearGradient id="cubiertaDerecha" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={colores.techo} />
              <stop offset="1" stopColor={colores.lateralClaro} />
            </linearGradient>
            <marker id="cota" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
              <path d="M 7 0 L 0 3.5 L 7 7 z" fill="#475569" />
            </marker>
            <filter id="sombraLona" x="-25%" y="-25%" width="160%" height="180%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.16" />
            </filter>
          </defs>
          <rect width="760" height="440" fill="url(#lienzo)" />
          <rect x="18" y="68" width="724" height="350" rx="18" fill="#ffffff" fillOpacity="0.64" stroke="#ffffff" />
          {/* Techo y lateral muestran el color de lona; el frente queda abierto. */}
          <g filter="url(#sombraLona)">
            <polygon
              points={puntosSvg(dibujo.lateralIzq)}
              fill="url(#lateralInterior)" fillOpacity="0.82" stroke="none"
            />
            {dibujo.tieneCumbrera ? (
              <>
                <path d={dibujo.cubiertaIzquierda!} fill="url(#cubiertaIzquierda)" stroke="none" />
                <path d={dibujo.cubiertaDerecha!} fill="url(#cubiertaDerecha)" stroke="none" />
              </>
            ) : (
              <path d={dibujo.cubiertaCompleta} fill="url(#cubiertaIzquierda)" stroke="none" />
            )}
            <polygon points={puntosSvg(dibujo.lateralDcha)} fill="url(#lateral)" stroke="none" />
          </g>

          {dibujo.ventana && (
            <g>
              <rect
                x={dibujo.ventana.x} y={dibujo.ventana.y}
                width={dibujo.ventana.ancho} height={dibujo.ventana.alto}
                rx={dibujo.ventana.radio}
                fill="none" stroke="#0f766e" strokeWidth="2.2"
              />
            </g>
          )}

          {/* Únicamente se conservan los bordes visibles de la lona. */}
          <path d={dibujo.coronacionFondo} fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line
            x1={dibujo.fondo.at(-2)!.x} y1={dibujo.fondo.at(-2)!.y}
            x2={dibujo.fondo.at(-1)!.x} y2={dibujo.fondo.at(-1)!.y}
            stroke="#64748b" strokeWidth="2" strokeLinecap="round"
          />
          {dibujo.aristasLongitudinales.map((arista, indice) => (
            <line
              key={indice}
              x1={arista.desde.x} y1={arista.desde.y}
              x2={arista.hasta.x} y2={arista.hasta.y}
              stroke="#52677c" strokeWidth="2" strokeLinecap="round"
            />
          ))}
          <path d={dibujo.contornoFrente} fill="none" stroke="#0f172a" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          {props.modo === "baqueton" && (
            <path
              d={dibujo.contornoFrente} fill="none" stroke="#f59e0b"
              strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"
            />
          )}

          <line x1={dibujo.frente[0].x} y1={dibujo.baseY + 5} x2={dibujo.frente[0].x} y2={dibujo.baseY + 42} stroke="#94a3b8" />
          <line x1={dibujo.frente.at(-1)!.x} y1={dibujo.baseY + 5} x2={dibujo.frente.at(-1)!.x} y2={dibujo.baseY + 42} stroke="#94a3b8" />
          <Cota desde={dibujo.anchoDesde} hasta={dibujo.anchoHasta} texto={`ANCHO ${fmt(props.ancho)}`} textoDy={22} />

          <line x1={dibujo.frente[0].x - 5} y1={dibujo.altoDesde.y} x2={dibujo.altoDesde.x - 7} y2={dibujo.altoDesde.y} stroke="#94a3b8" />
          <line x1={dibujo.frente[0].x - 5} y1={dibujo.altoHasta.y} x2={dibujo.altoHasta.x - 7} y2={dibujo.altoHasta.y} stroke="#94a3b8" />
          <Cota
            desde={dibujo.altoDesde} hasta={dibujo.altoHasta}
            texto={`${props.modo === "baqueton" ? "BAQUETÓN" : "ALTO DEL."} ${fmt(altoDelante)}`}
            rotacion={-90} textoDy={-9}
          />

          <Cota
            desde={dibujo.largoDesde} hasta={dibujo.largoHasta}
            texto={`LARGO ${fmt(props.largo)}`} rotacion={dibujo.anguloLargo} textoDy={-10}
          />
          {props.modo === "lona" && (props.aguas ?? 0) > 0 && ["TIPO 02", "TIPO 03"].includes(props.tipoPerfil) && (
            <g>
              <line
                x1={dibujo.aguasGuiaHombro.desde.x} y1={dibujo.aguasGuiaHombro.desde.y}
                x2={dibujo.aguasGuiaHombro.hasta.x} y2={dibujo.aguasGuiaHombro.hasta.y}
                stroke="#94a3b8" strokeWidth="1"
              />
              <line
                x1={dibujo.aguasGuiaPico.desde.x} y1={dibujo.aguasGuiaPico.desde.y}
                x2={dibujo.aguasGuiaPico.hasta.x} y2={dibujo.aguasGuiaPico.hasta.y}
                stroke="#94a3b8" strokeWidth="1"
              />
              <Cota
                desde={dibujo.aguasDesde} hasta={dibujo.aguasHasta}
                texto={`AGUAS ${fmt(props.aguas ?? 0)}`} rotacion={-90} textoDx={18} textoDy={0}
              />
            </g>
          )}
          {props.modo === "lona" && altoAtras !== altoDelante && (
            <text x="592" y="105" textAnchor="middle" fontSize="13" fontWeight="800" fill="#475569">
              ALTO TRAS. {fmt(altoAtras)}
            </text>
          )}
        </svg>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <svg width="52" height="42" viewBox="0 0 52 42" aria-hidden="true" className="text-slate-300">
            <path d="M4 37V15l22-10 22 10v22M4 15l22 10 22-10M26 25v12" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <p className="text-sm font-medium text-slate-500">Introduce largo, ancho y alto para ver la perspectiva</p>
          <p className="text-xs text-slate-400">Las cotas aparecerán automáticamente en centímetros.</p>
        </div>
      )}
    </div>
  );
}
