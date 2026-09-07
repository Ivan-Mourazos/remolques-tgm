import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { decidido, guardadoParaRevision } from "@/lib/pedidos/estado-pedido";

export const runtime = "nodejs";

type Accion = "aprobar" | "no-aprobar" | "revisar";
const ACCIONES: Accion[] = ["aprobar", "no-aprobar", "revisar"];

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
    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
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

  if (accion === "revisar") {
    const estado = await almacen.save(
      guardadoParaRevision(previo, { numeroPedido, por, en: ahora }),
    );
    return NextResponse.json({ estado });
  }

  if (!previo) {
    return NextResponse.json(
      { error: "Este pedido no está en revisión." },
      { status: 404 },
    );
  }
  const transicion = decidido(previo, {
    estado: accion === "aprobar" ? "APROBADO" : "NO_APROBADO", por, en: ahora,
  });
  if (!transicion.ok) {
    // 409: alguien se pronunció antes. La ficha se recarga y dice el estado
    // real, en vez de pisar la decisión de otro.
    return NextResponse.json({ error: transicion.motivo }, { status: 409 });
  }
  return NextResponse.json({ estado: await almacen.save(transicion.estado) });
}
