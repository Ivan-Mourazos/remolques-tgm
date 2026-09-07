import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { construirFicha } from "@/lib/revision/ficha-pedido";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/pedidos/[pedido]">,
) {
  const { pedido } = await ctx.params;
  const numero = decodeURIComponent(pedido);
  const [estado, registros] = await Promise.all([
    getPedidosStore().get(numero),
    getStore().list({ pedido: numero, limit: 200 }),
  ]);
  if (!estado && registros.length === 0) {
    return NextResponse.json({ error: "No hay ningún pedido con ese número." }, { status: 404 });
  }
  return NextResponse.json(construirFicha(estado, registros));
}
