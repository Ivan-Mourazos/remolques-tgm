"use client";

import { useEffect, useState } from "react";
import { BtnPrimary, BtnSecondary } from "@/components/ui/ActionBar";
import { inputClass, textareaClass } from "@/components/ui/FormField";
import { DEFAULT_OLLAO_TEMPLATES } from "@/lib/defaults/default-settings";
import { createId, loadOllaoTemplates, saveOllaoTemplates } from "@/lib/storage/local-storage";
import type { OllaoTemplate } from "@/lib/types";

export function OllaoTemplatesPanel() {
  const [items, setItems] = useState<OllaoTemplate[]>(DEFAULT_OLLAO_TEMPLATES);

  useEffect(() => {
    setItems(loadOllaoTemplates());
  }, []);

  const persist = (next: OllaoTemplate[]) => {
    setItems(next);
    saveOllaoTemplates(next);
  };

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Plantillas de ollaos</h1>
      <ul className="space-y-4">
        {items.map((t, i) => (
          <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-3 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              className={`${inputClass} mb-3`}
              value={t.nombre}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...t, nombre: e.target.value };
                persist(next);
              }}
            />
            <label className="mb-1 block text-sm font-medium text-slate-700">Laterales</label>
            <textarea
              className={`${textareaClass} mb-3`}
              rows={2}
              value={t.laterales}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...t, laterales: e.target.value };
                persist(next);
              }}
            />
            <label className="mb-1 block text-sm font-medium text-slate-700">Delante</label>
            <input
              className={`${inputClass} mb-3`}
              value={t.delante}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...t, delante: e.target.value };
                persist(next);
              }}
            />
            <label className="mb-1 block text-sm font-medium text-slate-700">Atrás</label>
            <input
              className={`${inputClass} mb-3`}
              value={t.atras}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...t, atras: e.target.value };
                persist(next);
              }}
            />
            <BtnSecondary onClick={() => persist(items.filter((x) => x.id !== t.id))}>
              Eliminar plantilla
            </BtnSecondary>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <BtnPrimary
          onClick={() =>
            persist([
              ...items,
              {
                id: createId(),
                nombre: "Nueva plantilla",
                laterales: "",
                delante: "",
                atras: "",
              },
            ])
          }
        >
          Añadir plantilla
        </BtnPrimary>
      </div>
    </section>
  );
}
