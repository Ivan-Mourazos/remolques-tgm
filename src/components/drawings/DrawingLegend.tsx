import { DRAWING_COLORS } from "@/components/drawings/drawing-colors";

const items = [
  { color: DRAWING_COLORS.finishedTrailer, label: "Remolque terminado", dash: false },
  { color: DRAWING_COLORS.cutLine, label: "Línea de corte / paño", dash: false },
  { color: DRAWING_COLORS.hemMargin, label: "Bastilla / margen", dash: false },
  { color: DRAWING_COLORS.eyelet, label: "Ollao", dash: false, circle: true },
  { color: DRAWING_COLORS.windowStroke, label: "Ventana", dash: true },
  { color: DRAWING_COLORS.gomaEar, label: "Oreja goma", dash: false },
];

export function DrawingLegend({ compact = false }: { compact?: boolean }) {
  return (
    <g className="drawing-legend">
      {items.map((item, i) => {
        const y = compact ? 12 + i * 14 : 16 + i * 18;
        return (
          <g key={item.label} transform={`translate(8, ${y})`}>
            {item.circle ? (
              <circle cx={8} cy={0} r={4} fill={item.color} />
            ) : (
              <line
                x1={0}
                y1={0}
                x2={16}
                y2={0}
                stroke={item.color}
                strokeWidth={2.5}
                strokeDasharray={item.dash ? "4 3" : undefined}
              />
            )}
            <text x={22} y={4} fontSize={compact ? 8 : 9} fill={DRAWING_COLORS.dimensionText}>
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
