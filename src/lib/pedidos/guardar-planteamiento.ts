import { registrarArchivo, type EstadoPedido } from "@/lib/pedidos/estado-pedido";

export interface DependenciasGuardado {
  leerEstado: () => Promise<EstadoPedido | null>;
  guardarEstado: (estado: EstadoPedido) => Promise<EstadoPedido>;
  generar: () => Promise<{ bytes: Uint8Array<ArrayBuffer>; nombre: string; rutas: string[] }>;
  ahora: string;
}
export type ResultadoGuardado =
  | { ok: true; estado: EstadoPedido; bytes: Uint8Array<ArrayBuffer>; nombre: string }
  | { ok: false; motivo: string; requiereConfirmacion: boolean };

/** La firma se registra después de archivar ambas copias. Coordina gestiona las decisiones. */
export async function guardarPlanteamiento(
  datos: { numeroPedido: string; por: string; sustituir: boolean },
  deps: DependenciasGuardado,
): Promise<ResultadoGuardado> {
  if (!datos.por.trim()) return { ok: false, motivo: "Elige el nombre del revisor.", requiereConfirmacion: false };
  const previo = await deps.leerEstado();
  if (previo?.produccion?.rutas.length && !datos.sustituir) {
    return {
      ok: false,
      motivo: `Ya hay un PDF archivado por ${previo.produccion.por}. Se sustituirán las dos copias.`,
      requiereConfirmacion: true,
    };
  }
  const { bytes, nombre, rutas } = await deps.generar();
  if (rutas.length !== 2) throw new Error("El PDF no se ha archivado en las dos carpetas. Revisa las rutas del servidor.");
  const estado = registrarArchivo(previo, {
    ...datos, por: datos.por.trim(), en: deps.ahora, nombrePdf: nombre, rutas,
  });
  return { ok: true, estado: await deps.guardarEstado(estado), bytes, nombre };
}
