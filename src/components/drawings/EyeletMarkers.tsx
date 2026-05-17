import { DRAWING_COLORS } from "@/components/drawings/drawing-colors";
import { distributePoints } from "@/components/drawings/drawing-utils";

export function EyeletMarkers({
  count,
  x1,
  y1,
  x2,
  y2,
  side = "top",
}: {
  count: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  side?: "top" | "bottom" | "left" | "right";
}) {
  if (count <= 0) return null;

  const points =
    side === "top" || side === "bottom"
      ? distributePoints(count, x1, x2).map((x) => ({
          cx: x,
          cy: side === "top" ? y1 : y2,
        }))
      : distributePoints(count, y1, y2).map((y) => ({
          cx: side === "left" ? x1 : x2,
          cy: y,
        }));

  return (
    <g className="eyelet-markers">
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r={3}
          fill={DRAWING_COLORS.eyelet}
          stroke={DRAWING_COLORS.eyeletStroke}
          strokeWidth={0.8}
        />
      ))}
    </g>
  );
}
