import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { TipoPlanteamiento } from "@/lib/store/types";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { estadoLinea, type LineaPedido } from "@/lib/workspace/lineas";

export interface OpcionesOrquestarPdf {
  numeroPedido: string;
  archivar: boolean;
  /** Las líneas del pedido, en orden. Las guardadas traen `id`. */
  lineas: LineaPedido[];
}

export interface DependenciasPdf {
  fetch: typeof globalThis.fetch;
  rasterizar: (svg: string) => Promise<string | null>;
  /**
   * Se llama una vez por dibujo rasterizado. Los dibujos se preparan en serie
   * y es la parte lenta de generar el PDF de un pedido con varios remolques,
   * así que es lo único que se puede contar honestamente.
   */
  onProgreso?: (hecho: number, total: number) => void;
}

export interface PaginaPdf {
  clave: string;
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export type ResultadoPdf =
  | { ok: true; respuesta: Response; nombre: string; omitidos: number }
  | { ok: false; motivo: "sin-elementos" | "http"; mensaje: string };

/** Las líneas sin guardar no tienen id y aun así necesitan casar con su dibujo. */
const claveLinea = (linea: LineaPedido) => linea.id ?? `borrador:${linea.version}`;

export async function orquestarPdf(
  opciones: OpcionesOrquestarPdf,
  deps: DependenciasPdf,
): Promise<ResultadoPdf> {
  const nombre = nombrePdf(opciones.numeroPedido.trim());
  // Las líneas ya vienen dadas: el workspace las tiene en la mano y casi
  // ninguna está guardada todavía. Completar el pedido comprueba antes que
  // están todas listas; aquí el filtro solo protege a la vista previa.
  const generables = opciones.lineas.filter((linea) => estadoLinea(linea).lista);
  const omitidos = opciones.lineas.length - generables.length;
  if (generables.length === 0) {
    return {
      ok: false,
      motivo: "sin-elementos",
      mensaje: "El pedido todavía no contiene ninguna línea completa para generar el PDF.",
    };
  }

  const total = generables.length;
  let hechos = 0;
  const snapshots: Record<string, string | null> = {};
  for (const linea of generables) {
    snapshots[claveLinea(linea)] = linea.snapshotSvg
      ? await deps.rasterizar(linea.snapshotSvg)
      : null;
    deps.onProgreso?.(++hechos, total);
  }

  const paginas: PaginaPdf[] = generables.map((linea) => ({
    clave: claveLinea(linea),
    id: linea.id,
    tipo: linea.tipo,
    input: linea.input,
  }));

  const respuesta = await deps.fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paginas, snapshots, archivar: opciones.archivar }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => null) as { error?: string } | null;
    return { ok: false, motivo: "http", mensaje: detalle?.error ?? String(respuesta.status) };
  }
  return { ok: true, respuesta, nombre, omitidos };
}
