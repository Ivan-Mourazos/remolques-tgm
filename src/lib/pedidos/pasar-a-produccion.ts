import { producido, type EstadoPedido } from "@/lib/pedidos/estado-pedido";

export interface DependenciasProduccion {
  leerEstado: () => Promise<EstadoPedido | null>;
  guardarEstado: (estado: EstadoPedido) => Promise<EstadoPedido>;
  /** Genera el PDF y lo archiva. Si la unidad de red no contesta, lanza. */
  generar: () => Promise<{ bytes: Uint8Array<ArrayBuffer>; nombre: string; rutas: string[] }>;
  ahora: string;
}

export type ResultadoProduccion =
  | { ok: true; estado: EstadoPedido; bytes: Uint8Array<ArrayBuffer>; nombre: string }
  | { ok: false; motivo: string; requiereConfirmacion: boolean };

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES");

/**
 * Generar, archivar y anotar, en ese orden y en un solo sitio: si el archivado
 * falla, la excepción sube y el pedido **no** queda marcado como producido, así
 * que se puede reintentar sin repetir nada. Al revés —anotar primero— dejaría
 * pedidos «en producción» sin PDF en la carpeta.
 */
export async function pasarAProduccion(
  datos: { numeroPedido: string; por: string; sustituir: boolean },
  deps: DependenciasProduccion,
): Promise<ResultadoProduccion> {
  const previo = await deps.leerEstado();

  // La puerta se comprueba antes de escribir nada.
  const puerta = producido(previo, {
    numeroPedido: datos.numeroPedido, por: datos.por, en: deps.ahora,
    nombrePdf: "", rutas: [],
  });
  if (!puerta.ok) {
    return { ok: false, motivo: puerta.motivo, requiereConfirmacion: false };
  }

  if (previo?.produccion && !datos.sustituir) {
    return {
      ok: false,
      motivo: `Ya hay un PDF archivado de este pedido, que pasó a producción ${previo.produccion.por} el ${fecha(previo.produccion.en)}. Se sustituirá.`,
      requiereConfirmacion: true,
    };
  }

  const { bytes, nombre, rutas } = await deps.generar();
  const transicion = producido(previo, {
    numeroPedido: datos.numeroPedido, por: datos.por, en: deps.ahora,
    nombrePdf: nombre, rutas,
  });
  if (!transicion.ok) {
    return { ok: false, motivo: transicion.motivo, requiereConfirmacion: false };
  }
  return {
    ok: true,
    estado: await deps.guardarEstado(transicion.estado),
    bytes,
    nombre,
  };
}
