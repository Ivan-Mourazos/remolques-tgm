"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionBar, BtnPrimary, BtnSecondary } from "@/components/ui/ActionBar";
import { BaquetonForm } from "@/components/forms/BaquetonForm";
import { LonaForm } from "@/components/forms/LonaForm";
import { BaquetonResult } from "@/components/result/BaquetonResult";
import { LonaResult } from "@/components/result/LonaResult";
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
import type {
  BaquetonFormInput,
  LonaFormInput,
  SavedBaqueton,
  SavedLona,
} from "@/lib/types";

type Mode = "lona-remolque" | "baqueton";

export function PlanteamientoWorkspace({ mode }: { mode: Mode }) {
  const { settings, ready } = useSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [lonaInput, setLonaInput] = useState<LonaFormInput>(createEmptyLonaInput);
  const [baquetonInput, setBaquetonInput] = useState<BaquetonFormInput>(() =>
    createEmptyBaquetonInput(),
  );
  const [savedId, setSavedId] = useState<string | null>(null);

  const materials = useMemo(
    () =>
      loadMaterials()
        .filter((m) => m.activo)
        .map((m) => m.nombre),
    [ready],
  );

  useEffect(() => {
    if (!editId || !ready) return;
    const item = getHistoryItem(editId);
    if (!item) return;
    if (item.type === "lona-remolque" && mode === "lona-remolque") {
      setLonaInput((item as SavedLona).input);
      setSavedId(item.id);
    }
    if (item.type === "baqueton" && mode === "baqueton") {
      setBaquetonInput((item as SavedBaqueton).input);
      setSavedId(item.id);
    }
  }, [editId, mode, ready]);

  const lonaResult = useMemo(
    () => (ready ? calculateLonaRemolque(lonaInput, settings) : null),
    [lonaInput, settings, ready],
  );

  const baquetonResult = useMemo(
    () => (ready ? calculateBaqueton(baquetonInput, settings) : null),
    [baquetonInput, settings, ready],
  );

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    const id = savedId ?? createId();

    if (mode === "lona-remolque" && lonaResult) {
      const item: SavedLona = {
        id,
        type: "lona-remolque",
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
    router.replace(mode === "lona-remolque" ? "/nuevo/lona" : "/nuevo/baqueton");
  };

  const handleDuplicate = () => {
    setSavedId(null);
    alert("Duplicado. Guarda para crear una copia nueva en el historial.");
  };

  const title =
    mode === "lona-remolque" ? "Lona remolque alto" : "Baquetón";

  if (!ready) {
    return <p className="text-slate-600">Cargando parámetros…</p>;
  }

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{title}</h1>
      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Datos de entrada</h2>
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
          <h2 className="mb-4 text-lg font-semibold text-slate-800 no-print">
            Resultado
          </h2>
          {mode === "lona-remolque" && lonaResult && (
            <LonaResult input={lonaInput} result={lonaResult} />
          )}
          {mode === "baqueton" && baquetonResult && (
            <BaquetonResult input={baquetonInput} result={baquetonResult} />
          )}
        </section>
      </div>

      <ActionBar>
        <BtnPrimary onClick={handleSave}>Guardar planteamiento</BtnPrimary>
        <BtnSecondary onClick={() => window.print()}>Imprimir</BtnSecondary>
        <BtnSecondary onClick={handleNew}>Nuevo planteamiento</BtnSecondary>
        <BtnSecondary onClick={handleDuplicate}>Duplicar</BtnSecondary>
      </ActionBar>
    </section>
  );
}
