const INVALIDOS = /[<>:"/\\|?*]/g;

/**
 * Un PDF por pedido: sin sufijo de versión. Las versiones (-10, -11…) van
 * dentro del propio PDF, una página por remolque; el sufijo queda para los
 * Excel, que sí se guardan por remolque.
 */
export function nombrePdf(numeroPedido: string): string {
  return `${(numeroPedido || "SIN-PEDIDO").replace(INVALIDOS, "_")}.pdf`;
}
