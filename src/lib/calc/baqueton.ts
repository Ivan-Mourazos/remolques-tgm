import { excelRound } from "@/lib/calc/redondeo";
import { findClienteBaqueton, type CalcParams } from "@/lib/calc/params";
import { calcOllaos, type OllaosResult } from "@/lib/calc/ollaos";
import type { CabeceraInput } from "@/lib/calc/lona";

export interface BaquetonInput {
  cabecera: CabeceraInput;
  cantidad: number; largo: number; ancho: number; baqueton: number;
  clienteEspecifico: string;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA";
  pasoOllaos: number;
  /** Distancia del primer y último ollao al borde; por defecto la de los parámetros. */
  primerOllao?: number;
  ollaosManuales: { laterales: number[]; atras: number[]; delante: number[] };
  rotulacion: boolean; textoRotulacion: string;
  material: string; observaciones: string;
}

export interface BaquetonResult {
  panoUnico: { largo: number; ancho: number };
  remolqueHecho: { largo: number; ancho: number };
  baquetonCostura: number;
  esquinaDelante: number; esquinaDetras: number;
  baquetonTrasero: number | null;
  superficieM2: number;
  ollaos: OllaosResult;
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  metrosTela: number;
  notas: string[];
}

const r1 = (v: number) => excelRound(v, 1);

export function calcBaqueton(input: BaquetonInput, params: CalcParams): BaquetonResult {
  const cli = findClienteBaqueton(params, input.clienteEspecifico);

  const panoUnico = {
    largo: r1(input.largo + 2 * input.baqueton + params.baquetonDemasiaLargoCostura + cli.extraLargoCostura),
    ancho: r1(input.ancho + 2 * input.baqueton + params.baquetonDemasiaAnchoCostura + cli.extraAnchoCostura),
  };
  const baquetonCostura = r1(input.baqueton + params.baquetonDemasiaCostura);
  const remolqueHecho = {
    largo: r1(input.largo + params.baquetonDemasiaFinal + cli.extraLargoFinal),
    ancho: r1(input.ancho + params.baquetonDemasiaFinal + cli.extraAnchoFinal),
  };

  const ollaos = calcOllaos(remolqueHecho.largo, remolqueHecho.ancho, input.pasoOllaos, params, input.primerOllao);
  const reparto =
    input.modoOllaos === "SEGUN SE INDICA"
      ? input.ollaosManuales
      : {
          laterales: ollaos.largo.posiciones,
          atras: ollaos.ancho.posiciones,
          delante: ollaos.ancho.posiciones,
        };

  const notas: string[] = [...cli.observaciones];
  if (input.rotulacion) {
    notas.push(input.textoRotulacion ? `Rotulación: ${input.textoRotulacion}.` : "Incluye rotulación.");
  }

  return {
    panoUnico, remolqueHecho, baquetonCostura,
    esquinaDelante: r1(baquetonCostura + cli.extraBaquetonLargoDelante),
    esquinaDetras: r1(baquetonCostura + cli.extraBaquetonLargoDetras),
    baquetonTrasero: cli.extraBaquetonTrasero > 0 ? r1(input.baqueton + cli.extraBaquetonTrasero) : null,
    superficieM2: excelRound((panoUnico.largo * panoUnico.ancho) / 10000, 4),
    ollaos, reparto,
    metrosTela: excelRound((input.cantidad * panoUnico.largo) / 100, 2),
    notas,
  };
}
