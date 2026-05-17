"use client";

import {
  cellsFromOllaoText,
  formatOllaoCellValue,
  OLLAO_GRID_COLUMNS,
  OLLAO_GRID_SECTIONS,
  ollaoSectionRows,
  ollaoTextFromCells,
  type OllaoSectionId,
} from "@/lib/print/ollaos-grid";

type SectionTexts = Record<OllaoSectionId, string>;

type Props = {
  laterales: string;
  atras: string;
  delante: string;
  editable?: boolean;
  headerLabel?: string;
  compact?: boolean;
  onChange?: (section: OllaoSectionId, text: string) => void;
};

function sectionTexts(props: Props): SectionTexts {
  return {
    laterales: props.laterales,
    atras: props.atras,
    delante: props.delante,
  };
}

export function OllaosRepartoGrid({
  laterales,
  atras,
  delante,
  editable = false,
  headerLabel = "REPARTIDOS",
  compact = false,
  onChange,
}: Props) {
  const texts = sectionTexts({ laterales, atras, delante, editable, headerLabel, compact, onChange });

  const titleCol = compact ? "w-[7.5rem]" : "w-[82mm]";
  const totalCol = compact ? "w-8" : "w-[12mm]";
  const cellInputClass =
    "w-full min-w-[1.6rem] border-0 bg-transparent px-0.5 py-0.5 text-center text-[9px] font-bold text-slate-950 outline-none focus:bg-amber-50 focus:ring-1 focus:ring-amber-400";

  return (
    <div className={compact ? "overflow-x-auto" : undefined}>
      <table
        className={`w-full table-fixed border-collapse overflow-hidden rounded-sm leading-tight shadow-[0_0_0_1px_#1f2937] ${
          compact ? "min-w-[28rem] text-[8px]" : "text-[7px]"
        }`}
      >
        <thead>
          <tr>
            <th
              className={`${titleCol} border border-slate-800 bg-slate-800 px-1 text-left font-black text-white`}
            >
              {headerLabel}
            </th>
            {Array.from({ length: OLLAO_GRID_COLUMNS }, (_, i) => (
              <th
                key={i}
                className="border border-slate-800 bg-slate-700 text-center font-black text-white"
              >
                {i + 1}
              </th>
            ))}
            <th
              className={`${totalCol} border border-slate-800 bg-amber-400 text-center font-black text-slate-950`}
            >
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {OLLAO_GRID_SECTIONS.map((section, sectionIndex) => {
            const rows = ollaoSectionRows(texts[section.id]);
            const cells = cellsFromOllaoText(texts[section.id]);
            const values = rows.map(formatOllaoCellValue);
            const total = values.filter(Boolean).length;

            const updateCell = (colIndex: number, value: string) => {
              if (!onChange) return;
              const next = [...cells];
              next[colIndex] = value;
              onChange(section.id, ollaoTextFromCells(next));
            };

            return (
              <tr
                key={section.id}
                className={sectionIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                <td className="border border-slate-800 bg-blue-50 px-1 font-black uppercase text-slate-900">
                  {compact ? (
                    <span className="block text-[7px] leading-tight">{section.title}</span>
                  ) : (
                    section.title
                  )}
                </td>
                {Array.from({ length: OLLAO_GRID_COLUMNS }, (_, colIndex) => (
                  <td
                    key={colIndex}
                    className="border border-slate-800 px-0.5 text-center font-bold text-slate-950"
                  >
                    {editable ? (
                      <input
                        type="text"
                        className={cellInputClass}
                        value={cells[colIndex] ?? ""}
                        onChange={(e) => updateCell(colIndex, e.target.value)}
                        aria-label={`${section.title} columna ${colIndex + 1}`}
                      />
                    ) : (
                      (values[colIndex] ?? "")
                    )}
                  </td>
                ))}
                <td className="border border-slate-800 bg-amber-50 text-center font-black text-slate-950">
                  {total || ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
