import { calcLona, type LonaInput } from "@/lib/calc/lona";
import { calcBaqueton, type BaquetonInput } from "@/lib/calc/baqueton";
import type { CalcParams } from "@/lib/calc/params";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";

export function buildRecord(
  tipo: TipoPlanteamiento,
  input: LonaInput | BaquetonInput,
  params: CalcParams,
  id?: string,
  snapshotSvg?: string | null,
): Omit<PlanteamientoRecord, "id" | "createdAt" | "updatedAt"> & { id?: string } {
  if (tipo === "lona") {
    const result = calcLona(input as LonaInput, params);
    return base(tipo, input, result, params, id, snapshotSvg);
  }
  if (tipo === "baqueton") {
    const result = calcBaqueton(input as BaquetonInput, params);
    return base(tipo, input, result, params, id, snapshotSvg);
  }
  throw new Error(`Tipo de planteamiento desconocido: ${tipo}`);
}

function base(
  tipo: TipoPlanteamiento,
  input: LonaInput | BaquetonInput,
  result: ReturnType<typeof calcLona> | ReturnType<typeof calcBaqueton>,
  params: CalcParams,
  id?: string,
  snapshotSvg?: string | null,
) {
  return {
    id, tipo,
    numeroPedido: input.cabecera.numeroPedido,
    version: input.cabecera.version,
    cliente: input.cabecera.cliente,
    input, result,
    paramsSnapshot: params,
    snapshotSvg: snapshotSvg ?? null,
  };
}
