import type { EstadoPedido, EstadoVisible } from "@/lib/pedidos/estado-pedido";
import { estadoVisiblePedido } from "@/lib/pedidos/estado-pedido";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { nombreElementoPedido, remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { seccionesRevision, type SeccionRevision } from "@/lib/revision/datos-revision";
import { datosHoja, type Celda } from "@/lib/pdf/datos-hoja";

export interface LineaFicha {
  /** El del registro guardado: es la clave con la que viajan los dibujos al
   *  generar el PDF de producción. */
  id: string;
  version: string;
  tipo: TipoPlanteamiento;
  nombre: string;
  /** Los datos tal y como se teclearon. */
  secciones: SeccionRevision[];
  /** Las medidas de corte, como dato secundario: es lo calculado, no lo tecleado. */
  corte: Celda[];
  /** El dibujo guardado: no hace falta recalcularlo ni montar la escena 3D. */
  snapshotSvg: string | null;
}

export interface FichaPedido {
  pedido: string;
  numeroPedido: string;
  cliente: string;
  visible: EstadoVisible;
  estado: EstadoPedido | null;
  lineas: LineaFicha[];
}

export function construirFicha(
  estado: EstadoPedido | null,
  registros: PlanteamientoRecord[],
): FichaPedido {
  const lineas = remolquesUnicos(registros);
  return {
    pedido: estado?.pedido ?? "",
    numeroPedido: estado?.numeroPedido ?? lineas[0]?.numeroPedido ?? "",
    cliente: lineas[0]?.cliente ?? "",
    visible: estadoVisiblePedido(estado, lineas),
    estado,
    lineas: lineas.map((registro, indice) => ({
      id: registro.id,
      version: registro.version,
      tipo: registro.tipo,
      nombre: nombreElementoPedido(registro.version, registro.tipo),
      secciones: seccionesRevision({
        tipo: registro.tipo, input: registro.input, version: registro.version,
      }),
      corte: datosHoja(registro, indice, lineas.length).banda,
      snapshotSvg: registro.snapshotSvg ?? null,
    })),
  };
}
