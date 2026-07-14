const INVALIDOS = /[<>:"/\\|?*]/g;

/** Nombre del Excel del planteamiento: pedido + sufijo interno (10 por defecto). */
export function nombreExcel(numeroPedido: string, sufijo = "10"): string {
  const pedido = (numeroPedido || "SIN-PEDIDO").replace(INVALIDOS, "_");
  const parte = (sufijo || "10").replace(INVALIDOS, "_");
  return `${pedido}-${parte}.xlsx`;
}
