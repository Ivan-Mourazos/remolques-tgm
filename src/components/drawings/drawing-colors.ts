/** Colores esquemáticos alineados con planteamientos Excel / taller */
export const DRAWING_COLORS = {
  finishedTrailer: "#E91E8C",
  cutLine: "#2E9B32",
  hemMargin: "#F5A623",
  dimensionText: "#1A1A1A",
  dimensionMuted: "#4A4A4A",
  eyelet: "#1565C0",
  eyeletStroke: "#0D47A1",
  windowStroke: "#555555",
  windowFill: "none",
  gomaEar: "#E91E8C",
  background: "#FFFFFF",
  frame: "#CCCCCC",
  labelBg: "#FFFFFF",
  warningFill: "#FFF8E1",
  warningStroke: "#F9A825",
} as const;

export const DRAWING_STROKES = {
  finished: 2.5,
  cut: 2,
  hem: 1.5,
  dimension: 1,
  eyelet: 1,
  window: 1.5,
  dashed: "6 4",
} as const;
