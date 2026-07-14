import { excelRound } from "@/lib/calc/redondeo";
import type { CalcParams } from "@/lib/calc/params";

export interface EjeOllaos { n: number; dist: number; posiciones: number[] }
export interface OllaosResult { largo: EjeOllaos; ancho: EjeOllaos }

function eje(medida: number, paso: number, params: CalcParams): EjeOllaos {
  if (!(medida > 0) || !(paso > 0)) return { n: 0, dist: 0, posiciones: [] };
  const n = excelRound(medida / paso, 0);
  if (n <= 0) return { n: 0, dist: 0, posiciones: [] };
  const dist = excelRound(medida / n, 1);
  const posiciones: number[] = [];
  let p = params.primerOllao;
  for (let i = 0; i < Math.min(n, params.maxPosicionesOllaos); i++) {
    posiciones.push(excelRound(p, 1));
    p += dist;
  }
  return { n, dist, posiciones };
}

export function calcOllaos(
  medidaLargo: number, medidaAncho: number, paso: number, params: CalcParams,
): OllaosResult {
  return { largo: eje(medidaLargo, paso, params), ancho: eje(medidaAncho, paso, params) };
}
