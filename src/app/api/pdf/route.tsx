import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { nombrePdf } from "@/lib/pdf/ruta-pdf";
import { anioDelPlanteamiento, guardarPdfDuplicado } from "@/lib/pdf/archivo-pdf";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";
import { getLogoTgmDataUri } from "@/lib/assets/logo-tgm";
import { buildRecord } from "@/app/api/planteamientos/build-record";
import type { PlanteamientoRecord, TipoPlanteamiento } from "@/lib/store/types";
import type { LonaInput } from "@/lib/calc/lona";
import type { BaquetonInput } from "@/lib/calc/baqueton";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { errorPlanteamientoIncompleto, planteamientoGenerable } from "@/lib/pedidos/validar-planteamiento";

export const runtime = "nodejs";

// Genera un único PDF por pedido y, en Linux de producción, archiva los mismos
// bytes en la carpeta general y en la carpeta del año correspondiente.
export async function POST(req: NextRequest) {
  let paginasPedidas: Array<{
    clave: string; id?: string; tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput;
  }>;
  let snapshots: Record<string, string | null>;
  let archivar: boolean;
  try {
    const body = await req.json();
    paginasPedidas = Array.isArray(body.paginas) ? body.paginas : [];
    snapshots = body.snapshots ?? {};
    archivar = body.archivar === true;
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }
  const store = getStore();
  const params = await store.getParams();
  const ahora = new Date().toISOString();
  // Cada página llega con su input: las líneas del pedido son borradores hasta
  // que se completa. De las guardadas se recupera su fecha de creación para que
  // el orden del PDF sea el de siempre.
  const recs: PlanteamientoRecord[] = [];
  for (const pagina of paginasPedidas) {
    const errorValidacion = errorPlanteamientoIncompleto(pagina.input);
    if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });
    const existente = pagina.id ? await store.get(pagina.id) : null;
    const base = buildRecord(pagina.tipo, pagina.input, params, pagina.id, null);
    recs.push({
      ...base,
      id: pagina.clave,
      createdAt: existente?.createdAt ?? ahora,
      updatedAt: ahora,
    });
  }
  const paginas = remolquesUnicos(recs).filter((registro) => planteamientoGenerable(registro.input));
  const omitidos = recs.length - paginas.length;
  if (paginas.length === 0) return NextResponse.json({ error: "No hay planteamientos completos para generar" }, { status: 400 });

  const doc = (
    <PlanteamientoPdf
      paginas={paginas.map((rec) => ({ rec, png: snapshots[rec.id] ?? null }))}
      logoTgm={getLogoTgmDataUri()}
    />
  );

  try {
    const buffer = await renderToBuffer(doc);
    const nombre = nombrePdf(paginas[0].numeroPedido);
    const anio = anioDelPlanteamiento(
      paginas[0].numeroPedido,
      paginas[0].input.cabecera.fecha,
    );
    const destinos = archivar
      ? await guardarPdfDuplicado(new Uint8Array(buffer), nombre, anio)
      : [];
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "X-Nombre-Pdf": nombre,
        "X-Pdf-Destinos": String(destinos.length),
        "X-Pdf-Anio": String(anio),
        "X-Pdf-Omitidos": String(omitidos),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo generar el PDF: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
