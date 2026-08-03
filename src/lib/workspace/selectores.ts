import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { EstadoWorkspace } from "@/lib/workspace/estado";
import type { LineaPedido } from "@/lib/workspace/lineas";
import type { OrigenRps, PedidoRps } from "@/lib/rps/types";
import type { ErrorPlanteamiento } from "@/lib/pedidos/validar-planteamiento";
import { FORMA_PEDIDO_RPS, normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

export type EstadoConsultaRps =
  | "idle" | "buscando" | "encontrado" | "no-encontrado" | "error";

/** La línea abierta, o null si el pedido no tiene ninguna. */
export function lineaActiva(estado: EstadoWorkspace): LineaPedido | null {
  return estado.lineas.find((linea) => linea.version === estado.versionActiva) ?? null;
}

/** Medidas mínimas para que el cálculo de paños y ollaos tenga sentido. */
export function medidasSuficientes(input: LonaInput | BaquetonInput): boolean {
  if ("baqueton" in input) {
    return input.largo > 0 && input.ancho > 0 && input.baqueton > 0;
  }
  return input.largo > 0 && input.ancho > 0 && input.altoDelante > 0
    && (!["TIPO 02", "TIPO 03"].includes(input.tipoPerfil) || (input.aguas ?? 0) > 0)
    && (input.tipoPerfil !== "TIPO 04" || (input.chaflan ?? 0) > 0)
    && (input.tipoPerfil !== "TIPO 05" || (input.radioEsquina ?? 0) > 0);
}

/** Errores indexados por campo, solo una vez que se ha intentado validar. */
export function erroresVisibles(
  errores: ErrorPlanteamiento[],
  validacionIntentada: boolean,
  camposTocados: string[],
): Record<string, string> {
  const visibles = validacionIntentada
    ? errores
    : errores.filter((error) => camposTocados.includes(error.campo));
  return Object.fromEntries(visibles.map((error) => [error.campo, error.mensaje]));
}

export function pedidoRpsVisible(
  numeroPedido: string,
  pedido: PedidoRps | null,
): PedidoRps | null {
  if (!pedido) return null;
  return normalizarNumeroPedidoRps(pedido.numero) === normalizarNumeroPedidoRps(numeroPedido)
    ? pedido
    : null;
}

/** El origen de RPS es de la línea, no del workspace: cada una vino de la suya. */
export function origenRpsActivo(
  numeroPedido: string,
  linea: LineaPedido | null,
): OrigenRps | null {
  const origen = linea?.origenRps;
  if (!origen) return null;
  return normalizarNumeroPedidoRps(origen.numeroPedido) === normalizarNumeroPedidoRps(numeroPedido)
    ? origen
    : null;
}

export function estadoRpsVisible(
  numeroPedido: string,
  numeroConsultado: string,
  estado: EstadoConsultaRps,
): EstadoConsultaRps {
  const normalizado = normalizarNumeroPedidoRps(numeroPedido);
  return FORMA_PEDIDO_RPS.test(normalizado) && numeroConsultado === normalizado
    ? estado
    : "idle";
}
