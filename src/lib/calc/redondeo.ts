/** ROUND de Excel: a `decimals` decimales, la mitad se aleja de cero. */
export function excelRound(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  // Corrige el error binario (p.ej. 35.15*10 = 351.49999…) antes de redondear.
  const scaled = Number((value * factor).toPrecision(12));
  return (Math.sign(scaled) * Math.round(Math.abs(scaled))) / factor;
}

/** Contorno: siempre hacia arriba al milímetro (1 decimal en cm). */
export function roundUpToMm(cm: number): number {
  const scaled = Number((cm * 10).toPrecision(12));
  return Math.ceil(scaled) / 10;
}
