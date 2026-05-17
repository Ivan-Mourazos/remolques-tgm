"use client";

import { OllaosRepartoGrid } from "@/components/ollaos/OllaosRepartoGrid";
import type { OllaoSectionId } from "@/lib/print/ollaos-grid";
import type { OllaoPlacement } from "@/lib/types";

type OllaoTexts = {
  laterales: string;
  atras: string;
  delante: string;
};

type Props = OllaoTexts & {
  colocacionOllaos: OllaoPlacement;
  onChange: (section: OllaoSectionId, text: string) => void;
};

export function OllaosEntryPanel({
  colocacionOllaos,
  laterales,
  atras,
  delante,
  onChange,
}: Props) {
  if (colocacionOllaos !== "a-la-medida") return null;

  return (
    <section className="no-print rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
        Introducir ollaos
      </h2>
      <OllaosRepartoGrid
        editable
        headerLabel="A LA MEDIDA"
        laterales={laterales}
        atras={atras}
        delante={delante}
        onChange={onChange}
      />
    </section>
  );
}
