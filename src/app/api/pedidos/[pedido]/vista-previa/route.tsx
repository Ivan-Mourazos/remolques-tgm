import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";
import { getLogoTgmDataUri } from "@/lib/assets/logo-tgm";
import { generarPdfPedido } from "@/lib/pdf/generar-pdf-pedido";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";

export const runtime = "nodejs";

/** La vista previa usa los datos guardados, sin archivar ni registrar una revisión. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ pedido: string }> },
) {
  const { pedido } = await ctx.params;
  let por: string;
  let snapshots: Record<string, string | null>;
  try {
    const body = await req.json();
    por = String(body.por ?? "").trim();
    snapshots = body.snapshots ?? {};
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }

  try {
    const store = getStore();
    const { tecnicos } = await store.getParams();
    if (por && !tecnicos.includes(por)) {
      return NextResponse.json({ error: "Elige el nombre del revisor de la lista de técnicos." }, { status: 400 });
    }
    const registros = remolquesUnicos(await store.list({ pedido, limit: 200 }));
    if (!registros.length) {
      return NextResponse.json({ error: "Este pedido no tiene líneas guardadas." }, { status: 404 });
    }
    const resultado = await generarPdfPedido({
      paginas: registros.map(registro => ({
        clave: registro.id, id: registro.id, tipo: registro.tipo, input: registro.input,
      })),
      snapshots,
      archivar: false,
    }, {
      store,
      render: async (paginas, logo) => new Uint8Array(
        await renderToBuffer(<PlanteamientoPdf paginas={paginas} logoTgm={logo} revisor={por} />),
      ),
      archivar: async () => { throw new Error("La vista previa no puede archivar archivos."); },
      logo: getLogoTgmDataUri(),
      ahora: new Date().toISOString(),
    });
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.mensaje }, { status: 400 });
    }
    return new NextResponse(resultado.bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${resultado.nombre}"`,
        "X-Nombre-Pdf": resultado.nombre,
        "X-Pdf-Destinos": "0",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo generar la vista previa: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
