import { excelRound } from "@/lib/calc/redondeo";
import { findRecogida, type CalcParams, type TipoPerfil } from "@/lib/calc/params";
import { calcOllaos, type OllaosResult } from "@/lib/calc/ollaos";

// P1 del spec: el Excel (G11 y RPS D7) usa la columna DELANTE también para el
// paño trasero. Cambiar a true si oficina técnica confirma que era un descuido.
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
  /** Medida final del contorno SCAD, introducida manualmente por oficina técnica. */
  contornoScad?: number;
  tipoPerfil: TipoPerfil;
  recogeDelante: string; recogeAtras: string;
  bastillaEnfundar: boolean; ventana: boolean;
  rotulacion: boolean; textoRotulacion: string;
  modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA";
  pasoOllaos: number;
  ollaosManuales: { laterales: number[]; atras: number[]; delante: number[] };
  material: string; observaciones: string;
}

export interface Pano { ancho: number; alto: number; etiqueta: string }

export interface LonaResult {
  lonaHecha: { largo: number; ancho: number };
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

  const contornoAjustado = Math.max(input.contornoScad ?? 0, 0);

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

  const ollaos = calcOllaos(lonaHecha.largo, lonaHecha.ancho, input.pasoOllaos, params);
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
    notas.push("Recoge con GOMA: preparar orejas por lado.");
  }
  if (input.bastillaEnfundar) notas.push("Bastilla de enfundar: paño contorno con demasía 13.");
  if (input.ventana) notas.push("Ventana indicada: verificar en taller.");
  if (input.rotulacion) {
    notas.push(input.textoRotulacion ? `Rotulación: ${input.textoRotulacion}.` : "Incluye rotulación.");
  }

  const textoRecogida = (lado: "DELANTE" | "ATRÁS", nombre: string) =>
    nombre === "NO" ? "NO RECOGE" : `RECOGE ${lado} CON ${nombre}`;

  return {
    lonaHecha, contornoAjustado,
    panoDelantero, panoTrasero, panoContorno,
    ollaos, reparto, metrosTela,
    recogeDelanteTexto: textoRecogida("DELANTE", recDel.nombre),
    recogeAtrasTexto: textoRecogida("ATRÁS", recAtr.nombre),
    notas,
  };
}
