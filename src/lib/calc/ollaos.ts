import { excelRound } from "@/lib/calc/redondeo";
import type { CalcParams } from "@/lib/calc/params";

export interface EjeOllaos { n: number; dist: number; posiciones: number[] }
export interface OllaosResult { largo: EjeOllaos; ancho: EjeOllaos }

function eje(medida: number, paso: number, params: CalcParams): EjeOllaos {
  if (!(medida > 0) || !(paso > 0)) return { n: 0, dist: 0, posiciones: [] };
  const primero = params.primerOllao;
  const ultimo = medida - params.primerOllao;
  const recorrido = ultimo - primero;
  if (!(recorrido > 0)) return { n: 0, dist: 0, posiciones: [] };
  // Se fijan exactamente el primer y el último ollao; los intermedios se
  // reparten uniformemente buscando el paso objetivo indicado por producción.
  const intervalos = Math.max(1, excelRound(recorrido / paso, 0));
  const distanciaExacta = recorrido / intervalos;
  const n = intervalos + 1;
  const posiciones = Array.from(
    { length: Math.min(n, params.maxPosicionesOllaos) },
    (_, indice) => excelRound(primero + distanciaExacta * indice, 1),
  );
  const dist = excelRound(distanciaExacta, 1);
  return { n, dist, posiciones };
}

export function calcOllaos(
  medidaLargo: number, medidaAncho: number, paso: number, params: CalcParams,
): OllaosResult {
  return { largo: eje(medidaLargo, paso, params), ancho: eje(medidaAncho, paso, params) };
}
