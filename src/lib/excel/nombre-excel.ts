const INVALIDOS = /[<>:"/\\|?*]/g;

/** Nombre del Excel del planteamiento: solo el nº de pedido (sin versión). */
export function nombreExcel(numeroPedido: string): string {
  const pedido = (numeroPedido || "SIN-PEDIDO").replace(INVALIDOS, "_");
  return `${pedido}.xlsx`;
}
