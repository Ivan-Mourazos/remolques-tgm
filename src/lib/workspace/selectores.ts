import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { TipoPlanteamiento } from "@/lib/store/types";
import type { OrigenRps, PedidoRps } from "@/lib/rps/types";
import type { ErrorPlanteamiento } from "@/lib/pedidos/validar-planteamiento";
import { normalizarNumeroPedidoRps } from "@/lib/rps/numero-pedido";

export type EstadoConsultaRps =
  | "idle" | "buscando" | "encontrado" | "no-encontrado" | "error";

/** Un número con forma de pedido de RPS: dos letras y al menos cinco dígitos. */
const FORMA_PEDIDO_RPS = /^[A-Z]{2}\d{5,}$/;

export function inputActivo(
  tipo: TipoPlanteamiento,
  lona: LonaInput,
  baqueton: BaquetonInput,
): LonaInput | BaquetonInput {
  return tipo === "lona" ? lona : baqueton;
}

export function hayCambiosSinGuardar(
  editorActivo: boolean,
  input: LonaInput | BaquetonInput,
  baseGuardada: string | null,
): boolean {
  return editorActivo && JSON.stringify(input) !== baseGuardada;
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
): Record<string, string> {
  if (!validacionIntentada) return {};
  return Object.fromEntries(errores.map((error) => [error.campo, error.mensaje]));
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

export function origenRpsActivo(
  numeroPedido: string,
  origen: OrigenRps | null,
): OrigenRps | null {
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
