import { DRAWING_COLORS, DRAWING_STROKES } from "@/components/drawings/drawing-colors";

type Orientation = "horizontal" | "vertical";

export function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  orientation = "horizontal",
  offset = 14,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  orientation?: Orientation;
  offset?: number;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const lx = orientation === "horizontal" ? mx : x1 - offset;
  const ly = orientation === "horizontal" ? y1 - offset : my;

  return (
    <g className="dimension-line" fill={DRAWING_COLORS.dimensionText}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={DRAWING_COLORS.dimensionMuted}
        strokeWidth={DRAWING_STROKES.dimension}
      />
      <polygon
        points={
          orientation === "horizontal"
            ? `${x1},${y1} ${x1 + 5},${y1 - 3} ${x1 + 5},${y1 + 3}`
            : `${x1},${y1} ${x1 - 3},${y1 + 5} ${x1 + 3},${y1 + 5}`
        }
        fill={DRAWING_COLORS.dimensionMuted}
      />
      <polygon
        points={
          orientation === "horizontal"
            ? `${x2},${y2} ${x2 - 5},${y2 - 3} ${x2 - 5},${y2 + 3}`
            : `${x2},${y2} ${x2 - 3},${y2 - 5} ${x2 + 3},${y2 - 5}`
        }
        fill={DRAWING_COLORS.dimensionMuted}
      />
      <text
        x={lx}
        y={ly}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontWeight={600}
        fill={DRAWING_COLORS.dimensionText}
      >
        {label}
      </text>
    </g>
  );
}
