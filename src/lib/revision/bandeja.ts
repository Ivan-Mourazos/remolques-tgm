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

/** Lo que espera respuesta va primero; dentro de cada grupo, lo más reciente. */
const ORDEN: Partial<Record<Situacion, number>> = { EN_REVISION: 0, NO_APROBADO: 1 };

/**
 * Los pedidos que le tocan a alguien: los que esperan una primera respuesta y
 * los rechazos que nadie ha empezado a arreglar. Un rechazo con las líneas ya
 * tocadas no está esperando a nadie —quien lleva el pedido está con él— y
 * dejarlo en la bandeja solo enseñaría a no mirarla.
 */
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
    .filter(({ visible }) => (
      visible.situacion === "EN_REVISION"
      || (visible.situacion === "NO_APROBADO" && !visible.conCambiosPosteriores)
    ))
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
    .sort((a, b) => (
      (ORDEN[a.situacion] ?? 9) - (ORDEN[b.situacion] ?? 9)
      || b.guardadoEn.localeCompare(a.guardadoEn)
    ));
}
