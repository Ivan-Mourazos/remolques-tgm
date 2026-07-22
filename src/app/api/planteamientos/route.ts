import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { buildRecord } from "@/app/api/planteamientos/build-record";
import type { TipoPlanteamiento } from "@/lib/store/types";
import { remolquesUnicos } from "@/lib/pedidos/agrupar-pedido";
import { errorPlanteamientoIncompleto } from "@/lib/pedidos/validar-planteamiento";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipoParam = searchParams.get("tipo");
  const recs = await getStore().list({
    texto: searchParams.get("texto") ?? undefined,
    tipo: tipoParam ? (tipoParam as TipoPlanteamiento) : undefined,
    pedido: searchParams.get("pedido") ?? undefined,
  });
  return NextResponse.json(recs);
}

export async function POST(req: NextRequest) {
  try {
    const { id, tipo, input, snapshotSvg } = await req.json();
    const errorValidacion = errorPlanteamientoIncompleto(input);
    if (errorValidacion) throw new Error(errorValidacion);
    const store = getStore();
    const params = await store.getParams();
    const record = buildRecord(tipo, input, params, id, snapshotSvg ?? null);
    let idDestino = id as string | undefined;
    if (!idDestino && record.numeroPedido.trim()) {
      const existentes = remolquesUnicos(await store.list({ pedido: record.numeroPedido, limit: 200 }));
      idDestino = existentes.find((registro) => registro.version === record.version)?.id;
    }
    const saved = await store.save({ ...record, id: idDestino });
    return NextResponse.json(saved);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
