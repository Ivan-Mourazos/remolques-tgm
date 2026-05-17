export function formatCm(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  const text =
    Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return text.replace(".", ",");
}

export function formatM2(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(4).replace(".", ",");
}

export function formatDate(value: string): string {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function formatBoolean(value: boolean): string {
  return value ? "Sí" : "No";
}

export function formatDimension(largo: number, ancho: number): string {
  return `${formatCm(largo)} × ${formatCm(ancho)}`;
}
