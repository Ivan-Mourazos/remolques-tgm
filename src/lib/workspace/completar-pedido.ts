import { estadoLinea, nombreLinea, type LineaPedido } from "@/lib/workspace/lineas";

export interface ImpedimentoLinea {
  /** Versión de la línea que falla; "" cuando el problema es del pedido entero. */
  version: string;
  nombre: string;
  falta: string;
}

/**
 * Lo que impide dar el pedido por terminado, línea por línea. Hasta ahora
 * `orquestarPdf` filtraba las incompletas y solo decía cuántas había omitido:
 * el pedido salía «bien» con un remolque menos.
 */
export function impedimentosCompletar(lineas: LineaPedido[]): ImpedimentoLinea[] {
  if (lineas.length === 0) {
    return [{ version: "", nombre: "El pedido", falta: "Añade al menos un remolque o un baquetón." }];
  }
  return lineas.flatMap((linea) => {
    const estado = estadoLinea(linea);
    return estado.lista
      ? []
      : [{ version: linea.version, nombre: nombreLinea(linea), falta: estado.falta ?? "" }];
  });
}

export function mensajeImpedimentos(impedimentos: ImpedimentoLinea[]): string {
  if (impedimentos.length === 0) return "";
  const detalle = impedimentos.map(({ nombre, falta }) => `${nombre}: ${falta}`).join(" ");
  return impedimentos.length === 1
    ? detalle
    : `Faltan ${impedimentos.length} líneas por terminar. ${detalle}`;
}
