import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { guardarPdfDuplicado, PdfExistenteError } from "@/lib/pdf/archivo-pdf";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";
import { getLogoTgmDataUri } from "@/lib/assets/logo-tgm";
import { generarPdfPedido } from "@/lib/pdf/generar-pdf-pedido";
import { guardarPlanteamiento, type ResultadoGuardado } from "@/lib/pedidos/guardar-planteamiento";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ pedido: string }> },
) {
  const { pedido } = await ctx.params;
  const numeroPedido = decodeURIComponent(pedido);

  let por: string;
  let sustituir: boolean;
  let snapshots: Record<string, string | null>;
  try {
    const body = await req.json();
    por = String(body.por ?? "").trim();
    sustituir = body.sustituir === true;
    snapshots = body.snapshots ?? {};
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }

  const store = getStore();
  const { tecnicos } = await store.getParams();
  if (!tecnicos.includes(por)) {
    return NextResponse.json(
      { error: "Elige el nombre del revisor de la lista de técnicos." },
      { status: 400 },
    );
  }

  const registros = remolquesUnicos(await store.list({ pedido: numeroPedido, limit: 200 }));
  if (registros.length === 0) {
    return NextResponse.json({ error: "Este pedido no tiene líneas guardadas." }, { status: 404 });
  }
  const ahora = new Date().toISOString();
  const almacen = getPedidosStore();

  let resultado: ResultadoGuardado;
  try {
    resultado = await guardarPlanteamiento({ numeroPedido, por, sustituir }, {
      leerEstado: () => almacen.get(numeroPedido),
      guardarEstado: (estado) => almacen.save(estado),
      ahora,
      generar: async () => {
        const generado = await generarPdfPedido(
          {
            // El dibujo sale de lo guardado: el cliente rasteriza los SVG y los
            // manda, igual que hace la vista previa.
            paginas: registros.map((registro) => ({
              clave: registro.id, id: registro.id,
              tipo: registro.tipo, input: registro.input,
            })),
            snapshots,
            archivar: true,
          },
          {
            store,
            render: async (pags, logo) => new Uint8Array(
              await renderToBuffer(<PlanteamientoPdf paginas={pags} logoTgm={logo} revisor={por} />),
            ),
            archivar: (bytes, nombre, anio) => guardarPdfDuplicado(bytes, nombre, anio, process.env, { sustituir }),
            logo: getLogoTgmDataUri(),
            ahora,
          },
        );
        if (!generado.ok) throw new Error(generado.mensaje);
        return { bytes: generado.bytes, nombre: generado.nombre, rutas: generado.destinos };
      },
    });
  } catch (e) {
    if (e instanceof PdfExistenteError) {
      return NextResponse.json({ error: e.message, requiereConfirmacion: true }, { status: 409 });
    }
    return NextResponse.json(
      { error: `No se pudo guardar el planteamiento: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.motivo, requiereConfirmacion: resultado.requiereConfirmacion },
      { status: 409 },
    );
  }
  return new NextResponse(resultado.bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "X-Nombre-Pdf": resultado.nombre,
      "X-Pdf-Destinos": String(resultado.estado.produccion?.rutas.length ?? 0),
    },
  });
}
