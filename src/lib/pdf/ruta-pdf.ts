const INVALIDOS = /[<>:"/\\|?*]/g;

const limpiar = (s: string) => s.replace(INVALIDOS, "_");

/** Con una versión mantiene el sufijo -10 histórico; con varias, un único PDF por pedido. */
export function nombrePdf(numeroPedido: string, versiones: string[]): string {
  const pedido = limpiar(numeroPedido || "SIN-PEDIDO");
  if (versiones.length === 1) return `${pedido}-${limpiar(versiones[0])}.pdf`;
  return `${pedido}.pdf`;
}
