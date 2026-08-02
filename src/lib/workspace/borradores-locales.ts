import type { LineaPedido } from "@/lib/workspace/lineas";
import { normalizarNumeroPedido } from "@/lib/pedidos/numero-pedido";

const PREFIJO = "tgm:borradores:";

/**
 * Los borradores viven en el navegador hasta que se completa el pedido. La
 * contrapartida es sabida y aceptada: un pedido a medias no sigue al usuario a
 * otro ordenador, y vaciar los datos del navegador lo pierde.
 *
 * El almacén llega por parámetro —no se lee `localStorage` aquí dentro— para
 * poder testear el módulo entero sin navegador.
 */
export function claveBorradores(numeroPedido: string): string {
  return `${PREFIJO}${normalizarNumeroPedido(numeroPedido)}`;
}

const pareceLinea = (valor: unknown): valor is LineaPedido => {
  if (typeof valor !== "object" || valor === null) return false;
  const linea = valor as Partial<LineaPedido>;
  return typeof linea.version === "string"
    && (linea.tipo === "lona" || linea.tipo === "baqueton")
    && typeof linea.input === "object" && linea.input !== null;
};

export function leerBorradores(almacen: Storage | null, numeroPedido: string): LineaPedido[] {
  if (!almacen) return [];
  try {
    const crudo = almacen.getItem(claveBorradores(numeroPedido));
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    // Lo que hay en el navegador puede venir de una versión anterior de la
    // aplicación: se filtra en vez de confiar en que tenga la forma esperada.
    return Array.isArray(datos) ? datos.filter(pareceLinea) : [];
  } catch {
    return [];
  }
}

/** Devuelve false si no se pudo guardar; entonces el trabajo solo vive en memoria. */
export function guardarBorradores(
  almacen: Storage | null, numeroPedido: string, lineas: LineaPedido[],
): boolean {
  if (!almacen) return false;
  try {
    if (lineas.length === 0) {
      almacen.removeItem(claveBorradores(numeroPedido));
      return true;
    }
    almacen.setItem(claveBorradores(numeroPedido), JSON.stringify(lineas));
    return true;
  } catch {
    return false;
  }
}

export function limpiarBorradores(almacen: Storage | null, numeroPedido: string): void {
  if (!almacen) return;
  try {
    almacen.removeItem(claveBorradores(numeroPedido));
  } catch {
    // Si no se puede limpiar, la próxima carga fusiona borrador y registro por
    // versión y el borrador ya coincide con lo guardado: no se pierde nada.
  }
}
