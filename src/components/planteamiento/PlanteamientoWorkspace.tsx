"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resolveBaquetonInput,
  resolveLonaInput,
} from "@/components/planteamiento/planteamiento-initial";
import { PrintablePlan } from "@/components/print/PrintablePlan";
import { PrintActions } from "@/components/print/PrintActions";
import { PrintWarnings } from "@/components/print/print-shared";
import { BaquetonForm } from "@/components/forms/BaquetonForm";
import { LonaForm } from "@/components/forms/LonaForm";
import { calculateBaqueton } from "@/lib/calculations/baqueton";
import { calculateLonaRemolque } from "@/lib/calculations/lona-remolque";
import {
  createEmptyBaquetonInput,
  createEmptyLonaInput,
} from "@/lib/defaults/default-settings";
import { useSettings } from "@/lib/hooks/use-settings";
import {
  addToHistory,
  createId,
  getHistoryItem,
  loadMaterials,
  updateHistoryItem,
} from "@/lib/storage/local-storage";
import {
  PLANTEAMIENTO_SCHEMA_VERSION,
  type BaquetonFormInput,
  type LonaFormInput,
  type SavedBaqueton,
  type SavedLona,
} from "@/lib/types";
import {
  validateBaquetonInput,
  validateLonaInput,
} from "@/lib/validation/planteamiento";

type Mode = "lona-remolque" | "baqueton";
type ViewMode = "edit" | "preview";

export function PlanteamientoWorkspace({
  mode,
  editId = null,
}: {
  mode: Mode;
  editId?: string | null;
}) {
  const { settings, ready } = useSettings();
  const router = useRouter();

  const [lonaInput, setLonaInput] = useState<LonaFormInput>(() =>
    resolveLonaInput(editId),
  );
  const [baquetonInput, setBaquetonInput] = useState<BaquetonFormInput>(() =>
    resolveBaquetonInput(editId),
  );
  const [savedId, setSavedId] = useState<string | null>(editId);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");

  const materials = useMemo(
    () =>
      loadMaterials()
        .filter((m) => m.activo)
        .map((m) => m.nombre),
    [],
  );

  const lonaResult = useMemo(
    () => (ready ? calculateLonaRemolque(lonaInput, settings) : null),
    [lonaInput, settings, ready],
  );

  const baquetonResult = useMemo(
    () => (ready ? calculateBaqueton(baquetonInput, settings) : null),
    [baquetonInput, settings, ready],
  );

  const lonaValidation = useMemo(() => validateLonaInput(lonaInput), [lonaInput]);
  const baquetonValidation = useMemo(
    () => validateBaquetonInput(baquetonInput),
    [baquetonInput],
  );

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    const id = savedId ?? createId();

    if (mode === "lona-remolque" && lonaResult) {
      const item: SavedLona = {
        id,
        type: "lona-remolque",
        schemaVersion: PLANTEAMIENTO_SCHEMA_VERSION,
        createdAt: savedId ? getHistoryItem(id)?.createdAt ?? now : now,
        updatedAt: now,
        input: lonaInput,
        result: lonaResult,
        settingsSnapshot: settings,
      };
      if (savedId) updateHistoryItem(item);
      else addToHistory(item);
      setSavedId(id);
      alert("Planteamiento guardado.");
    }

    if (mode === "baqueton" && baquetonResult) {
      const item: SavedBaqueton = {
        id,
        type: "baqueton",
        schemaVersion: PLANTEAMIENTO_SCHEMA_VERSION,
        createdAt: savedId ? getHistoryItem(id)?.createdAt ?? now : now,
        updatedAt: now,
        input: baquetonInput,
        result: baquetonResult,
        settingsSnapshot: settings,
      };
      if (savedId) updateHistoryItem(item);
      else addToHistory(item);
      setSavedId(id);
      alert("Planteamiento guardado.");
    }
  }, [
    mode,
    lonaResult,
    baquetonResult,
    lonaInput,
    baquetonInput,
    settings,
    savedId,
  ]);

  const handleNew = () => {
    if (mode === "lona-remolque") setLonaInput(createEmptyLonaInput());
    else setBaquetonInput(createEmptyBaquetonInput(settings));
    setSavedId(null);
    setViewMode("edit");
    router.replace(mode === "lona-remolque" ? "/nuevo/lona" : "/nuevo/baqueton");
  };

  const handleDuplicate = () => {
    setSavedId(null);
    setViewMode("edit");
    alert("Duplicado. Guarda para crear una copia nueva en el historial.");
  };

  const title =
    mode === "lona-remolque" ? "Lona remolque alto" : "Baquetón";

  if (!ready) {
    return <p className="text-slate-600">Cargando parámetros…</p>;
  }

  const previewBlock =
    mode === "lona-remolque" && lonaResult ? (
      <PrintablePlan
        type="lona-remolque"
        input={lonaInput}
        result={lonaResult}
        settings={settings}
        validationIssues={lonaValidation}
      />
    ) : mode === "baqueton" && baquetonResult ? (
      <PrintablePlan
        type="baqueton"
        input={baquetonInput}
        result={baquetonResult}
        settings={settings}
        validationIssues={baquetonValidation}
      />
    ) : null;

  const screenWarnings =
    mode === "lona-remolque" ? lonaValidation : baquetonValidation;

  return (
    <section>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {viewMode === "edit" ? (
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Vista impresión
          </button>
        ) : null}
      </div>

      {viewMode === "edit" ? (
        <div className="grid gap-8 xl:grid-cols-2">
          <section className="no-print rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Datos de entrada
            </h2>
            {mode === "lona-remolque" ? (
              <LonaForm
                input={lonaInput}
                settings={settings}
                materials={materials}
                onChange={setLonaInput}
              />
            ) : (
              <BaquetonForm
                input={baquetonInput}
                settings={settings}
                materials={materials}
                onChange={setBaquetonInput}
              />
            )}
          </section>

          <section>
            <h2 className="no-print mb-4 text-lg font-semibold text-slate-800">
              Vista previa del planteamiento
            </h2>
            <div className="no-print mb-4">
              <PrintWarnings issues={screenWarnings} />
            </div>
            {previewBlock}
          </section>
        </div>
      ) : (
        <section className="flex justify-center">
          <section className="w-full max-w-[297mm] overflow-x-auto">
            <section className="no-print mb-4">
              <PrintWarnings issues={screenWarnings} />
            </section>
            {previewBlock}
          </section>
        </section>
      )}

      <PrintActions
        onSave={handleSave}
        onDuplicate={handleDuplicate}
        onNew={handleNew}
        onEdit={() => setViewMode("edit")}
        showEdit={viewMode === "preview"}
      />
    </section>
  );
}
