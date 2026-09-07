import type { LonaInput, LonaResult } from "@/lib/calc/lona";
import type { BaquetonInput, BaquetonResult } from "@/lib/calc/baqueton";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { nombrePerfil } from "@/lib/calc/params";
import { datosGeometriaPdf } from "@/lib/pdf/datos-geometria";

/** Una etiqueta con sus valores; varios valores se pintan uno por línea. */
export interface Dato { etiqueta: string; valores: string[] }
export interface Grupo { titulo: string; datos: Dato[] }
/** Celda de la banda de corte: `lineas` va en grande, `notas` en gris pequeño. */
export interface Celda { titulo: string; lineas: string[]; notas: string[] }
export interface CuerpoHoja {
  banda: Celda[];
  grupos: Grupo[];
  material: string;
  observaciones: string;
}

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** Que un dato no esté puesto es justo lo que hay que poder ver. */
const oRaya = (valor: string) => (valor.trim() === "" ? "—" : valor);

/** «Sin elegir» no es un «NO»: imprimirlo como tal sería inventar la decisión. */
const siNo = (valor: boolean | null | undefined) => (valor == null ? "—" : valor ? "SÍ" : "NO");

/** «1 PAÑO DE» pero «2 PAÑOS DE»: la hoja anterior decía «2 PAÑO DE». */
export function textoPanos(cantidad: number, a: number, b: number): string {
  return `${cantidad} ${cantidad === 1 ? "PAÑO" : "PAÑOS"} DE ${fmt(a)} × ${fmt(b)}`;
}

/**
 * Un pedido de una sola pieza no necesita que le digan que es la 1 de 1; con
 * varias, quien tiene las hojas en la mano sabe cuál es cuál y si le falta una.
 */
export function tituloPagina(tipo: TipoPlanteamiento, indice: number, total: number): string {
  const nombre = tipo === "lona" ? "REMOLQUE" : "BAQUETÓN";
  return total <= 1 ? nombre : `${nombre} · ${indice + 1} DE ${total}`;
}

function textoVentana(i: LonaInput): string {
  if (i.ventana == null) return "—";
  if (!i.ventana) return "NO";
  return (i.ventanaAncho ?? 0) > 0 && (i.ventanaAlto ?? 0) > 0
    ? `SÍ · ${fmt(i.ventanaAncho!)} × ${fmt(i.ventanaAlto!)} CM`
    : "SÍ · MEDIDAS PENDIENTES";
}

export function hojaLona(i: LonaInput, r: LonaResult): CuerpoHoja {
  // vacío (0) = igual que delante
  const altoAtras = i.altoAtras > 0 ? i.altoAtras : i.altoDelante;
  const sesgado = (i.anchoAtras ?? 0) > 0 && i.anchoAtras !== i.ancho;
  const panos = [
    textoPanos(i.cantidad, r.panoDelantero.ancho, r.panoDelantero.alto),
    textoPanos(i.cantidad, r.panoTrasero.ancho, r.panoTrasero.alto),
    ...(r.panoContorno ? [textoPanos(i.cantidad, r.panoContorno.ancho, r.panoContorno.alto)] : []),
  ];
  return {
    banda: [
      { titulo: "PAÑOS A CORTAR", lineas: panos, notas: [] },
      {
        titulo: "MEDIDA LONA HECHA",
        lineas: [
          `${fmt(r.lonaHecha.largo)} × ${fmt(r.lonaHecha.ancho)}`,
          altoAtras !== i.altoDelante
            ? `ALTO ${fmt(i.altoDelante)} DEL. / ${fmt(altoAtras)} TRAS.`
            : `ALTO ${fmt(i.altoDelante)}`,
        ],
        notas: sesgado ? [`ANCHO ${fmt(i.ancho)} DEL. / ${fmt(i.anchoAtras!)} TRAS.`] : [],
      },
      {
        titulo: "CONTORNO DE CORTE",
        lineas: [r.contornoAjustado ? fmt(r.contornoAjustado) : "PENDIENTE"],
        notas: [],
      },
    ],
    grupos: [
      {
        titulo: "FORMA",
        datos: [
          { etiqueta: "PERFIL", valores: [i.tipoPerfil ? nombrePerfil(i.tipoPerfil) : "—"] },
          { etiqueta: "GEOMETRÍA", valores: datosGeometriaPdf(i) },
        ],
      },
      {
        // El modo de ollaos no está aquí: ya lo dice el título de su tabla.
        titulo: "ACABADOS",
        datos: [
          { etiqueta: "RECOGE DELANTE", valores: [oRaya(r.recogeDelanteTexto)] },
          { etiqueta: "RECOGE ATRÁS", valores: [oRaya(r.recogeAtrasTexto)] },
          { etiqueta: "VENTANA", valores: [textoVentana(i)] },
          { etiqueta: "ROTULACIÓN", valores: [siNo(i.rotulacion)] },
        ],
      },
    ],
    material: oRaya(i.material),
    observaciones: oRaya(i.observaciones),
  };
}

export function hojaBaqueton(i: BaquetonInput, r: BaquetonResult): CuerpoHoja {
  return {
    banda: [
      {
        titulo: "PAÑOS A CORTAR",
        lineas: [textoPanos(i.cantidad, r.panoUnico.largo, r.panoUnico.ancho)],
        notas: [],
      },
      {
        titulo: "MEDIDA REMOLQUE",
        lineas: [`${fmt(r.remolqueHecho.largo)} × ${fmt(r.remolqueHecho.ancho)}`],
        notas: [],
      },
      {
        titulo: "BAQUETÓN",
        lineas: [fmt(i.baqueton)],
        notas: [r.baquetonTrasero ? `TRASERO ${fmt(r.baquetonTrasero)}` : "EN LÍNEA"],
      },
    ],
    grupos: [
      {
        titulo: "ACABADOS",
        datos: [
          { etiqueta: "CLIENTE ESPECÍFICO", valores: [oRaya(i.clienteEspecifico)] },
          { etiqueta: "ROTULACIÓN", valores: [siNo(i.rotulacion)] },
        ],
      },
    ],
    material: oRaya(i.material),
    observaciones: oRaya(i.observaciones),
  };
}

export interface DatosHoja extends CuerpoHoja { titulo: string }

/** Lo único que el componente necesita saber de un registro. */
export function datosHoja(rec: PlanteamientoRecord, indice: number, total: number): DatosHoja {
  const cuerpo = rec.tipo === "lona"
    ? hojaLona(rec.input as LonaInput, rec.result as LonaResult)
    : hojaBaqueton(rec.input as BaquetonInput, rec.result as BaquetonResult);
  return { titulo: tituloPagina(rec.tipo, indice, total), ...cuerpo };
}
