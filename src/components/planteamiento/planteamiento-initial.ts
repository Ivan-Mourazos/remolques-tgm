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
    fecha: input.fecha ?? input.fechaSalida ?? new Date().toISOString().slice(0, 10),
    colocacionOllaos: input.colocacionOllaos ?? "repartidos",
    bastilla: input.bastilla === "enfundar" ? "enfundar" : "normal",
  };
}

function normalizeBaquetonInput(input: BaquetonFormInput): BaquetonFormInput {
  const fecha =
    input.fecha ?? input.fechaSalida ?? new Date().toISOString().slice(0, 10);
  return {
    ...input,
    ordenFabricacion: input.ordenFabricacion ?? "",
    clienteEspecifico: input.clienteEspecifico ?? "",
    fecha,
    fechaSalida: input.fechaSalida ?? fecha,
    colocacionOllaos: input.colocacionOllaos ?? "repartidos",
    tipoOllaos: input.tipoOllaos ?? "",
    ollaosDescDelante: input.ollaosDescDelante ?? "",
    ollaosDescLados: input.ollaosDescLados ?? "",
    ollaosDescAtras: input.ollaosDescAtras ?? "",
    textoRotulacion: input.textoRotulacion ?? "",
    checkEspecifico: input.checkEspecifico ?? "",
    ollaosLaterales: input.ollaosLaterales ?? input.ollaosManuales ?? "",
    ollaosDelante: input.ollaosDelante ?? "",
    ollaosAtras: input.ollaosAtras ?? "",
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
    return normalizeBaquetonInput((item as SavedBaqueton).input);
  }
  return createEmptyBaquetonInput();
}
