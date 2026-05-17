import {
  buildCrossSectionPath,
  type ProfilePathOptions,
} from "@/components/drawings/cross-section-paths";
import { DRAWING_COLORS, DRAWING_STROKES } from "@/components/drawings/drawing-colors";
import type { TrailerProfileType } from "@/lib/drawings/trailer-profile-types";

function clampRatio(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function CrossSectionProfile({
  x,
  y,
  width,
  height,
  tipo,
  chaflanCm,
  radioEsquinaCm,
  anchoCm,
  altoCm,
  stroke = DRAWING_COLORS.finishedTrailer,
  strokeWidth = DRAWING_STROKES.finished,
  showChaflanLabel = false,
  showTipoLabel,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  tipo: TrailerProfileType;
  chaflanCm?: number;
  radioEsquinaCm?: number;
  anchoCm?: number;
  altoCm?: number;
  stroke?: string;
  strokeWidth?: number;
  showChaflanLabel?: boolean;
  showTipoLabel?: string;
}) {
  const chaflanRatio =
    chaflanCm && anchoCm && anchoCm > 0 ? chaflanCm / anchoCm : undefined;
  const cornerRatio =
    radioEsquinaCm && anchoCm && anchoCm > 0 ? radioEsquinaCm / anchoCm : undefined;
  const peakRatio =
    altoCm && altoCm > 0 && anchoCm && anchoCm > 0
      ? clampRatio(altoCm / (altoCm + anchoCm * 0.35), 0.22, 0.48)
      : 0.36;

  const pathOpts: ProfilePathOptions = {
    tipo,
    chaflanRatio,
    cornerRatio,
    peakRatio,
  };

  const d = buildCrossSectionPath(pathOpts);

  return (
    <g transform={`translate(${x}, ${y})`}>
      <svg
        x={0}
        y={0}
        width={width}
        height={height}
        viewBox="0 0 100 80"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        {showChaflanLabel && tipo === "tipo-04" && (
          <text
            x={50}
            y={42}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill={DRAWING_COLORS.dimensionText}
          >
            CHAFLAN
          </text>
        )}
        {showTipoLabel && (
          <text
            x={50}
            y={8}
            textAnchor="middle"
            fontSize={7}
            fill={DRAWING_COLORS.dimensionMuted}
          >
            {showTipoLabel}
          </text>
        )}
      </svg>
    </g>
  );
}
