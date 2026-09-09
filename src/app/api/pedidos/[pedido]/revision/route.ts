import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { guardadoParaRevision } from "@/lib/pedidos/estado-pedido";

export const runtime = "nodejs";

type Accion = "revisar";
const ACCIONES: Accion[] = ["revisar"];

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/pedidos/[pedido]/revision">,
) {
  const { pedido } = await ctx.params;
  const numeroPedido = decodeURIComponent(pedido);

  let accion: Accion;
  let por: string;
  try {
    const body = await req.json();
    accion = body.accion;
    por = String(body.por ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }
  if (!ACCIONES.includes(accion)) {
    return NextResponse.json({ error: "Las aprobaciones y devoluciones se gestionan en Coordina." }, { status: 400 });
  }

  // Quien firma una revisión tiene que ser alguien de la lista: un nombre
  // escrito a mano convierte la firma en un campo de texto cualquiera.
  const { tecnicos } = await getStore().getParams();
  if (!tecnicos.includes(por)) {
    return NextResponse.json(
      { error: "Elige quién revisa de la lista de técnicos." },
      { status: 400 },
    );
  }

  const almacen = getPedidosStore();
  const previo = await almacen.get(numeroPedido);
  const ahora = new Date().toISOString();

  const estado = await almacen.save(
    guardadoParaRevision(previo, { numeroPedido, por, en: ahora }),
  );
  return NextResponse.json({ estado });
}
