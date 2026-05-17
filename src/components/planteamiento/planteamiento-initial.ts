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
    tipoPerfil: (input.tipoPerfil ?? "tipo-01") as TrailerProfileType,
    chaflanCm: input.chaflanCm ?? 15,
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
  if (item?.type === "baqueton") return (item as SavedBaqueton).input;
  return createEmptyBaquetonInput();
}
