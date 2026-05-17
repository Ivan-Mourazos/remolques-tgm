import { parseOllaoText, type OllaoRow } from "@/lib/print/parse-ollaos";

export const OLLAO_GRID_COLUMNS = 12;

export const OLLAO_GRID_SECTIONS = [
  {
    id: "laterales" as const,
    title: "Ollaos laterales de atrás a adelante",
  },
  {
    id: "atras" as const,
    title: "Ollaos atrás de izquierda a derecha",
  },
  {
    id: "delante" as const,
    title: "Ollaos delante de izquierda a derecha",
  },
];

export type OllaoSectionId = (typeof OLLAO_GRID_SECTIONS)[number]["id"];

export function cellsFromOllaoText(text: string): string[] {
  const rows = parseOllaoText(text);
  const cells = Array<string>(OLLAO_GRID_COLUMNS).fill("");
  rows.forEach((row, index) => {
    if (index < OLLAO_GRID_COLUMNS) cells[index] = row.detalle;
  });
  return cells;
}

export function ollaoTextFromCells(cells: string[]): string {
  return cells
    .map((cell) => cell.trim())
    .filter(Boolean)
    .join("\n");
}

export function formatOllaoCellValue(row: OllaoRow): string {
  return row.detalle === row.posicion ? row.detalle : `${row.posicion} ${row.detalle}`;
}

export function ollaoSectionRows(text: string): OllaoRow[] {
  return parseOllaoText(text);
}
