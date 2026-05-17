"use client";

import { useEffect, useState } from "react";
import { BtnPrimary, BtnSecondary } from "@/components/ui/ActionBar";
import { inputClass } from "@/components/ui/FormField";
import { DEFAULT_MATERIALS } from "@/lib/defaults/default-settings";
import { createId, loadMaterials, saveMaterials } from "@/lib/storage/local-storage";
import type { MaterialItem } from "@/lib/types";

export function MaterialesPanel() {
  const [items, setItems] = useState<MaterialItem[]>(DEFAULT_MATERIALS);

  useEffect(() => {
    setItems(loadMaterials());
  }, []);

  const persist = (next: MaterialItem[]) => {
    setItems(next);
    saveMaterials(next);
  };

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Materiales</h1>
      <table className="mb-4 w-full rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">Activo</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={m.id} className="border-t border-slate-100">
              <td className="p-3">
                <input
                  className={inputClass}
                  value={m.nombre}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...m, nombre: e.target.value };
                    persist(next);
                  }}
                />
              </td>
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={m.activo}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...m, activo: e.target.checked };
                    persist(next);
                  }}
                />
              </td>
              <td className="p-3">
                <BtnSecondary
                  onClick={() => persist(items.filter((x) => x.id !== m.id))}
                >
                  Quitar
                </BtnSecondary>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <BtnPrimary
        onClick={() =>
          persist([
            ...items,
            { id: createId(), nombre: "Nuevo material", activo: true },
          ])
        }
      >
        Añadir material
      </BtnPrimary>
    </section>
  );
}
