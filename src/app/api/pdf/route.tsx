import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { guardarPdfDuplicado } from "@/lib/pdf/archivo-pdf";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";
import { getLogoTgmDataUri } from "@/lib/assets/logo-tgm";
import {
  generarPdfPedido, type PaginaPedidoPdf, type ResultadoGenerar,
} from "@/lib/pdf/generar-pdf-pedido";

export const runtime = "nodejs";

// Genera un único PDF por pedido y, en Linux de producción, archiva los mismos
// bytes en la carpeta general y en la carpeta del año correspondiente.
export async function POST(req: NextRequest) {
  let paginas: PaginaPedidoPdf[];
  let snapshots: Record<string, string | null>;
  let archivar: boolean;
  try {
    const body = await req.json();
    paginas = Array.isArray(body.paginas) ? body.paginas : [];
    snapshots = body.snapshots ?? {};
    if (body.archivar === true) {
      return NextResponse.json({ error: "Para archivar el PDF, selecciona el revisor y usa Guardar planteamiento en Revisión." }, { status: 400 });
    }
    archivar = false;
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }

  let resultado: ResultadoGenerar;
  try {
    resultado = await generarPdfPedido({ paginas, snapshots, archivar }, {
      store: getStore(),
      render: async (pags, logo) => new Uint8Array(
        await renderToBuffer(<PlanteamientoPdf paginas={pags} logoTgm={logo} />),
      ),
      archivar: (bytes, nombre, anio) => guardarPdfDuplicado(bytes, nombre, anio),
      logo: getLogoTgmDataUri(),
      ahora: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo generar el PDF: ${(e as Error).message}` },
      { status: 500 },
    );
  }
  if (!resultado.ok) return NextResponse.json({ error: resultado.mensaje }, { status: 400 });

  return new NextResponse(resultado.bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "X-Nombre-Pdf": resultado.nombre,
      "X-Pdf-Destinos": String(resultado.destinos.length),
      "X-Pdf-Anio": String(resultado.anio),
      "X-Pdf-Omitidos": String(resultado.omitidos),
    },
  });
}
