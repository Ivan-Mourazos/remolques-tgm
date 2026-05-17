import type { TrailerProfileType } from "@/lib/drawings/trailer-profile-types";

/** Coordenadas normalizadas 0–100 (ancho) × 0–80 (alto) */
export interface ProfilePathOptions {
  tipo: TrailerProfileType;
  /** 0–1, tamaño del chaflán respecto al ancho (TIPO 04) */
  chaflanRatio?: number;
  /** 0–1, radio de esquina respecto al ancho (TIPO 03, 05) */
  cornerRatio?: number;
  /** 0–1, altura de cumbrera respecto al alto total (TIPO 02, 03) */
  peakRatio?: number;
}

const W = 100;
const H = 80;
const PAD = 8;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Genera el path SVG del perfil visto de frente (corte transversal).
 */
export function buildCrossSectionPath(options: ProfilePathOptions): string {
  const { tipo } = options;
  const chaflan = clamp(options.chaflanRatio ?? 0.14, 0.06, 0.28) * W;
  const corner = clamp(options.cornerRatio ?? 0.1, 0.04, 0.22) * W;
  const peakDrop = clamp(options.peakRatio ?? 0.38, 0.2, 0.55) * H;

  const left = PAD;
  const right = W - PAD;
  const bottom = H - PAD;
  const topFlat = PAD + 4;
  const midX = W / 2;
  const eaveY = topFlat + peakDrop;

  switch (tipo) {
    case "tipo-01":
      return `M ${left} ${topFlat} L ${right} ${topFlat} L ${right} ${bottom} L ${left} ${bottom} Z`;

    case "tipo-02":
      return [
        `M ${left} ${bottom}`,
        `L ${left} ${eaveY}`,
        `L ${midX} ${topFlat}`,
        `L ${right} ${eaveY}`,
        `L ${right} ${bottom}`,
        "Z",
      ].join(" ");

    case "tipo-03": {
      const r = corner;
      return [
        `M ${left} ${bottom}`,
        `L ${left} ${eaveY}`,
        `Q ${left} ${topFlat + r * 0.3} ${left + r} ${topFlat + r * 0.5}`,
        `L ${midX - r * 0.5} ${topFlat}`,
        `L ${midX} ${topFlat}`,
        `L ${midX + r * 0.5} ${topFlat}`,
        `L ${right - r} ${topFlat + r * 0.5}`,
        `Q ${right} ${topFlat + r * 0.3} ${right} ${eaveY}`,
        `L ${right} ${bottom}`,
        "Z",
      ].join(" ");
    }

    case "tipo-04": {
      const c = chaflan;
      return [
        `M ${left + c} ${topFlat}`,
        `L ${right - c} ${topFlat}`,
        `L ${right} ${topFlat + c}`,
        `L ${right} ${bottom}`,
        `L ${left} ${bottom}`,
        `L ${left} ${topFlat + c}`,
        "Z",
      ].join(" ");
    }

    case "tipo-05": {
      const r = corner;
      return [
        `M ${left + r} ${topFlat}`,
        `L ${right - r} ${topFlat}`,
        `Q ${right} ${topFlat} ${right} ${topFlat + r}`,
        `L ${right} ${bottom - r}`,
        `Q ${right} ${bottom} ${right - r} ${bottom}`,
        `L ${left + r} ${bottom}`,
        `Q ${left} ${bottom} ${left} ${bottom - r}`,
        `L ${left} ${topFlat + r}`,
        `Q ${left} ${topFlat} ${left + r} ${topFlat}`,
        "Z",
      ].join(" ");
    }

    default:
      return buildCrossSectionPath({ ...options, tipo: "tipo-01" });
  }
}

export function profileNeedsChaflan(tipo: TrailerProfileType): boolean {
  return tipo === "tipo-04";
}

export function profileNeedsCornerRadius(tipo: TrailerProfileType): boolean {
  return tipo === "tipo-03" || tipo === "tipo-05";
}

export function profileNeedsPeak(tipo: TrailerProfileType): boolean {
  return tipo === "tipo-02" || tipo === "tipo-03";
}
