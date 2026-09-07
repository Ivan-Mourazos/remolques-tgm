import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import type { PlanteamientoRecord, PlanteamientoStore, TipoPlanteamiento } from "@/lib/store/types";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { anioDelPlanteamiento } from "@/lib/pdf/archivo-pdf";
import { buildRecord } from "@/app/api/planteamientos/build-record";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { errorPlanteamientoIncompleto, planteamientoGenerable } from "@/lib/pedidos/validar-planteamiento";

export interface PaginaPedidoPdf {
  clave: string;
  id?: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

export interface DependenciasPdfPedido {
  store: PlanteamientoStore;
  /** El render de @react-pdf. Inyectado porque no se puede ejecutar en un test. */
  render: (
    paginas: Array<{ rec: PlanteamientoRecord; png: string | null }>,
    logo: string | null,
    // Uint8Array<ArrayBuffer> y no Uint8Array a secas: es lo que acepta una
    // respuesta HTTP como cuerpo, y así no hace falta un cast en la ruta.
  ) => Promise<Uint8Array<ArrayBuffer>>;
  /** La escritura en la unidad de red. Si falla, lanza: no hay PDF dado por bueno. */
  archivar: (bytes: Uint8Array, nombre: string, anio: number) => Promise<string[]>;
  logo: string | null;
  ahora: string;
}

export type ResultadoGenerar =
  | {
      ok: true;
      bytes: Uint8Array<ArrayBuffer>;
      nombre: string;
      anio: number;
      destinos: string[];
      omitidos: number;
    }
  | { ok: false; mensaje: string };

/**
 * Genera el PDF de un pedido y, si se pide, lo archiva. Lo usan la vista previa
 * de `/api/pdf` y el paso a producción: el nombre del fichero y sus destinos se
 * deciden en un solo sitio para que no puedan divergir.
 */
export async function generarPdfPedido(
  opciones: {
    paginas: PaginaPedidoPdf[];
    snapshots: Record<string, string | null>;
    archivar: boolean;
  },
  deps: DependenciasPdfPedido,
): Promise<ResultadoGenerar> {
  const params = await deps.store.getParams();
  const recs: PlanteamientoRecord[] = [];
  for (const pagina of opciones.paginas) {
    const error = errorPlanteamientoIncompleto(pagina.input);
    if (error) return { ok: false, mensaje: error };
    const existente = pagina.id ? await deps.store.get(pagina.id) : null;
    const base = buildRecord(pagina.tipo, pagina.input, params, pagina.id, null);
    recs.push({
      ...base,
      id: pagina.clave,
      createdAt: existente?.createdAt ?? deps.ahora,
      updatedAt: deps.ahora,
    });
  }

  const paginas = remolquesUnicos(recs).filter((r) => planteamientoGenerable(r.input));
  const omitidos = recs.length - paginas.length;
  if (paginas.length === 0) {
    return { ok: false, mensaje: "No hay planteamientos completos para generar" };
  }

  const bytes = await deps.render(
    paginas.map((rec) => ({ rec, png: opciones.snapshots[rec.id] ?? null })),
    deps.logo,
  );
  const nombre = nombrePdf(paginas[0].numeroPedido);
  const anio = anioDelPlanteamiento(paginas[0].numeroPedido, paginas[0].input.cabecera.fecha);
  const destinos = opciones.archivar ? await deps.archivar(bytes, nombre, anio) : [];
  return { ok: true, bytes, nombre, anio, destinos, omitidos };
}
