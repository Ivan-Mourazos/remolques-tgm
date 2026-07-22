const INVALIDOS = /[<>:"/\\|?*]/g;

/**
 * Un PDF por pedido: mantiene el sufijo histórico -10. Los distintos
 * remolques ya no generan -11, -12…; van como páginas del mismo PDF.
 */
export function nombrePdf(numeroPedido: string): string {
  return `${(numeroPedido || "SIN-PEDIDO").replace(INVALIDOS, "_")}-10.pdf`;
}
