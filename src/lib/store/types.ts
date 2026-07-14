import type { LonaInput, LonaResult } from "@/lib/calc/lona";
import type { BaquetonInput, BaquetonResult } from "@/lib/calc/baqueton";
import type { CalcParams } from "@/lib/calc/params";

export type TipoPlanteamiento = "lona" | "baqueton";

export interface PlanteamientoRecord {
  id: string;
  tipo: TipoPlanteamiento;
  numeroPedido: string;
  version: string;
  cliente: string;
  input: LonaInput | BaquetonInput;
  result: LonaResult | BaquetonResult;
  paramsSnapshot: CalcParams;
  pdfPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListadoFiltro { texto?: string; tipo?: TipoPlanteamiento; limit?: number }

export interface PlanteamientoStore {
  list(filtro?: ListadoFiltro): Promise<PlanteamientoRecord[]>;
  get(id: string): Promise<PlanteamientoRecord | null>;
  save(
    rec: Omit<PlanteamientoRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<PlanteamientoRecord>;
  getParams(): Promise<CalcParams>;
  saveParams(p: CalcParams): Promise<void>;
}
