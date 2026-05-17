import { CrossSectionProfile } from "@/components/drawings/CrossSectionProfile";
import { DimensionLine } from "@/components/drawings/DimensionLine";
import { EyeletMarkers } from "@/components/drawings/EyeletMarkers";
import { TechnicalDrawingFrame } from "@/components/drawings/TechnicalDrawingFrame";
import { profileNeedsCornerRadius } from "@/components/drawings/cross-section-paths";
import { getProfileDefinition } from "@/lib/drawings/trailer-profile-types";
import type { TrailerProfileType } from "@/lib/drawings/trailer-profile-types";
import { DRAWING_COLORS, DRAWING_STROKES } from "@/components/drawings/drawing-colors";
import { canDrawRect, fitScale } from "@/components/drawings/drawing-utils";
import { formatCm, formatDimension } from "@/lib/format/number";
import { parseOllaoText } from "@/lib/print/parse-ollaos";
import type { AppSettings, LonaCalculationResult, LonaFormInput } from "@/lib/types";

function GomaEars({
  x,
  y,
  w,
  h,
  earW,
  inicioLabel,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  earW: number;
  inicioLabel: string;
}) {
  const earPx = Math.min(earW, w * 0.12);
  const startY = y + h * 0.15;
  return (
    <g>
      <rect
        x={x - earPx}
        y={startY}
        width={earPx}
        height={h * 0.5}
        fill="none"
        stroke={DRAWING_COLORS.gomaEar}
        strokeWidth={DRAWING_STROKES.finished}
      />
      <rect
        x={x + w}
        y={startY}
        width={earPx}
        height={h * 0.5}
        fill="none"
        stroke={DRAWING_COLORS.gomaEar}
        strokeWidth={DRAWING_STROKES.finished}
      />
      <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize={8} fill={DRAWING_COLORS.gomaEar}>
        Orejas {formatCm(earW)} cm · Inicio {inicioLabel} cm
      </text>
    </g>
  );
}

function PanelRect({
  x,
  y,
  w,
  h,
  label,
  cutW,
  cutH,
  finishedW,
  finishedH,
  ventana,
  goma,
  earCm,
  inicioOreja,
  ollaoCount,
  ollaoSide,
  tipoPerfil,
  chaflanCm,
  radioEsquinaCm,
  anchoCm,
  altoCm,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  cutW: number;
  cutH: number;
  finishedW?: number;
  finishedH?: number;
  ventana?: boolean;
  goma?: boolean;
  earCm?: number;
  inicioOreja?: number;
  ollaoCount?: number;
  ollaoSide?: "top" | "bottom" | "left" | "right";
  tipoPerfil?: TrailerProfileType;
  chaflanCm?: number;
  radioEsquinaCm?: number;
  anchoCm?: number;
  altoCm?: number;
}) {
  const fx = finishedW && finishedH ? x + (w - finishedW) / 2 : x + w * 0.08;
  const fy = finishedW && finishedH ? y + (h - finishedH) / 2 : y + h * 0.1;
  const fw = finishedW ?? w * 0.84;
  const fh = finishedH ?? h * 0.8;

  return (
    <g>
      <text x={x + w / 2} y={y - 4} textAnchor="middle" fontSize={9} fontWeight={700}>
        {label}
      </text>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke={DRAWING_COLORS.cutLine}
        strokeWidth={DRAWING_STROKES.cut}
      />
      {tipoPerfil ? (
        <CrossSectionProfile
          x={fx}
          y={fy}
          width={fw}
          height={fh}
          tipo={tipoPerfil}
          chaflanCm={chaflanCm}
          radioEsquinaCm={radioEsquinaCm}
          anchoCm={anchoCm}
          altoCm={altoCm}
          showChaflanLabel={tipoPerfil === "tipo-04"}
        />
      ) : (
        <rect
          x={fx}
          y={fy}
          width={fw}
          height={fh}
          fill="none"
          stroke={DRAWING_COLORS.finishedTrailer}
          strokeWidth={DRAWING_STROKES.finished}
        />
      )}
      {ventana && (
        <rect
          x={fx + fw * 0.2}
          y={fy + fh * 0.25}
          width={fw * 0.6}
          height={fh * 0.35}
          fill={DRAWING_COLORS.windowFill}
          stroke={DRAWING_COLORS.windowStroke}
          strokeWidth={DRAWING_STROKES.window}
          strokeDasharray={DRAWING_STROKES.dashed}
        />
      )}
      {ventana && (
        <text
          x={fx + fw / 2}
          y={fy + fh / 2}
          textAnchor="middle"
          fontSize={8}
          fill={DRAWING_COLORS.windowStroke}
        >
          VENTANA
        </text>
      )}
      {goma && earCm != null && inicioOreja != null && (
        <GomaEars
          x={x}
          y={y}
          w={w}
          h={h}
          earW={earCm}
          inicioLabel={formatCm(inicioOreja)}
        />
      )}
      {ollaoCount != null && ollaoCount > 0 && ollaoSide && (
        <EyeletMarkers
          count={Math.min(ollaoCount, 8)}
          x1={x + 4}
          y1={y + 4}
          x2={x + w - 4}
          y2={y + h - 4}
          side={ollaoSide}
        />
      )}
      <DimensionLine
        x1={x}
        y1={y + h + 8}
        x2={x + w}
        y2={y + h + 8}
        label={`${formatCm(cutW)} × ${formatCm(cutH)}`}
        offset={10}
      />
    </g>
  );
}

export function TrailerCanvasTechnicalDrawing({
  input,
  result,
  settings,
}: {
  input: LonaFormInput;
  result: LonaCalculationResult;
  settings: AppSettings;
}) {
  const contorno = result.panos.contorno;
  const del = result.panos.delantero;
  const tra = result.panos.trasero;
  const params = settings.lonaParams;

  const canDraw =
    canDrawRect(del.ancho, del.alto) &&
    canDrawRect(tra.ancho, tra.alto) &&
    (contorno ? canDrawRect(contorno.ancho, contorno.largo) : true);

  if (!canDraw) {
    return (
      <TechnicalDrawingFrame
        title="Dibujo técnico — Lona remolque alto"
        viewBox="0 0 1 1"
        fallbackMessage="Faltan medidas para generar el dibujo"
      />
    );
  }

  const ollaoLat = parseOllaoText(result.ollaos.laterales).length;
  const ollaoDel = parseOllaoText(result.ollaos.delante).length;
  const ollaoTra = parseOllaoText(result.ollaos.atras).length;

  const inicioOrejaDel = input.tieneCurva
    ? input.radioCurva
    : params.inicioOrejaSinCurva;
  const inicioOrejaTra = inicioOrejaDel;

  const contW = contorno?.ancho ?? result.medidaLonaHecha.largo;
  const contH = contorno?.largo ?? result.medidaLonaHecha.ancho;

  const scaleC = fitScale(contW, contH, 420, 95);
  const cW = contW * scaleC;
  const cH = contH * scaleC;
  const cX = 240 - cW / 2;
  const cY = 28;

  const scaleD = fitScale(del.ancho, del.alto, 150, 85);
  const dW = del.ancho * scaleD;
  const dH = del.alto * scaleD;

  const scaleT = fitScale(tra.ancho, tra.alto, 150, 85);
  const tW = tra.ancho * scaleT;
  const tH = tra.alto * scaleT;

  const finScale = fitScale(
    result.medidaLonaHecha.largo,
    result.medidaLonaHecha.ancho,
    cW * 0.88,
    cH * 0.88,
  );
  const finW = result.medidaLonaHecha.largo * finScale;
  const finH = result.medidaLonaHecha.ancho * finScale;

  const tipoPerfil = input.tipoPerfil ?? "tipo-01";
  const radioEsquina =
    profileNeedsCornerRadius(tipoPerfil) && input.radioCurva > 0
      ? input.radioCurva
      : 10;

  return (
    <TechnicalDrawingFrame
      title="Dibujo técnico — Lona remolque alto"
      viewBox="0 0 520 300"
      width={560}
      height={300}
    >
      {contorno && (
        <g>
          <PanelRect
            x={cX}
            y={cY}
            w={cW}
            h={cH}
            label="PAÑO CONTORNO"
            cutW={contorno.ancho}
            cutH={contorno.largo}
            finishedW={finW}
            finishedH={finH}
            ollaoCount={ollaoLat}
            ollaoSide="top"
          />
          {input.tieneCurva && (
            <text x={cX + cW / 2} y={cY + cH + 22} textAnchor="middle" fontSize={8}>
              Contorno CAD + curva · Radio {formatCm(input.radioCurva)} cm
            </text>
          )}
          <rect
            x={cX - 4}
            y={cY - 4}
            width={cW + 8}
            height={cH + 8}
            fill="none"
            stroke={DRAWING_COLORS.hemMargin}
            strokeWidth={DRAWING_STROKES.hem}
            strokeDasharray="3 2"
          />
        </g>
      )}

      <PanelRect
        x={40}
        y={175}
        w={dW}
        h={dH}
        label="PAÑO DELANTERO"
        cutW={del.ancho}
        cutH={del.alto}
        ventana={input.ventana}
        goma={input.recogeDelante === "GOMA"}
        earCm={params.medidaOrejaGoma}
        inicioOreja={inicioOrejaDel}
        ollaoCount={ollaoDel}
        ollaoSide="bottom"
        tipoPerfil={tipoPerfil}
        chaflanCm={input.chaflanCm}
        radioEsquinaCm={radioEsquina}
        anchoCm={input.anchoPedido}
        altoCm={input.altoDelantero}
      />

      <PanelRect
        x={320}
        y={175}
        w={tW}
        h={tH}
        label="PAÑO TRASERO"
        cutW={tra.ancho}
        cutH={tra.alto}
        goma={input.recogeAtras === "GOMA"}
        earCm={params.medidaOrejaGoma}
        inicioOreja={inicioOrejaTra}
        ollaoCount={ollaoTra}
        ollaoSide="bottom"
        tipoPerfil={tipoPerfil}
        chaflanCm={input.chaflanCm}
        radioEsquinaCm={radioEsquina}
        anchoCm={input.anchoPedido}
        altoCm={input.altoTrasero}
      />

      <text x={8} y={292} fontSize={8} fill={DRAWING_COLORS.dimensionMuted}>
        {getProfileDefinition(tipoPerfil).label} · Lona hecha:{" "}
        {formatDimension(result.medidaLonaHecha.largo, result.medidaLonaHecha.ancho)} cm
      </text>
    </TechnicalDrawingFrame>
  );
}
