export interface OllaoRow {
  posicion: string;
  detalle: string;
}

export function parseOllaoText(text: string): OllaoRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(/\s*[|;,]\s*/);
      if (parts.length >= 2) {
        return { posicion: parts[0], detalle: parts.slice(1).join(" · ") };
      }
      return { posicion: String(index + 1), detalle: line };
    });
}
