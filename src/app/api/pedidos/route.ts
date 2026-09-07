import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getPedidosStore } from "@/lib/store/pedidos";
import { construirBandeja } from "@/lib/revision/bandeja";

export const runtime = "nodejs";

/** La bandeja: lo que espera a alguien. */
export async function GET() {
  const [estados, registros] = await Promise.all([
    getPedidosStore().list(),
    getStore().list({ limit: 2000 }),
  ]);
  return NextResponse.json({ pedidos: construirBandeja(estados, registros) });
}
