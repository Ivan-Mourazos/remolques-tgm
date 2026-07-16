import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { buildRecord } from "@/app/api/planteamientos/build-record";
import type { TipoPlanteamiento } from "@/lib/store/types";

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
    const params = await getStore().getParams();
    const saved = await getStore().save(buildRecord(tipo, input, params, id, snapshotSvg ?? null));
    return NextResponse.json(saved);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
