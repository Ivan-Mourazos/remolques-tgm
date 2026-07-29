import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { planteamientoGenerable } from "@/lib/pedidos/validar-planteamiento";

export interface OpcionesOrquestarPdf {
  numeroPedido: string;
  archivar: boolean;
  editorActivo: boolean;
  /** id devuelto por el guardado previo, si el flujo guardó antes de generar. */
  idGuardado: string | null;
  /** id del elemento en edición, o "__vista-previa__" si aún no se ha guardado. */
  idBorrador: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
  /** SVG serializado de la vista técnica en pantalla. */
  svgActual: string | null;
}

export interface DependenciasPdf {
  fetch: typeof globalThis.fetch;
  rasterizar: (svg: string) => Promise<string | null>;
}

export type ResultadoPdf =
  | { ok: true; respuesta: Response; nombre: string; omitidos: number }
  | { ok: false; motivo: "sin-elementos" | "http"; mensaje: string };

export async function orquestarPdf(
  opciones: OpcionesOrquestarPdf,
  deps: DependenciasPdf,
): Promise<ResultadoPdf> {
  const { archivar, editorActivo, idBorrador, idGuardado, input, tipo } = opciones;
  const pedido = opciones.numeroPedido.trim();
  const nombre = nombrePdf(pedido);

  // Un PDF por pedido: una página por cada remolque guardado, en orden de creación.
  let registros: PlanteamientoRecord[] = [];
  if (pedido) {
    registros = await deps.fetch(`/api/planteamientos?pedido=${encodeURIComponent(pedido)}`)
      .then((r) => (r.ok ? r.json() as Promise<PlanteamientoRecord[]> : []))
      .catch(() => []);
  }
  const agrupados = remolquesUnicos(registros);
  const generables = agrupados.filter((registro) => planteamientoGenerable(registro.input));
  const omitidos = agrupados.length - generables.length;
  const paginas = generables
    .filter((registro) => archivar || !editorActivo || registro.version !== input.cabecera.version)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const ids = paginas.map((r) => r.id);
  if (ids.length === 0 && !editorActivo) {
    return {
      ok: false,
      motivo: "sin-elementos",
      mensaje: "El pedido todavía no contiene ningún elemento válido para generar el PDF.",
    };
  }

  const snapshots: Record<string, string | null> = {};
  for (const r of paginas) {
    snapshots[r.id] = r.snapshotSvg ? await deps.rasterizar(r.snapshotSvg) : null;
  }
  if (editorActivo) {
    const idPaginaActual = idGuardado ?? idBorrador;
    if (!(idPaginaActual in snapshots)) {
      snapshots[idPaginaActual] = await deps.rasterizar(opciones.svgActual ?? "");
    }
  }

  const respuesta = await deps.fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ids,
      snapshots,
      archivar,
      borrador: archivar || !editorActivo ? null : { id: idBorrador, tipo, input },
    }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => null) as { error?: string } | null;
    return { ok: false, motivo: "http", mensaje: detalle?.error ?? String(respuesta.status) };
  }
  return {
    ok: true,
    respuesta,
    nombre,
    omitidos: Math.max(omitidos, Number(respuesta.headers.get("X-Pdf-Omitidos") ?? 0)),
  };
}
