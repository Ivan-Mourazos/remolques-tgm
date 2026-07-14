"use client";

import { useEffect, useMemo, useRef } from "react";
import { perfilPuntos } from "@/lib/geometry/perfil";
import type { TipoPerfil } from "@/lib/calc/params";

type Punto = { x: number; y: number };

export interface Escena3DProps {
  modo: "lona" | "baqueton";
  largo: number;
  ancho: number;
  altoDelante: number;
  altoAtras: number;
  aguas?: number;
  tipoPerfil: TipoPerfil;
  llevaCurva: boolean;
  radioCurva?: number;
  baqueton?: number;
  onSnapshotReady?: (getSnapshot: (() => Promise<string | null>) | null) => void;
}

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { maximumFractionDigits: 1 });

const puntosSvg = (puntos: Punto[]) =>
  puntos.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

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
        x={cx} y={cy} textAnchor="middle" fontSize="12" fontWeight="700"
        fill="currentColor" stroke="#f8fafc" strokeWidth="5" paintOrder="stroke"
        strokeLinejoin="round" transform={`rotate(${rotacion} ${cx} ${cy})`}
      >
        {texto}
      </text>
    </g>
  );
}

export function Escena3D(props: Escena3DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
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
      radio: props.llevaCurva ? props.radioCurva ?? 15 : 15,
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
    const indicePico = delantero.reduce(
      (mejor, [, y], indice) => y > delantero[mejor][1] ? indice : mejor,
      0,
    );
    const techo = [...frente.slice(1, -1), ...fondo.slice(1, -1).reverse()];
    const lateralDcha = [frente.at(-2)!, frente.at(-1)!, fondo.at(-1)!, fondo.at(-2)!];
    const contornoFrente = frente.slice(0, -1);
    const contornoTechoFondo = fondo.slice(1, -1);
    const hombroDerecho = frente.at(-2)!;
    const picoFrente = frente[indicePico];
    const xCotaAguas = frente.at(-1)!.x + 34;
    return {
      frente, fondo, techo, lateralDcha, contornoFrente, contornoTechoFondo,
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
    valido, props.modo, props.tipoPerfil, props.ancho, props.largo, props.llevaCurva,
    props.radioCurva, props.aguas, altoDelante, altoAtras,
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
    <div className="relative h-[clamp(330px,40vw,500px)] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="absolute left-4 top-4 z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">
          Vista Técnica
        </p>
        <p className="text-sm font-semibold text-slate-800">Perspectiva fija · cotas en cm</p>
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
            <linearGradient id="cara" x1="0" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#e8f1fb" />
              <stop offset="1" stopColor="#bfd7f3" />
            </linearGradient>
            <linearGradient id="lateral" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c9ddf5" />
              <stop offset="1" stopColor="#9ebfe5" />
            </linearGradient>
            <marker id="cota" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
              <path d="M 7 0 L 0 3.5 L 7 7 z" fill="#475569" />
            </marker>
            <pattern id="rejilla" width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#e2e8f0" strokeWidth="0.7" />
            </pattern>
          </defs>
          <rect width="760" height="440" fill="#f8fafc" />
          <rect x="18" y="68" width="724" height="350" rx="8" fill="url(#rejilla)" stroke="#e2e8f0" />
          {/* Volumen cerrado: paños opacos y solo las aristas visibles. */}
          <polygon points={puntosSvg(dibujo.fondo)} fill="#edf4fb" stroke="none" />
          <polygon points={puntosSvg(dibujo.techo)} fill="#d9e8f8" stroke="none" />
          <polygon points={puntosSvg(dibujo.lateralDcha)} fill="url(#lateral)" stroke="none" />
          <polygon points={puntosSvg(dibujo.frente)} fill="url(#cara)" stroke="none" />
          <polyline points={puntosSvg(dibujo.contornoTechoFondo)} fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinejoin="round" />
          <line
            x1={dibujo.fondo.at(-2)!.x} y1={dibujo.fondo.at(-2)!.y}
            x2={dibujo.fondo.at(-1)!.x} y2={dibujo.fondo.at(-1)!.y}
            stroke="#64748b" strokeWidth="1.6"
          />
          <line
            x1={dibujo.frente.at(-2)!.x} y1={dibujo.frente.at(-2)!.y}
            x2={dibujo.fondo.at(-2)!.x} y2={dibujo.fondo.at(-2)!.y}
            stroke="#64748b" strokeWidth="1.8"
          />
          <polyline points={puntosSvg(dibujo.contornoFrente)} fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {props.modo === "baqueton" && (
            <polyline
              points={puntosSvg(dibujo.techo)} fill="none" stroke="#f59e0b"
              strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
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
                texto={`AGUAS ${fmt(props.aguas ?? 0)}`} textoDx={48} textoDy={4}
              />
            </g>
          )}
          {props.modo === "lona" && altoAtras !== altoDelante && (
            <text x="592" y="105" textAnchor="middle" fontSize="12" fontWeight="700" fill="#475569">
              ALTO TRAS. {fmt(altoAtras)}
            </text>
          )}
          <text x="725" y="400" textAnchor="end" fontSize="10" fontWeight="700" fill="#94a3b8">
            {props.modo === "lona" ? props.tipoPerfil : "BAQUETÓN"}
          </text>
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
