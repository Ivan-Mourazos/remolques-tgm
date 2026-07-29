export type Severidad = "error" | "exito" | "info";

export interface Aviso {
  id: string;
  severidad: Severidad;
  texto: string;
}

export interface AccionConfirmacion {
  clave: string;
  etiqueta: string;
  tono?: "primario" | "peligro" | "neutro";
  /** Si viene, el botón se desactiva y muestra este motivo. */
  deshabilitada?: string;
}

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  acciones: AccionConfirmacion[];
}

/** Milisegundos hasta el descarte automático. Los errores no se van solos. */
export const DURACION_AVISO: Record<Severidad, number | null> = {
  error: null,
  exito: 6000,
  info: 10000,
};

export const TOPE_AVISOS = 4;
