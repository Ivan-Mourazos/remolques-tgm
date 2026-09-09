import type { EstadoPedido, Situacion } from "@/lib/pedidos/estado-pedido";
import { estadoVisiblePedido } from "@/lib/pedidos/estado-pedido";
import type { PlanteamientoRecord } from "@/lib/store/types";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";

export interface EntradaBandeja {
  pedido: string;
  numeroPedido: string;
  cliente: string;
  lineas: number;
  guardadoPor: string;
  guardadoEn: string;
  situacion: Situacion;
  etiqueta: string;
}

/** Pedidos pendientes de guardar el PDF, con independencia de las decisiones antiguas. */
export function construirBandeja(
  estados: EstadoPedido[],
  registros: PlanteamientoRecord[],
): EntradaBandeja[] {
  const porPedido = new Map<string, PlanteamientoRecord[]>();
  for (const registro of registros) {
    const clave = normalizarNumeroPedido(registro.numeroPedido);
    porPedido.set(clave, [...(porPedido.get(clave) ?? []), registro]);
  }

  return estados
    .map((estado) => {
      const lineas = remolquesUnicos(porPedido.get(estado.pedido) ?? []);
      return { estado, lineas, visible: estadoVisiblePedido(estado, lineas) };
    })
    .filter(({ visible }) => visible.situacion !== "GUARDADO")
    .map(({ estado, lineas, visible }) => ({
      pedido: estado.pedido,
      numeroPedido: estado.numeroPedido,
      cliente: lineas[0]?.cliente ?? "",
      lineas: lineas.length,
      guardadoPor: estado.revision.por,
      guardadoEn: estado.revision.en,
      situacion: visible.situacion,
      etiqueta: visible.etiqueta,
    }))
    .sort((a, b) => b.guardadoEn.localeCompare(a.guardadoEn));
}
