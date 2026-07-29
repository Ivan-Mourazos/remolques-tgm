export { normalizarNumeroPedido as normalizarNumeroPedidoRps } from "@/lib/pedidos/numero-pedido";

/** Un número con forma de pedido de RPS: dos letras y al menos cinco dígitos. */
export const FORMA_PEDIDO_RPS = /^[A-Z]{2}\d{5,}$/;
