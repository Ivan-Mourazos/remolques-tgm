import { DimensionLine } from "@/components/drawings/DimensionLine";
import { EyeletMarkers } from "@/components/drawings/EyeletMarkers";
import { TechnicalDrawingFrame } from "@/components/drawings/TechnicalDrawingFrame";
import { DRAWING_COLORS, DRAWING_STROKES } from "@/components/drawings/drawing-colors";
import { canDrawRect, fitScale } from "@/components/drawings/drawing-utils";
import { formatCm, formatDimension, formatM2 } from "@/lib/format/number";
import { parseOllaoText } from "@/lib/print/parse-ollaos";
import type { BaquetonCalculationResult, BaquetonFormInput } from "@/lib/types";

export function BaquetonTechnicalDrawing({
  input,
  result,
}: {
  input: BaquetonFormInput;
  result: BaquetonCalculationResult;
}) {
  const { panoUnico, medidasRemolqueHecho, baquetonCostura } = result;
  const canDraw = canDrawRect(panoUnico.largo, panoUnico.ancho);

  if (!canDraw) {
    return (
      <TechnicalDrawingFrame
        title="Dibujo técnico — Baquetón"
        viewBox="0 0 1 1"
        fallbackMessage="Faltan medidas para generar el dibujo"
      />
    );
  }

  const ollaoCount = parseOllaoText(input.ollaosManuales).length;
  const scale = fitScale(panoUnico.largo, panoUnico.ancho, 400, 200);
  const pw = panoUnico.largo * scale;
  const ph = panoUnico.ancho * scale;
  const px = 260 - pw / 2;
  const py = 50;

  const finScale = fitScale(
    medidasRemolqueHecho.largo,
    medidasRemolqueHecho.ancho,
    pw * 0.72,
    ph * 0.72,
  );
  const fw = medidasRemolqueHecho.largo * finScale;
  const fh = medidasRemolqueHecho.ancho * finScale;
  const fx = px + (pw - fw) / 2;
  const fy = py + (ph - fh) / 2;

  const marginX = ((panoUnico.largo - medidasRemolqueHecho.largo) / 2) * scale;
  const marginY = ((panoUnico.ancho - medidasRemolqueHecho.ancho) / 2) * scale;

  return (
    <TechnicalDrawingFrame
      title="Dibujo técnico — Baquetón"
      viewBox="0 0 520 280"
      width={560}
      height={280}
    >
      <text x={260} y={36} textAnchor="middle" fontSize={10} fontWeight={700}>
        PAÑO ÚNICO BAQUETÓN
      </text>

      <rect
        x={px}
        y={py}
        width={pw}
        height={ph}
        fill="none"
        stroke={DRAWING_COLORS.cutLine}
        strokeWidth={DRAWING_STROKES.cut}
      />

      <rect
        x={px + marginX * 0.3}
        y={py + marginY * 0.3}
        width={pw - marginX * 0.6}
        height={ph - marginY * 0.6}
        fill="none"
        stroke={DRAWING_COLORS.hemMargin}
        strokeWidth={DRAWING_STROKES.hem}
        strokeDasharray="4 3"
      />

      <rect
        x={fx}
        y={fy}
        width={fw}
        height={fh}
        fill="none"
        stroke={DRAWING_COLORS.finishedTrailer}
        strokeWidth={DRAWING_STROKES.finished}
      />

      <text x={fx + fw / 2} y={fy + fh / 2} textAnchor="middle" fontSize={9} fontWeight={600}>
        REMOLQUE HECHO
      </text>
      <text x={px - 8} y={py + ph / 2} textAnchor="end" fontSize={8} fill={DRAWING_COLORS.hemMargin}>
        BAQUETÓN {formatCm(baquetonCostura)} cm
      </text>

      <DimensionLine
        x1={px}
        y1={py + ph + 12}
        x2={px + pw}
        y2={py + ph + 12}
        label={`${formatCm(panoUnico.largo)} × ${formatCm(panoUnico.ancho)} cm`}
      />
      <DimensionLine
        x1={px + pw + 12}
        y1={fy}
        x2={px + pw + 12}
        y2={fy + fh}
        label={`${formatCm(medidasRemolqueHecho.ancho)}`}
        orientation="vertical"
        offset={18}
      />

      {ollaoCount > 0 && (
        <EyeletMarkers
          count={Math.min(ollaoCount, 10)}
          x1={px + 6}
          y1={py + 6}
          x2={px + pw - 6}
          y2={py + ph - 6}
          side="top"
        />
      )}

      <text x={260} y={268} textAnchor="middle" fontSize={8} fill={DRAWING_COLORS.dimensionMuted}>
        Superficie {formatM2(result.superficieM2)} m² ·{" "}
        {formatDimension(medidasRemolqueHecho.largo, medidasRemolqueHecho.ancho)} remolque
      </text>
    </TechnicalDrawingFrame>
  );
}
