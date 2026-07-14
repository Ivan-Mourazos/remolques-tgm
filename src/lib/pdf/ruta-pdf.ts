const INVALIDOS = /[<>:"/\\|?*]/g;

export function nombrePdf(numeroPedido: string, version: string): string {
  const pedido = numeroPedido.replace(INVALIDOS, "_");
  const ver = version.replace(INVALIDOS, "_");
  return `${pedido}-${ver}.pdf`;
}
