"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resolveBaquetonInput,
  resolveLonaInput,
} from "@/components/planteamiento/planteamiento-initial";
import { PrintablePlan } from "@/components/print/PrintablePlan";
import { PrintActions } from "@/components/print/PrintActions";
import { BaquetonForm } from "@/components/forms/BaquetonForm";
import { LonaForm } from "@/components/forms/LonaForm";
import { OllaosEntryPanel } from "@/components/ollaos/OllaosEntryPanel";
import { calculateBaqueton } from "@/lib/calculations/baqueton";
import { calculateLonaRemolque } from "@/lib/calculations/lona-remolque";
import {
  createEmptyBaquetonInput,
  createEmptyLonaInput,
} from "@/lib/defaults/default-settings";
import { useSettings } from "@/lib/hooks/use-settings";
import type { OllaoSectionId } from "@/lib/print/ollaos-grid";
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
  type AppSettings,
  type LonaFormInput,
  type SavedBaqueton,
  type SavedLona,
} from "@/lib/types";
import {
  issuesByField,
  validateBaquetonInput,
  validateLonaInput,
} from "@/lib/validation/planteamiento";

type Mode = "lona-remolque" | "baqueton";
type ViewMode = "edit" | "preview";

function resolveSettingsSnapshot(editId: string | null): AppSettings | null {
  if (!editId) return null;
  return getHistoryItem(editId)?.settingsSnapshot ?? null;
}

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
  const [settingsSnapshot, setSettingsSnapshot] = useState<AppSettings | null>(() =>
    resolveSettingsSnapshot(editId),
  );
  const calculationSettings = settingsSnapshot ?? settings;

  const materials = useMemo(
    () =>
      loadMaterials()
        .filter((m) => m.activo)
        .map((m) => m.nombre),
    [],
  );

  const lonaResult = useMemo(
    () => (ready ? calculateLonaRemolque(lonaInput, calculationSettings) : null),
    [lonaInput, calculationSettings, ready],
  );

  const baquetonResult = useMemo(
    () => (ready ? calculateBaqueton(baquetonInput, calculationSettings) : null),
    [baquetonInput, calculationSettings, ready],
  );

  const lonaFieldWarnings = useMemo(
    () => issuesByField(validateLonaInput(lonaInput)),
    [lonaInput],
  );
  const baquetonFieldWarnings = useMemo(
    () => issuesByField(validateBaquetonInput(baquetonInput)),
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
        settingsSnapshot: calculationSettings,
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
        settingsSnapshot: calculationSettings,
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
    calculationSettings,
    savedId,
  ]);

  const handleNew = () => {
    if (mode === "lona-remolque") setLonaInput(createEmptyLonaInput());
    else setBaquetonInput(createEmptyBaquetonInput(settings));
    setSavedId(null);
    setSettingsSnapshot(null);
    setViewMode("edit");
    router.replace(mode === "lona-remolque" ? "/nuevo/lona" : "/nuevo/baqueton");
  };

  const handleDuplicate = () => {
    setSavedId(null);
    setViewMode("edit");
    alert("Duplicado. Guarda para crear una copia nueva en el historial.");
  };

  const setLonaOllaoSection = useCallback(
    (section: OllaoSectionId, text: string) => {
      setLonaInput((prev) => {
        if (section === "laterales") return { ...prev, ollaosLaterales: text };
        if (section === "atras") return { ...prev, ollaosAtras: text };
        return { ...prev, ollaosDelante: text };
      });
    },
    [],
  );

  const setBaquetonOllaoSection = useCallback(
    (section: OllaoSectionId, text: string) => {
      setBaquetonInput((prev) => {
        if (section === "laterales") return { ...prev, ollaosLaterales: text };
        if (section === "atras") return { ...prev, ollaosAtras: text };
        return { ...prev, ollaosDelante: text };
      });
    },
    [],
  );

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
        settings={calculationSettings}
      />
    ) : mode === "baqueton" && baquetonResult ? (
      <PrintablePlan
        type="baqueton"
        input={baquetonInput}
        result={baquetonResult}
        settings={calculationSettings}
      />
    ) : null;

  const ollaosPanel =
    mode === "lona-remolque" ? (
      <OllaosEntryPanel
        colocacionOllaos={lonaInput.colocacionOllaos}
        laterales={lonaInput.ollaosLaterales}
        atras={lonaInput.ollaosAtras}
        delante={lonaInput.ollaosDelante}
        onChange={setLonaOllaoSection}
      />
    ) : (
      <OllaosEntryPanel
        colocacionOllaos={baquetonInput.colocacionOllaos}
        laterales={baquetonInput.ollaosLaterales}
        atras={baquetonInput.ollaosAtras}
        delante={baquetonInput.ollaosDelante}
        onChange={setBaquetonOllaoSection}
      />
    );

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
        <div className="no-print grid items-start gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
          <aside className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto p-1">
            {mode === "lona-remolque" ? (
              <LonaForm
                input={lonaInput}
                settings={settings}
                materials={materials}
                fieldWarnings={lonaFieldWarnings}
                onChange={setLonaInput}
              />
            ) : (
              <BaquetonForm
                input={baquetonInput}
                settings={settings}
                materials={materials}
                fieldWarnings={baquetonFieldWarnings}
                onChange={setBaquetonInput}
              />
            )}
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            {previewBlock}
            {ollaosPanel}
          </section>
        </div>
      ) : (
        <section className="flex flex-col items-center gap-4">
          <section className="w-full max-w-[297mm] overflow-x-auto">
            {previewBlock}
          </section>
          {ollaosPanel}
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
