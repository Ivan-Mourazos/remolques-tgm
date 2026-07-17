import { excelRound } from "@/lib/calc/redondeo";
import { ajusteContorno, findRecogida, type CalcParams, type TipoPerfil } from "@/lib/calc/params";
import { calcOllaos, type OllaosResult } from "@/lib/calc/ollaos";

// El paño trasero usa la columna DELANTE de la recogida, igual que el Excel
// (G11 y RPS D7). Confirmado por Iván el 2026-07-17: es el comportamiento
// deseado. El interruptor queda por si algún día cambia la regla.
export const USAR_COLUMNA_ATRAS = false;

export interface CabeceraInput {
  numeroPedido: string; version: string; cliente: string; revision: string;
  realizadoPor: string; fecha: string; fechaSalida: string;
  /** Orden de fabricación, introducida manualmente por oficina técnica. */
  ordenFabricacion?: string;
}

export interface LonaInput {
  cabecera: CabeceraInput;
  cantidad: number; largo: number; ancho: number;
  altoDelante: number; altoAtras: number;
  /** Caída desde la cumbrera hasta los hombros del perfil. */
  aguas?: number;
  /** Radio real del arco de cumbrera (TIPO 03); necesario para calcular el contorno. */
  radioCumbrera?: number;
  /** Radio real de las esquinas superiores (TIPO 05); necesario para calcular el contorno. */
  radioEsquina?: number;
  /** Chaflán real de las esquinas superiores (TIPO 04); necesario para calcular el contorno. */
  chaflan?: number;
  /** Contorno real del remolque, antes de añadir las bastillas y la demasía de curva. */
  contorno?: number;
  /** Campo histórico: contenía directamente la medida final de corte. */
  contornoScad?: number;
  tipoPerfil: TipoPerfil;
  recogeDelante: string; recogeAtras: string;
  bastillaEnfundar: boolean; ventana: boolean;
  rotulacion: boolean; textoRotulacion: string;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA";
  pasoOllaos: number;
  /** Distancia del primer y último ollao al borde; por defecto la de los parámetros. */
  primerOllao?: number;
  ollaosManuales: { laterales: number[]; atras: number[]; delante: number[] };
  material: string; observaciones: string;
}

export interface Pano { ancho: number; alto: number; etiqueta: string }

export interface LonaResult {
  lonaHecha: { largo: number; ancho: number };
  contornoIntroducido: number;
  ajusteContorno: number;
  contornoAjustado: number;
  panoDelantero: Pano; panoTrasero: Pano; panoContorno: Pano | null;
  ollaos: OllaosResult;
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  metrosTela: number;
  recogeDelanteTexto: string; recogeAtrasTexto: string;
  notas: string[];
}

const r1 = (v: number) => excelRound(v, 1);

export function calcLona(input: LonaInput, params: CalcParams): LonaResult {
  const recDel = findRecogida(params, input.recogeDelante);
  const recAtr = findRecogida(params, input.recogeAtras);

  const lonaHecha = {
    largo: r1(input.largo + params.demasiaLonaHecha),
    ancho: r1(input.ancho + params.demasiaLonaHecha),
  };

  const ajuste = ajusteContorno(params, input.tipoPerfil);
  const contornoNuevo = Math.max(input.contorno ?? 0, 0);
  const contornoLegacy = Math.max(input.contornoScad ?? 0, 0);
  const usaContornoLegacy = input.contorno == null && contornoLegacy > 0;
  const contornoIntroducido = usaContornoLegacy
    ? r1(Math.max(contornoLegacy - ajuste, 0))
    : contornoNuevo;
  const contornoAjustado = usaContornoLegacy
    ? contornoLegacy
    : contornoIntroducido > 0
      ? r1(contornoIntroducido + ajuste)
      : 0;

  const panoDelantero: Pano = {
    ancho: r1(input.ancho + recDel.delante),
    alto: r1(input.altoDelante + params.demasiaAlto),
    etiqueta: "PAÑO DELANTERO",
  };
  const demasiaTrasera = USAR_COLUMNA_ATRAS ? recAtr.atras : recAtr.delante;
  const panoTrasero: Pano = {
    ancho: r1(input.ancho + demasiaTrasera),
    alto: r1(input.altoAtras + params.demasiaAlto),
    etiqueta: "PAÑO TRASERO",
  };

  const demasiaContorno = input.bastillaEnfundar
    ? params.demasiaContornoEnfundar
    : params.demasiaContornoNormal;
  const panoContorno: Pano | null =
    contornoAjustado > 0
      ? {
          ancho: r1(input.largo + demasiaContorno + recDel.lateralSoloDelante + recAtr.lateralSoloAtras),
          alto: contornoAjustado,
          etiqueta: "PAÑO CONTORNO",
        }
      : null;

  const ollaos = calcOllaos(lonaHecha.largo, lonaHecha.ancho, input.pasoOllaos, params, input.primerOllao);
  const reparto =
    input.modoOllaos === "SEGUN SE INDICA"
      ? input.ollaosManuales
      : {
          laterales: ollaos.largo.posiciones,
          atras: ollaos.ancho.posiciones,
          delante: ollaos.ancho.posiciones,
        };

  const metrosTela = panoContorno
    ? excelRound(
        (input.cantidad * (panoDelantero.ancho + panoTrasero.ancho + panoContorno.ancho)) / 100,
        2,
      )
    : 0;

  const notas: string[] = [];
  if (input.recogeDelante === "GOMA" || input.recogeAtras === "GOMA") {
    notas.push("GOMA: preparar orejas por lado.");
  }
  if (input.bastillaEnfundar) notas.push("Bastilla de enfundar: paño contorno con demasía 13.");
  if (input.ventana) notas.push("Ventana indicada: verificar en taller.");
  if (input.rotulacion) {
    notas.push(input.textoRotulacion ? `Rotulación: ${input.textoRotulacion}.` : "Incluye rotulación.");
  }

  return {
    lonaHecha, contornoIntroducido, ajusteContorno: ajuste, contornoAjustado,
    panoDelantero, panoTrasero, panoContorno,
    ollaos, reparto, metrosTela,
    recogeDelanteTexto: recDel.nombre,
    recogeAtrasTexto: recAtr.nombre,
    notas,
  };
}
