import { DrawingLegend } from "@/components/drawings/DrawingLegend";
import { DRAWING_COLORS } from "@/components/drawings/drawing-colors";

export function TechnicalDrawingFrame({
  title,
  width = 560,
  height = 300,
  viewBox,
  children,
  showLegend = true,
  fallbackMessage,
}: {
  title: string;
  width?: number;
  height?: number;
  viewBox: string;
  children?: React.ReactNode;
  showLegend?: boolean;
  fallbackMessage?: string;
}) {
  if (fallbackMessage) {
    return (
      <div
        className="flex h-full min-h-[200px] items-center justify-center rounded border border-dashed p-4 text-center text-xs text-slate-600"
        style={{
          borderColor: DRAWING_COLORS.warningStroke,
          backgroundColor: DRAWING_COLORS.warningFill,
        }}
      >
        {fallbackMessage}
      </div>
    );
  }

  return (
    <div className="technical-drawing-frame h-full w-full">
      <svg
        viewBox={viewBox}
        width={width}
        height={height}
        className="h-auto w-full max-h-[280px]"
        role="img"
        aria-label={title}
      >
        <rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill={DRAWING_COLORS.background}
        />
        <text
          x={8}
          y={16}
          fontSize={11}
          fontWeight={700}
          fill={DRAWING_COLORS.dimensionText}
        >
          {title}
        </text>
        {children}
        {showLegend && (
          <g transform="translate(8, 240)">
            <DrawingLegend compact />
          </g>
        )}
      </svg>
    </div>
  );
}
