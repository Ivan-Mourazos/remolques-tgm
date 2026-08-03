import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { OrigenRps } from "@/lib/rps/types";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { nombreElementoPedido, remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { erroresPlanteamiento } from "@/lib/pedidos/validar-planteamiento";

/**
 * Una línea del pedido. Las guardadas y los borradores son lo mismo: lo único
 * que las distingue es que la guardada trae `id`. Así no hay dos listas que
 * cuadrar entre sí.
 */
export interface LineaPedido {
  version: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
  /** id del registro guardado del que salió; ausente si nunca se guardó. */
  id?: string;
  /**
   * SVG de la vista técnica, capturado al dejar de editar la línea. La escena
   * solo dibuja la línea abierta, así que sin esto las demás llegarían al PDF
   * sin dibujo.
   */
  snapshotSvg?: string | null;
  /** Línea de RPS de la que se importó, si vino de ahí. */
  origenRps?: OrigenRps | null;
}

export interface EstadoLinea {
  lista: boolean;
  /** Primer error pendiente, o null si está lista. */
  falta: string | null;
}

export function nombreLinea(linea: LineaPedido): string {
  return nombreElementoPedido(linea.version, linea.tipo);
}

/**
 * El estado se calcula, no se marca: uno marcado a mano se queda rancio en
 * cuanto se toca una medida. Y se calcula igual para todas, vengan de donde
 * vengan: una línea con `id` no está lista «por definición», porque la base de
 * datos contiene registros incompletos.
 */
export function estadoLinea(linea: LineaPedido): EstadoLinea {
  const errores = erroresPlanteamiento(linea.input);
  return { lista: errores.length === 0, falta: errores[0]?.mensaje ?? null };
}

const numeroVersion = (version: string) => {
  const numero = Number(version);
  return Number.isFinite(numero) ? numero : Number.MAX_SAFE_INTEGER;
};

const porVersion = (a: LineaPedido, b: LineaPedido) =>
  numeroVersion(a.version) - numeroVersion(b.version);

export function lineasDesdeRegistros(registros: PlanteamientoRecord[]): LineaPedido[] {
  return remolquesUnicos(registros).map((registro) => ({
    version: registro.version,
    tipo: registro.tipo,
    input: registro.input,
    id: registro.id,
    snapshotSvg: registro.snapshotSvg ?? null,
  }));
}

/**
 * Une lo que hay en la base de datos con lo que hay en el navegador. El
 * borrador manda —es lo último que tocó el usuario— pero hereda el `id` del
 * registro de su misma versión: sin él se guardaría como registro nuevo y el
 * pedido acabaría con dos veces el mismo remolque.
 */
export function fusionarLineas(
  guardadas: LineaPedido[], borradores: LineaPedido[],
): LineaPedido[] {
  const porClave = new Map(guardadas.map((linea) => [linea.version, linea]));
  for (const borrador of borradores) {
    const guardada = porClave.get(borrador.version);
    porClave.set(borrador.version, guardada
      ? {
          ...borrador,
          id: borrador.id ?? guardada.id,
          snapshotSvg: borrador.snapshotSvg ?? guardada.snapshotSvg,
        }
      : borrador);
  }
  return [...porClave.values()].sort(porVersion);
}

/** Sigue a la versión más alta, no al número de líneas: eliminar no reutiliza. */
export function siguienteVersion(lineas: LineaPedido[]): string {
  const ultima = lineas.reduce((maximo, linea) => {
    const version = Number(linea.version);
    return Number.isInteger(version) ? Math.max(maximo, version) : maximo;
  }, 9);
  return String(ultima + 1);
}
