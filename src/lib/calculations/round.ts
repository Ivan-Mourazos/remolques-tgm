import type { RoundingMode } from "@/lib/types";

export function roundValue(
  value: number,
  decimals: number,
  mode: RoundingMode = "normal",
): number {
  const factor = 10 ** decimals;
  if (mode === "up") return Math.ceil(value * factor) / factor;
  if (mode === "down") return Math.floor(value * factor) / factor;
  return Math.round(value * factor) / factor;
}
