"use client";

import { useState } from "react";
import { BtnPrimary, BtnSecondary } from "@/components/ui/ActionBar";
import { inputClass } from "@/components/ui/FormField";
import { DEFAULT_SETTINGS } from "@/lib/defaults/default-settings";
import { useSettings } from "@/lib/hooks/use-settings";
import type { AppSettings, BaquetonProfile, RecogidaType } from "@/lib/types";

function cloneSettings(settings: AppSettings): AppSettings {
  return JSON.parse(JSON.stringify(settings)) as AppSettings;
}

function SettingsEditor({
  initialSettings,
  onSave,
}: {
  initialSettings: AppSettings;
  onSave: (next: AppSettings) => void;
}) {
  const [draft, setDraft] = useState(() => cloneSettings(initialSettings));

  const updateLona = (key: keyof AppSettings["lonaParams"], value: number | string) => {
    setDraft({
      ...draft,
      lonaParams: { ...draft.lonaParams, [key]: value },
    });
  };

  const updateRecogida = (index: number, field: keyof RecogidaType, value: string | number) => {
    const next = [...draft.recogidaTypes];
    next[index] = { ...next[index], [field]: value };
    setDraft({ ...draft, recogidaTypes: next });
  };

  const updateProfile = (
    index: number,
    field: keyof BaquetonProfile,
    value: string | number,
  ) => {
    const next = [...draft.baquetonProfiles];
    next[index] = { ...next[index], [field]: value };
    setDraft({ ...draft, baquetonProfiles: next });
  };

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Parámetros</h1>
        <p className="mt-1 text-slate-600">
          Valores usados en los cálculos. Cada planteamiento guardado incluye una copia de estos parámetros.
        </p>
      </header>

      <fieldset className="rounded-xl border border-slate-200 bg-white p-6">
        <legend className="px-2 text-lg font-semibold">Lona remolque</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(draft.lonaParams) as Array<keyof AppSettings["lonaParams"]>).map(
            (key) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">{key}</span>
                <input
                  className={inputClass}
                  type={key === "redondeo" ? "text" : "number"}
                  step="0.1"
                  value={draft.lonaParams[key]}
                  onChange={(e) =>
                    updateLona(
                      key,
                      key === "redondeo" ? e.target.value : Number(e.target.value),
                    )
                  }
                />
              </label>
            ),
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-slate-200 bg-white p-6">
        <legend className="px-2 text-lg font-semibold">Tipos de recogida</legend>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="p-2">Nombre</th>
                <th className="p-2">Delante</th>
                <th className="p-2">Atrás</th>
              </tr>
            </thead>
            <tbody>
              {draft.recogidaTypes.map((t, i) => (
                <tr key={t.nombre} className="border-b border-slate-100">
                  <td className="p-2 font-medium">{t.nombre}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      className={inputClass}
                      value={t.delante}
                      onChange={(e) => updateRecogida(i, "delante", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className={inputClass}
                      value={t.atras}
                      onChange={(e) => updateRecogida(i, "atras", Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-slate-200 bg-white p-6">
        <legend className="px-2 text-lg font-semibold">Perfiles baquetón</legend>
        {draft.baquetonProfiles.map((p, i) => (
          <section key={p.id} className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <p className="col-span-full font-semibold text-slate-800">{p.nombre}</p>
            {(
              [
                "demasiaLargoPiezaFinal",
                "demasiaAnchoPiezaFinal",
                "demasiaBaquetonPicostura",
                "demasiaBaquetonEnLargoDelante",
                "demasiaBaquetonEnLargoDetras",
                "demasiaBaquetonEnAnchoDelante",
                "demasiaBaquetonEnAnchoDetras",
              ] as const
            ).map((key) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">{key}</span>
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  value={p[key] ?? 0}
                  onChange={(e) => updateProfile(i, key, Number(e.target.value))}
                />
              </label>
            ))}
          </section>
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <BtnPrimary onClick={() => onSave(draft)}>Guardar parámetros</BtnPrimary>
        <BtnSecondary onClick={() => setDraft(cloneSettings(DEFAULT_SETTINGS))}>
          Restaurar valores por defecto
        </BtnSecondary>
      </div>
    </section>
  );
}

export function SettingsPanel() {
  const { settings, setSettings, ready } = useSettings();

  if (!ready) return <p>Cargando…</p>;

  return <SettingsEditor initialSettings={settings} onSave={setSettings} />;
}
