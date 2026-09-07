import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { guardarPdfDuplicado } from "@/lib/pdf/archivo-pdf";
import { PlanteamientoPdf } from "@/lib/pdf/PlanteamientoPdf";
import { getLogoTgmDataUri } from "@/lib/assets/logo-tgm";
import { generarPdfPedido } from "@/lib/pdf/generar-pdf-pedido";
import { pasarAProduccion, type ResultadoProduccion } from "@/lib/pedidos/pasar-a-produccion";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/pedidos/[pedido]/produccion">,
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
      { error: "Elige quién pasa el pedido a producción de la lista de técnicos." },
      { status: 400 },
    );
  }

  const registros = remolquesUnicos(await store.list({ pedido: numeroPedido, limit: 200 }));
  if (registros.length === 0) {
    return NextResponse.json({ error: "Este pedido no tiene líneas guardadas." }, { status: 404 });
  }
  const ahora = new Date().toISOString();
  const almacen = getPedidosStore();

  let resultado: ResultadoProduccion;
  try {
    resultado = await pasarAProduccion({ numeroPedido, por, sustituir }, {
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
              await renderToBuffer(<PlanteamientoPdf paginas={pags} logoTgm={logo} />),
            ),
            archivar: (bytes, nombre, anio) => guardarPdfDuplicado(bytes, nombre, anio),
            logo: getLogoTgmDataUri(),
            ahora,
          },
        );
        if (!generado.ok) throw new Error(generado.mensaje);
        return { bytes: generado.bytes, nombre: generado.nombre, rutas: generado.destinos };
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo pasar a producción: ${(e as Error).message}` },
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
