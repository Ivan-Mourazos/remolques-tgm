import { excelRound } from "@/lib/calc/redondeo";
import { findClienteBaqueton, type CalcParams } from "@/lib/calc/params";
import { calcOllaos, type OllaosResult } from "@/lib/calc/ollaos";
import type { CabeceraInput } from "@/lib/calc/lona";

export interface BaquetonInput {
  cabecera: CabeceraInput;
  cantidad: number; largo: number; ancho: number; baqueton: number;
  clienteEspecifico: string;
  /** Ausente = según cliente; null = en línea con el lateral; número = caída propia. */
  baquetonDelante?: number | null;
  baquetonDetras?: number | null;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA" | "";
  pasoOllaos: number;
  /** Distancia del primer y último ollao al borde; por defecto la de los parámetros. */
  primerOllao?: number;
  ollaosManuales: { laterales: number[]; atras: number[]; delante: number[] };
  /** Solo se indica si va rotulado. null = sin elegir. */
  rotulacion: boolean | null;
  material: string; observaciones: string;
}

export interface BaquetonResult {
  panoUnico: { largo: number; ancho: number };
  remolqueHecho: { largo: number; ancho: number };
  baquetonCostura: number;
  esquinaDelante: number; esquinaDetras: number;
  baquetonTrasero: number | null;
  baquetonDelantero?: number | null;
  superficieM2: number;
  ollaos: OllaosResult;
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  metrosTela: number;
  notas: string[];
}

const r1 = (v: number) => excelRound(v, 1);

export function calcBaqueton(input: BaquetonInput, params: CalcParams): BaquetonResult {
  const cli = findClienteBaqueton(params, input.clienteEspecifico);
  const delante = input.baquetonDelante ?? input.baqueton;
  const detrasDefecto = input.baqueton + cli.extraBaquetonTrasero;
  const detras = input.baquetonDetras === undefined ? detrasDefecto : (input.baquetonDetras ?? input.baqueton);
  const ajusteDelante = delante - input.baqueton;
  const ajusteDetras = detras - detrasDefecto;

  const panoUnico = {
    largo: r1(input.largo + 2 * input.baqueton + params.baquetonDemasiaLargoCostura + cli.extraLargoCostura + ajusteDelante + ajusteDetras),
    ancho: r1(input.ancho + 2 * input.baqueton + params.baquetonDemasiaAnchoCostura + cli.extraAnchoCostura),
  };
  const baquetonCostura = r1(input.baqueton + params.baquetonDemasiaCostura);
  const remolqueHecho = {
    largo: r1(input.largo + params.baquetonDemasiaFinal + cli.extraLargoFinal),
    ancho: r1(input.ancho + params.baquetonDemasiaFinal + cli.extraAnchoFinal),
  };

  const ollaos = calcOllaos(remolqueHecho.largo, remolqueHecho.ancho, input.pasoOllaos, params, input.primerOllao);
  // Sin modo elegido no se reparte nada, igual que en la lona: un reparto que
  // nadie ha confirmado acabaría dibujado en la hoja de taller.
  const reparto = input.modoOllaos === ""
    ? { laterales: [], atras: [], delante: [] }
    : input.modoOllaos === "SEGUN SE INDICA"
      ? input.ollaosManuales
      : {
          laterales: ollaos.largo.posiciones,
          atras: ollaos.ancho.posiciones,
          delante: ollaos.ancho.posiciones,
        };

  const notas: string[] = [...cli.observaciones];
  if (input.rotulacion) notas.push("Incluye rotulación.");

  return {
    panoUnico, remolqueHecho, baquetonCostura,
    esquinaDelante: r1(baquetonCostura + cli.extraBaquetonLargoDelante + ajusteDelante),
    esquinaDetras: r1(baquetonCostura + cli.extraBaquetonLargoDetras + ajusteDetras),
    baquetonDelantero: delante !== input.baqueton ? r1(delante) : null,
    baquetonTrasero: detras !== input.baqueton ? r1(detras) : null,
    superficieM2: excelRound((panoUnico.largo * panoUnico.ancho) / 10000, 4),
    ollaos, reparto,
    metrosTela: excelRound((input.cantidad * panoUnico.largo) / 100, 2),
    notas,
  };
}
