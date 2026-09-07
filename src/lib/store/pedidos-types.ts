import type { EstadoPedido } from "@/lib/pedidos/estado-pedido";

/**
 * El estado de revisión vive en su propio sitio, no en una columna de
 * `Planteamientos`: aprobar un pedido no debe reescribir sus líneas, y las
 * líneas no tienen por qué cargar con un campo que no es suyo.
 */
export interface PedidosStore {
  /** Acepta el número tal cual se escribió; normaliza por dentro. */
  get(pedido: string): Promise<EstadoPedido | null>;
  /** Todos, del más reciente al más antiguo. */
  list(): Promise<EstadoPedido[]>;
  save(estado: EstadoPedido): Promise<EstadoPedido>;
}
