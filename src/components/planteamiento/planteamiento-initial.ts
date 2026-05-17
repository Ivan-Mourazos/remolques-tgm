import {
  createEmptyBaquetonInput,
  createEmptyLonaInput,
} from "@/lib/defaults/default-settings";
import { getHistoryItem } from "@/lib/storage/local-storage";
import type {
  BaquetonFormInput,
  LonaFormInput,
  SavedBaqueton,
  SavedLona,
  TrailerProfileType,
} from "@/lib/types";

function normalizeLonaInput(input: LonaFormInput): LonaFormInput {
  return {
    ...input,
    ordenFabricacion: input.ordenFabricacion ?? "",
    tipoPerfil: (input.tipoPerfil ?? "tipo-01") as TrailerProfileType,
    chaflanCm: input.chaflanCm ?? 15,
    alturaCumbrera: input.alturaCumbrera ?? 0,
    contornoManualEnabled: input.contornoManualEnabled ?? false,
    contornoManual: input.contornoManual ?? input.contornoCad ?? 0,
    colocacionOllaos: input.colocacionOllaos ?? "repartidos",
    bastilla: input.bastilla === "enfundar" ? "enfundar" : "normal",
  };
}

export function resolveLonaInput(editId: string | null): LonaFormInput {
  if (!editId) return createEmptyLonaInput();
  const item = getHistoryItem(editId);
  if (item?.type === "lona-remolque") return normalizeLonaInput((item as SavedLona).input);
  return createEmptyLonaInput();
}

export function resolveBaquetonInput(editId: string | null): BaquetonFormInput {
  if (!editId) return createEmptyBaquetonInput();
  const item = getHistoryItem(editId);
  if (item?.type === "baqueton") {
    const input = (item as SavedBaqueton).input;
    return {
      ...input,
      ordenFabricacion: input.ordenFabricacion ?? "",
      colocacionOllaos: input.colocacionOllaos ?? "repartidos",
    };
  }
  return createEmptyBaquetonInput();
}
