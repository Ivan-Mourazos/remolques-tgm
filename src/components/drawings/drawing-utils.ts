export function fitScale(
  width: number,
  height: number,
  maxW: number,
  maxH: number,
): number {
  if (width <= 0 || height <= 0 || maxW <= 0 || maxH <= 0) return 0;
  return Math.min(maxW / width, maxH / height);
}

export function canDrawRect(w: number, h: number): boolean {
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
}

export function distributePoints(count: number, start: number, end: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(start + end) / 2];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + step * i);
}
